# GitHub Actions Deployment Setup

Complete guide to set up GitHub Actions for automated deployment to your HestiaCP server.

## 📋 Prerequisites

- GitHub repository with this code
- Hetzner/HestiaCP server with SSH access
- SSH key pair generated on your server
- GitHub account with repository access

---

## 🔑 Step 1: Generate SSH Key on Server

SSH into your server and generate an SSH key for deployments:

```bash
ssh rafiadmin@your-server-ip

# Generate SSH key (no passphrase for automation)
ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -C "github-actions" -N ""

# Display the private key (you'll need this for GitHub)
cat ~/.ssh/github-deploy

# Display the public key (add to authorized_keys)
cat ~/.ssh/github-deploy.pub >> ~/.ssh/authorized_keys

# Fix permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

---

## 🔐 Step 2: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Create the following secrets:

### Required Secrets:

#### Server Credentials
```
DEPLOY_HOST
  Value: your-server-ip (or domain)
  Example: 123.45.67.89

DEPLOY_SSH_KEY
  Value: (Copy entire contents of ~/.ssh/github-deploy from server)
  Start with: -----BEGIN OPENSSH PRIVATE KEY-----
  End with: -----END OPENSSH PRIVATE KEY-----

DEPLOY_PORT (optional)
  Value: 22 (default SSH port)
```

#### Firebase Credentials
```
FIREBASE_PROJECT_ID
  Value: your-firebase-project-id
  Example: ai-links-production

FIREBASE_PRIVATE_KEY
  Value: (From Firebase service account JSON - the "private_key" field)
  ⚠️  IMPORTANT: Make sure to include the newline characters
  Start with: -----BEGIN PRIVATE KEY-----
  End with: -----END PRIVATE KEY-----

FIREBASE_CLIENT_EMAIL
  Value: (From Firebase service account JSON - the "client_email" field)
  Example: firebase-adminsdk-abc@project.iam.gserviceaccount.com
```

#### API Keys
```
OPENAI_API_KEY
  Value: sk-... (your OpenAI API key)

REDIS_PASSWORD
  Value: your-secure-redis-password
```

---

## 🖥️ Step 3: Server Setup (One-time)

SSH into your server and prepare the deployment directory:

```bash
ssh rafiadmin@your-server-ip

# Create deployment directory
DEPLOY_DIR="/home/rafiadmin/web/ailinksengagement.dropticks.com/public_html"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Initialize git repo (GitHub Actions will handle this, but good to prepare)
git init
git remote add origin https://github.com/YOUR_USERNAME/ai-links-engagement.git

# Create logs directory
mkdir -p logs backups

# Ensure permissions
chmod 755 "$DEPLOY_DIR"
```

**Important:** Make sure `rafiadmin` user can:
- Write to the deployment directory
- Execute PM2 commands
- Access Redis (usually on localhost:6379)
- Read/write environment files

---

## 🚀 Step 4: Trigger First Deployment

### Option A: Via Git Push

```bash
git push origin main
```

The workflow will trigger automatically.

### Option B: Manual Trigger in GitHub UI

1. Go to **Actions** tab in your repository
2. Select **Deploy to HestiaCP Production**
3. Click **Run workflow** → **Run workflow**

---

## 📊 Step 5: Monitor Deployment

### Via GitHub UI
1. Go to **Actions** tab
2. Watch the deployment job progress
3. Check logs in real-time

### Via Server SSH

```bash
ssh rafiadmin@your-server-ip

# Watch PM2 logs in real-time
pm2 logs

# Check status
pm2 status

# Check specific app logs
pm2 logs admin
pm2 logs worker
```

---

## ✅ Deployment Checklist

Before pushing to `main`, ensure:

- [ ] All secrets are configured in GitHub
- [ ] Server deployment directory exists and permissions are correct
- [ ] SSH key is properly set in `DEPLOY_SSH_KEY` secret
- [ ] Firebase credentials are valid
- [ ] OpenAI API key is valid
- [ ] Redis is running on server (`redis-cli ping` returns PONG)
- [ ] Port 3000 is available on server
- [ ] Domain DNS points to server IP

---

## 🔄 Deployment Flow

```
1. Push to main branch
       ↓
2. GitHub Actions triggered
       ↓
3. Run tests & lint
       ↓
4. Build admin & worker
       ↓
5. SSH into server as rafiadmin
       ↓
6. Pull latest code
       ↓
7. Install dependencies (pnpm)
       ↓
8. Build applications
       ↓
9. Create .env.local files from secrets
       ↓
10. Stop old PM2 processes
       ↓
11. Start new processes with ecosystem.config.js
       ↓
12. Health checks (admin API, Redis)
       ↓
13. Verify deployment & logs
```

---

## 🐛 Troubleshooting

### SSH Connection Failed
```bash
# Check SSH key is correct
cat ~/.ssh/github-deploy | wc -c  # Should be > 1000 characters

# Test SSH connection locally
ssh -i ~/.ssh/github-deploy rafiadmin@your-server-ip "echo OK"

# Check GitHub secret DEPLOY_SSH_KEY has full key
```

### Build Failed
- Check Node.js version: `node --version` (should be 20.x)
- Check pnpm: `pnpm --version`
- Check dependencies: `pnpm install --frozen-lockfile`

### Services Not Starting
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Manual start
cd /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html
pm2 start ecosystem.config.js

# Check ports
netstat -tlnp | grep 3000
```

### Health Check Failed
```bash
# Test admin service manually
curl http://127.0.0.1:3000/api/queue/status

# Check if port 3000 is listening
lsof -i :3000

# Check Nginx reverse proxy
sudo systemctl status nginx
```

### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping

# Check Redis is listening on correct port
redis-cli -p 6379 ping

# Start Redis if stopped
sudo systemctl start redis-server
```

### Environment Variables Not Loaded
```bash
# Verify .env.local exists
cat /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html/.env.local

# Check GitHub secrets are escaped properly
# FIREBASE_PRIVATE_KEY must have literal newlines:
# -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

---

## 📝 Deployment Logs

Logs are stored in two places:

### 1. GitHub Actions Logs
- URL: `https://github.com/YOUR_USERNAME/ai-links-engagement/actions`
- Shows: Tests, builds, deployment commands
- Useful for: Debugging deployment failures

### 2. Server PM2 Logs
```bash
# Real-time logs
pm2 logs

# Last 100 lines
pm2 logs --lines 100

# Specific app
pm2 logs admin
pm2 logs worker

# Save logs to file
pm2 logs > deployment.log
```

---

## 🔄 Rollback Procedure

If deployment fails, rollback to previous version:

```bash
ssh rafiadmin@your-server-ip

DEPLOY_DIR="/home/rafiadmin/web/ailinksengagement.dropticks.com/public_html"
cd "$DEPLOY_DIR"

# Stop current processes
pm2 delete ecosystem.config.js

# Checkout previous commit
git log --oneline | head -5  # Find good commit hash
git reset --hard <COMMIT_HASH>

# Rebuild and restart
pnpm install --frozen-lockfile
pnpm run build
pm2 start ecosystem.config.js
pm2 save

# Verify
pm2 logs
```

---

## 🎯 Verifying Deployment

After deployment completes, verify everything is working:

```bash
# 1. Check processes are running
pm2 status

# 2. Check admin dashboard is accessible
curl https://ailinksengagement.dropticks.com/api/queue/status

# 3. Check Redis connectivity
redis-cli ping

# 4. Check logs for errors
pm2 logs --lines 50

# 5. Check Firestore connection (in logs)
# Should see successful auth messages

# 6. Test a manual job trigger
curl -X POST https://ailinksengagement.dropticks.com/api/jobs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

---

## 📧 Deployment Notifications

The GitHub Actions workflow includes:
- ✅ Success notifications
- ❌ Failure notifications
- 📋 Detailed logs

Check GitHub for:
- Actions tab → Latest workflow run
- Workflow logs and output
- Environment variable validation

---

## 🛡️ Security Best Practices

1. **SSH Key Security**
   - Never share private key
   - Use dedicated key for GitHub Actions
   - Rotate keys periodically

2. **Secret Management**
   - Never commit `.env` files
   - Rotate API keys periodically
   - Use separate keys for dev/prod

3. **Firewall Rules**
   - Restrict SSH to GitHub's IP ranges (optional)
   - Use strong passwords for Redis
   - Enable firewall on production server

4. **Monitoring**
   - Monitor PM2 logs for errors
   - Set up alerts for deployment failures
   - Review deployment history regularly

---

## 📞 Support

If deployment fails:

1. Check GitHub Actions logs for error message
2. SSH into server and check `pm2 logs`
3. Verify all environment variables are set
4. Check server has required software:
   ```bash
   node --version    # Should be 20.x
   pnpm --version    # Should be 9.0.0+
   pm2 --version
   redis-cli ping
   ```
5. Review troubleshooting section above
