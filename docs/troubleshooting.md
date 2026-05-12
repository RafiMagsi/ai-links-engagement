# Troubleshooting Guide

Common issues and solutions for the AI Links engagement automation engine.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Redis Problems](#redis-problems)
3. [Worker Issues](#worker-issues)
4. [Firestore Issues](#firestore-issues)
5. [Admin Dashboard Issues](#admin-dashboard-issues)
6. [Job Processing Issues](#job-processing-issues)
7. [Performance Issues](#performance-issues)
8. [Network and Deployment Issues](#network-and-deployment-issues)

## Installation Issues

### Issue: `pnpm install` fails

**Error**: `ERR_INVALID_PACKAGE_JSON`

**Solutions**:
```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
pnpm install --force

# If still failing, check Node.js version
node --version  # Should be v20.x or higher

# Update Node.js if needed
nvm install 20
nvm use 20
```

### Issue: Module not found errors

**Error**: `Cannot find module '@ai-links/shared-types'`

**Solutions**:
```bash
# Ensure you're in the root directory
cd /path/to/ai-links-engagement

# Install workspace dependencies
pnpm install -r

# Build shared packages
pnpm --filter shared-types build
pnpm --filter firebase-admin build

# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Issue: TypeScript compilation fails

**Error**: `error TS2307: Cannot find module`

**Solutions**:
```bash
# Ensure tsconfig paths are correct
cat apps/admin/tsconfig.json  # Check baseUrl and paths

# Rebuild packages
pnpm --filter admin build

# Run type check
pnpm type-check

# Clear TypeScript cache
find . -name "*.tsbuildinfo" -delete
pnpm type-check
```

## Redis Problems

### Issue: Cannot connect to Redis

**Error**: `Redis connection refused on 127.0.0.1:6379`

**Checklist**:
1. Is Redis running?
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. Is Redis listening on the right port?
   ```bash
   netstat -an | grep 6379
   # Should show LISTEN on 127.0.0.1:6379
   ```

3. Check Redis configuration
   ```bash
   cat /etc/redis/redis.conf | grep -E "^port|^bind"
   ```

**Solutions**:
```bash
# Start Redis if not running
redis-server

# Or using systemctl
sudo systemctl start redis-server

# Verify connection
redis-cli -h 127.0.0.1 -p 6379 ping

# If using password
redis-cli -h 127.0.0.1 -p 6379 -a your_password ping
```

### Issue: Redis authentication failed

**Error**: `WRONGPASS invalid username-password pair`

**Solutions**:
1. Verify password in `.env.local`:
   ```bash
   cat .env.local | grep REDIS_PASSWORD
   ```

2. Verify Redis password setting:
   ```bash
   redis-cli -a your_password CONFIG GET requirepass
   ```

3. Update Redis configuration:
   ```bash
   sudo nano /etc/redis/redis.conf
   # Set: requirepass your_secure_password
   
   sudo systemctl restart redis-server
   ```

4. Update application `.env.local` files with correct password

### Issue: Redis running out of memory

**Error**: `OOM command not allowed when used memory > 'maxmemory'`

**Solutions**:
```bash
# Check current memory usage
redis-cli INFO memory

# Increase maxmemory in Redis config
sudo nano /etc/redis/redis.conf
# Change: maxmemory 2gb

# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server

# Monitor memory usage
redis-cli --stat
```

### Issue: Redis data lost after restart

**Error**: Data persisted to Redis is lost on server restart

**Solutions**:
```bash
# Enable RDB persistence
sudo nano /etc/redis/redis.conf
# Uncomment: save 900 1 600 10 60 1000

# Or enable AOF (Append Only File)
# appendonly yes
# appendfsync everysec

# Restart Redis
sudo systemctl restart redis-server
```

## Worker Issues

### Issue: Worker won't start

**Error**: `Worker failed to start` or `Cannot find module`

**Solutions**:
```bash
# Check environment variables
cat apps/worker/.env.local

# Verify all required variables are set
echo $FIREBASE_PROJECT_ID
echo $REDIS_HOST

# Check logs
pm2 logs ai-links-worker

# Rebuild worker
pnpm --filter worker build

# Start worker in development to see errors
cd apps/worker
pnpm dev
```

### Issue: Jobs not processing

**Error**: Jobs added to queue but not processed

**Solutions**:
1. Verify worker is running:
   ```bash
   pm2 list | grep ai-links-worker
   ```

2. Check queue has jobs:
   ```bash
   redis-cli -a your_password
   > KEYS "*"  # Should show queue keys
   > LLEN postJobs  # Check queue length
   ```

3. Check worker logs for errors:
   ```bash
   pm2 logs ai-links-worker --lines 100
   ```

4. Restart worker:
   ```bash
   pm2 restart ai-links-worker
   pm2 logs ai-links-worker
   ```

### Issue: Worker consuming too much memory

**Error**: Worker process using 100%+ memory

**Solutions**:
```bash
# Check memory usage
ps aux | grep worker

# Reduce worker concurrency
# Edit .env.local
WORKER_CONCURRENCY=2

# Or edit ecosystem.config.js
max_memory_restart: '256M'

# Restart worker
pm2 restart ai-links-worker
```

### Issue: Worker stalled on a job

**Error**: Job shows "active" but not completing

**Solutions**:
```bash
# Get stalled job ID
redis-cli -a your_password LRANGE "postJobs:active" 0 -1

# Check job details
redis-cli -a your_password GET "bull:postJobs:job-id"

# Remove stalled job
redis-cli -a your_password DEL "bull:postJobs:job-id"

# Or use BullMQ cleanup
# This is handled automatically by worker

# Restart worker
pm2 restart ai-links-worker
```

## Firestore Issues

### Issue: Cannot read from Firestore

**Error**: `Error: Failed to authenticate with the given credentials`

**Solutions**:
1. Verify credentials file:
   ```bash
   # Check if service account JSON is valid
   cat path/to/serviceAccount.json | jq .
   ```

2. Verify environment variables:
   ```bash
   echo $FIREBASE_PROJECT_ID
   echo $FIREBASE_CLIENT_EMAIL
   echo $FIREBASE_PRIVATE_KEY
   ```

3. Check Firebase Console:
   - Project ID matches
   - Service account has appropriate roles
   - Collection exists and has read permissions

### Issue: Firestore write permission denied

**Error**: `Permission denied on resource`

**Solutions**:
1. Update Firestore security rules:
   ```javascript
   // In Firebase Console > Firestore > Rules
   match /automationAccounts/{document=**} {
     allow read, write: if request.auth.uid != null && 
       request.auth.token.admin == true;
   }
   ```

2. Check service account roles:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Ensure service account has Editor or Firestore Editor role

3. Verify rules allow writes:
   ```bash
   firebase firestore:indexes
   firebase firestore:rules:get
   ```

### Issue: Firestore exceeds quota

**Error**: `Quota exceeded for operation`

**Solutions**:
1. Check usage:
   ```bash
   firebase firestore:usage  # If using CLI
   ```

2. In Firebase Console:
   - Go to Firestore > Usage tab
   - Check daily reads/writes

3. Optimize queries:
   - Create indexes for common queries
   - Use batching for bulk operations
   - Archive old data to separate collection

4. Upgrade plan if necessary

### Issue: Field/collection not found in Firestore

**Error**: `Document not found` or `Field is undefined`

**Solutions**:
```bash
# Initialize Firestore with required collections
# Use Firebase CLI or manually create:
firebase firestore:start-collection

# Or use Firebase Console to create:
# 1. Go to Cloud Firestore
# 2. Create Collection: automationAccounts
# 3. Create Collection: automationActionLogs
# 4. Create Collection: automationPolicies
# 5. Create Collection: dailyUsage

# Set default global policy document
# Go to automationPolicies > Add Document (ID: 'global')
# Fields:
# - automationEnabled: true
# - globalKillSwitch: false
# - quotaCapMultiplier: 1.0
```

## Admin Dashboard Issues

### Issue: Dashboard won't load

**Error**: Blank page or 404 error

**Solutions**:
```bash
# Check if admin service is running
pm2 list | grep admin

# Check admin logs
pm2 logs ai-links-admin

# Verify Nginx is forwarding correctly
curl -I http://127.0.0.1:3000

# Check Nginx config
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Issue: Authentication fails

**Error**: Cannot log in, stuck on login page

**Solutions**:
1. Verify Firebase config in `.env.local`:
   ```bash
   cat apps/admin/.env.local | grep NEXT_PUBLIC_FIREBASE
   ```

2. Check browser console for errors:
   - Open DevTools (F12)
   - Check Console tab for error messages
   - Check Network tab to see API calls

3. Verify admin user exists:
   ```bash
   firebase auth:list  # View all users
   firebase auth:get your-user-email  # Get specific user
   ```

4. Set admin claim on user:
   ```bash
   firebase auth:create-user --uid your-uid --email your-email@example.com
   # Then set custom claim in Firebase Console
   ```

### Issue: API returns 401 Unauthorized

**Error**: API calls failing with 401

**Solutions**:
1. Check authentication token:
   - Ensure user is logged in
   - Token is fresh (not expired)

2. Verify API requires auth:
   ```bash
   # Check if Authorization header is being sent
   # In browser DevTools > Network > API call
   # Look for "Authorization: Bearer ..." header
   ```

3. Clear browser cache and cookies:
   - In browser DevTools > Application > Clear storage
   - Or use incognito window

### Issue: Styles not loading

**Error**: Dashboard appears unstyled (no Tailwind CSS)

**Solutions**:
```bash
# Rebuild admin with Tailwind
cd apps/admin
pnpm run build

# Clear Next.js cache
rm -rf .next

# Restart admin
pm2 restart ai-links-admin

# Check Tailwind build
grep -r "tailwindcss" tailwind.config.ts
```

## Job Processing Issues

### Issue: Jobs failing repeatedly

**Error**: Jobs show failed with retry count exceeded

**Solutions**:
1. Check job details:
   ```bash
   # View job in Firestore
   db.collection('automationActionLogs')
     .where('success', '==', false)
     .orderBy('createdAt', 'desc')
     .limit(10)
     .get()
   ```

2. Identify error pattern:
   - Check error field in job document
   - Look for patterns in stack traces
   - Review timing of failures

3. Common failure reasons:
   - Account deleted or inactive
   - Firestore write limits exceeded
   - Network/API timeouts
   - Invalid job data

4. Retry failed job:
   ```bash
   # Use admin dashboard
   # Or manually via API
   curl -X POST https://yourdomain.com/api/queue/jobs/job-id/retry \
     -H "Authorization: Bearer token"
   ```

### Issue: Kill switch not working

**Error**: Jobs still processing when globalKillSwitch is true

**Solutions**:
1. Verify policy is set correctly:
   ```bash
   # Check Firestore
   db.collection('automationPolicies').doc('global').get()
   # Should show: globalKillSwitch: true
   ```

2. Restart worker to reload policy:
   ```bash
   pm2 restart ai-links-worker
   ```

3. Check worker is checking kill switch:
   ```bash
   pm2 logs ai-links-worker | grep "kill switch"
   ```

### Issue: Jobs queued but not running

**Error**: Jobs stuck in pending state

**Solutions**:
1. Check worker concurrency:
   ```bash
   # Check how many jobs worker can process
   grep WORKER_CONCURRENCY apps/worker/.env.local
   ```

2. Increase concurrency:
   ```bash
   # Edit .env.local
   WORKER_CONCURRENCY=10

   # Restart worker
   pm2 restart ai-links-worker
   ```

3. Check job priority:
   - Lower priority jobs may be delayed if high-priority jobs fill queue
   - Monitor queue depth with `/api/queue/status`

4. Clear stuck jobs:
   ```bash
   redis-cli -a your_password
   > FLUSHDB  # WARNING: Clears entire Redis DB - backup first!
   ```

## Performance Issues

### Issue: High API response times

**Error**: Requests taking > 1 second

**Solutions**:
1. Monitor request times:
   ```bash
   # Check Nginx logs for slow requests
   tail -f /var/log/nginx/ai-links_access.log
   ```

2. Optimize database queries:
   - Create Firestore indexes
   - Use pagination for large result sets
   - Cache frequently accessed data

3. Check server resources:
   ```bash
   htop  # View CPU and memory
   top   # Process list
   iotop # Disk I/O
   ```

4. Scale horizontally:
   - Add more worker instances
   - Enable Nginx load balancing across multiple admin instances

### Issue: Queue processing is slow

**Error**: Jobs taking too long to process

**Solutions**:
1. Check processing time:
   ```bash
   # View job execution time in logs
   pm2 logs ai-links-worker | grep "Job completed"
   ```

2. Identify slow operations:
   - Profile Firestore queries
   - Check OpenAI API response times
   - Monitor network latency

3. Optimize job handlers:
   - Batch operations where possible
   - Use parallel processing for independent jobs
   - Cache common data

4. Add more workers:
   ```bash
   # In ecosystem.config.js
   instances: 4  # Add more instances

   pm2 restart ecosystem.config.js
   ```

### Issue: High memory usage

**Error**: Server running out of memory, OOM killer activating

**Solutions**:
```bash
# Check memory usage by process
ps aux --sort=-%mem | head

# For Node.js processes
node --max-old-space-size=512 dist/index.js

# Or set in ecosystem.config.js
NODE_OPTIONS: '--max-old-space-size=512'

# Monitor over time
watch -n 1 'free -h'
```

## Network and Deployment Issues

### Issue: Nginx returns 502 Bad Gateway

**Error**: Upstream connection refused

**Solutions**:
1. Check if admin service is running:
   ```bash
   lsof -i :3000  # Should show Node process
   ```

2. Verify Nginx config:
   ```bash
   sudo nginx -t
   ```

3. Check Nginx error log:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. Restart services:
   ```bash
   pm2 restart ai-links-admin
   sudo systemctl reload nginx
   ```

### Issue: SSL certificate errors

**Error**: `NET::ERR_CERT_EXPIRED` or `ERR_CERT_AUTHORITY_INVALID`

**Solutions**:
```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Check auto-renewal is working
sudo certbot renew --dry-run

# View certificate details
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443
```

### Issue: Deployment script fails

**Error**: Git pull or build failing during deployment

**Solutions**:
```bash
# Check git status
cd /opt/ai-links-engagement
git status

# Handle uncommitted changes
git stash

# Pull latest changes
git pull origin main

# Verify no merge conflicts
git diff

# Rebuild
pnpm install --frozen-lockfile
pnpm run build

# Restart
pm2 restart all
```

### Issue: Port already in use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or let PM2 handle it
pm2 delete ai-links-admin
pm2 start ecosystem.config.js

# For Nginx
sudo systemctl restart nginx
```

## Getting Help

### Log Collection for Debugging

```bash
# Collect all relevant logs
mkdir ai-links-debug
cd ai-links-debug

# Application logs
pm2 logs > app-logs.txt 2>&1

# System logs
sudo journalctl -u redis-server -n 100 > redis-logs.txt
sudo journalctl -u nginx -n 100 > nginx-logs.txt

# Environment info
node --version > system-info.txt
redis-server --version >> system-info.txt
nginx -v >> system-info.txt

# Configuration (remove sensitive data)
cat /opt/ai-links-engagement/.env.local | grep -v KEY | grep -v PASSWORD > config.txt

# Share these files with support team
tar -czf ai-links-debug.tar.gz *
```

### Getting Support

1. Check this guide first
2. Search GitHub issues
3. Review logs with above collection
4. Contact support with:
   - Description of issue
   - Error messages
   - System information
   - Steps to reproduce
   - Debug logs

---

Last Updated: 2024
For additional help, see: /infra/README.md, /DEPLOYMENT.md
