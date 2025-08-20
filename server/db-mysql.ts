import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// Check if we have a MySQL database URL or create a default one for development
let connectionConfig: any;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://')) {
  // Update DATABASE_URL to use VPS IP instead of localhost
  let databaseUrl = process.env.DATABASE_URL;
  if (process.env.VPS_IP_ADDRESS && databaseUrl.includes('@localhost:')) {
    databaseUrl = databaseUrl.replace('@localhost:', `@${process.env.VPS_IP_ADDRESS}:`);
    console.log(`✅ Updated DATABASE_URL to use VPS IP: ${process.env.VPS_IP_ADDRESS}`);
  }
  connectionConfig = databaseUrl;
  console.log('✅ Using MySQL DATABASE_URL for database connection');
} else {
  // Default MySQL configuration for local development
  console.log('⚠️  No MySQL DATABASE_URL found. Using default local MySQL configuration.');
  console.log('🔧 For production, set DATABASE_URL=mysql://user:password@host:port/database');
  
  connectionConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'whatsapp_pro',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}

// Create MySQL connection pool
export const connection = mysql.createPool(
  typeof connectionConfig === 'string' 
    ? {
        uri: connectionConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        ...connectionConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      }
);

export const db = drizzle(connection, { schema, mode: 'default' });