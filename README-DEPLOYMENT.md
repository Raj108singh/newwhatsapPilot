# WhatsApp Pro - VPS Deployment Guide

## Quick Start

1. Extract the deployment package to your VPS
2. Run: `chmod +x install.sh && ./install.sh`
3. Start: `./start.sh`
4. Access: `http://your-server-ip:5000`
5. Login: admin/admin123

## System Requirements

- **Node.js**: 18.0.0 or higher
- **RAM**: 1GB minimum, 2GB recommended
- **Storage**: 5GB minimum
- **Network**: Port 5000 open for HTTP traffic

## Database Configuration

The application connects to your existing MySQL database:
- **Host**: 103.38.50.233:3306
- **Database**: niharsk_whatsapp_raj
- **Credentials**: Already configured in startup script

## Environment Variables

Create `.env` file in root directory with these variables:

```bash
NODE_ENV=production
DATABASE_URL=mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@103.38.50.233:3306/niharsk_whatsapp_raj
PORT=5000
HOST=0.0.0.0
JWT_SECRET=your-super-secret-jwt-key-change-this
```

## WhatsApp Business API Setup

After deployment, configure WhatsApp API in admin panel:
1. Go to Settings → WhatsApp Configuration
2. Enter your WhatsApp Business API credentials:
   - Access Token
   - Phone Number ID  
   - Business Account ID

## File Structure

```
whatsapp-pro/
├── dist/                  # Production build files
├── start.sh              # Startup script
├── install.sh            # Installation script
├── package-production.json
├── README-DEPLOYMENT.md
└── whatsapp_pro_mysql_export.sql
```

## Production Commands

```bash
# Install dependencies
./install.sh

# Start application
./start.sh

# Check if running
ps aux | grep node

# Stop application
pkill -f "node dist/server/index.js"
```

## Troubleshooting

### Application Won't Start
- Check Node.js version: `node --version`
- Verify database connection
- Check port 5000 availability: `lsof -i :5000`

### Database Connection Issues
- Verify MySQL server is running
- Check firewall settings for port 3306
- Test connection: `mysql -h 103.38.50.233 -P 3306 -u niharsk_whatsapp_raj -p`

### Performance Optimization
- Use PM2 for process management: `npm install -g pm2`
- Start with PM2: `pm2 start dist/server/index.js --name whatsapp-pro`
- Enable auto-restart: `pm2 startup && pm2 save`

## Security Notes

- Change default admin password after first login
- Update JWT_SECRET environment variable
- Configure firewall to allow only necessary ports
- Enable SSL/TLS for production (recommended)
- Regular database backups recommended

## Support

For technical support or configuration help:
- Check application logs for error details
- Verify all environment variables are set correctly
- Ensure database connectivity from VPS to MySQL server