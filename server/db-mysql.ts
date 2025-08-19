import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create MySQL connection
export const connection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  // Alternative format if URI doesn't work:
  // host: 'localhost',
  // user: 'your_db_user',
  // password: 'your_db_password',
  // database: 'whatsapp_pro',
  // port: 3306,
});

export const db = drizzle(connection, { schema, mode: 'default' });