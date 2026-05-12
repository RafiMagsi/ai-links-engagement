# Phase 2 Setup Guide

## Prerequisites

- Node.js 18+
- pnpm 9.0.0+
- Firebase Project with Firestore enabled
- OpenAI API key

## Installation

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example files:

```bash
cp .env.example .env.local
cp apps/worker/.env.example apps/worker/.env.local
```

Update `.env.local` with your Firebase and OpenAI credentials:

```env
# Firebase Configuration (shared)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account_email

# Next.js Admin (client-side Firebase config)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# OpenAI
OPENAI_API_KEY=sk-...

# Worker
WORKER_LOG_LEVEL=info
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100
```

Update `apps/worker/.env.local`:

```env
# Firebase Admin (same as root)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account_email

# OpenAI
OPENAI_API_KEY=sk-...

# Worker Settings
WORKER_LOG_LEVEL=info
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100
```

### 3. Set Up Firestore Collections

In Firebase Console, create these collections:

1. **automationAccounts** - Document ID: random
   - Index on: userId (Ascending), isActive (Ascending)

2. **automationKeywords** - Document ID: {accountId}

3. **automationSchedules** - Document ID: {accountId}

4. **automationJobs** - Document ID: random
   - Index on: accountId (Asc), status (Asc), createdAt (Desc)
   - Index on: status (Asc), priority (Desc), createdAt (Asc)

5. **automationActionLogs** - Document ID: random
   - Index on: accountId (Asc), createdAt (Desc)

6. **automationDailyUsage** - Document ID: {YYYY-MM-DD}

### 4. Build Shared Packages

```bash
pnpm --filter "@ai-links/*" build
```

### 5. Run Development Servers

**Terminal 1 - Admin Dashboard:**
```bash
pnpm --filter admin dev
```
Access at http://localhost:3000

**Terminal 2 - Worker Service:**
```bash
cd apps/worker
pnpm dev
```
Watch for: "Worker started, listening for jobs..."

## Testing the System

### 1. Create an Admin User

In Firebase Console Authentication:
1. Create user with test email (e.g., admin@example.com)
2. Set password

### 2. Log into Admin Dashboard

1. Open http://localhost:3000
2. Click "Sign in with Firebase"
3. Enter your test credentials
4. Should be redirected to /dashboard

### 3. Create an Automation Account

1. Go to Dashboard → Accounts
2. Click "Create Account"
3. Fill in:
   - LinkedIn URL: https://www.linkedin.com/in/yourprofile
   - Daily limits: 30 posts, 50 comments, 20 reactions
   - Timezone: Asia/Karachi
4. Click "Create Account"

### 4. Configure Keywords

(Keywords configuration UI coming in next dashboard update, or use API directly)

**Via API:**
```bash
curl -X POST http://localhost:3000/api/keywords \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "account-id",
    "primaryKeywords": ["AI", "Machine Learning"],
    "secondaryKeywords": ["Technology"],
    "blockedKeywords": [],
    "tonePreset": "professional",
    "allowedIntents": ["knowledge_sharing", "industry_news"]
  }'
```

### 5. Create a Test Job

1. Go to Dashboard → Jobs
2. Select your account
3. Choose job type: "Post Generation"
4. Enter keyword: "AI"
5. Click "Create Job"

### 6. Monitor Execution

**Admin Dashboard:**
- Go to Jobs page
- Watch status change from "pending" → "processing" → "completed"

**Worker Console:**
- Should log: "Processing job..."
- Should log: "Post generated successfully"
- Should log: "Job completed successfully"

### 7. Check Daily Usage

1. Go to Dashboard → Usage
2. Should show:
   - Posts created: 1
   - Posts remaining: 29
   - Total actions: 1
   - Total remaining: 99

## Troubleshooting

### Worker won't start

**Error: "Firebase Admin SDK not initialized"**
- Ensure `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` are set in worker `.env`
- Check private key is properly formatted (should have escaped newlines)

**Error: "OPENAI_API_KEY is required"**
- Add OpenAI key to `apps/worker/.env`

### Jobs not processing

**Check worker is running:**
```bash
# Terminal running worker should show:
# Worker initialized successfully
# Worker started, listening for jobs...
```

**Check job is in Firestore:**
1. Firebase Console → Firestore
2. Collection: automationJobs
3. Document should exist with status="pending"

**Check logs:**
```bash
# Increase log level in worker .env
WORKER_LOG_LEVEL=debug
```

### API Authentication fails

**Error: "Unauthorized" on API calls**
1. Make sure you're sending valid Firebase ID token
2. Token format: `Authorization: Bearer <token>`
3. Test with curl:
```bash
# Get token (from browser console after login)
# firebase.auth().currentUser.getIdToken()

# Test API
curl -X GET http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Firestore permissions denied

**Error: "Missing or insufficient permissions"**
1. Set Firestore rules in Firebase Console:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /automationAccounts/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /automationKeywords/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /automationSchedules/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /automationJobs/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /automationActionLogs/{document=**} {
      allow read: if request.auth != null;
    }
    match /automationDailyUsage/{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

## Development Workflow

### Adding New Features

1. **Update Shared Types** - First update `packages/shared-types/src/index.ts`
2. **Update Worker** - Add logic to `apps/worker/src/lib/`
3. **Update Admin** - Add API endpoints and UI components
4. **Test** - Manual testing in admin dashboard

### Running Type Checks

```bash
pnpm type-check
```

### Running Linting

```bash
pnpm lint
```

## Debugging Tips

### View Worker Logs in Real-Time

```bash
# Terminal 2 (worker)
# Logs appear as jobs are processed
```

### Inspect Firestore Data

Firebase Console → Firestore:
1. Check `automationJobs` for pending jobs
2. Check `automationDailyUsage` for quota tracking
3. Check `automationActionLogs` for audit trail

### Check OpenAI Usage

OpenAI Dashboard → Usage:
1. Verify API key is active
2. Check token usage from generated posts

### Test API Endpoints with Postman

1. Get auth token from Firebase Console (generate custom token)
2. Set up Postman with Bearer token auth
3. Test POST /api/jobs with:
```json
{
  "accountId": "your-account-id",
  "jobType": "post_generation",
  "payload": {
    "keyword": "AI"
  },
  "priority": 10
}
```

## Next Steps

- Phase 3: Implement actual LinkedIn posting/commenting
- Phase 4: Replace Firestore job queue with Redis/BullMQ
- Phase 5: Add scheduling and automatic job triggers
- Phase 6: Analytics and reporting dashboard

## Support

For issues or questions:
1. Check logs in both admin and worker terminals
2. Review Firebase Firestore data
3. Verify all environment variables are set correctly
4. Ensure all collections exist in Firestore
