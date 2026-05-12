# AI Links Deployment Guide

Complete step-by-step guide for deploying the AI Links engagement automation engine to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Testing](#local-testing)
3. [Production Build](#production-build)
4. [Server Setup](#server-setup)
5. [Application Deployment](#application-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Monitoring Setup](#monitoring-setup)

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All environment variables are configured
- [ ] Firestore database is initialized
- [ ] Redis server is running and accessible
- [ ] SSL certificates are ready
- [ ] Domain is registered and DNS configured
- [ ] Backup of current production (if updating)
- [ ] Database migrations reviewed
- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Rollback plan documented

## Local Testing

### 1. Install All Dependencies

```bash
cd /path/to/ai-links-engagement
pnpm install
```

### 2. Setup Environment Variables

Create `.env.local` files:

```bash
# Root level
cp .env.example .env.local
nano .env.local

# Admin app
cp apps/admin/.env.example apps/admin/.env.local
nano apps/admin/.env.local

# Worker
cp apps/worker/.env.example apps/worker/.env.local
nano apps/worker/.env.local
```

### 3. Start Redis Locally

```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or using local installation
redis-server

# Verify connection
redis-cli ping
# Should return: PONG
```

### 4. Run Development Environment

Terminal 1 - Admin dashboard:
```bash
pnpm --filter admin dev
# Available at http://localhost:3000
```

Terminal 2 - Worker:
```bash
pnpm --filter worker dev
# Processes jobs from queue
```

### 5. Test Key Features

```bash
# Test queue operations
curl -X GET http://localhost:3000/api/queue/status

# Test global policies
curl -X GET http://localhost:3000/api/policies/global

# Test logs
curl -X GET http://localhost:3000/api/logs
```

### 6. Run Type Checking

```bash
pnpm type-check
```

## Production Build

### 1. Build All Applications

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build for production
pnpm run build

# Or build individually
pnpm --filter admin build
pnpm --filter worker build
```

### 2. Verify Build Artifacts

```bash
# Check build outputs
ls -la apps/admin/.next
ls -la apps/worker/dist

# File size check (should be reasonable)
du -sh apps/admin/.next apps/worker/dist
```

### 3. Create Production Archive

```bash
# Create tarball for deployment
tar -czf ai-links-production.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  --exclude=.env.local \
  --exclude=.next/cache \
  .

# Verify archive
tar -tzf ai-links-production.tar.gz | head -20
```

## Server Setup

Follow the complete setup guide in `/infra/README.md`:

1. System update and security patches
2. Node.js and pnpm installation
3. Redis installation and configuration
4. Nginx installation and configuration
5. SSL certificate setup (Let's Encrypt)
6. Firewall configuration

### Quick Setup Script

```bash
#!/bin/bash
set -e

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git build-essential

# Install Node.js
curl https://get.volta.sh | bash
volta install node@20 pnpm@9.0.0

# Install Redis
curl https://packages.redis.io/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/redis-archive-keyring.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update && sudo apt install -y redis

# Install Nginx
sudo apt install -y nginx

# Setup directories
mkdir -p /opt/ai-links-engagement/logs
chmod 755 /opt/ai-links-engagement

echo "Server setup complete!"
```

## Application Deployment

### 1. Clone or Upload Application

```bash
# Option A: Clone from git
cd /opt
sudo git clone https://github.com/yourusername/ai-links-engagement.git
sudo chown -R $USER:$USER ai-links-engagement

# Option B: Upload production archive
tar -xzf ai-links-production.tar.gz -C /opt/ai-links-engagement
```

### 2. Install Dependencies

```bash
cd /opt/ai-links-engagement
pnpm install --frozen-lockfile

# Verify installation
node --version
pnpm --version
```

### 3. Configure Environment Variables

Create `/opt/ai-links-engagement/.env.local`:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="your_private_key_here"
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project_id.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com

# Admin App
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_ADMIN_EMAIL_DOMAINS=yourdomain.com

# OpenAI
OPENAI_API_KEY=sk-your_api_key_here
```

Create `/opt/ai-links-engagement/apps/worker/.env.local`:

```env
# Firebase (same as root)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="your_private_key_here"
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project_id.iam.gserviceaccount.com

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# OpenAI
OPENAI_API_KEY=sk-your_api_key_here

# Worker Settings
WORKER_LOG_LEVEL=info
WORKER_CONCURRENCY=5
TIMEZONE=Asia/Karachi

# Quotas
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100

# Job Settings
JOB_MAX_ATTEMPTS=3
JOB_BACKOFF_DELAY=1000
```

### 4. Build Production Assets

```bash
cd /opt/ai-links-engagement
pnpm run build

# Verify builds
ls -la apps/admin/.next
ls -la apps/worker/dist
```

### 5. Setup PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/home/$USER/.nvm/versions/node/v20.x.x/bin pm2 startup systemd -u $USER --hp /home/$USER

# Copy ecosystem config
cp /opt/ai-links-engagement/ecosystem.config.js ~/.config/pm2/
```

### 6. Start Services

```bash
cd /opt/ai-links-engagement

# Start applications
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Verify services started
pm2 list
pm2 logs
```

### 7. Configure Nginx

```bash
# Copy Nginx configuration
sudo cp /opt/ai-links-engagement/infra/nginx-config.conf /etc/nginx/sites-available/ai-links

# Update domain in config
sudo sed -i 's/yourdomain.com/your_actual_domain.com/g' /etc/nginx/sites-available/ai-links

# Enable site
sudo ln -s /etc/nginx/sites-available/ai-links /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 8. Setup SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check if services are running
pm2 list

# Verify admin is accessible
curl -I https://yourdomain.com

# Should return: HTTP/2 200 OK
```

### 2. API Endpoints

```bash
# Test authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Test queue status
curl -X GET https://yourdomain.com/api/queue/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test policies
curl -X GET https://yourdomain.com/api/policies/global \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Worker Status

```bash
# Check worker logs
pm2 logs ai-links-worker

# Verify Redis connection
redis-cli -a your_password ping
# Should return: PONG

# Check queue status
redis-cli -a your_password KEYS "*"
```

### 4. Database Connection

```bash
# Verify Firestore is accessible
# Check Firebase Console for automationActionLogs collection

# Test a sample write
firebase shell
db.collection('test').add({timestamp: new Date()})
```

### 5. SSL Certificate

```bash
# Verify certificate
sudo certbot certificates

# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | grep -A 2 "Not Before\|Not After"
```

## Monitoring Post-Deployment

### 1. Setup Log Rotation

Create `/etc/logrotate.d/ai-links`:

```
/opt/ai-links-engagement/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reload all > /dev/null 2>&1 || true
    endscript
}
```

### 2. Monitor System Resources

```bash
# Install and run htop
sudo apt install -y htop
htop

# Or use top
top
```

### 3. Setup Application Monitoring

```bash
# View real-time logs
pm2 logs

# Monitor specific service
pm2 monit

# View historical logs
pm2 logs --lines 100
```

## Rollback Procedure

### If Issues Occur

#### Option 1: Restart Services

```bash
# Restart just the affected service
pm2 restart ai-links-worker

# Or restart all
pm2 restart all
```

#### Option 2: Restore Previous Version

```bash
# Stop services
pm2 stop all

# Restore from backup (assuming you backed up old code)
cd /opt/ai-links-engagement
git checkout previous-stable-version

# Rebuild
pnpm install --frozen-lockfile
pnpm run build

# Restart
pm2 start ecosystem.config.js
```

#### Option 3: Full Rollback

```bash
# Check git history
cd /opt/ai-links-engagement
git log --oneline

# Checkout previous commit
git checkout <previous-commit-hash>

# Reinstall and rebuild
pnpm install --frozen-lockfile
pnpm run build

# Restart services
pm2 restart all
```

### Verify Rollback Success

```bash
# Check services
pm2 list

# Verify endpoints
curl https://yourdomain.com/api/queue/status

# Check logs for errors
pm2 logs
```

## Continuous Deployment (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/ai-links-engagement
            git pull origin main
            pnpm install --frozen-lockfile
            pnpm run build
            pm2 restart all
            pm2 save
```

## Troubleshooting Deployment

### Services Won't Start

```bash
# Check logs
pm2 logs

# Check environment variables
cat .env.local

# Verify Redis connection
redis-cli -a your_password ping

# Check Node.js version
node --version
```

### High Memory Usage

```bash
# Check memory usage
ps aux | grep node

# Increase max-old-space-size
# Edit ecosystem.config.js and increase max_memory_restart

# Restart services
pm2 restart all
```

### Nginx Not Forwarding

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Verify PM2 services running on port 3000
lsof -i :3000
```

### Database Connection Issues

```bash
# Verify Firestore credentials
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_CLIENT_EMAIL

# Test with Firebase CLI
firebase auth:export users.json

# Check Firestore rules
firebase firestore:indexes
```

## Maintenance Tasks

### Weekly

- [ ] Monitor PM2 logs for errors
- [ ] Check disk space usage
- [ ] Review Redis memory usage
- [ ] Check Nginx error logs

### Monthly

- [ ] Update system packages
- [ ] Review and archive old logs
- [ ] Check Firestore quota usage
- [ ] Test backup restoration

### Quarterly

- [ ] Update Node.js and dependencies
- [ ] Review security headers
- [ ] Test disaster recovery procedure
- [ ] Review and update deployment documentation

## Performance Optimization

### Node.js Tuning

Update `ecosystem.config.js`:

```javascript
{
  max_memory_restart: '500M',
  NODE_OPTIONS: '--max-old-space-size=512 --enable-source-maps',
  instances: 'max',
  exec_mode: 'cluster'
}
```

### Redis Tuning

Edit `/etc/redis/redis.conf`:

```conf
maxmemory 512mb
maxmemory-policy allkeys-lru
tcp-backlog 511
timeout 0
```

### Database Optimization

- Create Firestore indexes for frequently queried fields
- Archive old action logs to separate collection
- Use batched writes for bulk operations

## Security Checklist

- [ ] All environment variables secured in secrets
- [ ] Firestore rules restrict access appropriately
- [ ] Redis password set and strong
- [ ] SSH key-based authentication enabled
- [ ] Fail2Ban configured for brute-force protection
- [ ] Regular security updates applied
- [ ] SSL/TLS certificates valid and auto-renewing
- [ ] Backups encrypted and tested

## Support and Documentation

For detailed information:
- Infrastructure setup: `/infra/README.md`
- Worker configuration: `/apps/worker/README.md`
- Troubleshooting: `/docs/troubleshooting.md`
- Architecture: `/README.md`

## Rollout Plan

### Phase 1: Pre-Deployment
- Code review and testing
- Environment preparation
- Team notification

### Phase 2: Deployment
- Deploy to staging (if available)
- Verify functionality
- Deploy to production
- Monitor closely for 1 hour

### Phase 3: Post-Deployment
- Performance monitoring
- Error tracking
- User communication
- Documentation update

## Emergency Contacts

- Platform: Hetzner Support
- Database: Firebase Support
- CI/CD: GitHub Support
- Monitoring: Your monitoring service

---

**Last Updated**: 2024
**Version**: 1.0.0
**Author**: AI Links Team
