# VPS Environment Variables Setup Guide

## CWP Panel Configuration

Based on your screenshot, here's how to configure your Node.js app in CWP:

### General Settings:
- **User account**: niharsk
- **NodeJS Version**: 21.7.3 (or latest stable)
- **Descriptive name**: whatsappPro
- **Application mode**: Production
- **Path**: /home/niharsk/whatsappPro/newwhatsappPilot/server/
- **Startup file**: index.js (NOT index.ts - this should be the compiled JS file)
- **Port**: 4200 (or 3000)

### Environment Variables Section:
Click "Add environment variable" and add these one by one:

#### 1. Database Configuration
```
Name: DATABASE_URL
Value: mysql://your_db_user:your_db_password@localhost:3306/whatsapp_pro
```

#### 2. Application Settings
```
Name: NODE_ENV
Value: production
```

```
Name: PORT
Value: 3000
```

#### 3. WhatsApp Business API (REQUIRED)
```
Name: WHATSAPP_TOKEN
Value: EACEUw1YCh7cBPNWErQx15ZAUN74QTPhtl9PPYZC9hR7ZA5aKMr0KrduFILDaF4ElLxZCt24aQeLVobbj1f7t7mAQjRxC87UVnilFdX0zODga1k7h8OZCZCp7fJcOvlDqPGLR6ZC0TSheLogoYbkR5FBgWX925EZCLaZCIThQVnsoOlRzZCtN3UdTmX5jZC6ISvGfgwc
```

```
Name: WHATSAPP_PHONE_NUMBER_ID
Value: 636589589532430
```

```
Name: WHATSAPP_BUSINESS_ACCOUNT_ID
Value: 1372721233974205
```

```
Name: WHATSAPP_VERIFY_TOKEN
Value: secretwebhook
```

#### 4. Security Settings
```
Name: JWT_SECRET
Value: your_random_jwt_secret_key_minimum_32_characters
```

```
Name: SESSION_SECRET
Value: your_random_session_secret_minimum_32_characters
```

#### 5. Domain Configuration
```
Name: DOMAIN
Value: https://yourdomain.com
```

## File Structure on VPS

Your application should be organized like this:
```
/home/niharsk/whatsappPro/
├── dist/                    # Built application (created by npm run build)
│   ├── index.js            # Compiled server file (entry point)
│   └── assets/             # Built frontend assets
├── node_modules/           # Dependencies
├── package.json            # Project dependencies
├── whatsapp_pro_complete_export_2025_08_19.sql  # Database file
└── README.md
```

## Setup Steps for Your VPS:

### 1. Upload Files
- Upload your project files to `/home/niharsk/whatsappPro/`
- Make sure you have the compiled `dist/` folder

### 2. Install Dependencies
SSH into your server and run:
```bash
cd /home/niharsk/whatsappPro/
npm install --production
```

### 3. Build Application
```bash
npm run build
```

### 4. Create Database
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE whatsapp_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'whatsapp_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON whatsapp_pro.* TO 'whatsapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import your data
mysql -u whatsapp_user -p whatsapp_pro < whatsapp_pro_complete_export_2025_08_19.sql
```

### 5. Test Your Application

#### Check if app starts:
```bash
cd /home/niharsk/whatsappPro/
NODE_ENV=production node dist/index.js
```

#### Test via domain:
- Visit: `https://yourdomain.com`
- Login with: username=`admin`, password=`admin123`

## Apache Virtual Host Configuration

Add this to your domain's Apache config in CWP:
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # WebSocket support
    ProxyPass /socket.io/ ws://localhost:3000/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:3000/socket.io/
    
    DocumentRoot /home/niharsk/public_html/yourdomain.com
    ErrorLog logs/yourdomain.com_error.log
    CustomLog logs/yourdomain.com_access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # WebSocket support
    ProxyPass /socket.io/ ws://localhost:3000/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:3000/socket.io/
    
    DocumentRoot /home/niharsk/public_html/yourdomain.com
    ErrorLog logs/yourdomain.com_error.log
    CustomLog logs/yourdomain.com_access.log combined
    
    # SSL Configuration (will be added by Let's Encrypt)
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/private.key
</VirtualHost>
```

## Troubleshooting

### If app doesn't start:
1. Check Node.js version: `node --version`
2. Check if port 3000 is free: `netstat -tulpn | grep 3000`
3. Check application logs: `journalctl -u your-app-name -f`

### If website shows error:
1. Check Apache error logs: `tail -f /var/log/httpd/error_log`
2. Verify proxy is working: `curl http://localhost:3000`
3. Check if database connection works

### WhatsApp webhook setup:
- Webhook URL: `https://yourdomain.com/api/webhook`
- Verify token: `secretwebhook`

## Your Current WhatsApp Settings:
From your exported database:
- Phone Number ID: `636589589532430`
- Business Account ID: `1372721233974205`  
- Token: (use the token from your settings)
- Verify Token: `secretwebhook`

Once configured, your WhatsApp Pro platform will be fully operational on your VPS!