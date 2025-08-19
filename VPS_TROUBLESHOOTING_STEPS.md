# VPS Troubleshooting - DATABASE_URL Already Set

## Current Status:
✅ **DATABASE_URL is set correctly**: `mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@localhost:3306/niharsk_whatsapp_raj`

## Issues to Fix:

### 1. **Install MySQL Driver on Your VPS**
Your application needs the `mysql2` package. SSH into your VPS and run:

```bash
cd /home/niharsk/whatsappPro/newwhatsappPilot/
npm install mysql2
npm install drizzle-orm@^0.39.1
```

### 2. **Import Your Database**
Make sure your database exists and has data:

```bash
# First, upload your SQL file to the server, then:
mysql -u niharsk_whatsapp_raj -p niharsk_whatsapp_raj < whatsapp_pro_complete_export_2025_08_19.sql
```

### 3. **Verify Database Connection**
Test if your database connection works:

```bash
mysql -u niharsk_whatsapp_raj -p
# Enter password: niharsk_whatsapp_raj
USE niharsk_whatsapp_raj;
SHOW TABLES;
# You should see: users, templates, messages, campaigns, etc.
EXIT;
```

### 4. **Update Your Code (Download from Replit)**
I've updated the database configuration. Download these updated files:

**Updated files to download:**
- `server/db.ts` (now configured for MySQL)
- Upload this to replace your current `server/db.ts` on the VPS

### 5. **Rebuild Your Application**
After uploading the updated files:

```bash
cd /home/niharsk/whatsappPro/newwhatsappPilot/
npm install
npm run build
```

### 6. **Test the Application**
Now try running it again:

```bash
node dist/index.js
```

## Expected Result:
The DATABASE_URL error should be gone, and you should see:
```
Default admin user created: username=admin, password=admin123
[timestamp] [express] serving on port 3000
```

## If Still Getting Database Errors:

### Check 1: Verify MySQL is Running
```bash
sudo systemctl status mysql
# or
sudo systemctl status mariadb
```

### Check 2: Test Connection Manually
```bash
node -e "
const mysql = require('mysql2/promise');
mysql.createConnection('mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@localhost:3306/niharsk_whatsapp_raj')
  .then(() => console.log('✅ Database connected!'))
  .catch(err => console.error('❌ Connection failed:', err.message));
"
```

### Check 3: Alternative Connection Format
If the URI format doesn't work, you can modify the connection in `server/db.ts`:

```javascript
const connection = mysql.createPool({
  host: 'localhost',
  user: 'niharsk_whatsapp_raj',
  password: 'niharsk_whatsapp_raj',
  database: 'niharsk_whatsapp_raj',
  port: 3306,
  connectionLimit: 10,
});
```

## Final Verification:
Once working, visit `https://yourdomain.com` and login with:
- Username: `admin`
- Password: `admin123`

## Next Steps After Working:
1. Configure your WhatsApp webhook: `https://yourdomain.com/api/webhook`
2. Update WhatsApp API settings in the dashboard
3. Test message sending functionality