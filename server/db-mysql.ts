import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// Check if we have a MySQL database URL or create a default one for development
let connectionConfig: any;

// Prefer MYSQL_DATABASE_URL if available, then VPS_DATABASE_URL, fallback to DATABASE_URL
const databaseUrl = process.env.MYSQL_DATABASE_URL || process.env.VPS_DATABASE_URL || process.env.DATABASE_URL;

if (databaseUrl && databaseUrl.startsWith('mysql://')) {
  connectionConfig = databaseUrl;
  console.log('✅ Using MySQL DATABASE_URL for database connection');
  console.log(`🔗 Connecting to: ${databaseUrl.replace(/\/\/.*:.*@/, '//***:***@')}`); // Log without credentials
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
    ssl: false,
  };
}

// Create MySQL connection pool with UTF-8 support
export const connection = mysql.createPool(
  typeof connectionConfig === 'string' 
    ? {
        uri: connectionConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: false,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        connectTimeout: 60000,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
      }
    : {
        ...connectionConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        connectTimeout: 60000,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
      }
);

export const db = drizzle(connection, { schema, mode: 'default' });