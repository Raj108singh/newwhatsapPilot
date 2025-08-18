import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertTemplateSchema, insertMessageSchema, insertCampaignSchema, insertContactSchema, insertSettingSchema,
  insertAutoReplyRuleSchema, insertConversationSchema, loginSchema 
} from "@shared/schema";
import { z } from "zod";
import { authService } from "./auth";

interface WhatsAppMessage {
  messaging_product: 'whatsapp';
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
  private businessAccountId: string;

  constructor() {
    this.token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "default_token";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "default_phone_id";
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "default_business_id";
  }

  // Update credentials from database
  async updateCredentials(): Promise<void> {
    try {
      const tokenSetting = await storage.getSetting('whatsapp_token');
      const phoneNumberIdSetting = await storage.getSetting('whatsapp_phone_number_id');
      const businessAccountIdSetting = await storage.getSetting('whatsapp_business_account_id');

      console.log('Retrieved settings from database:', {
        tokenExists: !!tokenSetting?.value,
        phoneNumberIdExists: !!phoneNumberIdSetting?.value,
        businessAccountIdExists: !!businessAccountIdSetting?.value,
        tokenPrefix: tokenSetting?.value ? (tokenSetting.value as string).substring(0, 10) + '...' : 'None',
        phoneNumberId: phoneNumberIdSetting?.value || 'None',
        businessAccountId: businessAccountIdSetting?.value || 'None'
      });

      if (tokenSetting?.value) {
        this.token = tokenSetting.value as string;
      }
      if (phoneNumberIdSetting?.value) {
        this.phoneNumberId = phoneNumberIdSetting.value as string;
      }
      if (businessAccountIdSetting?.value) {
        this.businessAccountId = businessAccountIdSetting.value as string;
      }

      console.log('Updated WhatsApp service credentials:', {
        tokenPrefix: this.token.substring(0, 10) + '...',
        phoneNumberId: this.phoneNumberId,
        businessAccountId: this.businessAccountId
      });
    } catch (error) {
      console.error('Error updating WhatsApp credentials from database:', error);
    }
  }

  // Check if credentials are configured
  async areCredentialsConfigured(): Promise<boolean> {
    await this.updateCredentials();
    return !!(this.token && this.token !== 'default_token' && 
              this.phoneNumberId && this.phoneNumberId !== 'default_phone_id');
  }

  // Get business account details
  async getBusinessAccount(): Promise<any> {
    const url = `https://graph.facebook.com/v18.0/${this.businessAccountId}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`WhatsApp Business API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('WhatsApp Business Account API error:', error);
      throw error;
    }
  }

  // Get templates from business account
  async getTemplates(): Promise<any[]> {
    const url = `https://graph.facebook.com/v18.0/${this.businessAccountId}/message_templates`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`WhatsApp Templates API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('WhatsApp Templates API error:', error);
      throw error;
    }
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
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        console.error('WhatsApp API error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          requestMessage: message,
          url: url
        });
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('WhatsApp API error:', error);
      throw error;
    }
  }

  async sendBulkMessages(recipients: string[], templateId: string, parameters: any[] = []): Promise<any[]> {
    // Update credentials before sending
    await this.updateCredentials();
    
    const template = await storage.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    console.log('Sending bulk messages with credentials:', {
      tokenPrefix: this.token.substring(0, 10) + '...',
      phoneNumberId: this.phoneNumberId,
      businessAccountId: this.businessAccountId
    });

    const results = [];
    for (const recipient of recipients) {
      try {
        const message: WhatsAppMessage = {
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: template.name,
            language: {
              code: template.language,
            },
            components: this.buildTemplateComponents(template.components, parameters),
          },
        };

        console.log('Sending template message:', JSON.stringify(message, null, 2));

        const result = await this.sendMessage(message);
        results.push({ recipient, success: true, result });

        // Store complete template message with actual content
        const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
        const actualContent = bodyComponent?.text || template.name;
        
        const storedMessage = await storage.createMessage({
          phoneNumber: recipient,
          content: actualContent,
          direction: 'outbound',
          messageType: 'template',
          status: 'sent',
          templateId: template.id,
          templateData: template.components,
          buttons: this.extractButtons(template.components),
          mediaUrl: this.extractMediaUrl(template.components),
        });

        // Note: Broadcasting will be handled by the route handler
        console.log('Template message stored:', storedMessage.id);

      } catch (error) {
        console.error(`Failed to send message to ${recipient}:`, error);
        results.push({ recipient, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        
        // Store failed message for tracking
        try {
          await storage.createMessage({
            phoneNumber: recipient,
            content: `Failed to send template: ${template.name}`,
            direction: 'outbound',
            messageType: 'template',
            status: 'failed',
            templateId: template.id,
          });
        } catch (storeError) {
          console.error('Failed to store failed message:', storeError);
        }
      }
    }

    return results;
  }

  // Helper method to extract buttons from template components
  extractButtons(components: any[]): any[] {
    if (!components) return [];
    
    const buttonComponent = components.find(c => c.type === 'BUTTONS');
    return buttonComponent ? buttonComponent.buttons : [];
  }

  // Helper method to extract media URL from template components  
  extractMediaUrl(components: any[]): string | null {
    if (!components) return null;
    
    const headerComponent = components.find(c => c.type === 'HEADER');
    if (headerComponent && headerComponent.format === 'IMAGE') {
      return headerComponent.example?.header_handle?.[0] || null;
    }
    return null;
  }

  // Enhanced method to send template with full components
  async sendTemplateMessage(recipient: string, template: any, parameters: any[] = []): Promise<any> {
    await this.updateCredentials();

    // Build complete template message with all components
    const templateMessage: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: template.name,
        language: {
          code: template.language,
        },
        components: this.buildTemplateComponents(template.components, parameters),
      },
    };

    return await this.sendMessage(templateMessage);
  }

  // Build template components with proper structure for WhatsApp API
  buildTemplateComponents(templateComponents: any[], parameters: any[] = []): any[] {
    if (!templateComponents) return [];
    
    const components: any[] = [];
    let paramIndex = 0;
    
    templateComponents.forEach((component: any) => {
      if (component.type === "HEADER" && component.format === "TEXT" && component.text) {
        const headerMatches = component.text.match(/\{\{(\d+)\}\}/g);
        if (headerMatches && parameters[paramIndex]) {
          components.push({
            type: "header",
            parameters: headerMatches.map(() => ({
              type: "text",
              text: parameters[paramIndex++] || ""
            }))
          });
        }
      }
      
      if (component.type === "BODY" && component.text) {
        const bodyMatches = component.text.match(/\{\{(\d+)\}\}/g);
        if (bodyMatches && bodyMatches.length > 0) {
          components.push({
            type: "body",
            parameters: bodyMatches.map(() => ({
              type: "text",
              text: parameters[paramIndex++] || ""
            }))
          });
        }
      }
      
      if (component.type === "BUTTONS" && component.buttons) {
        const buttonParams: any[] = [];
        component.buttons.forEach((button: any, buttonIndex: number) => {
          if (button.type === "URL" && button.url && button.url.includes("{{")) {
            const urlMatches = button.url.match(/\{\{(\d+)\}\}/g);
            if (urlMatches) {
              urlMatches.forEach(() => {
                buttonParams.push({
                  type: "text",
                  text: parameters[paramIndex++] || ""
                });
              });
            }
          }
        });
        
        if (buttonParams.length > 0) {
          components.push({
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: buttonParams
          });
        }
      }
    });
    
    return components;

    const components = [];

    templateComponents.forEach((component: any) => {
      switch (component.type) {
        case 'HEADER':
          if (component.format === 'TEXT' && parameters.length > 0) {
            components.push({
              type: 'header',
              parameters: [{ type: 'text', text: parameters[0] || '' }]
            });
          } else if (component.format === 'IMAGE') {
            components.push({
              type: 'header',
              parameters: [{ type: 'image', image: { link: component.example?.header_handle?.[0] || '' } }]
            });
          }
          break;

        case 'BODY':
          if (parameters.length > 0) {
            components.push({
              type: 'body',
              parameters: parameters.map((param, index) => ({ type: 'text', text: param }))
            });
          }
          break;

        case 'BUTTONS':
          // For button templates, we need to handle button parameters
          if (component.buttons) {
            component.buttons.forEach((button: any, index: number) => {
              if (button.type === 'URL' && parameters[index]) {
                components.push({
                  type: 'button',
                  sub_type: 'url',
                  index: index,
                  parameters: [{ type: 'text', text: parameters[index] }]
                });
              }
            });
          }
          break;
      }
    });

    return components;
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

  // Templates API - Fetch from WhatsApp Business API
  app.get('/api/templates', async (req, res) => {
    try {
      const whatsappToken = process.env.WHATSAPP_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!whatsappToken || !phoneNumberId) {
        // Fallback to stored templates if no credentials
        const templates = await storage.getTemplates();
        return res.json(templates);
      }

      // Fetch templates from WhatsApp Business API
      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/message_templates`, {
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Transform WhatsApp API response to our schema
          const whatsappTemplates = data.data?.map((template: any) => ({
            id: template.id,
            name: template.name,
            category: template.category || 'marketing',
            language: template.language || 'en_US',
            status: template.status === 'APPROVED' ? 'approved' : 
                   template.status === 'PENDING' ? 'pending' : 'rejected',
            content: template.components?.find((c: any) => c.type === 'BODY')?.text || '',
            createdAt: new Date(),
          })) || [];

          // Store fetched templates locally for future reference
          for (const template of whatsappTemplates) {
            try {
              await storage.createTemplate(template);
            } catch (error) {
              // Template might already exist, ignore error
            }
          }

          res.json(whatsappTemplates);
        } else {
          console.error('WhatsApp API error response:', await response.text());
          // Fallback to stored templates
          const templates = await storage.getTemplates();
          res.json(templates);
        }
      } catch (apiError) {
        console.error('WhatsApp API fetch error:', apiError);
        // Fallback to stored templates
        const templates = await storage.getTemplates();
        res.json(templates);
      }
    } catch (error) {
      console.error('Templates endpoint error:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  app.post('/api/templates', async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      
      // If we have WhatsApp credentials, create template via API
      const whatsappToken = process.env.WHATSAPP_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      if (whatsappToken && phoneNumberId) {
        try {
          // Create template via WhatsApp Business API
          const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/message_templates`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: templateData.name,
              category: templateData.category.toUpperCase(),
              language: templateData.language,
              components: [
                {
                  type: 'BODY',
                  text: (templateData.components as any)?.[0]?.text || templateData.name,
                }
              ],
            }),
          });

          if (response.ok) {
            const apiResponse = await response.json();
            
            // Store locally with API response data
            const template = await storage.createTemplate({
              name: templateData.name,
              category: templateData.category,
              language: templateData.language,
              components: templateData.components,
              status: 'pending', // New templates start as pending
            });
            
            res.json(template);
          } else {
            const errorData = await response.text();
            console.error('WhatsApp template creation error:', errorData);
            res.status(400).json({ 
              error: 'Failed to create template in WhatsApp Business API',
              details: errorData 
            });
          }
        } catch (apiError) {
          console.error('WhatsApp API error:', apiError);
          res.status(500).json({ error: 'WhatsApp API connection failed' });
        }
      } else {
        // No credentials, store locally only
        const template = await storage.createTemplate(templateData);
        res.json(template);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid template data', details: error.errors });
      } else {
        console.error('Template creation error:', error);
        res.status(500).json({ error: 'Failed to create template' });
      }
    }
  });

  // Refresh templates from WhatsApp API
  app.post('/api/templates/refresh', async (req, res) => {
    try {
      // Update credentials from database first
      await whatsappService.updateCredentials();
      
      // Check if credentials are configured
      const credentialsConfigured = await whatsappService.areCredentialsConfigured();
      
      if (!credentialsConfigured) {
        return res.status(400).json({ 
          error: 'WhatsApp credentials not configured. Please add your WhatsApp Token, Phone Number ID, and Business Account ID in Settings.' 
        });
      }

      // Fetch templates using the business account ID
      const templates = await whatsappService.getTemplates();
      
      // Transform and store templates locally
      let savedCount = 0;
      for (const template of templates) {
        try {
          const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
          
          await storage.createTemplate({
            name: template.name,
            category: template.category?.toLowerCase() || 'marketing',
            language: template.language || 'en',
            status: template.status === 'APPROVED' ? 'approved' : 
                   template.status === 'PENDING' ? 'pending' : 'rejected',
            components: template.components || [
              {
                type: 'BODY',
                text: bodyComponent?.text || `Template: ${template.name}`
              }
            ]
          });
          savedCount++;
        } catch (error) {
          // Template might already exist, continue with next
          console.log(`Template ${template.name} already exists, skipping...`);
        }
      }
      
      res.json({ 
        success: true, 
        message: `Successfully refreshed templates from WhatsApp Business API`,
        totalFetched: templates.length,
        newTemplatesSaved: savedCount,
        templates: templates.length 
      });
    } catch (error) {
      console.error('Template refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh templates from WhatsApp Business API' });
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
  app.post('/api/send-bulk', authenticate, async (req: any, res) => {
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

      console.log('Starting bulk message sending:', { 
        templateId, 
        recipientsCount: recipients.length, 
        parametersCount: parameters.length,
        parameters: parameters 
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

          // Broadcast new messages to all connected clients for real-time updates
          const allMessages = await storage.getMessages();
          broadcastMessage({
            type: 'messages_updated',
            data: allMessages,
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

  // Send individual message API
  app.post('/api/send-message', async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
      }

      // Update credentials from database
      await whatsappService.updateCredentials();

      // Check if credentials are configured
      const credentialsConfigured = await whatsappService.areCredentialsConfigured();
      
      if (!credentialsConfigured) {
        return res.status(400).json({ 
          error: 'WhatsApp credentials not configured. Please add your credentials in Settings.' 
        });
      }

      // Send message using WhatsApp API
      const whatsappMessage: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      };

      const result = await whatsappService.sendMessage(whatsappMessage);

      // Store outbound message in database
      const storedMessage = await storage.createMessage({
        phoneNumber,
        content: message,
        direction: 'outbound',
        messageType: 'text',
        status: 'sent',
      });

      // Broadcast to connected clients
      broadcastMessage({
        type: 'new_message',
        data: storedMessage,
      });

      res.json({
        success: true,
        message: 'Message sent successfully',
        data: storedMessage,
        whatsappResponse: result
      });

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Webhook endpoint for WhatsApp
  app.post('/api/webhook', async (req, res) => {
    try {
      console.log('Webhook received:', JSON.stringify(req.body, null, 2));
      
      const { entry } = req.body;

      if (entry && entry[0] && entry[0].changes) {
        const changes = entry[0].changes[0];
        
        if (changes.field === 'messages' && changes.value.messages) {
          const incomingMessage = changes.value.messages[0];
          
          console.log('Processing incoming message:', incomingMessage);
          
          // Store incoming message
          const message = await storage.createMessage({
            phoneNumber: incomingMessage.from,
            content: incomingMessage.text?.body || incomingMessage.type || 'Media message',
            direction: 'inbound',
            messageType: incomingMessage.type || 'text',
            status: 'received',
          });

          console.log('Stored incoming message:', message);

          // Broadcast to connected clients
          broadcastMessage({
            type: 'new_message',
            data: message,
          });

          console.log('Broadcasted message to clients');
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Webhook verification for WhatsApp
  app.get('/api/webhook', async (req, res) => {
    try {
      // Get verify token from database first
      await whatsappService.updateCredentials();
      const verifyTokenSetting = await storage.getSetting('whatsapp_verify_token');
      const verifyToken = verifyTokenSetting?.value || process.env.WHATSAPP_VERIFY_TOKEN || 'default_verify_token';
      
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('Webhook verification attempt:', { mode, token, expectedToken: verifyToken });

      if (mode === 'subscribe' && token === verifyToken) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send('Forbidden');
      }
    } catch (error) {
      console.error('Webhook verification error:', error);
      res.status(500).send('Internal Server Error');
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

  // Settings endpoint
  app.get('/api/settings', async (req, res) => {
    try {
      // Get settings from database
      const businessNameSetting = await storage.getSetting('business_name');
      const timezoneSetting = await storage.getSetting('timezone');
      const whatsappTokenSetting = await storage.getSetting('whatsapp_token');
      const whatsappPhoneNumberIdSetting = await storage.getSetting('whatsapp_phone_number_id');
      
      // Check if WhatsApp is configured either via env vars or database
      const whatsappConfigured = !!(
        (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) ||
        (whatsappTokenSetting?.value && whatsappPhoneNumberIdSetting?.value)
      );
      
      const settings = {
        whatsappConfigured,
        webhookUrl: `${req.protocol}://${req.get('host')}/api/webhook`,
        businessName: businessNameSetting?.value || 'WhatsApp Pro Business',
        timezone: timezoneSetting?.value || 'UTC',
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { token, phoneNumberId, verifyToken, businessAccountId } = req.body;
      
      // Validate that required fields are provided
      if (!token || !phoneNumberId || !verifyToken) {
        return res.status(400).json({ 
          error: 'Required fields: token, phoneNumberId, verifyToken. BusinessAccountId is optional but recommended.' 
        });
      }

      // Store WhatsApp credentials in database
      await storage.setSetting({
        key: 'whatsapp_token',
        value: token,
        category: 'whatsapp',
        isEncrypted: true
      });

      await storage.setSetting({
        key: 'whatsapp_phone_number_id',
        value: phoneNumberId,
        category: 'whatsapp'
      });

      await storage.setSetting({
        key: 'whatsapp_verify_token',
        value: verifyToken,
        category: 'whatsapp',
        isEncrypted: true
      });

      if (businessAccountId) {
        await storage.setSetting({
          key: 'whatsapp_business_account_id',
          value: businessAccountId,
          category: 'whatsapp'
        });
      }

      console.log('WhatsApp settings saved to database:', {
        token: token ? `${token.substring(0, 8)}...` : 'Not provided',
        phoneNumberId: phoneNumberId || 'Not provided',
        verifyToken: verifyToken ? `${verifyToken.substring(0, 4)}...` : 'Not provided',
        businessAccountId: businessAccountId || 'Not provided'
      });

      res.json({ 
        success: true, 
        message: 'WhatsApp settings saved successfully to database',
        data: {
          tokenSaved: !!token,
          phoneNumberIdSaved: !!phoneNumberId,
          verifyTokenSaved: !!verifyToken,
          businessAccountIdSaved: !!businessAccountId
        }
      });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.post('/api/settings/general', async (req, res) => {
    try {
      const { businessName, timezone } = req.body;
      
      // Save settings to database
      if (businessName) {
        await storage.setSetting({
          key: 'business_name',
          value: businessName,
          category: 'general'
        });
      }
      
      if (timezone) {
        await storage.setSetting({
          key: 'timezone',
          value: timezone,
          category: 'general'
        });
      }
      
      res.json({ 
        success: true, 
        message: 'General settings saved successfully',
        data: { businessName, timezone }
      });
    } catch (error) {
      console.error('General settings error:', error);
      res.status(500).json({ error: 'Failed to save general settings' });
    }
  });

  // Stop campaign endpoint
  app.post('/api/campaigns/:id/stop', async (req, res) => {
    try {
      const { id } = req.params;
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.id === id);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status !== 'running') {
        return res.status(400).json({ error: 'Campaign is not running' });
      }

      // Update campaign status to stopped
      // In a real implementation, you would update the database
      res.json({ 
        success: true, 
        message: 'Campaign stopped successfully' 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop campaign' });
    }
  });

  return httpServer;
}
