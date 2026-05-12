# AI Links Transparent AI Auto-Seeding & Engagement Engine
## Hetzner HestiaCP Deployment Plan — Next.js Admin + Node.js Worker + Firebase

---

## 0. Scope and Product Rule

This system is for **transparent, consented, officially-labeled automation** inside AI Links.

It can support:

- Official AI accounts such as `Snow AI`, `AI Links Official`, `AI Builder Daily`, `AI Tool Radar`
- Opted-in managed accounts that are clearly marked as automated/assisted
- Scheduled AI posts
- Scheduled AI comments
- Official AI reactions where the action is explainable
- Daily engagement quotas and rate limiting
- Admin approval/review workflows

It must **not** be used for:

- Fake human users
- Hidden bot profiles pretending to be real people
- Fake social proof
- Random artificial likes/comments from deceptive accounts

The production-safe target is:

```text
Transparent AI seeding + official AI engagement + strict quotas + audit logs
```

---

# 1. System Goal

Build a server-hosted automation panel that lets the admin:

1. View users and official AI accounts from Firebase
2. Select which official/approved accounts may auto-post
3. Configure keywords, themes, posting styles, and schedules per account
4. Generate AI posts automatically
5. Generate AI comments on selected posts
6. Create official likes/reactions where allowed
7. Cap system activity at approximately:

```text
100 total AI engagement actions per day
```

Example daily budget:

```text
40 auto posts
40 comments
20 official reactions / curated likes
```

The quota should be configurable.

---

# 2. Recommended Stack

## 2.1 Recommended Architecture

```text
Next.js Admin Dashboard
+ Node.js API/Worker
+ Firebase Admin SDK
+ Firestore
+ Firebase Authentication custom claims
+ Redis/BullMQ for production queues
+ OpenAI API for content generation
+ Hetzner VPS with HestiaCP
+ Nginx reverse proxy through Hestia custom templates
```

## 2.2 Why this stack

### Next.js
Use for:

- Admin panel UI
- Login-protected dashboard
- Manage official accounts
- Manage keyword sets
- View queue/jobs/logs
- Manual approvals
- Analytics summaries

### Node.js Worker
Use for:

- Scheduled posting jobs
- AI content generation
- Comment generation
- Rate-limit enforcement
- Firebase writes through Admin SDK
- Queue processing
- Retry logic
- Logs and audit trails

### Firebase
Use for:

- Existing app data source
- Profiles
- Posts
- Comments
- Notifications if needed
- Admin authentication/custom claims

### Redis + BullMQ
Recommended for:

- Delayed jobs
- Retry jobs
- Daily quota queues
- Preventing duplicate posting
- Worker reliability

For a tiny MVP, you can initially use `node-cron`, but for deployment quality, BullMQ + Redis is the better architecture.

---

# 3. High-Level Architecture

```text
┌────────────────────────────┐
│      Next.js Admin UI      │
│  /accounts /jobs /logs     │
└──────────────┬─────────────┘
               │ REST / Server Actions
               ▼
┌────────────────────────────┐
│       Node.js API Layer    │
│ Auth checks, CRUD, config  │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│       Firestore Config     │
│ automationAccounts         │
│ automationPolicies         │
│ automationKeywords         │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│      Redis + BullMQ        │
│ postJobs commentJobs       │
│ reactionJobs               │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│        Node Worker         │
│ Generate AI → Validate     │
│ Rate limit → Write Firebase│
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│         Firebase           │
│ profiles posts comments    │
│ logs quota counters        │
└────────────────────────────┘
```

---

# 4. Core Modules

## 4.1 Admin Panel Modules

### A. Dashboard

Show:

```text
Today's scheduled posts
Today's generated comments
Today's reactions
Actions used / remaining from daily quota
Failed jobs
Queued jobs
Recently created AI content
```

### B. Accounts

List:

```text
Official AI accounts
Approved automated accounts
Disabled accounts
```

Per account:

```text
uid
displayName
accountType
automationEnabled
dailyPostLimit
dailyCommentLimit
dailyReactionLimit
status
```

### C. Keyword & Topic Manager

Per account, configure:

```text
Primary keywords
Secondary keywords
Blocked keywords
Post themes
Tone preset
Allowed post intents
Target audience
```

Example:

```text
Account: AI Builder Daily
Keywords:
- AI startup
- Flutter AI app
- SaaS validation
- founders
- product feedback

Tone:
- concise
- practical
- builder-focused
```

### D. Schedule Manager

Configure:

```text
Post windows
Comments windows
Reaction windows
Weekday/weekend behavior
Daily cap
Quiet hours
```

Example:

```text
Snow AI:
- Comments between 09:00–22:00
- Max 15 comments/day
- Minimum 45 minutes between comments

AI Builder Daily:
- Posts at 09:00, 14:00, 20:00
```

### E. Job Queue Monitor

Show:

```text
queued
processing
completed
failed
skipped
rate-limited
```

Actions:

```text
retry failed job
cancel queued job
run now
view generated prompt/output
```

### F. Audit Logs

Every automated action should store:

```text
jobId
actionType
actorUid
targetPostId
targetCommentId
AI prompt snapshot
AI response snapshot
approvedBy
createdAt
status
errorMessage
```

---

# 5. Firestore Collections

## 5.1 automationAccounts

```text
automationAccounts/{accountUid}
```

Example:

```json
{
  "uid": "snow_ai",
  "displayName": "Snow AI",
  "accountType": "official_ai",
  "automationEnabled": true,
  "postingEnabled": true,
  "commentingEnabled": true,
  "reactionEnabled": true,
  "dailyPostLimit": 4,
  "dailyCommentLimit": 15,
  "dailyReactionLimit": 5,
  "requireApprovalBeforePost": false,
  "requireApprovalBeforeComment": false,
  "status": "active",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

---

## 5.2 automationKeywords

```text
automationKeywords/{accountUid}
```

Example:

```json
{
  "accountUid": "snow_ai",
  "primaryKeywords": [
    "AI product feedback",
    "founder validation",
    "startup positioning"
  ],
  "secondaryKeywords": [
    "Flutter",
    "SaaS",
    "automation"
  ],
  "blockedKeywords": [
    "politics",
    "adult",
    "medical diagnosis"
  ],
  "tonePreset": "constructive_mentor",
  "allowedPostIntents": [
    "feedback",
    "question",
    "update"
  ],
  "updatedAt": "serverTimestamp"
}
```

---

## 5.3 automationSchedules

```text
automationSchedules/{accountUid}
```

Example:

```json
{
  "accountUid": "ai_builder_daily",
  "timezone": "Asia/Karachi",
  "postWindows": [
    "09:00",
    "14:00",
    "20:00"
  ],
  "commentWindowStart": "09:00",
  "commentWindowEnd": "22:00",
  "minMinutesBetweenActions": 20,
  "weekdaysEnabled": true,
  "weekendsEnabled": true,
  "updatedAt": "serverTimestamp"
}
```

---

## 5.4 automationDailyUsage

```text
automationDailyUsage/{yyyy-mm-dd}
```

Example:

```json
{
  "date": "2026-05-12",
  "totalAllowed": 100,
  "postsUsed": 32,
  "commentsUsed": 41,
  "reactionsUsed": 16,
  "totalUsed": 89,
  "updatedAt": "serverTimestamp"
}
```

---

## 5.5 automationJobs

```text
automationJobs/{jobId}
```

Example:

```json
{
  "jobId": "job_abc",
  "type": "generate_post",
  "actorUid": "ai_builder_daily",
  "status": "queued",
  "payload": {
    "keyword": "AI startup validation",
    "postIntent": "question"
  },
  "attempts": 0,
  "scheduledFor": "timestamp",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

---

## 5.6 automationActionLogs

```text
automationActionLogs/{logId}
```

Example:

```json
{
  "actionType": "comment",
  "actorUid": "snow_ai",
  "targetPostId": "post_123",
  "generatedText": "Strong idea. Clarify the audience and exact pain point.",
  "aiModel": "gpt-model",
  "status": "completed",
  "createdAt": "serverTimestamp"
}
```

---

# 6. Engagement Types

## 6.1 Automated Posts

Allowed post intents:

```text
update
launch
feedback
hiring
cofounder
question
```

Recommended official AI post types:

```text
Daily builder question
AI tool spotlight
Product feedback prompt
Collaboration prompt
Founder challenge
Useful market insight
```

Example:

```text
What are you building with AI this week, and what is the one blocker slowing you down?
```

---

## 6.2 Automated Comments

Rules:

```text
- Only official/approved accounts
- No duplicate comments
- Do not comment on every post
- Prefer high-value posts
- Add rate limits per actor and globally
- Avoid empty praise
```

Useful comment types:

```text
Constructive feedback
Question that deepens discussion
Launch summary
Suggestion for clarity
Next-step recommendation
```

---

## 6.3 Official Reactions / Likes

Use carefully.

Recommended:

```text
- Official reaction after Snow AI comment
- Curated like by AI Links Picks
- Feature/save action for quality products
```

Do not:

```text
- Like everything automatically
- Create mass "fake popularity"
- Inflate counts randomly
```

Every reaction should have:

```text
actorType: official_ai
isOfficialAction: true
actionReason: curated | feedback_given | spotlight
```

---

# 7. Daily Quota Engine

## 7.1 Global Daily Cap

Set:

```text
100 total actions/day
```

Actions counted:

```text
post = 1
comment = 1
reaction = 1
```

## 7.2 Suggested MVP Allocation

```text
Posts: 30/day
Comments: 50/day
Reactions: 20/day
```

or:

```text
Posts: 20/day
Comments: 60/day
Reactions: 20/day
```

## 7.3 Hard Rules

Before executing any job:

```text
1. Check global daily quota
2. Check per-account daily quota
3. Check per-action quota
4. Check minimum cooldown
5. Check duplicate-content risk
6. Check content safety rules
7. Then execute
```

If quota is exceeded:

```text
status = skipped_rate_limited
```

---

# 8. AI Generation Pipeline

## 8.1 Post Generation

```text
Select account
→ select keyword/theme
→ build AI prompt
→ generate draft
→ validate length / quality
→ optionally require approval
→ create Firestore post
→ write audit log
```

## 8.2 Comment Generation

```text
Fetch target post
→ verify post is eligible
→ build prompt with post context
→ generate concise comment
→ check duplicate / quality
→ create comment
→ optional official reaction
→ log action
```

## 8.3 Prompt Quality Rules

Generated content should:

```text
- be concise
- feel human-readable
- avoid repetitive templates
- stay within platform tone
- not claim personal lived experience
- not pretend to be a real human
```

---

# 9. Recommended Repository Structure

```text
ai-links-automation/
├── apps/
│   ├── admin/                     # Next.js admin panel
│   └── worker/                    # Node.js background worker
├── packages/
│   ├── firebase-admin-client/
│   ├── ai/
│   ├── validation/
│   └── shared-types/
├── infra/
│   ├── hestia/
│   │   ├── nginx-template.tpl
│   │   └── nginx-template.stpl
│   └── pm2/
│       └── ecosystem.config.js
├── docs/
│   ├── deployment-hetzner-hestia.md
│   ├── firestore-schema.md
│   └── automation-policies.md
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

---

# 10. Recommended Tech Choices

## Runtime

Use:

```text
Node.js 24 LTS
```

## Package manager

Recommended:

```text
pnpm
```

## Admin App

```text
Next.js
TypeScript
Tailwind CSS
Firebase Admin verification on server
```

## Worker

```text
Node.js TypeScript
BullMQ
Redis
OpenAI SDK
Firebase Admin SDK
Zod validation
Pino logger
```

---

# 11. Hetzner HestiaCP Deployment Architecture

HestiaCP does not provide first-class Node.js app management out of the box. The clean deployment is:

```text
HestiaCP domain
→ Custom Nginx reverse proxy template
→ local Node/Next app on 127.0.0.1:3000
→ PM2 or systemd keeps process alive
```

## Recommended Ports

```text
Admin Next.js app: 3000
Worker process: no public port
Redis: 6379 local only
```

## Domain example

```text
automation.ailinks.yourdomain.com
```

---

# 12. Server Preparation on Hetzner

## 12.1 Update server

```bash
sudo apt update && sudo apt upgrade -y
```

## 12.2 Install basics

```bash
sudo apt install -y git curl unzip build-essential redis-server
```

## 12.3 Install Node.js 24 LTS

Use a maintained Node installation method appropriate for your Debian/Ubuntu version.

After install:

```bash
node -v
npm -v
```

Expected:

```text
Node 24.x LTS
```

## 12.4 Install pnpm

```bash
npm install -g pnpm
```

## 12.5 Install PM2

```bash
npm install -g pm2
```

## 12.6 Enable Redis

```bash
sudo systemctl enable redis-server
sudo systemctl restart redis-server
sudo systemctl status redis-server
```

---

# 13. App Deployment Path

Example Hestia user:

```text
rafiadmin
```

Example domain:

```text
automation.ailinks.com
```

Recommended project path:

```text
/home/rafiadmin/apps/ai-links-automation
```

Create:

```bash
mkdir -p /home/rafiadmin/apps
cd /home/rafiadmin/apps
git clone YOUR_REPOSITORY_URL ai-links-automation
cd ai-links-automation
pnpm install
```

---

# 14. Environment Variables

Create:

```text
.env
```

or app-specific:

```text
apps/admin/.env.production
apps/worker/.env
```

## Example values

```env
NODE_ENV=production

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# OpenAI
OPENAI_API_KEY=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# App
ADMIN_BASE_URL=https://automation.ailinks.com
DAILY_GLOBAL_ENGAGEMENT_CAP=100
```

Important:

```text
FIREBASE_PRIVATE_KEY must preserve newlines correctly.
```

---

# 15. Build and Start

## 15.1 Build shared packages and apps

```bash
pnpm build
```

or if using workspace scripts:

```bash
pnpm --filter admin build
pnpm --filter worker build
```

## 15.2 Start admin app with PM2

```bash
cd /home/rafiadmin/apps/ai-links-automation
pm2 start "pnpm --filter admin start" --name ai-links-admin
```

## 15.3 Start worker with PM2

```bash
pm2 start "pnpm --filter worker start" --name ai-links-worker
```

## 15.4 Save PM2 startup state

```bash
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`.

## 15.5 Check status

```bash
pm2 status
pm2 logs ai-links-admin
pm2 logs ai-links-worker
```

---

# 16. HestiaCP Reverse Proxy Setup

## 16.1 Create the domain in HestiaCP

Add:

```text
automation.ailinks.com
```

Enable:

```text
SSL
Let's Encrypt
```

## 16.2 Create custom Nginx templates

Template directory:

```text
/usr/local/hestia/data/templates/web/nginx/
```

Create custom files:

```text
node-next-3000.tpl
node-next-3000.stpl
```

The template should proxy:

```text
https://automation.ailinks.com
→ http://127.0.0.1:3000
```

## 16.3 Apply template in Hestia

In domain settings, select your custom Nginx template.

Then rebuild/restart:

```bash
sudo systemctl reload nginx
```

---

# 17. GitHub Deployment Flow

## Recommended CI/CD

Use GitHub Actions to:

```text
1. SSH into Hetzner server
2. Pull latest code
3. Install dependencies
4. Build
5. Restart PM2 apps
```

## Deployment command flow

```bash
cd /home/rafiadmin/apps/ai-links-automation
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 restart ai-links-admin
pm2 restart ai-links-worker
```

---

# 18. Worker Scheduling Strategy

## Recommended production approach

Use:

```text
BullMQ repeatable jobs
```

Examples:

```text
Generate scheduled posts
Run comment selection cycle
Run reaction cycle
Reset daily quota counters
```

## Example schedules

```text
Post scheduler:
Every 30 minutes, evaluate which accounts should post

Comment scheduler:
Every 20 minutes, identify eligible posts

Reaction scheduler:
Every 30 minutes, apply limited official reactions

Quota reset:
Daily at 00:05 Asia/Karachi
```

This is better than fixed hardcoded jobs because the admin panel can configure accounts dynamically.

---

# 19. AI Comment Selection Logic

Before commenting on a post:

```text
- post is active
- post is not deleted
- post is not official AI post unless intentionally allowed
- account has not already commented
- user has not exceeded AI comment visibility quota
- post is related to configured keywords
- comment adds value
```

---

# 20. Admin Controls

## Must-have toggles

```text
Enable/disable posting globally
Enable/disable comments globally
Enable/disable reactions globally
Pause an account
Require review before publishing
Set daily system cap
Set per-account caps
```

## Emergency Kill Switch

Add:

```text
automationPolicies/global
{
  "automationEnabled": false
}
```

Every worker must check this before running jobs.

---

# 21. Security Rules

## Do not let the frontend write automation actions directly

Only the server worker using Firebase Admin SDK should create:

```text
official AI posts
official AI comments
official AI reactions
automation logs
quota records
```

Admin panel calls your Node API/server actions. The browser must never receive Firebase Admin credentials.

## Recommended role gate

Admin dashboard should require:

```text
Firebase Auth + custom claim admin == true
```

---

# 22. Monitoring and Logs

## Minimum monitoring

```text
PM2 logs
Firestore automationActionLogs
Firestore automationJobs
Daily quota usage
Error alerts
```

## Recommended error monitoring

```text
Sentry or similar
```

## Track these metrics

```text
jobs created
jobs completed
jobs failed
actions skipped by quota
posts published
comments published
reactions published
AI API cost estimate
```

---

# 23. Deployment Checklist

```text
[ ] Hetzner server ready
[ ] HestiaCP domain created
[ ] SSL enabled
[ ] Node.js 24 LTS installed
[ ] Redis installed and running
[ ] pnpm installed
[ ] PM2 installed
[ ] Repository cloned
[ ] Environment variables configured
[ ] Firebase Admin credentials configured
[ ] OpenAI API key configured
[ ] Apps built
[ ] Admin app running on port 3000
[ ] Worker running in PM2
[ ] Hestia Nginx reverse proxy applied
[ ] Domain opens Next.js admin panel
[ ] Admin claim login works
[ ] Queue jobs execute
[ ] Firestore writes succeed
[ ] Daily quota protection works
[ ] Kill switch tested
```

---

# 24. MVP Build Order

## Phase 1 — Foundation

```text
- Monorepo setup
- Next.js admin login
- Firebase Admin connection
- Users/accounts list
- Official automation account settings
```

## Phase 2 — Post Automation

```text
- Keyword sets
- Schedule sets
- AI post generation
- Post publishing
- Logs
- Daily cap
```

## Phase 3 — Comments and Official Reactions

```text
- Eligible post selection
- AI comment generation
- Rate limits
- Curated likes/reactions
- Action logs
```

## Phase 4 — Queue + Production Reliability

```text
- Redis + BullMQ
- Retry logic
- Failed job inspection
- Kill switch
- GitHub Actions deployment
```

---

# 25. Final Recommendation

Build this as:

```text
Next.js Admin Dashboard
+ Node.js Worker
+ Firebase Admin SDK
+ Redis/BullMQ
+ Hetzner HestiaCP deployment with Nginx reverse proxy
```

Use the system for:

```text
Transparent official AI seeding
Useful AI comments
Curated official reactions
Controlled daily engagement
```

Not for hidden fake-human engagement.

That version is deployable, defensible, and actually useful.
