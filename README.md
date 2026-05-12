# AI Links Engagement Automation Engine

A production-grade full-stack automation platform for LinkedIn engagement with advanced job queuing, scheduled processing, global controls, and comprehensive monitoring. Built with Next.js, Node.js, Firebase, Redis, BullMQ, and OpenAI.

**Phase 4 - PRODUCTION RELIABILITY & DEPLOYMENT**: ✅ COMPLETE

**Complete Implementation**: Phases 1-4 | Production Ready

## Quick Start

### Development Setup
```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/worker/.env.example apps/worker/.env.local

# Start Redis (required for Phase 4)
redis-server
# or: docker run -d -p 6379:6379 redis:latest

# Fill in Firebase, OpenAI, and Redis credentials
nano .env.local
nano apps/worker/.env.local
```

### Run Services (Development)
```bash
# Option 1: Start all services
pnpm dev:all

# Option 2: Start individually
# Terminal 1: Admin Dashboard
pnpm --filter admin dev
# http://localhost:3000

# Terminal 2: Worker Service
pnpm --filter worker dev
```

### Production Deployment
```bash
# Build all applications
pnpm build

# Start with PM2
pnpm start

# Monitor services
pnpm logs

# Full deployment documentation: see DEPLOYMENT.md
```

## Project Structure

```
ai-links-engagement/
├── apps/
│   ├── admin/                          # Next.js Admin Dashboard
│   │   ├── app/api/                    # API Routes (6 endpoints)
│   │   └── app/dashboard/              # Dashboard Pages (4 pages)
│   │
│   └── worker/                         # Node.js Job Processor
│       └── src/lib/                    # Core services
│           ├── job-processor.ts
│           ├── quota-engine.ts
│           ├── content-generator.ts
│           └── logger.ts
│
├── packages/
│   ├── shared-types/                   # TypeScript Types & Schemas
│   │   ├── index.ts                    # 10+ interfaces & enums
│   │   └── schemas.ts                  # Zod validation schemas
│   │
│   └── firebase-admin/                 # Firebase Admin Wrapper
│
├── PHASE2.md                           # Architecture Documentation
├── SETUP_PHASE2.md                     # Setup & Troubleshooting
└── IMPLEMENTATION_SUMMARY.md           # Feature Summary
```

## Phase 4 Features (Production Ready)

### Advanced Job Queuing (BullMQ + Redis)
- **Queue System**: Separate queues for posts, comments, reactions
- **Job Scheduling**: Automated cron-based scheduling (every 20-30 minutes)
- **Job Persistence**: Redis-backed job storage with durability
- **Automatic Retries**: Exponential backoff (1s, 2s, 4s)
- **Job Monitoring**: Full job lifecycle tracking and inspection

### Global Kill Switch
- **Instant Disable**: Toggle automation on/off globally
- **Per-Job Enforcement**: Checked before every job execution
- **Audit Logging**: All policy changes logged and traceable
- **Admin Dashboard**: Easy toggle in UI with history

### Automated Scheduling
- **Post Scheduler**: Every 30 minutes
- **Comment Scheduler**: Every 20 minutes
- **Reaction Scheduler**: Every 30 minutes
- **Quota Reset**: Daily at 00:05 UTC (configurable timezone)
- **Cron Patterns**: Fully customizable via environment

### Queue Management API
```
GET    /api/queue/status                 Queue metrics
GET    /api/queue/jobs                   List all jobs (with filtering)
GET    /api/queue/jobs/{id}              Job details
POST   /api/queue/jobs/{id}/retry        Retry failed job
DELETE /api/queue/jobs/{id}              Remove job
POST   /api/policies/global              Update global policy
GET    /api/policies/global              Get global policy
GET    /api/logs                         Audit log viewer
```

### Production Deployment
- **PM2 Management**: Cluster mode, auto-restart, memory limits
- **Nginx Reverse Proxy**: TLS/SSL, load balancing, rate limiting
- **GitHub Actions**: Automated CI/CD with tests and deployment
- **Health Checks**: Automatic verification post-deployment
- **Infrastructure as Code**: Complete deployment automation

### Comprehensive Monitoring
- **Real-time Logs**: PM2 log streaming with filtering
- **Queue Metrics**: Pending, active, completed, failed job counts
- **Performance Stats**: Job duration, success rates, error analysis
- **Audit Trails**: Complete action history with timestamps
- **Health Checks**: System and service status verification

## Key Components

### Job Processor (`apps/worker/src/lib/job-processor.ts`)
- FIFO job queue with priority support
- Automatic retry (max 3 attempts)
- Quota validation before execution
- Status transitions: pending → processing → completed/failed/skipped

### Quota Engine (`apps/worker/src/lib/quota-engine.ts`)
- Daily global quota tracking
- Configurable per-action limits
- Pre-execution quota checks
- Automatic daily reset

### Content Generator (`apps/worker/src/lib/content-generator.ts`)
- OpenAI GPT-3.5-turbo integration
- 5 tone presets (professional, friendly, educational, inspirational, humorous)
- 5 content intents (knowledge sharing, question, industry news, personal story, call to action)
- Zod validation with token tracking

## Firestore Collections

| Collection | Purpose | Indexed Fields |
|-----------|---------|-----------------|
| `automationAccounts` | Account settings & limits | userId, isActive |
| `automationKeywords` | Keywords, tone, intents | accountId |
| `automationSchedules` | Post/comment windows | accountId |
| `automationJobs` | Job queue | accountId, status, priority, createdAt |
| `automationActionLogs` | Audit trail with prompts | accountId, createdAt |
| `automationDailyUsage` | Daily quota tracking | date (YYYY-MM-DD) |

## Authentication

All API endpoints require Firebase ID token:
```bash
curl http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

## Example Usage

### Create Account
```typescript
const response = await fetch('/api/accounts', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    linkedinUrl: 'https://www.linkedin.com/in/profile',
    dailyPostLimit: 30,
    dailyCommentLimit: 50,
    dailyReactionLimit: 20,
    timezone: 'Asia/Karachi'
  })
});
```

### Create & Monitor Job
```typescript
// Create
const job = await fetch('/api/jobs', {
  method: 'POST',
  body: JSON.stringify({
    accountId: 'acc-123',
    jobType: 'post_generation',
    payload: { keyword: 'AI' },
    priority: 10
  })
});

// Monitor
setInterval(async () => {
  const jobs = await fetch('/api/jobs?accountId=acc-123&status=processing');
  // Job status updates in real-time
}, 5000);
```

## Development Workflow

### Add New Feature
1. Update types in `packages/shared-types/src/index.ts`
2. Add Zod schema in `packages/shared-types/src/schemas.ts`
3. Add API endpoint in `apps/admin/app/api/`
4. Add worker logic in `apps/worker/src/lib/`
5. Add UI in `apps/admin/app/dashboard/`

### Type Checking
```bash
pnpm type-check
```

### Linting
```bash
pnpm lint
```

## Documentation

### Phase 4 (Production Deployment)
- **PHASE4_IMPLEMENTATION.md** - Complete Phase 4 feature summary and architecture
- **DEPLOYMENT.md** - Step-by-step production deployment guide (1200+ lines)
- **infra/README.md** - Infrastructure setup for Hetzner HestiaCP (800+ lines)
- **docs/troubleshooting.md** - Comprehensive troubleshooting and debugging guide
- **apps/worker/README.md** - Worker service configuration and scheduling details

### General
- **README.md** (this file) - Quick start and overview
- **.env.example** - Configuration template with all Phase 4 variables
- **ecosystem.config.js** - PM2 production process configuration

## Deployment Ready

- ✓ Full TypeScript with strict mode
- ✓ Zod validation on all inputs
- ✓ Comprehensive error handling
- ✓ Complete audit logging
- ✓ Firestore indexes configured
- ✓ Environment configuration templated
- ✓ Multiple concurrent workers supported

## Technology Stack (Phase 4)

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Admin API** | Next.js API Routes, Firebase Admin SDK |
| **Job Queue** | BullMQ 5.10.0, Redis 4.6.13 |
| **Worker** | Node.js 20, TypeScript, Pino logging |
| **Scheduler** | Node-cron patterns, BullMQ repeatable jobs |
| **Database** | Firestore (Cloud Firestore), Redis (queue) |
| **Authentication** | Firebase Authentication with custom claims |
| **Content Generation** | OpenAI API (GPT-3.5-turbo) |
| **Validation** | Zod schemas |
| **Process Management** | PM2 (cluster mode, auto-restart) |
| **Web Server** | Nginx (reverse proxy, load balancing, TLS) |
| **CI/CD** | GitHub Actions |
| **Logging** | Pino (JSON structured logging) |
| **Package Manager** | pnpm 9.0.0+ |

## Architecture Highlights

### Production-Grade Features
- ✅ **Job Persistence**: Redis-backed queue with durability
- ✅ **Automatic Scheduling**: Cron-based job scheduling
- ✅ **Global Kill Switch**: Instant automation disable
- ✅ **Error Resilience**: Exponential backoff, max 3 retries
- ✅ **Monitoring**: Real-time metrics, logs, and audit trails
- ✅ **Load Balancing**: Nginx + PM2 cluster mode
- ✅ **Security**: TLS/SSL, authentication, authorization
- ✅ **Scalability**: Horizontal scaling ready
- ✅ **Deployment**: Automated CI/CD with GitHub Actions
- ✅ **Documentation**: 3000+ lines of guides and references

### File Structure
```
ai-links-engagement/
├── apps/
│   ├── admin/                    # Next.js 14 admin dashboard
│   │   └── app/api/              # REST API endpoints (7 endpoints)
│   └── worker/                   # Job processor with BullMQ
│       └── src/lib/
│           ├── redis.ts          # Redis client management
│           ├── queue.ts          # BullMQ queue system
│           ├── job-handlers.ts   # Job processors
│           ├── scheduler.ts      # Cron scheduler
│           └── logger.ts         # Pino logging
├── packages/
│   ├── shared-types/             # Shared TypeScript types
│   └── firebase-admin/           # Firebase Admin wrapper
├── infra/                        # Infrastructure setup
├── docs/                         # Documentation
├── ecosystem.config.js           # PM2 configuration
├── DEPLOYMENT.md                 # Deployment guide
└── PHASE4_IMPLEMENTATION.md      # This implementation
```

## What's Next

- **Phase 5** - Advanced Analytics & Reporting
- **Phase 6** - LinkedIn Integration (actual API calls)
- **Phase 7** - Multi-account Management & Team Features
- **Phase 8** - AI Content Optimization & A/B Testing

## License

Proprietary - AI Links
