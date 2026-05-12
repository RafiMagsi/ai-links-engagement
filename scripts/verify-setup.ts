#!/usr/bin/env node
/**
 * Setup Verification Script
 * Validates all environment variables, dependencies, and services before deployment
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, errorMsg: string, warningMsg?: string): void {
  if (condition) {
    results.push({ name, status: 'ok', message: '✅ Pass' });
  } else if (warningMsg && !errorMsg) {
    results.push({ name, status: 'warning', message: '⚠️  Warning', details: warningMsg });
  } else {
    results.push({ name, status: 'error', message: '❌ Failed', details: errorMsg });
  }
}

function checkEnvVar(varName: string, isRequired = true): boolean {
  const value = process.env[varName];
  const exists = !!value && value.trim().length > 0;

  if (isRequired) {
    check(
      `Environment: ${varName}`,
      exists,
      `${varName} is required but not set or empty`
    );
  } else {
    check(
      `Environment: ${varName} (optional)`,
      true,
      '',
      exists ? undefined : `${varName} is optional - not set`
    );
  }

  return exists;
}

function checkFile(filePath: string, description: string): boolean {
  const exists = fs.existsSync(filePath);
  check(
    `File: ${description}`,
    exists,
    `Required file not found: ${filePath}`
  );
  return exists;
}

function checkCommand(command: string, name: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' });
    check(`Command: ${name}`, true, '');
    return true;
  } catch {
    check(`Command: ${name}`, false, `${name} not found or not executable. Install with: npm install -g ${name}`);
    return false;
  }
}

function checkDirectory(dirPath: string, description: string, shouldBeWritable = false): boolean {
  const exists = fs.existsSync(dirPath);
  check(
    `Directory: ${description}`,
    exists,
    `Required directory not found: ${dirPath}`
  );

  if (exists && shouldBeWritable) {
    try {
      const testFile = path.join(dirPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch {
      results.push({
        name: `Write Permission: ${description}`,
        status: 'error',
        message: '❌ Failed',
        details: `No write permission to ${dirPath}`
      });
      return false;
    }
  }

  return exists;
}

async function runChecks(): Promise<void> {
  console.log('\n📋 AI Links Automation - Setup Verification\n');
  console.log('=' .repeat(60) + '\n');

  // 1. Check Node.js and npm tools
  console.log('🔧 Checking System Requirements...\n');
  checkCommand('node', 'Node.js');
  checkCommand('pnpm', 'pnpm');
  checkCommand('npm', 'npm');

  // 2. Check project structure
  console.log('\n📁 Checking Project Structure...\n');
  checkFile(path.join(process.cwd(), 'pnpm-workspace.yaml'), 'pnpm-workspace.yaml');
  checkFile(path.join(process.cwd(), 'package.json'), 'Root package.json');
  checkFile(path.join(process.cwd(), 'apps/admin/package.json'), 'Admin app package.json');
  checkFile(path.join(process.cwd(), 'apps/worker/package.json'), 'Worker package.json');
  checkDirectory(path.join(process.cwd(), 'apps/admin'), 'Admin app');
  checkDirectory(path.join(process.cwd(), 'apps/worker'), 'Worker app');
  checkDirectory(path.join(process.cwd(), 'packages'), 'Packages directory');

  // 3. Check node_modules
  console.log('\n📦 Checking Dependencies...\n');
  const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
  check(
    'Dependencies: node_modules',
    nodeModulesExists,
    'node_modules not found. Run: pnpm install --frozen-lockfile'
  );

  const lockfileExists = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));
  check(
    'Lockfile: pnpm-lock.yaml',
    lockfileExists,
    'pnpm-lock.yaml not found. Run: pnpm install to generate it'
  );

  // 4. Check Firebase configuration
  console.log('\n🔐 Checking Firebase Configuration...\n');
  checkEnvVar('FIREBASE_PROJECT_ID', true);
  checkEnvVar('FIREBASE_PRIVATE_KEY', true);
  checkEnvVar('FIREBASE_CLIENT_EMAIL', true);

  // Validate Firebase private key format
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    const hasBeginMarker = privateKey.includes('-----BEGIN');
    const hasEndMarker = privateKey.includes('-----END');
    check(
      'Firebase: Private key format',
      hasBeginMarker && hasEndMarker,
      'FIREBASE_PRIVATE_KEY is not in valid PEM format'
    );
  }

  // 5. Check OpenAI configuration
  console.log('\n🤖 Checking OpenAI Configuration...\n');
  checkEnvVar('OPENAI_API_KEY', true);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    check(
      'OpenAI: API key format',
      openaiKey.startsWith('sk-'),
      'OPENAI_API_KEY should start with "sk-"'
    );
  }

  // 6. Check Redis configuration
  console.log('\n📊 Checking Redis Configuration...\n');
  checkEnvVar('REDIS_HOST', false);
  checkEnvVar('REDIS_PORT', false);
  checkEnvVar('REDIS_PASSWORD', false);

  // 7. Check application-specific config
  console.log('\n⚙️  Checking Application Configuration...\n');
  checkEnvVar('NODE_ENV', false);
  checkEnvVar('ADMIN_BASE_URL', false);
  checkEnvVar('DAILY_GLOBAL_ENGAGEMENT_CAP', false);

  // 8. Check environment files exist
  console.log('\n🔑 Checking Environment Files...\n');
  const envLocalExists = fs.existsSync(path.join(process.cwd(), '.env.local'));
  const adminEnvExists = fs.existsSync(path.join(process.cwd(), 'apps/admin/.env.local'));
  const workerEnvExists = fs.existsSync(path.join(process.cwd(), 'apps/worker/.env.local'));

  check(
    'Environment: .env.local',
    envLocalExists,
    '.env.local not found. Copy from .env.example and configure',
    'File not found (optional)'
  );
  check(
    'Environment: apps/admin/.env.local',
    adminEnvExists,
    'apps/admin/.env.local not found',
    'File not found (will be created)'
  );
  check(
    'Environment: apps/worker/.env.local',
    workerEnvExists,
    'apps/worker/.env.local not found',
    'File not found (will be created)'
  );

  // 9. Check build artifacts
  console.log('\n🏗️  Checking Build Artifacts...\n');
  const adminBuildExists = fs.existsSync(path.join(process.cwd(), 'apps/admin/.next'));
  const workerBuildExists = fs.existsSync(path.join(process.cwd(), 'apps/worker/dist'));

  check(
    'Build: Admin app (.next)',
    adminBuildExists,
    'Admin build not found. Run: pnpm --filter admin build',
    'Build artifact not present (will be created on deployment)'
  );
  check(
    'Build: Worker app (dist)',
    workerBuildExists,
    'Worker build not found. Run: pnpm --filter worker build',
    'Build artifact not present (will be created on deployment)'
  );

  // 10. Check PM2 configuration
  console.log('\n⚙️  Checking PM2 Configuration...\n');
  checkFile(
    path.join(process.cwd(), 'ecosystem.config.js'),
    'PM2 ecosystem configuration'
  );

  // 11. Display results
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 VERIFICATION RESULTS\n');

  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');
  const passed = results.filter(r => r.status === 'ok');

  console.log(`✅ Passed:  ${passed.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Errors:   ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('❌ ERRORS:\n');
    errors.forEach(r => {
      console.log(`  • ${r.name}`);
      if (r.details) console.log(`    ${r.details}`);
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    warnings.forEach(r => {
      console.log(`  • ${r.name}`);
      if (r.details) console.log(`    ${r.details}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ Setup verification failed. Fix errors above and try again.\n');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('\n⚠️  Setup verification passed with warnings. Review above before proceeding.\n');
    process.exit(0);
  } else {
    console.log('\n✅ Setup verification passed! You are ready to deploy.\n');
    console.log('Next steps:');
    console.log('  1. pnpm install --frozen-lockfile (if not done)');
    console.log('  2. pnpm run build');
    console.log('  3. pnpm --filter admin dev (in terminal 1)');
    console.log('  4. pnpm --filter worker dev (in terminal 2)');
    console.log('  5. Or: git push origin main (for GitHub Actions deployment)\n');
    process.exit(0);
  }
}

runChecks().catch(err => {
  console.error('\n❌ Verification script error:', err.message);
  process.exit(1);
});
