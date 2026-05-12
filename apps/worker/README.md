# AI Links Worker

Production-grade job queue processor using BullMQ and Redis for the AI Links engagement automation engine.

## Features

- **BullMQ Job Queues**: Three specialized queues for posts, comments, and reactions
- **Redis Integration**: High-performance job persistence and coordination
- **Automated Scheduling**: Cron-based schedulers for recurring tasks
- **Error Resilience**: Automatic retries with exponential backoff
- **Kill Switch**: Global automation disable via Firestore policy
- **Structured Logging**: Pino-based JSON logging for production environments
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT signals

## Architecture

### Queues

- **postJobs**: Handles post creation and engagement actions
- **commentJobs**: Manages comment generation and posting
- **reactionJobs**: Processes reaction automation
- **schedulerJobs**: Internal queue for scheduled tasks

### Job Types

- `POST_ACTION`: Directly queued post action
- `COMMENT_ACTION`: Directly queued comment action
- `REACTION_ACTION`: Directly queued reaction action
- `POST_SCHEDULER`: Runs every 30 minutes to queue eligible posts
- `COMMENT_SCHEDULER`: Runs every 20 minutes to find eligible posts for comments
- `REACTION_SCHEDULER`: Runs every 30 minutes to select and queue reactions
- `QUOTA_RESET`: Runs daily at 00:05 UTC to reset quotas

## Installation

1. Install dependencies:
   ```bash
   cd apps/worker
   pnpm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Ensure Redis is running:
   ```bash
   # Option 1: Using Docker
   docker run -d -p 6379:6379 redis:latest

   # Option 2: Using Homebrew (macOS)
   brew services start redis

   # Option 3: Direct Redis server
   redis-server
   ```

## Configuration

### Environment Variables

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account_email

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Worker Settings
WORKER_LOG_LEVEL=info
WORKER_CONCURRENCY=5
TIMEZONE=Asia/Karachi

# Quotas
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100

# Job Retry Configuration
JOB_MAX_ATTEMPTS=3
JOB_BACKOFF_DELAY=1000
```

### Log Levels

- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages only

## Development

Start the worker in development mode with auto-reload:

```bash
pnpm dev
```

## Production

Build for production:

```bash
pnpm build
```

Start the production worker:

```bash
pnpm start
```

## Scheduling Details

### Post Scheduler
- **Interval**: Every 30 minutes
- **Purpose**: Check all active accounts and queue eligible posts based on scheduling rules
- **Time Windows**: Respects account-level time windows and timezone

### Comment Scheduler
- **Interval**: Every 20 minutes
- **Purpose**: Find eligible posts for comment engagement
- **Strategy**: Targets posts matching keyword criteria and engagement thresholds

### Reaction Scheduler
- **Interval**: Every 30 minutes
- **Purpose**: Select and queue reaction actions
- **Logic**: Balances reaction types and targets high-engagement posts

### Quota Reset
- **Time**: 00:05 UTC daily
- **Timezone**: Configurable per account (default: Asia/Karachi)
- **Purpose**: Reset daily quotas for all accounts
- **Note**: Respects account-specific timezone for quota windows

## Job Processing Flow

1. **Scheduler**: Cron job triggers every X minutes/hours
2. **Queue**: Job added to BullMQ queue with retry policy
3. **Worker**: Picks up job from queue based on concurrency limits
4. **Handler**: Executes job (post/comment/reaction action)
5. **Logging**: Action logged to Firestore automationActionLogs collection
6. **Status**: Job marked complete or failed based on outcome
7. **Retry**: Failed jobs automatically retry with exponential backoff

## Global Kill Switch

The worker checks the global automation policy before executing any job:

```typescript
// Firestore path: automationPolicies/global
{
  automationEnabled: boolean,
  globalKillSwitch: boolean,
  quotaCapMultiplier: number
}
```

When `globalKillSwitch` is `true`, all jobs are skipped with a "Kill switch enabled" reason.

## Error Handling

### Job Failures

- **Max Retries**: 3 attempts (configurable)
- **Backoff Strategy**: Exponential (1s, 2s, 4s)
- **Dead Letter**: Failed jobs remain in queue for manual inspection

### Network Errors

- **Firebase Errors**: Logged with full context and stack trace
- **Redis Errors**: Automatic reconnection with exponential backoff
- **Job Processing**: Errors captured and stored in job metadata

## Monitoring

### Queue Metrics

Monitor queue status via the admin dashboard API:

```bash
curl http://localhost:3000/api/queue/status
```

### Job Inspection

View individual job details:

```bash
curl http://localhost:3000/api/queue/jobs/{jobId}
```

### Logs

All worker actions logged to console and Firestore:

```bash
# View in worker console
pnpm dev

# Query Firestore automationActionLogs collection
db.collection('automationActionLogs').where('createdAt', '>=', yesterday).get()
```

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check connection details
redis-cli -h 127.0.0.1 -p 6379
```

### Jobs Not Processing

1. Check worker is running: `ps aux | grep "worker"`
2. Verify Redis connection: `redis-cli keys "*"`
3. Check logs: `pnpm dev` (development) or PM2 logs (production)
4. Verify Firestore credentials are correct
5. Check Firebase rules allow worker reads/writes

### High Memory Usage

- Reduce WORKER_CONCURRENCY
- Reduce number of jobs in queue
- Implement job cleanup with removeOnComplete option

### Slow Job Processing

- Check Redis performance: `redis-cli --latency`
- Check Firestore write latency
- Monitor network connectivity
- Scale horizontally with multiple worker instances

## Production Deployment

See `/infra/deployment-hetzner-hestia.md` for full deployment instructions.

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'ai-links-worker',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

### Health Checks

Worker responds to health checks via HTTP endpoint (future feature):

```bash
curl http://localhost:3001/health
# Returns: { status: 'healthy', uptime: 12345, queues: { ... } }
```

## Contributing

1. Follow the existing code structure
2. Add logging for all major operations
3. Handle errors gracefully with detailed error messages
4. Add retry logic for transient failures
5. Test with both Redis and Firestore

## License

Proprietary - AI Links
