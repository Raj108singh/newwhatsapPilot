# DATABASE_URL Configuration Guide

## Where to Update DATABASE_URL

### **1. CWP Panel Environment Variables (MAIN LOCATION)**

In your CWP Node.js application settings:

**Click "Add environment variable" and enter:**
- **Name**: `DATABASE_URL`
- **Value**: `mysql://your_db_user:your_db_password@localhost:3306/whatsapp_pro`

**Example:**
```
DATABASE_URL=mysql://whatsapp_user:secure_password123@localhost:3306/whatsapp_pro
```

### **2. Local .env File (For Testing)**

Create a `.env` file in your project root:
```bash
DATABASE_URL="mysql://whatsapp_user:secure_password123@localhost:3306/whatsapp_pro"
NODE_ENV=production
PORT=3000
```

### **3. Update Application Code for MySQL**

**Your current code uses PostgreSQL. For MySQL, you need to:**

#### Option A: Use MySQL Database (Recommended)
Replace `server/db.ts` with `server/db-mysql.ts` (already created):

```javascript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

export const connection = mysql.createPool({
  uri: process.env.DATABASE_URL
});
export const db = drizzle(connection, { schema, mode: 'default' });
```

#### Option B: Keep PostgreSQL 
Install PostgreSQL on your VPS and use:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/whatsapp_pro"
```

### **4. Database Connection Examples**

#### For MySQL (Recommended for VPS):
```bash
# Format 1: Connection String
DATABASE_URL="mysql://username:password@host:port/database"

# Format 2: With SSL
DATABASE_URL="mysql://username:password@host:port/database?ssl=true"

# Example:
DATABASE_URL="mysql://whatsapp_user:mySecurePass123@localhost:3306/whatsapp_pro"
```

#### For PostgreSQL:
```bash
DATABASE_URL="postgresql://username:password@host:port/database"

# Example:
DATABASE_URL="postgresql://postgres:mySecurePass123@localhost:5432/whatsapp_pro"
```

## Step-by-Step VPS Setup:

### **Step 1: Create Database**
```bash
# For MySQL
mysql -u root -p
CREATE DATABASE whatsapp_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'whatsapp_user'@'localhost' IDENTIFIED BY 'secure_password123';
GRANT ALL PRIVILEGES ON whatsapp_pro.* TO 'whatsapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **Step 2: Import Your Data**
```bash
mysql -u whatsapp_user -p whatsapp_pro < whatsapp_pro_complete_export_2025_08_19.sql
```

### **Step 3: Set Environment Variable in CWP**
- Go to your Node.js app settings
- Click "Add environment variable"
- Name: `DATABASE_URL`  
- Value: `mysql://whatsapp_user:secure_password123@localhost:3306/whatsapp_pro`

### **Step 4: Install MySQL Dependencies**
Add to your package.json:
```bash
npm install mysql2
```

### **Step 5: Update Database Configuration**
Replace the import in your files from:
```javascript
// Change this
import { db } from './db.ts';

// To this  
import { db } from './db-mysql.ts';
```

## Testing Database Connection:

### **Test locally:**
```bash
# Set environment variable
export DATABASE_URL="mysql://whatsapp_user:secure_password123@localhost:3306/whatsapp_pro"

# Test connection
node -e "
const mysql = require('mysql2/promise');
mysql.createConnection(process.env.DATABASE_URL)
  .then(() => console.log('Database connected successfully!'))
  .catch(err => console.error('Database connection failed:', err));
"
```

### **Common Issues:**

1. **Connection refused**: Check if MySQL/PostgreSQL is running
2. **Access denied**: Verify username/password
3. **Database not found**: Make sure database exists
4. **SSL issues**: Add `?ssl=false` to connection string

## Current Application Database Schema:

Your application expects these tables:
- `users` (admin account)
- `templates` (WhatsApp templates)
- `messages` (chat history)
- `campaigns` (bulk messaging)
- `conversations` (chat sessions)
- `contacts` (contact management)
- `settings` (WhatsApp API config)

All these are included in your `whatsapp_pro_complete_export_2025_08_19.sql` file.

## Quick Verification:

Once configured, test by visiting:
- `https://yourdomain.com` - Should show login page
- Login with: `admin` / `admin123`
- Check Settings page to verify WhatsApp API connection