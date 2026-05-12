# Pre-Deployment Checklist

Complete verification before deploying to production.

## ✅ Local Development Verification

### 1. Dependencies & Build
- [ ] Run `pnpm install --frozen-lockfile` (should complete without errors)
- [ ] Run `pnpm run build` (both admin and worker build successfully)
- [ ] Run `pnpm type-check` (no TypeScript errors)
- [ ] Verify `pnpm-lock.yaml` exists and is committed

### 2. Environment Configuration
- [ ] Copy `.env.example` → `.env.local` 
- [ ] Copy `apps/admin/.env.example` → `apps/admin/.env.local`
- [ ] Copy `apps/worker/.env.example` → `apps/worker/.env.local`
- [ ] All environment variables are filled with valid values
- [ ] No secrets committed to git (check `.gitignore`)

### 3. Firebase Setup
- [ ] Firebase project created in console
- [ ] Service account JSON downloaded and credentials extracted:
  - [ ] `FIREBASE_PROJECT_ID` obtained
  - [ ] `FIREBASE_PRIVATE_KEY` obtained (with proper newlines)
  - [ ] `FIREBASE_CLIENT_EMAIL` obtained
- [ ] Firebase Admin SDK can authenticate (test locally)
- [ ] Firestore database created
- [ ] Security rules are prepared (not deployed yet)

### 4. OpenAI Configuration
- [ ] OpenAI API key obtained (starts with `sk-`)
- [ ] API key is valid and has sufficient quota
- [ ] Billing method is set up
- [ ] Test API call succeeds locally

### 5. Redis Setup (Local)
- [ ] Redis installed locally (`redis-cli --version`)
- [ ] Redis server running (`redis-cli ping` returns PONG)
- [ ] Redis accessible on configured host:port
- [ ] If using password, verify it's correct

### 6. Local Testing
- [ ] Terminal 1: `pnpm --filter admin dev` works (admin on :3000)
- [ ] Terminal 2: `pnpm --filter worker dev` works (worker starts)
- [ ] Admin dashboard loads at `http://localhost:3000`
- [ ] Login works with test Firebase user
- [ ] Worker processes jobs from Firestore
- [ ] API endpoints respond correctly

### 7. Code Quality
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No console errors in admin dashboard
- [ ] No console errors in worker logs
- [ ] All imports resolve correctly
- [ ] No hardcoded secrets in code

---

## 🔧 Server Preparation

### 1. Server Requirements
- [ ] Server is Ubuntu 22.04 LTS or Debian 12
- [ ] Server has minimum 4GB RAM, 2 vCPU recommended
- [ ] SSH access is working
- [ ] Internet connectivity is verified

### 2. System Software
- [ ] Node.js v20 LTS installed (`node --version` returns v20.x)
- [ ] npm is working (`npm --version`)
- [ ] pnpm v9+ installed (`pnpm --version` returns 9.x+)
- [ ] PM2 installed globally (`pm2 --version`)
- [ ] Redis installed and running (`redis-cli ping` returns PONG)
- [ ] Nginx installed (`nginx -v`)

### 3. Server Directories
- [ ] Create deployment directory: `/home/rafiadmin/web/ailinksengagement.dropticks.com/public_html`
- [ ] Create logs directory: `.../public_html/logs`
- [ ] Create backups directory: `.../public_html/backups`
- [ ] Set correct permissions: `chmod 755` on public_html
- [ ] Verify write access: can create files in these directories

### 4. Redis Configuration
- [ ] Redis is running as a service (`sudo systemctl status redis-server`)
- [ ] Redis password is set in `/etc/redis/redis.conf` (requirepass)
- [ ] Redis persistence enabled (AOF or RDB)
- [ ] Redis can be accessed from application: `redis-cli -a PASSWORD ping`
- [ ] Memory limit is set appropriately: `maxmemory 512mb`
- [ ] Memory policy configured: `maxmemory-policy allkeys-lru`

### 5. SSH Keys for Deployment
- [ ] SSH key pair generated on server: `ssh-keygen -t ed25519 -f ~/.ssh/github-deploy`
- [ ] Public key added to `~/.ssh/authorized_keys`
- [ ] Private key secured (permissions 600)
- [ ] Verify SSH works from outside: `ssh -i ~/.ssh/github-deploy rafiadmin@server`

### 6. Nginx Configuration
- [ ] Create Nginx config at `/etc/nginx/sites-available/automation`
- [ ] Config proxies to `http://127.0.0.1:3000`
- [ ] SSL certificates are ready (or Certbot installed)
- [ ] Nginx config is tested: `sudo nginx -t`
- [ ] Nginx is reloaded: `sudo systemctl reload nginx`
- [ ] Nginx is enabled on boot: `sudo systemctl enable nginx`

---

## 🔐 GitHub Repository Setup

### 1. GitHub Configuration
- [ ] Repository is public or private (as desired)
- [ ] `.git/config` has correct remote URL
- [ ] `main` branch is protected (require PR reviews for production)
- [ ] Branch protection rules are set

### 2. GitHub Secrets (8 Required)
Go to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these exact secrets:
- [ ] `DEPLOY_HOST` = your-server-ip-or-domain
- [ ] `DEPLOY_SSH_KEY` = (full content of `~/.ssh/github-deploy`)
- [ ] `DEPLOY_PORT` = 22 (or your custom SSH port)
- [ ] `FIREBASE_PROJECT_ID` = your-firebase-project
- [ ] `FIREBASE_PRIVATE_KEY` = (full private key with newlines)
- [ ] `FIREBASE_CLIENT_EMAIL` = firebase-adminsdk@...
- [ ] `OPENAI_API_KEY` = sk-...
- [ ] `REDIS_PASSWORD` = your-redis-password

### 3. Verify Secrets
- [ ] Each secret is set to the correct value
- [ ] Secrets are not visible after clicking "Done"
- [ ] Try accessing a secret to verify it exists

---

## 📋 Application Configuration

### 1. Firebase Security Rules
- [ ] Security rules file prepared: `firestore.rules`
- [ ] Rules allow admin writes
- [ ] Rules restrict public access
- [ ] Indexes prepared: `firestore.indexes.json`
- [ ] Ready to deploy (but not deployed yet)

### 2. Firestore Collections
- [ ] Database exists and is accessible
- [ ] Verify collections can be created from code:
  - [ ] `automationAccounts`
  - [ ] `automationKeywords`
  - [ ] `automationSchedules`
  - [ ] `automationJobs`
  - [ ] `automationActionLogs`
  - [ ] `automationDailyUsage`

### 3. Admin User Setup
- [ ] Create a test user in Firebase Authentication
- [ ] Set custom claim `admin: true` using Firebase Admin SDK:
  ```bash
  firebase shell
  # Or via Cloud Functions/custom script
  admin.auth().setCustomUserClaims('user-uid', { admin: true })
  ```
- [ ] Verify custom claim is set correctly

### 4. Environment Variables Review
- [ ] All required vars are defined
- [ ] No staging/test values in production config
- [ ] API keys are for production services
- [ ] Database is production Firestore project
- [ ] Redis credentials are correct

---

## 🚀 Deployment Process

### 1. Pre-Deployment
- [ ] Back up any existing data on server
- [ ] Verify all checklist items above are complete
- [ ] Team is aware of deployment window
- [ ] Rollback plan is documented

### 2. Execute Deployment
```bash
# Generate lockfile if not done
pnpm install

# Commit all changes
git add .
git commit -m "Pre-deployment verification complete"

# Push to main branch
git push origin main

# OR manually trigger GitHub Actions:
# Go to Actions tab → "Deploy to HestiaCP Production" → Run workflow
```

### 3. Monitor Deployment
- [ ] Watch GitHub Actions workflow in real-time
- [ ] Check logs for any errors
- [ ] SSH to server: `ssh rafiadmin@server`
- [ ] Monitor PM2 logs: `pm2 logs`
- [ ] Wait for health checks to pass

### 4. Post-Deployment Verification
- [ ] Admin dashboard loads: `https://ailinksengagement.dropticks.com`
- [ ] Can login with admin credentials
- [ ] PM2 shows both processes running: `pm2 list`
  - [ ] `admin` is online
  - [ ] `worker` is online
- [ ] No errors in `pm2 logs`
- [ ] Redis is accessible: `redis-cli ping`
- [ ] API health check passes: `curl https://ailinksengagement.dropticks.com/api/health`

### 5. Functional Testing
- [ ] Create a test automation account in admin panel
- [ ] Configure keywords for the test account
- [ ] Set up a schedule
- [ ] Manually trigger a post generation job
- [ ] Verify job is queued in BullMQ
- [ ] Check that job execution creates audit logs
- [ ] Verify quota is tracked correctly

---

## 🆘 Rollback Procedure

If deployment fails or issues are found:

```bash
# SSH into server
ssh rafiadmin@server

# Go to app directory
cd /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html

# Stop current processes
pm2 delete ecosystem.config.js

# Find previous working commit
git log --oneline | head -5

# Rollback to previous commit
git reset --hard COMMIT_HASH

# Rebuild
pnpm install --frozen-lockfile
pnpm run build

# Restart
pm2 start ecosystem.config.js
pm2 save

# Verify
pm2 logs
```

---

## 📊 Final Checklist Summary

### Critical (Must Complete)
- [ ] Dependencies build locally without errors
- [ ] All 8 GitHub secrets are configured
- [ ] Firebase credentials are valid
- [ ] OpenAI API key works
- [ ] Redis is running on server
- [ ] Nginx reverse proxy is configured
- [ ] SSH key is in GitHub secrets
- [ ] pnpm-lock.yaml is committed

### Important (Should Complete)
- [ ] Local testing passes (admin + worker)
- [ ] Server meets minimum requirements
- [ ] Admin user has `admin: true` custom claim
- [ ] All environment variables are correct
- [ ] Security rules are prepared
- [ ] Firestore indexes are ready

### Nice-to-Have (Recommended)
- [ ] Rollback procedure is tested
- [ ] Monitoring/alerts are set up
- [ ] Team communication is established
- [ ] Deployment window is scheduled

---

## ✅ Sign-Off

- [ ] All critical items checked
- [ ] All important items checked
- [ ] No blockers remain
- [ ] **Ready to deploy**

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Approval:** ___________

---

## 📞 Support

If you hit issues during deployment:

1. Check the detailed guides:
   - `GITHUB_DEPLOYMENT_SETUP.md` - Complete setup guide
   - `QUICK_DEPLOY_STEPS.md` - Fast reference
   - `docs/troubleshooting.md` - Common issues

2. SSH into server and check logs:
   ```bash
   pm2 logs              # Real-time logs
   pm2 list              # Check processes
   pm2 logs --lines 100  # Last 100 lines
   ```

3. Check Nginx:
   ```bash
   sudo nginx -t         # Test config
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/error.log
   ```

4. Check Redis:
   ```bash
   redis-cli ping
   redis-cli -a PASSWORD PING
   redis-cli INFO        # Full Redis info
   ```
