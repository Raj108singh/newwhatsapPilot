# WhatsApp Pro - Production Deployment Guide

## Overview
Your WhatsApp Pro application is ready for production deployment. This guide covers building, configuring, and deploying to your VPS.

## Prerequisites
- Node.js 18+ installed on your production server
- MySQL database running on VPS (103.38.50.233)
- WhatsApp Business API credentials
- PM2 or similar process manager (recommended)

## 1. Build for Production

### Local Build
```bash
# Make build script executable
chmod +x build-production.sh

# Run production build
./build-production.sh
```

This creates a `dist/` folder with your production-ready application.

## 2. Environment Configuration

### Database Connection
Your MySQL database is already configured at:
- **Host**: 103.38.50.233
- **Port**: 3306
- **Database**: niharsk_whatsapp_raj
- **User**: niharsk_whatsapp_raj

**Important**: The VPS database is configured to accept connections from any IP (`%` wildcard), so you don't need to change specific IPs to localhost.

### Environment Variables
Create a `.env` file on your production server:

```bash
# Production Environment
NODE_ENV=production

# Database - Your VPS MySQL (already configured for remote access)
DATABASE_URL=mysql://niharsk_whatsapp_raj:rajuser@103.38.50.233:3306/niharsk_whatsapp_raj

# WhatsApp API (use your production tokens)
WHATSAPP_ACCESS_TOKEN=your_production_access_token
WHATSAPP_PHONE_NUMBER_ID=636589589532430
WHATSAPP_BUSINESS_ACCOUNT_ID=1372721233974205
WHATSAPP_VERIFY_TOKEN=secretwebhook

# Server Configuration
PORT=5000
HOST=0.0.0.0

# Security (change this!)
JWT_SECRET=your_super_secure_jwt_secret_for_production

# Application Settings
LOG_LEVEL=info
MAX_RECIPIENTS_PER_CAMPAIGN=10000
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

## 3. Deployment Options

### Option A: Direct Deployment
1. Copy the `dist/` folder to your production server
2. Create the `.env` file with production values
3. Install dependencies and start:

```bash
cd dist
npm install
npm start
```

### Option B: PM2 Process Manager (Recommended)
1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Create PM2 ecosystem file:
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'whatsapp-pro',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF
```

3. Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option C: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY dist/ .
RUN npm install
EXPOSE 5000
CMD ["npm", "start"]
```

## 4. Database Considerations

### Remote Access Already Configured
Your MySQL database at 103.38.50.233 is already configured to accept remote connections:
- User `niharsk_whatsapp_raj@%` can connect from any IP
- No need to change database host to localhost
- No firewall modifications needed

### Connection Testing
Test your database connection:
```bash
mysql -h 103.38.50.233 -u niharsk_whatsapp_raj -p niharsk_whatsapp_raj
```

## 5. Security Checklist

### Environment Variables
- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use production WhatsApp Access Token
- [ ] Verify database credentials
- [ ] Set appropriate `LOG_LEVEL`

### Network Security
- [ ] Enable HTTPS (use nginx proxy or SSL certificates)
- [ ] Configure firewall to allow only necessary ports
- [ ] Regular security updates

### Application Security
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] Error handling doesn't expose sensitive data

## 6. Monitoring & Maintenance

### Health Check Endpoint
The application includes a health check at `/api/health`

### Log Monitoring
- Application logs are written to console
- Use PM2 logs or redirect to log files
- Monitor for errors and performance issues

### Database Backups
Regular backups of your MySQL database:
```bash
mysqldump -h 103.38.50.233 -u niharsk_whatsapp_raj -p niharsk_whatsapp_raj > backup_$(date +%Y%m%d).sql
```

## 7. Troubleshooting

### Common Issues
1. **Database Connection Failed**: Check if VPS database is running and accessible
2. **WhatsApp API Errors**: Verify access tokens and phone number ID
3. **Port Already in Use**: Change PORT in .env file
4. **Permission Issues**: Ensure proper file permissions on server

### Debug Mode
To enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## 8. Production URLs

Once deployed, your application will be available at:
- **Dashboard**: http://your-server-ip:5000
- **API**: http://your-server-ip:5000/api
- **Webhooks**: http://your-server-ip:5000/api/webhook

## Support
Your WhatsApp Pro application is production-ready with:
- ✅ External MySQL database connectivity
- ✅ WhatsApp Business API integration  
- ✅ Comprehensive template support
- ✅ Bulk messaging capabilities
- ✅ Real-time chat functionality
- ✅ Campaign management
- ✅ Contact organization