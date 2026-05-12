# Quick Deployment Steps for HestiaCP

Fast reference guide to deploy to `/home/rafiadmin/web/ailinksengagement.dropticks.com/public_html`

## 5-Minute Setup

### 1️⃣ Generate SSH Key on Server (1 minute)

```bash
ssh rafiadmin@your-server-ip

ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -C "github-actions" -N ""
cat ~/.ssh/github-deploy         # Copy this
cat ~/.ssh/github-deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2️⃣ Add GitHub Secrets (2 minutes)

Go to: **GitHub Repo** → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value |
|---|---|
| `DEPLOY_HOST` | Your server IP or domain |
| `DEPLOY_SSH_KEY` | Entire content of `~/.ssh/github-deploy` |
| `DEPLOY_PORT` | 22 (or your SSH port) |
| `FIREBASE_PROJECT_ID` | From Firebase service account |
| `FIREBASE_PRIVATE_KEY` | From Firebase service account (with newlines) |
| `FIREBASE_CLIENT_EMAIL` | From Firebase service account |
| `OPENAI_API_KEY` | Your OpenAI key |
| `REDIS_PASSWORD` | Your Redis password |

### 3️⃣ Prepare Server Directory (1 minute)

```bash
ssh rafiadmin@your-server-ip

mkdir -p /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html
mkdir -p /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html/{logs,backups}
chmod 755 /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html
```

### 4️⃣ Verify Prerequisites on Server (1 minute)

```bash
ssh rafiadmin@your-server-ip

node --version          # Should be 20.x
npm --version
pnpm --version          # Should be 9.0.0+
pm2 --version
redis-cli ping          # Should return PONG
```

### 5️⃣ Deploy! 

Push to main branch:
```bash
git push origin main
```

**Or** manually trigger in GitHub:
- Go to **Actions** → **Deploy to HestiaCP Production** → **Run workflow**

---

## 🔍 Monitor Deployment

### Watch GitHub Actions
```
https://github.com/YOUR_USERNAME/ai-links-engagement/actions
```

### SSH and Monitor Server
```bash
ssh rafiadmin@your-server-ip

# Watch real-time logs
pm2 logs

# Check status
pm2 status

# Check specific logs
pm2 logs admin
pm2 logs worker

# Check if port 3000 is open
netstat -tlnp | grep 3000
```

---

## ✅ Verify Success

After deployment completes:

```bash
# 1. Check processes are running
pm2 status
# Should show "admin" and "worker" with status "online"

# 2. Test admin dashboard
curl http://127.0.0.1:3000/api/queue/status
# Should return JSON

# 3. Check Redis
redis-cli ping
# Should return PONG

# 4. Check logs for errors
pm2 logs --lines 50
# Should not have error messages
```

---

## 🐛 If Deployment Fails

### Check GitHub Actions Log
Go to: `https://github.com/YOUR_USERNAME/ai-links-engagement/actions` → Latest run → See error

### Common Issues

**SSH Connection Failed**
```bash
# Test SSH locally
ssh -i ~/.ssh/github-deploy rafiadmin@your-server-ip "echo OK"

# Re-add GitHub secret DEPLOY_SSH_KEY with full key content
```

**Build Failed**
```bash
# SSH in and test build manually
ssh rafiadmin@your-server-ip
cd /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html
pnpm install --frozen-lockfile
pnpm run build
```

**Services Won't Start**
```bash
# SSH in and check PM2
ssh rafiadmin@your-server-ip
pm2 logs
pm2 list

# Try manual start
cd /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html
pm2 delete ecosystem.config.js
pm2 start ecosystem.config.js
```

**Health Check Failed**
```bash
# Check if admin is listening
curl http://127.0.0.1:3000/api/queue/status
# If no response, check PM2 logs

# Check port
lsof -i :3000

# Check Nginx if using reverse proxy
sudo systemctl status nginx
```

---

## 📋 Environment Variables Reference

Your `.env` files are auto-created from GitHub secrets. Key variables:

```env
# In /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html/.env.local
NODE_ENV=production
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
OPENAI_API_KEY=sk-...
ADMIN_BASE_URL=https://ailinksengagement.dropticks.com

# In apps/worker/.env.local (auto-generated during deploy)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your-password
DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100
```

---

## 🔄 Redeploy (After Code Changes)

Just push to main:
```bash
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build apps
3. Deploy to server
4. Restart PM2 processes
5. Run health checks

No manual intervention needed!

---

## 📞 Emergency Rollback

If something breaks:

```bash
ssh rafiadmin@your-server-ip

cd /home/rafiadmin/web/ailinksengagement.dropticks.com/public_html

# Stop current
pm2 delete ecosystem.config.js

# Go to previous working commit
git log --oneline | head -5
git reset --hard <COMMIT_HASH>

# Rebuild
pnpm install --frozen-lockfile
pnpm run build

# Start
pm2 start ecosystem.config.js
pm2 save

# Verify
pm2 logs
```

---

## ✨ That's It!

Your app is now automatically deployed on every push to `main`. 

**Access it at:** `https://ailinksengagement.dropticks.com`

For detailed info, see: `GITHUB_DEPLOYMENT_SETUP.md`
