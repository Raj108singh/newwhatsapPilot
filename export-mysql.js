#!/usr/bin/env node

/**
 * WhatsApp Pro - Database Export to MySQL
 * Exports PostgreSQL database to MySQL-compatible format
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database connection configuration
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function exportToMySQL() {
  console.log('🚀 Starting database export to MySQL format...');
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    let mysqlDump = '';
    
    // Add MySQL header
    mysqlDump += `-- WhatsApp Pro Database Export\n`;
    mysqlDump += `-- Generated on: ${new Date().toISOString()}\n`;
    mysqlDump += `-- Export format: MySQL 8.0 compatible\n\n`;
    
    mysqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    mysqlDump += `SET AUTOCOMMIT = 0;\n`;
    mysqlDump += `START TRANSACTION;\n\n`;

    // Export Users Table
    console.log('📋 Exporting users table...');
    mysqlDump += exportTable('users', [
      { name: 'id', type: 'VARCHAR(36)', key: 'PRIMARY' },
      { name: 'username', type: 'VARCHAR(255)', unique: true },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'password_hash', type: 'TEXT' },
      { name: 'avatar_url', type: 'TEXT' },
      { name: 'company_name', type: 'VARCHAR(255)' },
      { name: 'company_logo_url', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]);

    // Export Templates Table  
    console.log('📋 Exporting templates table...');
    mysqlDump += exportTable('templates', [
      { name: 'id', type: 'VARCHAR(36)', key: 'PRIMARY' },
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'language', type: 'VARCHAR(10)' },
      { name: 'category', type: 'VARCHAR(100)' },
      { name: 'components', type: 'JSON' },
      { name: 'status', type: 'VARCHAR(50)', default: "'APPROVED'" },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]);

    // Export Messages Table
    console.log('📋 Exporting messages table...');
    mysqlDump += exportTable('messages', [
      { name: 'id', type: 'VARCHAR(36)', key: 'PRIMARY' },
      { name: 'phone_number', type: 'VARCHAR(20)' },
      { name: 'content', type: 'TEXT' },
      { name: 'direction', type: 'VARCHAR(20)' },
      { name: 'message_type', type: 'VARCHAR(50)', default: "'text'" },
      { name: 'template_id', type: 'VARCHAR(36)' },
      { name: 'template_data', type: 'JSON' },
      { name: 'status', type: 'VARCHAR(50)', default: "'sent'" },
      { name: 'whatsapp_message_id', type: 'VARCHAR(255)' },
      { name: 'buttons', type: 'JSON' },
      { name: 'media_url', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
    ]);

    // Export Campaigns Table
    console.log('📋 Exporting campaigns table...');
    mysqlDump += exportTable('campaigns', [
      { name: 'id', type: 'VARCHAR(36)', key: 'PRIMARY' },
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'template_id', type: 'VARCHAR(36)' },
      { name: 'recipients', type: 'JSON' },
      { name: 'total_recipients', type: 'INT' },
      { name: 'sent_count', type: 'INT', default: '0' },
      { name: 'delivered_count', type: 'INT', default: '0' },
      { name: 'failed_count', type: 'INT', default: '0' },
      { name: 'status', type: 'VARCHAR(50)', default: "'draft'" },
      { name: 'scheduled_at', type: 'TIMESTAMP NULL' },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'completed_at', type: 'TIMESTAMP NULL' }
    ]);

    // Export Contacts Table
    console.log('📋 Exporting contacts table...');
    mysqlDump += exportTable('contacts', [
      { name: 'id', type: 'VARCHAR(36)', key: 'PRIMARY' },
      { name: 'phone_number', type: 'VARCHAR(20)', unique: true },
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'tags', type: 'JSON' },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
    ]);

    // Export Settings Table
    console.log('📋 Exporting settings table...');
    mysqlDump += exportTable('settings', [
      { name: 'id', type: 'VARCHAR(36)', key: 'PRIMARY' },
      { name: 'key', type: 'VARCHAR(255)', unique: true },
      { name: 'value', type: 'JSON' },
      { name: 'category', type: 'VARCHAR(100)', default: "'general'" },
      { name: 'is_encrypted', type: 'BOOLEAN', default: 'FALSE' },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]);

    // Export Conversations Table
    console.log('📋 Exporting conversations table...');
    mysqlDump += exportTable('conversations', [
      { name: 'id', type: 'VARCHAR(36)', key: 'PRIMARY' },
      { name: 'phone_number', type: 'VARCHAR(20)', unique: true },
      { name: 'contact_name', type: 'VARCHAR(255)' },
      { name: 'last_message', type: 'TEXT' },
      { name: 'last_message_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'unread_count', type: 'INT', default: '0' },
      { name: 'status', type: 'VARCHAR(50)', default: "'active'" },
      { name: 'assigned_to', type: 'VARCHAR(36)' },
      { name: 'tags', type: 'JSON' },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]);

    // Export data from each table
    await exportTableData('users', mysqlDump);
    await exportTableData('templates', mysqlDump);
    await exportTableData('messages', mysqlDump);
    await exportTableData('campaigns', mysqlDump);
    await exportTableData('contacts', mysqlDump);
    await exportTableData('settings', mysqlDump);
    await exportTableData('conversations', mysqlDump);

    mysqlDump += `\nCOMMIT;\n`;
    mysqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    // Write to file
    const exportPath = path.join(__dirname, 'whatsapp_pro_mysql_export.sql');
    fs.writeFileSync(exportPath, mysqlDump);
    
    console.log('✅ Export completed successfully!');
    console.log(`📁 File saved as: ${exportPath}`);
    console.log(`📊 File size: ${(fs.statSync(exportPath).size / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    await client.end();
  }
}

function exportTable(tableName, columns) {
  let sql = `-- Table structure for ${tableName}\n`;
  sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
  sql += `CREATE TABLE \`${tableName}\` (\n`;
  
  const columnDefs = columns.map(col => {
    let def = `  \`${col.name}\` ${col.type}`;
    if (col.key === 'PRIMARY') def += ' PRIMARY KEY';
    if (col.unique) def += ' UNIQUE';
    if (col.default) def += ` DEFAULT ${col.default}`;
    return def;
  });
  
  sql += columnDefs.join(',\n');
  sql += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;
  
  return sql;
}

async function exportTableData(tableName, mysqlDump) {
  try {
    const result = await client.query(`SELECT * FROM ${tableName}`);
    
    if (result.rows.length > 0) {
      console.log(`📦 Exporting ${result.rows.length} records from ${tableName}`);
      
      mysqlDump += `-- Data for table ${tableName}\n`;
      mysqlDump += `INSERT INTO \`${tableName}\` VALUES\n`;
      
      const values = result.rows.map(row => {
        const escapedValues = Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          return val;
        });
        return `(${escapedValues.join(', ')})`;
      });
      
      mysqlDump += values.join(',\n');
      mysqlDump += ';\n\n';
    }
  } catch (error) {
    console.log(`⚠️  Warning: Could not export data from ${tableName}:`, error.message);
  }
}

// Run export
exportToMySQL();