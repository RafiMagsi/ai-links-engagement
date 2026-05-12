# Phase 2 - POST AUTOMATION Implementation

## Overview

Phase 2 implements the complete post automation system with account management, job processing, and daily quota tracking. This phase includes a Node.js worker service for processing automation jobs and a comprehensive Next.js admin dashboard for managing accounts and monitoring automation activities.

## Architecture

### Apps

#### 1. **Admin Dashboard** (`apps/admin`)
Next.js 14 application for managing automation accounts and monitoring jobs.

**Key Pages:**
- `/dashboard` - Overview with daily usage stats
- `/dashboard/accounts` - Account management (CRUD, settings)
- `/dashboard/jobs` - Job creation and monitoring
- `/dashboard/usage` - Daily quota tracking and history

**Key Components:**
- `AccountList` - Display all automation accounts
- `JobMonitor` - Real-time job status monitoring with filters

#### 2. **Worker Service** (`apps/worker`)
Node.js service for processing automation jobs with OpenAI integration.

**Key Features:**
- Job processor polling every 5 seconds
- Content generation with OpenAI API
- Daily quota enforcement
- Retry logic with exponential backoff
- Comprehensive logging with Pino

### Packages

#### 1. **Shared Types** (`packages/shared-types`)
Extended TypeScript interfaces and enums:
- `AutomationAccount` - Account configuration with daily limits
- `AutomationKeywords` - Keywords, tone, and content intents
- `AutomationSchedule` - Post/comment windows and timing
- `AutomationJob` - Job queue with status and payload
- `DailyUsage` - Quota tracking per day
- `AutomationActionLog` - Audit trail with AI prompts/responses

#### 2. **Firebase Admin SDK** (`packages/firebase-admin`)
Wrapper around Firebase Admin SDK with helper functions for auth and Firestore.

## Firestore Collections

### automationAccounts/{accountUid}
```typescript
{
  id: string;
  userId: string;
  linkedinUrl: string;
  isActive: boolean;
  dailyPostLimit: number;      // Account-level limit
  dailyCommentLimit: number;
  dailyReactionLimit: number;
  timezone: string;
  settings: {
    enableAutoPosting: boolean;
    enableAutoComments: boolean;
    enableAutoReactions: boolean;
    minMinutesBetweenActions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### automationKeywords/{accountUid}
```typescript
{
  id: string;
  accountId: string;
  primaryKeywords: string[];    // Main topics to focus on
  secondaryKeywords: string[];  // Supporting topics
  blockedKeywords: string[];    // Topics to avoid
  tonePreset: TonePreset;       // professional|friendly|educational|inspirational|humorous
  allowedIntents: ContentIntent[]; // Types of content to generate
  createdAt: Date;
  updatedAt: Date;
}
```

### automationSchedules/{accountUid}
```typescript
{
  id: string;
  accountId: string;
  weekdayPostWindow: { startTime: "HH:mm", endTime: "HH:mm", enabled: boolean };
  weekendPostWindow: { startTime: "HH:mm", endTime: "HH:mm", enabled: boolean };
  weekdayCommentWindow: { startTime: "HH:mm", endTime: "HH:mm", enabled: boolean };
  weekendCommentWindow: { startTime: "HH:mm", endTime: "HH:mm", enabled: boolean };
  timezone: string;
  minMinutesBetweenActions: number;
  weekdaysEnabled: boolean[];   // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  createdAt: Date;
  updatedAt: Date;
}
```

### automationJobs/{jobId}
```typescript
{
  id: string;
  accountId: string;
  jobType: JobType;              // post_generation|comment_generation|reaction_action
  status: JobStatus;             // pending|processing|completed|failed|skipped_rate_limited|cancelled
  priority: number;              // 1-10, higher = process first
  payload: {
    keyword?: string;
    theme?: string;
    contentId?: string;
    targetProfileUrl?: string;
    manualTrigger?: boolean;
  };
  result?: {
    generatedContent?: string;
    aiModel?: string;
    tokensUsed?: number;
    publishedUrl?: string;
    error?: string;
  };
  attempts: number;
  maxAttempts: number;
  startedAt?: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### automationActionLogs/{logId}
```typescript
{
  id: string;
  jobId?: string;
  accountId: string;
  actionType: ActionType;
  targetContentId?: string;
  targetProfileUrl?: string;
  success: boolean;
  details?: {
    generatedContent?: string;
    prompt?: string;
    model?: string;
    tokensUsed?: number;
  };
  error?: string;
  createdAt: Date;
}
```

### automationDailyUsage/{yyyy-mm-dd}
```typescript
{
  id: string;                      // Date string YYYY-MM-DD
  date: string;
  postsCreated: number;
  commentsCreated: number;
  reactionsAdded: number;
  totalActions: number;
  quotaPostsRemaining: number;
  quotaCommentsRemaining: number;
  quotaReactionsRemaining: number;
  quotaTotalRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Daily Quota System

### Global Limits (MVP)
- **Posts**: 30 per day
- **Comments**: 50 per day
- **Reactions**: 20 per day
- **Total**: 100 per day

### Quota Engine (`worker/lib/quota-engine.ts`)

**Methods:**
- `initializeQuotaLimits(limits)` - Set global limits at startup
- `getOrCreateDailyUsage()` - Get or initialize today's usage record
- `checkQuota(actionType)` - Check if action can be taken
- `recordAction(actionType)` - Increment usage counter
- `getDailyStatus()` - Get current quota status

### Quota Enforcement

1. Before processing any job, quota is checked
2. If exceeded, job marked as `SKIPPED_RATE_LIMITED`
3. An audit log entry is created
4. Usage is tracked in automationDailyUsage collection
5. Resets daily at midnight UTC

## API Endpoints

### POST /api/accounts
Create a new automation account.

**Request:**
```json
{
  "linkedinUrl": "https://www.linkedin.com/in/profile",
  "dailyPostLimit": 30,
  "dailyCommentLimit": 50,
  "dailyReactionLimit": 20,
  "timezone": "Asia/Karachi",
  "settings": {
    "enableAutoPosting": true,
    "enableAutoComments": true,
    "enableAutoReactions": false,
    "minMinutesBetweenActions": 5
  }
}
```

### GET /api/accounts
List all accounts for current user.

### POST /api/keywords
Configure keywords for an account.

**Request:**
```json
{
  "accountId": "account-id",
  "primaryKeywords": ["AI", "Machine Learning"],
  "secondaryKeywords": ["Tech", "Innovation"],
  "blockedKeywords": ["Spam"],
  "tonePreset": "professional",
  "allowedIntents": ["knowledge_sharing", "industry_news"]
}
```

### GET /api/keywords?accountId=...
Get keywords configuration for an account.

### POST /api/schedules
Configure posting schedules for an account.

**Request:**
```json
{
  "accountId": "account-id",
  "weekdayPostWindow": { "startTime": "09:00", "endTime": "17:00", "enabled": true },
  "weekendPostWindow": { "startTime": "10:00", "endTime": "16:00", "enabled": true },
  "weekdayCommentWindow": { "startTime": "09:00", "endTime": "17:00", "enabled": true },
  "weekendCommentWindow": { "startTime": "10:00", "endTime": "16:00", "enabled": true },
  "timezone": "Asia/Karachi",
  "minMinutesBetweenActions": 5,
  "weekdaysEnabled": [true, true, true, true, true, true, true]
}
```

### GET /api/schedules?accountId=...
Get schedule configuration for an account.

### POST /api/jobs
Create a new automation job (manual trigger).

**Request:**
```json
{
  "accountId": "account-id",
  "jobType": "post_generation",
  "payload": {
    "keyword": "AI",
    "manualTrigger": true
  },
  "priority": 10
}
```

### GET /api/jobs?accountId=...&status=...&limit=50
List jobs with optional filtering.

### POST /api/jobs/{id}
Perform action on a job (retry/cancel).

**Request:**
```json
{
  "action": "retry"  // or "cancel"
}
```

### GET /api/usage?days=7
Get daily quota usage and history.

## Worker Service

### Job Processing Pipeline

1. **Poll** - Every 5 seconds, fetch next pending job
2. **Validate** - Check account exists and is configured
3. **Check Quota** - Verify global quota not exceeded
   - If exceeded: mark as `SKIPPED_RATE_LIMITED` and return
4. **Process** - Based on job type:
   - **POST_GENERATION**: Generate post with content generator
   - **COMMENT_GENERATION**: Generate comment for target post
5. **Validate Result** - Ensure generated content meets criteria
6. **Record Usage** - Update daily quota counters
7. **Update Job** - Mark as completed with result
8. **Log Action** - Create audit trail entry

### Retry Logic

- **Max Attempts**: 3 per job
- **Backoff**: Exponential (1 min, 2 min, 4 min)
- **Auto-retry**: Failed jobs retry automatically
- **Manual Actions**: Admins can force retry via API

### Content Generation (`worker/lib/content-generator.ts`)

**Features:**
- OpenAI GPT-3.5-turbo integration
- Configurable tone and intent
- Input validation with Zod
- Token usage tracking
- Error handling and logging

**Tones Supported:**
- Professional
- Friendly
- Educational
- Inspirational
- Humorous

**Content Intents:**
- Knowledge Sharing
- Question
- Industry News
- Personal Story
- Call to Action

## Environment Variables

### Root `.env.example`
```
# Firebase Configuration (shared)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email
FIREBASE_DATABASE_URL=your_firebase_database_url

# Next.js Admin App
NEXT_PUBLIC_FIREBASE_API_KEY=your_public_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# OpenAI Configuration (shared)
OPENAI_API_KEY=your_openai_api_key

# Admin Settings
NEXT_PUBLIC_ADMIN_EMAIL_DOMAINS=example.com

# Worker Configuration
WORKER_LOG_LEVEL=info
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100
```

### Worker `.env.example`
```
# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email

# Redis Configuration (for future Bull MQ implementation)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Worker Configuration
WORKER_LOG_LEVEL=info
WORKER_CONCURRENCY=5
TIMEZONE=Asia/Karachi

# Daily Quotas
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100

# Job Settings
JOB_MAX_ATTEMPTS=3
JOB_BACKOFF_DELAY=1000
```

## Running the Services

### Admin Dashboard
```bash
cd apps/admin
npm run dev
# Runs on http://localhost:3000
```

### Worker Service
```bash
cd apps/worker
npm run dev
# Starts processing jobs from Firestore
```

## Authentication

All API endpoints require Firebase ID token authentication via the `Authorization: Bearer <token>` header. Token verification happens server-side before any operations.

## Data Flow

1. **Admin creates account** → Stored in `automationAccounts` collection
2. **Admin configures keywords** → Stored in `automationKeywords` collection
3. **Admin creates job** → Stored in `automationJobs` collection with status=pending
4. **Worker polls jobs** → Fetches pending jobs, processes in FIFO order
5. **Worker checks quota** → Validates against `automationDailyUsage`
6. **Worker generates content** → Uses OpenAI API with configured tone/intent
7. **Worker logs action** → Creates audit trail in `automationActionLogs`
8. **Worker updates usage** → Increments `automationDailyUsage` counters
9. **Admin monitors** → Views job status, usage, and quotas in dashboard

## Key Design Decisions

1. **Simple Job Queue** - Using Firestore for MVP instead of Redis/BullMQ (Phase 4)
2. **Global Quotas** - Unified daily limits across all accounts prevents abuse
3. **Async Processing** - Worker polls independently, no real-time job execution
4. **Retry-First** - Automatic exponential backoff for transient failures
5. **Zod Validation** - All inputs validated at API and worker boundaries
6. **Audit Logging** - Complete trail of AI generation for compliance and debugging

## Notes

- Phase 3 will add the actual LinkedIn automation (posting, commenting, reacting)
- Phase 4 will replace the simple Firestore job queue with Redis/BullMQ for better performance
- Scheduler configurations are prepared but not used yet (Phase 3)
- The content generator is integrated but posts aren't published to LinkedIn yet
