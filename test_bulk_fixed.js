// Direct test of bulk messaging function
import { storage } from './server/database-storage.js';

async function testBulkMessage() {
  console.log('Testing bulk message functionality...');
  
  // Test template retrieval
  const template = await storage.getTemplate('44803e03-1b34-4c5f-b18b-f7527136db39');
  console.log('Template found:', template?.name);
  
  // Test campaign creation
  const campaign = await storage.createCampaign({
    name: 'Test Campaign',
    templateId: '44803e03-1b34-4c5f-b18b-f7527136db39',
    recipients: ['+918318868521'],
    totalRecipients: 1,
    status: 'running',
  });
  
  console.log('Campaign created:', campaign.id);
}

testBulkMessage().catch(console.error);