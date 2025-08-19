# Database Download Instructions

## Available Database Exports

You have several database export files available for download:

### 1. **whatsapp_pro_mysql_export_final.sql** (RECOMMENDED)
- **Size**: 4,066 bytes
- **Format**: MySQL compatible
- **Content**: Complete database structure and data
- **Best for**: VPS hosting with MySQL/MariaDB

### 2. **database_export.sql**
- **Size**: 9,806 bytes  
- **Format**: PostgreSQL
- **Content**: Full database dump with all tables and data

### 3. **whatsapp_pro_mysql_export.sql**
- **Size**: 3,637 bytes
- **Format**: MySQL format
- **Content**: Alternative MySQL export

## How to Download

### Method 1: Direct Download from Replit
1. In your Replit project, click on the **Files** panel (left sidebar)
2. Look for the SQL files in the root directory
3. Right-click on `whatsapp_pro_mysql_export_final.sql`
4. Select **"Download"**
5. Save it to your computer

### Method 2: Using Replit Console
1. Open the **Console** in Replit
2. Run this command to create a downloadable archive:
```bash
tar -czf database_backup.tar.gz *.sql VPS_DEPLOYMENT_GUIDE.md
```
3. Download the `database_backup.tar.gz` file

## Database Contents

Your database includes:
- **Users**: Admin user with credentials (admin/admin123)
- **Messages**: WhatsApp message history and logs
- **Templates**: WhatsApp Business message templates
- **Campaigns**: Bulk messaging campaign data
- **Conversations**: Chat conversations and contact info
- **Contacts**: Contact management data
- **Settings**: WhatsApp API configuration and app settings

## Next Steps for VPS Deployment

1. **Download** `whatsapp_pro_mysql_export_final.sql`
2. **Download** `VPS_DEPLOYMENT_GUIDE.md` for complete setup instructions
3. **Download** your entire project files (you can zip the whole project)

## Quick VPS Setup Summary

1. **Upload files** to your VPS via CWP File Manager
2. **Install Node.js** (version 18+)
3. **Setup database** (MySQL or PostgreSQL)
4. **Import database** using the downloaded SQL file
5. **Configure environment** variables (.env file)
6. **Install dependencies** (`npm install`)
7. **Build application** (`npm run build`)
8. **Setup reverse proxy** (Apache/Nginx via CWP)
9. **Create service** for auto-restart
10. **Configure SSL** certificate

## Database Connection Strings

### For MySQL:
```
DATABASE_URL="mysql://username:password@localhost:3306/whatsapp_pro"
```

### For PostgreSQL:
```
DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_pro"
```

## Support

If you need help during deployment:
1. Check the VPS_DEPLOYMENT_GUIDE.md for detailed steps
2. Ensure your domain points to your VPS IP
3. Configure WhatsApp webhook URL: `https://yourdomain.com/api/webhook`
4. Test with admin login: username=`admin`, password=`admin123`

Your WhatsApp Pro application is ready for production deployment!