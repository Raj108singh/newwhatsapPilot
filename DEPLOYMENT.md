# WhatsApp Pro - Production Deployment Guide

## Prerequisites

1. **Node.js 18+** installed on your VPS
2. **MySQL database** accessible from your VPS
3. **PM2** for process management
4. **Domain/subdomain** pointed to your VPS (optional)

## Deployment Steps

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd whatsapp-pro
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

Required environment variables:
- `DATABASE_URL`: Your MySQL connection string
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp Business API token
- `WHATSAPP_PHONE_NUMBER_ID`: Your WhatsApp phone number ID
- `NODE_ENV=production`
- `PORT=5000`

### 3. Database Setup

```bash
# Push database schema
npm run db:push
```

### 4. Build Application

```bash
# Run production build
./build.sh
```

### 5. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 6. Verify Deployment

- Application should be running on port 5000
- Check logs: `pm2 logs whatsapp-pro`
- Check status: `pm2 status`

## Production Management

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs whatsapp-pro

# Restart application
pm2 restart whatsapp-pro

# Stop application
pm2 stop whatsapp-pro

# Monitor resources
pm2 monit
```

### Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart
./build.sh
pm2 restart whatsapp-pro
```

## SSL/HTTPS Setup (Optional)

For production, consider setting up:
1. **Nginx** as reverse proxy
2. **Let's Encrypt** SSL certificate
3. **Firewall** configuration

## Troubleshooting

1. **Database Connection Issues**
   - Verify DATABASE_URL in .env
   - Check MySQL server is running
   - Ensure firewall allows connections

2. **WhatsApp API Issues**
   - Verify WHATSAPP_ACCESS_TOKEN
   - Check webhook URL configuration
   - Validate phone number ID

3. **Application Errors**
   - Check PM2 logs: `pm2 logs`
   - Verify all environment variables
   - Check disk space and memory

## Security Considerations

1. Use strong passwords for database
2. Keep access tokens secure
3. Regular security updates
4. Monitor application logs
5. Set up firewall rules

For support, check the application logs and ensure all environment variables are correctly configured.