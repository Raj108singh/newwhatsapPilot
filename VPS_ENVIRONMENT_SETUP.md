# VPS Environment Setup - Final Fix

## Issue: DATABASE_URL Not Found on VPS

The error shows your application can't find the DATABASE_URL environment variable when running on your VPS.

## Solutions:

### Solution 1: Set Environment Variable in Shell (Quick Fix)

```bash
# SSH into your VPS and run:
cd /home/niharsk/whatsappPro/newwhatsappPilot/

# Set the environment variable and run the app:
DATABASE_URL="mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@localhost:3306/niharsk_whatsapp_raj" node dist/index.js
```

### Solution 2: Create .env File

Create a `.env` file in your project root:

```bash
# In your project directory:
nano .env

# Add this line:
DATABASE_URL=mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@localhost:3306/niharsk_whatsapp_raj
```

Then install dotenv and update your application:

```bash
npm install dotenv
```

### Solution 3: Export Environment Variable

```bash
# Add to your shell profile:
echo 'export DATABASE_URL="mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@localhost:3306/niharsk_whatsapp_raj"' >> ~/.bashrc
source ~/.bashrc

# Then run:
node dist/index.js
```

### Solution 4: Update CWP Node.js App Settings

In your CWP panel:
1. Go to Node.js Apps → whatsappPro
2. In "Environment variables" section
3. Add:
   - **Name**: `DATABASE_URL`
   - **Value**: `mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@localhost:3306/niharsk_whatsapp_raj`
4. Save and restart the app through CWP

## Correct Commands:

```bash
# Build the application first:
npm run build

# Then run the correct file:
node dist/index.js

# OR with environment variable:
DATABASE_URL="mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@localhost:3306/niharsk_whatsapp_raj" node dist/index.js
```

## Expected Success Output:

```
Default admin user created: username=admin, password=admin123
[timestamp] [express] serving on port 3000
```

## If Database Connection Still Fails:

1. **Test MySQL connection**:
```bash
mysql -u niharsk_whatsapp_raj -p niharsk_whatsapp_raj
# Enter password: niharsk_whatsapp_raj
```

2. **Check if database exists**:
```sql
SHOW DATABASES;
USE niharsk_whatsapp_raj;
SHOW TABLES;
```

3. **Import database if empty**:
```bash
mysql -u niharsk_whatsapp_raj -p niharsk_whatsapp_raj < whatsapp_pro_complete_export_2025_08_19.sql
```

## Alternative: Use CWP's Built-in Node.js Management

Instead of running manually, use CWP's Node.js app management:
1. Upload all files to the app directory
2. Set environment variables in CWP
3. Use CWP's start/restart buttons
4. Check logs in CWP panel

This ensures proper environment variable handling.