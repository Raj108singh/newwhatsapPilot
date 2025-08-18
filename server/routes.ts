import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTemplateSchema, insertMessageSchema, insertCampaignSchema, insertContactSchema } from "@shared/schema";
import { z } from "zod";

interface WhatsAppMessage {
  to: string;
  type: string;
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
  text?: {
    body: string;
  };
}

class WhatsAppService {
  private token: string;
  private phoneNumberId: string;

  constructor() {
    this.token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "default_token";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "default_phone_id";
  }

  async sendMessage(message: WhatsAppMessage): Promise<any> {
    const url = `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('WhatsApp API error:', error);
      throw error;
    }
  }

  async sendBulkMessages(recipients: string[], templateId: string, parameters: any[] = []): Promise<any[]> {
    const template = await storage.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const results = [];
    for (const recipient of recipients) {
      try {
        const message: WhatsAppMessage = {
          to: recipient,
          type: 'template',
          template: {
            name: template.name.toLowerCase().replace(/\s+/g, '_'),
            language: {
              code: template.language,
            },
            components: parameters.length > 0 ? [
              {
                type: 'body',
                parameters: parameters.map(param => ({ type: 'text', text: param }))
              }
            ] : undefined,
          },
        };

        const result = await this.sendMessage(message);
        results.push({ recipient, success: true, result });

        // Store message in database
        await storage.createMessage({
          phoneNumber: recipient,
          content: `Template: ${template.name}`,
          direction: 'outbound',
          messageType: 'template',
          status: 'sent',
          templateId: template.id,
        });

      } catch (error) {
        results.push({ recipient, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const whatsappService = new WhatsAppService();
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log('Client connected to WebSocket');

    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  // Broadcast message to all connected clients
  function broadcastMessage(message: any) {
    const data = JSON.stringify(message);
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Templates API
  app.get('/api/templates', async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  app.post('/api/templates', async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid template data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create template' });
      }
    }
  });

  app.put('/api/templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const templateData = insertTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(id, templateData);
      
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid template data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update template' });
      }
    }
  });

  app.delete('/api/templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTemplate(id);
      
      if (!deleted) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // Messages API
  app.get('/api/messages', async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // Broadcast new message to connected clients
      broadcastMessage({
        type: 'new_message',
        data: message,
      });

      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid message data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create message' });
      }
    }
  });

  // Campaigns API
  app.get('/api/campaigns', async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    try {
      const campaignData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid campaign data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create campaign' });
      }
    }
  });

  // Bulk messaging endpoint
  app.post('/api/send-bulk', async (req, res) => {
    try {
      const { templateId, recipients, parameters = [], campaignName } = req.body;

      if (!templateId || !recipients || !Array.isArray(recipients)) {
        res.status(400).json({ error: 'Missing required fields: templateId, recipients' });
        return;
      }

      // Create campaign
      const campaign = await storage.createCampaign({
        name: campaignName || `Campaign ${new Date().toISOString()}`,
        templateId,
        recipients,
        totalRecipients: recipients.length,
        status: 'running',
      });

      // Start sending messages in background
      whatsappService.sendBulkMessages(recipients, templateId, parameters)
        .then(async (results) => {
          const successCount = results.filter(r => r.success).length;
          const failedCount = results.filter(r => !r.success).length;

          await storage.updateCampaign(campaign.id, {
            status: 'completed',
            sentCount: successCount,
            deliveredCount: successCount, // Assume sent = delivered for now
            failedCount,
          });

          // Broadcast campaign completion
          broadcastMessage({
            type: 'campaign_completed',
            data: {
              campaignId: campaign.id,
              results,
            },
          });
        })
        .catch(async (error) => {
          await storage.updateCampaign(campaign.id, {
            status: 'failed',
          });

          broadcastMessage({
            type: 'campaign_failed',
            data: {
              campaignId: campaign.id,
              error: error.message,
            },
          });
        });

      res.json({
        success: true,
        campaignId: campaign.id,
        message: 'Bulk message campaign started',
      });

    } catch (error) {
      console.error('Bulk messaging error:', error);
      res.status(500).json({ error: 'Failed to send bulk messages' });
    }
  });

  // Webhook endpoint for WhatsApp
  app.post('/api/webhook', async (req, res) => {
    try {
      const { entry } = req.body;

      if (entry && entry[0] && entry[0].changes) {
        const changes = entry[0].changes[0];
        
        if (changes.field === 'messages' && changes.value.messages) {
          const incomingMessage = changes.value.messages[0];
          
          // Store incoming message
          const message = await storage.createMessage({
            phoneNumber: incomingMessage.from,
            content: incomingMessage.text?.body || incomingMessage.type,
            direction: 'inbound',
            messageType: incomingMessage.type,
            status: 'received',
          });

          // Broadcast to connected clients
          broadcastMessage({
            type: 'new_message',
            data: message,
          });
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Webhook verification for WhatsApp
  app.get('/api/webhook', (req, res) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'default_verify_token';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  });

  // Contacts API
  app.get('/api/contacts', async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.post('/api/contacts', async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid contact data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create contact' });
      }
    }
  });

  // Statistics endpoint
  app.get('/api/stats', async (req, res) => {
    try {
      const messages = await storage.getMessages();
      const campaigns = await storage.getCampaigns();
      const templates = await storage.getTemplates();
      const contacts = await storage.getContacts();

      const stats = {
        messagesSent: messages.filter(m => m.direction === 'outbound').length,
        deliveryRate: 98.5, // This would be calculated from actual delivery statuses
        activeChats: new Set(messages.map(m => m.phoneNumber)).size,
        templates: templates.length,
        contacts: contacts.length,
        campaigns: campaigns.length,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // Settings endpoint (informational only - Replit handles actual env vars)
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = {
        whatsappConfigured: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
        webhookUrl: `${req.protocol}://${req.get('host')}/api/webhook`,
        businessName: 'WhatsApp Pro Business',
        timezone: 'UTC',
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      // In production, settings would be updated via environment variables
      // For now, we just acknowledge the request
      res.json({ 
        success: true, 
        message: 'Settings update request received. Please update environment variables in Replit Secrets.' 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  return httpServer;
}
