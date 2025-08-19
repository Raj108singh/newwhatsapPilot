# WhatsApp Pro VPS Deployment Guide (CWP Panel)

## Prerequisites
- VPS with CentOS Web Panel (CWP)
- Node.js 18+ installed
- PostgreSQL database
- Domain name pointing to your VPS
- SSL certificate (Let's Encrypt recommended)

## Step 1: Download Your Database

Your database has been exported to multiple formats:
- `whatsapp_pro_complete_export.sql` - Complete PostgreSQL dump
- `whatsapp_pro_mysql_export_final.sql` - MySQL format (if you prefer MySQL)

Download these files from your Replit project.

## Step 2: Prepare Your VPS

### Install Node.js (if not installed)
```bash
# Via CWP or manually:
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### Install PostgreSQL (recommended)
```bash
sudo yum install -y postgresql postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user
sudo -u postgres createuser --interactive
sudo -u postgres createdb whatsapp_pro
```

## Step 3: Upload Your Application

### Via CWP File Manager:
1. Login to CWP panel
2. Go to File Manager
3. Navigate to your domain folder (usually `/public_html/yourdomain.com`)
4. Create a new folder: `whatsapp-pro`
5. Upload all your project files to this folder

### Via SSH/SFTP:
```bash
# Upload via SCP
scp -r /path/to/project root@your-vps-ip:/home/username/whatsapp-pro/
```

## Step 4: Install Dependencies

SSH into your VPS and navigate to your project folder:
```bash
cd /path/to/whatsapp-pro
npm install
```

## Step 5: Import Your Database

### For PostgreSQL:
```bash
# Import your database
psql -U postgres -d whatsapp_pro < whatsapp_pro_complete_export.sql
```

### For MySQL (alternative):
```bash
mysql -u root -p
CREATE DATABASE whatsapp_pro;
mysql -u root -p whatsapp_pro < whatsapp_pro_mysql_export_final.sql
```

## Step 6: Configure Environment Variables

Create a `.env` file in your project root:
```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_pro"

# Or for MySQL
# DATABASE_URL="mysql://username:password@localhost:3306/whatsapp_pro"

# WhatsApp Business API
WHATSAPP_TOKEN="your_whatsapp_token"
WHATSAPP_PHONE_NUMBER_ID="your_phone_number_id"
WHATSAPP_BUSINESS_ACCOUNT_ID="your_business_account_id"

# Server Configuration
NODE_ENV=production
PORT=3000
```

## Step 7: Build the Application

```bash
npm run build
```

## Step 8: Configure Reverse Proxy (Apache/Nginx)

### For Apache (via CWP):
1. Go to CWP → Apache Settings → Vhost Conf
2. Add this configuration for your domain:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    DocumentRoot /home/username/public_html/yourdomain.com
    ErrorLog logs/yourdomain.com_error.log
    CustomLog logs/yourdomain.com_access.log combined
</VirtualHost>
```

### For Nginx:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 9: Create Systemd Service

Create `/etc/systemd/system/whatsapp-pro.service`:
```ini
[Unit]
Description=WhatsApp Pro Business Messaging Platform
After=network.target

[Service]
Type=simple
User=username
WorkingDirectory=/path/to/whatsapp-pro
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-pro
sudo systemctl start whatsapp-pro
```

## Step 10: Configure SSL (Let's Encrypt)

### Via CWP:
1. Go to CWP → SSL Certificates → Let's Encrypt
2. Select your domain and generate SSL certificate

### Manual installation:
```bash
sudo yum install certbot python-certbot-apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
```

## Step 11: Configure Firewall

```bash
# Open necessary ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Step 12: Final Configuration

1. Update your WhatsApp webhook URL to: `https://yourdomain.com/api/webhook`
2. Test the application by visiting: `https://yourdomain.com`
3. Login with: username=`admin`, password=`admin123`
4. Configure your WhatsApp Business API credentials in Settings

## Monitoring and Maintenance

### Check service status:
```bash
sudo systemctl status whatsapp-pro
```

### View logs:
```bash
sudo journalctl -u whatsapp-pro -f
```

### Update application:
```bash
cd /path/to/whatsapp-pro
git pull  # if using git
npm install
npm run build
sudo systemctl restart whatsapp-pro
```

## Troubleshooting

1. **Database connection issues**: Check DATABASE_URL and database credentials
2. **Port conflicts**: Ensure port 3000 is not used by other applications
3. **Permission issues**: Check file ownership and permissions
4. **SSL issues**: Verify certificate installation and domain configuration

Your WhatsApp Pro application should now be running on your VPS with CWP panel!