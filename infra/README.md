# Infrastructure Setup Guide

This guide covers the infrastructure setup for the AI Links engagement automation engine using Hetzner HestiaCP.

## Architecture Overview

The production system consists of:

1. **Admin Dashboard**: Next.js application running on port 3000
2. **Worker**: Node.js job processor with BullMQ/Redis
3. **Redis**: In-memory cache and job queue store
4. **Firestore**: Cloud database (Firebase)
5. **Nginx**: Reverse proxy and load balancer

## System Requirements

- **Server**: Hetzner VPS (minimum 4GB RAM, 2 vCPU recommended)
- **OS**: Ubuntu 22.04 LTS or Debian 12
- **Node.js**: v20.x (LTS)
- **pnpm**: 9.0.0+
- **Redis**: 7.0+
- **Nginx**: Latest stable

## Pre-Installation

### 1. Update System

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### 2. Install Node.js

```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js v20
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version
npm --version
```

### 3. Install pnpm

```bash
npm install -g pnpm@9.0.0

# Verify installation
pnpm --version
```

### 4. Install Redis

```bash
# Add Redis repository
curl https://packages.redis.io/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/redis-archive-keyring.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update

# Install Redis
sudo apt-get install -y redis

# Enable and start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify installation
redis-cli ping
```

### 5. Configure Redis for Production

Edit `/etc/redis/redis.conf`:

```bash
sudo nano /etc/redis/redis.conf
```

Update these settings:

```conf
# Bind to localhost and internal interface
bind 127.0.0.1 ::1

# Require password
requirepass your_secure_redis_password

# Set maxmemory policy
maxmemory 512mb
maxmemory-policy allkeys-lru

# Enable persistence
save 900 1
save 300 10
save 60 10000

# AOF (Append Only File) - optional but recommended
appendonly yes
appendfsync everysec
```

Restart Redis:

```bash
sudo systemctl restart redis-server
```

### 6. Install Nginx

```bash
sudo apt install -y nginx

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verify installation
nginx -v
```

## Application Deployment

### 1. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/yourusername/ai-links-engagement.git
sudo chown -R $USER:$USER ai-links-engagement
cd ai-links-engagement
```

### 2. Install Dependencies

```bash
pnpm install --frozen-lockfile
```

### 3. Setup Environment Variables

Create `.env.local` in the root directory:

```bash
cp .env.example .env.local
nano .env.local
```

Fill in your Firebase credentials and configuration.

Create `apps/admin/.env.local`:

```bash
cp apps/admin/.env.example apps/admin/.env.local
nano apps/admin/.env.local
```

Create `apps/worker/.env.local`:

```bash
cp apps/worker/.env.example apps/worker/.env.local
nano apps/worker/.env.local
```

Example worker `.env.local`:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account_email

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

WORKER_LOG_LEVEL=info
WORKER_CONCURRENCY=5
TIMEZONE=Asia/Karachi

DAILY_QUOTA_POSTS=30
DAILY_QUOTA_COMMENTS=50
DAILY_QUOTA_REACTIONS=20
DAILY_QUOTA_TOTAL=100

JOB_MAX_ATTEMPTS=3
JOB_BACKOFF_DELAY=1000
```

### 4. Build Applications

```bash
# Build all apps
pnpm run build

# Or build individually
pnpm --filter admin build
pnpm --filter worker build
```

### 5. Install PM2

```bash
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/home/$USER/.nvm/versions/node/v20.x.x/bin /home/$USER/.local/share/npm-global/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

### 6. Start Services with PM2

```bash
# Copy ecosystem config
cp ecosystem.config.js /opt/ai-links-engagement/

# Create logs directory
mkdir -p /opt/ai-links-engagement/logs

# Start applications
cd /opt/ai-links-engagement
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save
```

Verify services are running:

```bash
pm2 list
pm2 logs
```

## Nginx Configuration

### 1. Create Nginx Config

Create `/etc/nginx/sites-available/ai-links`:

```nginx
upstream admin_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    keepalive 64;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Client body size
    client_max_body_size 20M;

    # Logging
    access_log /var/log/nginx/ai-links_access.log;
    error_log /var/log/nginx/ai-links_error.log;

    # Admin Dashboard
    location / {
        limit_req zone=general_limit burst=20 nodelay;
        
        proxy_pass http://admin_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API endpoints - stricter rate limiting
    location /api/ {
        limit_req zone=api_limit burst=10 nodelay;
        
        proxy_pass http://admin_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ ~$ {
        deny all;
    }
}
```

### 2. Enable Configuration

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/ai-links /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Verify renewal
sudo certbot renew --dry-run
```

## Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify rules
sudo ufw status
```

## Monitoring and Logs

### PM2 Monitoring

```bash
# View real-time logs
pm2 logs

# View specific app logs
pm2 logs ai-links-admin
pm2 logs ai-links-worker

# Clear logs
pm2 flush

# Monitor with dashboard
pm2 monit
```

### System Monitoring

```bash
# Monitor system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Monitor Redis
redis-cli --stat
```

### Nginx Logs

```bash
# View Nginx access logs
tail -f /var/log/nginx/ai-links_access.log

# View Nginx error logs
tail -f /var/log/nginx/ai-links_error.log
```

## Database Initialization

### Create Firestore Collections

```bash
# Use Firebase Console or Firebase CLI
firebase init

# Initialize collections with security rules
firebase deploy --only firestore:rules
```

## Backup and Maintenance

### Redis Backup

```bash
# Manual backup
redis-cli BGSAVE

# Verify backup
ls -lh /var/lib/redis/dump.rdb
```

### Database Backup

```bash
# Export Firestore data
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

### Updates and Patches

```bash
# Update system packages
sudo apt update
sudo apt upgrade

# Update Node.js packages
cd /opt/ai-links-engagement
pnpm install --latest
pnpm run build

# Restart services
pm2 restart all
```

## Troubleshooting

### Service Won't Start

```bash
# Check PM2 logs
pm2 logs

# Check Node.js errors
pm2 describe ai-links-worker
pm2 describe ai-links-admin

# Verify environment variables
cat .env.local
```

### High Memory Usage

```bash
# Check memory per process
ps aux | grep node

# Restart service
pm2 restart ai-links-worker

# Check memory limits in ecosystem.config.js
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h 127.0.0.1 -p 6379 ping
# Should return: PONG

# Check Redis password
redis-cli -a your_password ping

# Monitor Redis
redis-cli monitor
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View error log
tail -f /var/log/nginx/ai-links_error.log
```

## Performance Tuning

### Node.js Optimization

Update `ecosystem.config.js`:

```javascript
env: {
  NODE_ENV: 'production',
  NODE_OPTIONS: '--max-old-space-size=512',
}
```

### Redis Optimization

In `/etc/redis/redis.conf`:

```conf
# Increase max connections
maxclients 10000

# Tune memory
maxmemory 2gb
```

### Nginx Optimization

In `/etc/nginx/nginx.conf`:

```nginx
worker_processes auto;
worker_connections 2048;
```

## Security Best Practices

1. **Firewall**: Restrict access to sensitive ports
2. **SSH**: Use SSH keys instead of passwords
3. **Secrets**: Store in environment variables, never in code
4. **HTTPS**: Always use SSL/TLS certificates
5. **Updates**: Keep system and dependencies updated
6. **Monitoring**: Monitor logs and metrics regularly
7. **Backups**: Regular backups of databases and code

## Support and Troubleshooting

For issues:
1. Check logs: `pm2 logs`
2. Verify environment variables
3. Test connectivity to external services
4. Check Nginx configuration
5. Review Firestore rules and quotas

## Related Documentation

- [Worker Configuration](../apps/worker/README.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Troubleshooting Guide](../docs/troubleshooting.md)
