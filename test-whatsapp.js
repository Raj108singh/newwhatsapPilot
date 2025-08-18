// Test WhatsApp API Configuration
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fetch from 'node-fetch';

async function testWhatsAppConfig() {
  console.log('🔍 Testing WhatsApp API Configuration...\n');
  
  try {
    // Get database connection
    const connectionString = process.env.DATABASE_URL;
    const sql = postgres(connectionString);
    const db = drizzle(sql, { schema: require('./shared/schema.ts') });
    
    // Get settings
    const { settings } = require('./shared/schema.ts');
    const allSettings = await db.select().from(settings);
    
    // Find WhatsApp settings
    const tokenSetting = allSettings.find(s => s.key === 'whatsapp_token');
    const phoneNumberIdSetting = allSettings.find(s => s.key === 'whatsapp_phone_number_id');
    const businessAccountIdSetting = allSettings.find(s => s.key === 'whatsapp_business_account_id');
    
    console.log('📋 Current WhatsApp Settings:');
    console.log(`- Token: ${tokenSetting?.value ? '✅ Configured (' + tokenSetting.value.substring(0, 20) + '...)' : '❌ Missing'}`);
    console.log(`- Phone Number ID: ${phoneNumberIdSetting?.value ? '✅ ' + phoneNumberIdSetting.value : '❌ Missing'}`);
    console.log(`- Business Account ID: ${businessAccountIdSetting?.value ? '✅ ' + businessAccountIdSetting.value : '❌ Missing'}\n`);
    
    if (!tokenSetting?.value || !phoneNumberIdSetting?.value) {
      console.log('❌ PROBLEM: Missing required WhatsApp credentials!');
      console.log('📝 To fix this:');
      console.log('1. Go to Settings in the app');
      console.log('2. Add your WhatsApp Business API Access Token');
      console.log('3. Add your WhatsApp Phone Number ID');
      console.log('4. Add your WhatsApp Business Account ID (optional but recommended)');
      console.log('\n🔗 Get these from: https://developers.facebook.com/apps/');
      sql.end();
      return;
    }
    
    // Test API connection
    console.log('🌐 Testing WhatsApp Business API connection...');
    
    const testUrl = `https://graph.facebook.com/v17.0/${phoneNumberIdSetting.value}`;
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${tokenSetting.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ WhatsApp API connection successful!');
      console.log(`📞 Phone Number: ${data.display_phone_number || data.phone_number || 'Unknown'}`);
      console.log(`🔢 Phone Number ID: ${data.id || phoneNumberIdSetting.value}`);
      console.log(`✅ Status: ${data.code_verification_status || 'Active'}\n`);
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ WhatsApp API connection failed!');
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Error: ${JSON.stringify(errorData, null, 2)}\n`);
      
      if (response.status === 401) {
        console.log('🔐 This is likely an authentication issue:');
        console.log('- Check if your Access Token is valid');
        console.log('- Ensure the token has whatsapp_business_messaging permission');
        console.log('- Verify the token hasn\'t expired');
      }
    }
    
    sql.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWhatsAppConfig();