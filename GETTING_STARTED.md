# Getting Started Guide

Complete guide to set up, run, and deploy the AI Links automation engine locally and in production.

## 📋 Prerequisites

- **Node.js** v20 LTS or higher
- **pnpm** v9.0.0 or higher (or npm)
- **Redis** 7.0+ (for local development)
- **Firebase** account with Firestore project
- **OpenAI** API account with active billing

## 🚀 Quick Start (5 Minutes)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/ai-links-engagement.git
cd ai-links-engagement
pnpm install
```

### 2. Configure Environment
```bash
# Copy example files
cp .env.example .env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/worker/.env.example apps/worker/.env.local

# Edit .env.local with your credentials
nano .env.local
```

Add these values:
```env
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@...iam.gserviceaccount.com
OPENAI_API_KEY=sk-...
```

### 3. Start Redis (if not running)
```bash
# macOS with Homebrew
brew services start redis

# Or start manually
redis-server

# Verify
redis-cli ping  # Should return PONG
```

### 4. Verify Setup
```bash
pnpm run verify-setup
# This will check all requirements and configurations
```

### 5. Start Local Development
```bash
# Terminal 1: Admin Dashboard
pnpm --filter admin dev
# Opens at http://localhost:3000

# Terminal 2: Worker
pnpm --filter worker dev
# Processes jobs from Firestore
```

### 6. Login & Test
1. Go to http://localhost:3000
2. Login with Firebase admin credentials
3. Create a test automation account
4. Configure keywords and schedule
5. Watch worker process jobs in Terminal 2

---

## 📝 Project Structure

```
ai-links-engagement/
├── apps/
│   ├── admin/              # Next.js admin dashboard
│   │   ├── app/
│   │   │   ├── login/      # Firebase login page
│   │   │   ├── dashboard/  # Admin pages (accounts, jobs, comments, etc)
│   │   │   └── api/        # 20 API endpoints
│   │   └── lib/            # Auth context, Firebase config
│   └── worker/             # Node.js background processor
│       ├── src/lib/        # Core logic (queues, scheduler, jobs)
│       └── src/index.ts    # Worker entry point
├── packages/
│   ├── firebase-admin/     # Firebase Admin SDK wrapper
│   └── shared-types/       # Shared TypeScript types
├── scripts/
│   └── verify-setup.ts     # Setup verification script
├── docs/                   # Documentation
├── ecosystem.config.js     # PM2 configuration
├── pnpm-workspace.yaml     # Workspace config
└── README.md              # Project overview
```

---

## 🔧 Development Commands

### Build
```bash
# Build everything
pnpm run build

# Build specific app
pnpm --filter admin build
pnpm --filter worker build
```

### Development
```bash
# Watch and rebuild
pnpm --filter admin dev
pnpm --filter worker dev

# Or start both (from root, requires tmux)
pnpm run dev
```

### Testing
```bash
# Verify setup
pnpm run verify-setup

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Database/Cache
```bash
# Start Redis locally
redis-server

# Connect to Redis CLI
redis-cli

# Check Redis status
redis-cli ping
```

---

## 🔑 Getting Firebase Credentials

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable Firestore Database

### Step 2: Create Service Account
1. Click ⚙️ **Settings** → **Project settings**
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file securely

### Step 3: Extract Credentials
Open the JSON file and find:
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep newlines as `\n`)
- `client_email` → `FIREBASE_CLIENT_EMAIL`

### Step 4: Set Custom Claims
To make your user an admin, set custom claims:

```bash
# Option 1: Firebase Console
# You can use Firebase Admin SDK to set claims

# Option 2: Firebase CLI
firebase login
firebase shell
# Then in the shell:
admin.auth().setCustomUserClaims('YOUR_USER_UID', { admin: true })
```

---

## 🤖 Getting OpenAI API Key

1. Go to https://platform.openai.com
2. Sign in to your account
3. Click **API keys** in the left menu
4. Click **Create new secret key**
5. Copy and paste into `OPENAI_API_KEY`

**Note:** Each key is shown only once. If you lose it, generate a new one.

---

## 📊 Understanding the Architecture

### Admin Dashboard (Next.js)
- **Port:** 3000
- **Purpose:** Manage automation accounts, configurations, and monitor jobs
- **Auth:** Firebase custom claims (admin flag)
- **Pages:**
  - Dashboard: Overview with daily quota
  - Accounts: Create and manage automation accounts
  - Keywords: Configure keywords and tone per account
  - Schedules: Set post/comment timing
  - Jobs: Monitor and control job queue
  - Comments/Reactions: Manage approval workflows

### Worker (Node.js)
- **Purpose:** Background job processor
- **Runs:** Scheduled jobs for posts, comments, reactions
- **Uses:** Redis + BullMQ for job queuing
- **Integrates:** Firebase (read/write), OpenAI (content generation)

### Data Storage (Firestore)
- **Collections:**
  - `automationAccounts` - Account settings
  - `automationKeywords` - Keywords per account
  - `automationSchedules` - Timing configuration
  - `automationJobs` - Job queue
  - `automationActionLogs` - Audit trail
  - `automationDailyUsage` - Quota tracking

### Job Queue (Redis + BullMQ)
- **Queues:**
  - `posts` - Post generation jobs
  - `comments` - Comment generation jobs
  - `reactions` - Reaction generation jobs
  - `scheduler` - Scheduler jobs

---

## 🐛 Troubleshooting

### Admin Won't Load
```bash
# Check if Next.js dev server is running
curl http://localhost:3000

# Check logs for errors
# Terminal running "pnpm --filter admin dev" should show errors

# Common issues:
# 1. Firebase config not found
# 2. Missing environment variables
# 3. Port 3000 already in use
```

### Worker Won't Start
```bash
# Run verification
pnpm run verify-setup

# Check Redis is running
redis-cli ping  # Should return PONG

# Check Firebase credentials
# Private key must have valid format with newlines

# Check logs
# Terminal running "pnpm --filter worker dev" should show errors
```

### Redis Connection Fails
```bash
# Verify Redis is running
ps aux | grep redis

# Start Redis if stopped
redis-server

# Check connection
redis-cli ping

# Test with password (if set)
redis-cli -a YOUR_PASSWORD ping
```

### Firebase Auth Fails
```bash
# Verify credentials in .env files
cat .env.local | grep FIREBASE

# Check Firebase project is active
# Go to Firebase Console and verify project settings

# Check Firestore is enabled
# Go to Firebase Console → Firestore → Create Database
```

### OpenAI API Fails
```bash
# Verify API key is correct
# Should start with "sk-"

# Check API key has billing enabled
# Go to https://platform.openai.com/account/billing/limits

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY" | head -20
```

---

## 🌐 Environment Variables Reference

### Required
```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com

# OpenAI
OPENAI_API_KEY=sk-...

# App
NODE_ENV=development
```

### Optional (with defaults)
```env
# Redis (defaults: localhost:6379)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Admin
ADMIN_BASE_URL=http://localhost:3000

# Quotas (defaults shown)
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100

# Worker
WORKER_LOG_LEVEL=info
WORKER_CONCURRENCY=5
TIMEZONE=Asia/Karachi

# Jobs
JOB_MAX_ATTEMPTS=3
JOB_BACKOFF_DELAY=1000
```

---

## 🚀 Deploying to Production

See [GITHUB_DEPLOYMENT_SETUP.md](GITHUB_DEPLOYMENT_SETUP.md) for complete deployment instructions.

**Quick Summary:**
1. Add 8 GitHub secrets
2. Generate SSH key for deployment
3. Push to main branch
4. GitHub Actions handles the rest

---

## 📚 Documentation

- **[README.md](README.md)** - Project overview
- **[DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)** - What's implemented
- **[GITHUB_DEPLOYMENT_SETUP.md](GITHUB_DEPLOYMENT_SETUP.md)** - Deploy to production
- **[QUICK_DEPLOY_STEPS.md](QUICK_DEPLOY_STEPS.md)** - Fast deployment reference
- **[PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md)** - Verification checklist
- **[docs/troubleshooting.md](docs/troubleshooting.md)** - Common issues & fixes

---

## 📞 Getting Help

1. **Check logs:**
   ```bash
   pm2 logs        # All logs
   pm2 logs admin  # Admin logs
   pm2 logs worker # Worker logs
   ```

2. **Run verification:**
   ```bash
   pnpm run verify-setup
   ```

3. **Check documentation:**
   - See relevant doc file listed above
   - Search for your error in `docs/troubleshooting.md`

4. **Review code comments:**
   - Implementation details are documented in code
   - Check `packages/shared-types/src` for types
   - Check `apps/worker/src/lib` for worker logic

---

## ✅ What's Next?

After getting started locally:
1. Explore the admin dashboard
2. Create an automation account
3. Configure keywords and schedules
4. Watch the worker process jobs
5. Check audit logs
6. Test the approval workflows
7. When ready, follow deployment guide for production

Enjoy! 🎉
