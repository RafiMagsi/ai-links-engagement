/**
 * Configuration and Environment Variable Validation
 * Validates all required environment variables at startup
 */

interface Config {
  // Node environment
  nodeEnv: 'development' | 'production' | 'test';

  // Firebase
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };

  // OpenAI
  openai: {
    apiKey: string;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix: string;
  };

  // Worker settings
  worker: {
    concurrency: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    timezone: string;
  };

  // Quotas
  quotas: {
    dailyPostLimit: number;
    dailyCommentLimit: number;
    dailyReactionLimit: number;
    dailyTotalLimit: number;
  };

  // Job settings
  jobs: {
    maxAttempts: number;
    backoffDelay: number;
    maxStalledCount: number;
  };
}

function getEnvVar(name: string, required = true, defaultValue?: string): string {
  const value = process.env[name];

  if (!value) {
    if (required && !defaultValue) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return defaultValue || '';
  }

  return value;
}

function validateFirebaseKey(key: string): void {
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('FIREBASE_PRIVATE_KEY: Invalid format - missing BEGIN marker');
  }
  if (!key.includes('-----END PRIVATE KEY-----')) {
    throw new Error('FIREBASE_PRIVATE_KEY: Invalid format - missing END marker');
  }
}

function validateOpenAIKey(key: string): void {
  if (!key.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY: Invalid format - should start with "sk-"');
  }
  if (key.length < 20) {
    throw new Error('OPENAI_API_KEY: Invalid format - key too short');
  }
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  console.log('🔧 Loading configuration from environment variables...');

  try {
    // Firebase validation
    const firebaseProjectId = getEnvVar('FIREBASE_PROJECT_ID', true);
    const firebasePrivateKey = getEnvVar('FIREBASE_PRIVATE_KEY', true);
    const firebaseClientEmail = getEnvVar('FIREBASE_CLIENT_EMAIL', true);

    validateFirebaseKey(firebasePrivateKey);

    // OpenAI validation
    const openaiApiKey = getEnvVar('OPENAI_API_KEY', true);
    validateOpenAIKey(openaiApiKey);

    // Redis validation
    const redisHost = getEnvVar('REDIS_HOST', false, '127.0.0.1');
    const redisPort = parseInt(getEnvVar('REDIS_PORT', false, '6379'), 10);
    const redisPassword = getEnvVar('REDIS_PASSWORD', false);

    if (isNaN(redisPort) || redisPort < 1 || redisPort > 65535) {
      throw new Error('REDIS_PORT: Invalid port number');
    }

    // Quotas validation
    const dailyPostLimit = parseInt(
      getEnvVar('DAILY_QUOTA_POSTS', false, '30'),
      10
    );
    const dailyCommentLimit = parseInt(
      getEnvVar('DAILY_QUOTA_COMMENTS', false, '50'),
      10
    );
    const dailyReactionLimit = parseInt(
      getEnvVar('DAILY_QUOTA_REACTIONS', false, '20'),
      10
    );
    const dailyTotalLimit = parseInt(
      getEnvVar('DAILY_QUOTA_TOTAL', false, '100'),
      10
    );

    if (dailyPostLimit <= 0 || dailyCommentLimit <= 0 || dailyReactionLimit <= 0) {
      throw new Error('DAILY_QUOTA_*: Values must be greater than 0');
    }

    const sum = dailyPostLimit + dailyCommentLimit + dailyReactionLimit;
    if (sum > dailyTotalLimit) {
      console.warn(
        `⚠️  Warning: Sum of individual quotas (${sum}) exceeds total quota (${dailyTotalLimit})`
      );
    }

    // Worker settings
    const concurrency = parseInt(
      getEnvVar('WORKER_CONCURRENCY', false, '5'),
      10
    );
    const logLevel = (getEnvVar('WORKER_LOG_LEVEL', false, 'info') as
      | 'debug'
      | 'info'
      | 'warn'
      | 'error') || 'info';
    const timezone = getEnvVar('TIMEZONE', false, 'Asia/Karachi');

    // Job settings
    const maxAttempts = parseInt(
      getEnvVar('JOB_MAX_ATTEMPTS', false, '3'),
      10
    );
    const backoffDelay = parseInt(
      getEnvVar('JOB_BACKOFF_DELAY', false, '1000'),
      10
    );

    if (maxAttempts < 1 || maxAttempts > 10) {
      throw new Error('JOB_MAX_ATTEMPTS: Must be between 1 and 10');
    }

    if (backoffDelay < 100 || backoffDelay > 60000) {
      throw new Error('JOB_BACKOFF_DELAY: Must be between 100ms and 60s');
    }

    const config: Config = {
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      firebase: {
        projectId: firebaseProjectId,
        privateKey: firebasePrivateKey,
        clientEmail: firebaseClientEmail,
      },
      openai: {
        apiKey: openaiApiKey,
      },
      redis: {
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        keyPrefix: 'ai-links:',
      },
      worker: {
        concurrency,
        logLevel,
        timezone,
      },
      quotas: {
        dailyPostLimit,
        dailyCommentLimit,
        dailyReactionLimit,
        dailyTotalLimit,
      },
      jobs: {
        maxAttempts,
        backoffDelay,
        maxStalledCount: 2,
      },
    };

    console.log('✅ Configuration loaded successfully\n');
    console.log('Configuration summary:');
    console.log(`  • Firebase Project: ${config.firebase.projectId}`);
    console.log(`  • Redis: ${config.redis.host}:${config.redis.port}`);
    console.log(`  • Worker Concurrency: ${config.worker.concurrency}`);
    console.log(`  • Daily Quota: ${config.quotas.dailyTotalLimit} total`);
    console.log(`    - Posts: ${config.quotas.dailyPostLimit}`);
    console.log(`    - Comments: ${config.quotas.dailyCommentLimit}`);
    console.log(`    - Reactions: ${config.quotas.dailyReactionLimit}`);
    console.log(`  • Timezone: ${config.worker.timezone}`);
    console.log('');

    return config;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Configuration Error:');
    console.error(`   ${message}\n`);
    console.error('Please ensure all required environment variables are set.');
    console.error('See .env.example for required variables.\n');
    process.exit(1);
  }
}

// Export singleton config
let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

/**
 * Validate config is loaded before starting worker
 */
export function ensureConfigLoaded(): void {
  getConfig();
}
