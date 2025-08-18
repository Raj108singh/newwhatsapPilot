import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authService } from "./auth";
import { 
  insertTemplateSchema, insertMessageSchema, insertCampaignSchema, insertContactSchema, insertSettingSchema,
  insertAutoReplyRuleSchema, insertConversationSchema, loginSchema, changePasswordSchema, updateProfileSchema
} from "@shared/schema";
import { z } from "zod";

// Authentication middleware
async function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const user = await authService.authenticate(authHeader);
  
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  req.user = user;
  next();
}

// Auto-reply service
class AutoReplyService {
  async processIncomingMessage(phoneNumber: string, content: string): Promise<string | null> {
    const rules = await storage.getActiveAutoReplyRules();
    
    for (const rule of rules) {
      if (this.matchesRule(content, rule)) {
        return rule.replyMessage;
      }
    }
    
    return null;
  }

  private matchesRule(content: string, rule: any): boolean {
    const lowerContent = content.toLowerCase();
    const trigger = rule.trigger.toLowerCase();
    
    switch (rule.triggerType) {
      case 'keyword':
        return lowerContent.includes(trigger);
      case 'greeting':
        return /^(hi|hello|hey|good morning|good evening)/i.test(content);
      case 'default':
        return true;
      default:
        return false;
    }
  }
}

// WhatsApp Service
class EnhancedWhatsAppService {
  private token: string = "";
  private phoneNumberId: string = "";
  private businessAccountId: string = "";

  async updateCredentials(): Promise<void> {
    const tokenSetting = await storage.getSetting('whatsapp_token');
    const phoneNumberIdSetting = await storage.getSetting('whatsapp_phone_number_id');
    const businessAccountIdSetting = await storage.getSetting('whatsapp_business_account_id');

    if (tokenSetting?.value) this.token = tokenSetting.value as string;
    if (phoneNumberIdSetting?.value) this.phoneNumberId = phoneNumberIdSetting.value as string;
    if (businessAccountIdSetting?.value) this.businessAccountId = businessAccountIdSetting.value as string;
  }

  async sendMessage(message: any): Promise<any> {
    await this.updateCredentials();
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    return await response.json();
  }

  async getTemplates(): Promise<any[]> {
    await this.updateCredentials();
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${this.businessAccountId}/message_templates`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WhatsApp Templates API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }
}

export async function registerModernRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const whatsappService = new EnhancedWhatsAppService();
  const autoReplyService = new AutoReplyService();

  // Initialize default admin user
  await authService.initializeDefaultUser();

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
  });

  function broadcastMessage(message: any) {
    const data = JSON.stringify(message);
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Authentication Routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const result = await authService.login(credentials);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid request data" });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    res.json(req.user);
  });

  app.post('/api/auth/logout', authenticate, async (req: any, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    
    const success = await authService.logout(token);
    res.json({ success });
  });

  // Enhanced Messages API with real-time updates
  app.get('/api/messages', authenticate, async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', authenticate, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Get or create conversation
      let conversation = await storage.getConversationByPhoneNumber(messageData.phoneNumber);
      if (!conversation) {
        conversation = await storage.createConversation({
          phoneNumber: messageData.phoneNumber,
          contactName: messageData.phoneNumber,
          lastMessage: messageData.content,
        });
      }

      messageData.conversationId = conversation.id;
      const message = await storage.createMessage(messageData);

      // Send via WhatsApp
      if (messageData.direction === 'outbound') {
        const whatsappMessage = {
          messaging_product: 'whatsapp',
          to: messageData.phoneNumber,
          type: 'text',
          text: { body: messageData.content },
        };
        
        await whatsappService.sendMessage(whatsappMessage);
      }

      // Broadcast real-time update
      broadcastMessage({
        type: 'new_message',
        data: message,
      });

      res.json(message);
    } catch (error) {
      console.error('Message creation error:', error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Update message status (for delivered, read tracking)
  app.patch('/api/messages/:id/status', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const message = await storage.updateMessage(id, { status });
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Broadcast status update
      broadcastMessage({
        type: 'message_status_update',
        data: { messageId: id, status },
      });

      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to update message status" });
    }
  });

  // Conversations API
  app.get('/api/conversations', authenticate, async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/:id/messages', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByConversation(id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation messages" });
    }
  });

  // Auto Reply Rules API
  app.get('/api/auto-reply-rules', authenticate, async (req, res) => {
    try {
      const rules = await storage.getAutoReplyRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch auto reply rules" });
    }
  });

  app.post('/api/auto-reply-rules', authenticate, async (req, res) => {
    try {
      const ruleData = insertAutoReplyRuleSchema.parse(req.body);
      const rule = await storage.createAutoReplyRule(ruleData);
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to create auto reply rule" });
    }
  });

  app.put('/api/auto-reply-rules/:id', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const ruleData = insertAutoReplyRuleSchema.partial().parse(req.body);
      const rule = await storage.updateAutoReplyRule(id, ruleData);
      
      if (!rule) {
        return res.status(404).json({ error: "Auto reply rule not found" });
      }
      
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to update auto reply rule" });
    }
  });

  app.delete('/api/auto-reply-rules/:id', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAutoReplyRule(id);
      
      if (!success) {
        return res.status(404).json({ error: "Auto reply rule not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete auto reply rule" });
    }
  });

  // Enhanced Settings API
  app.get('/api/settings', authenticate, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const settingsMap: any = {};
      
      settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      // Check WhatsApp configuration
      const whatsappConfigured = !!(
        settingsMap.whatsapp_token && 
        settingsMap.whatsapp_phone_number_id &&
        settingsMap.whatsapp_business_account_id
      );

      res.json({
        ...settingsMap,
        whatsappConfigured,
        webhookUrl: `${req.protocol}://${req.get('host')}/api/webhook`,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', authenticate, async (req, res) => {
    try {
      const updates = req.body;
      
      for (const [key, value] of Object.entries(updates)) {
        // Handle WhatsApp API settings with proper key mapping
        let settingKey = key;
        if (key === 'token') settingKey = 'whatsapp_token';
        if (key === 'phoneNumberId') settingKey = 'whatsapp_phone_number_id';
        if (key === 'verifyToken') settingKey = 'whatsapp_verify_token';
        if (key === 'businessAccountId') settingKey = 'whatsapp_business_account_id';
        
        const category = settingKey.startsWith('whatsapp_') ? 'whatsapp' : 
                        settingKey.startsWith('company_') ? 'branding' : 'general';
        const isEncrypted = settingKey.includes('token') || settingKey.includes('secret');
        
        await storage.setSetting({
          key: settingKey,
          value: value as any,
          category,
          isEncrypted,
        });
      }

      res.json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Change Password API
  app.post('/api/auth/change-password', authenticate, async (req: any, res) => {
    try {
      const passwordData = changePasswordSchema.parse(req.body);
      const user = req.user;
      
      // Verify current password
      const isCurrentPasswordValid = await authService.verifyPasswordByUsername(user.username, passwordData.currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Update password
      await authService.updateUserPassword(user.id, passwordData.newPassword);
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid password data", details: error.errors });
      } else {
        console.error('Password change error:', error);
        res.status(500).json({ error: "Failed to change password" });
      }
    }
  });

  // Update Profile API
  app.post('/api/auth/update-profile', authenticate, async (req: any, res) => {
    try {
      const profileData = updateProfileSchema.parse(req.body);
      const user = req.user;
      
      // Check if username or email already exists (excluding current user)
      const existingUser = await authService.findUserByUsernameOrEmail(profileData.username, profileData.email);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      
      // Update profile
      const updatedUser = await authService.updateUserProfile(user.id, profileData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ 
        success: true, 
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid profile data", details: error.errors });
      } else {
        console.error('Profile update error:', error);
        res.status(500).json({ error: "Failed to update profile" });
      }
    }
  });

  // Database Export API
  app.get('/api/export/database', authenticate, async (req: any, res) => {
    try {
      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const [templates, messages, campaigns, contacts, settings, conversations, autoReplyRules] = await Promise.all([
        storage.getTemplates(),
        storage.getMessages(),
        storage.getCampaigns(),
        storage.getContacts(),
        storage.getSettings(),
        storage.getConversations(),
        storage.getAutoReplyRules(),
      ]);

      const exportData = {
        export_info: {
          timestamp: new Date().toISOString(),
          database: "WhatsApp Pro",
          version: "2.0",
        },
        tables: {
          templates,
          messages,
          campaigns,
          contacts,
          settings: settings.map(s => ({ ...s, value: s.isEncrypted ? '[ENCRYPTED]' : s.value })),
          conversations,
          auto_reply_rules: autoReplyRules,
        },
        statistics: {
          total_templates: templates.length,
          total_messages: messages.length,
          total_campaigns: campaigns.length,
          total_contacts: contacts.length,
          total_conversations: conversations.length,
          total_auto_reply_rules: autoReplyRules.length,
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="whatsapp-pro-export-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export database" });
    }
  });

  // Templates API (existing functionality preserved)
  app.get('/api/templates', authenticate, async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Template refresh from WhatsApp API
  app.post('/api/templates/refresh', authenticate, async (req, res) => {
    try {
      // Update credentials from database first
      await whatsappService.updateCredentials();
      
      // Check if credentials are configured
      const tokenSetting = await storage.getSetting('whatsapp_token');
      const phoneNumberIdSetting = await storage.getSetting('whatsapp_phone_number_id');
      const businessAccountIdSetting = await storage.getSetting('whatsapp_business_account_id');
      
      console.log('Template refresh credentials check:', {
        token: tokenSetting?.value ? 'Present' : 'Missing',
        phoneNumberId: phoneNumberIdSetting?.value ? 'Present' : 'Missing',
        businessAccountId: businessAccountIdSetting?.value ? 'Present' : 'Missing'
      });
      
      if (!tokenSetting?.value || !phoneNumberIdSetting?.value || !businessAccountIdSetting?.value) {
        return res.status(400).json({ 
          error: 'WhatsApp credentials not configured. Please add your WhatsApp Token, Phone Number ID, and Business Account ID in Settings.',
          debug: {
            token: tokenSetting?.value ? 'Present' : 'Missing',
            phoneNumberId: phoneNumberIdSetting?.value ? 'Present' : 'Missing', 
            businessAccountId: businessAccountIdSetting?.value ? 'Present' : 'Missing'
          }
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

  // WhatsApp webhook for incoming messages
  app.post('/api/webhook', async (req, res) => {
    try {
      const body = req.body;
      
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              for (const message of change.value.messages || []) {
                const phoneNumber = message.from;
                const content = message.text?.body || message.button?.text || '[Media/Interactive Message]';
                
                // Process auto-reply
                const autoReply = await autoReplyService.processIncomingMessage(phoneNumber, content);
                
                // Get or create conversation
                let conversation = await storage.getConversationByPhoneNumber(phoneNumber);
                if (!conversation) {
                  conversation = await storage.createConversation({
                    phoneNumber,
                    contactName: phoneNumber,
                    lastMessage: content,
                  });
                }

                // Store incoming message
                const incomingMessage = await storage.createMessage({
                  phoneNumber,
                  content,
                  direction: 'inbound',
                  conversationId: conversation.id,
                  status: 'received',
                });

                // Send auto-reply if applicable
                if (autoReply) {
                  const replyMessage = {
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'text',
                    text: { body: autoReply },
                  };
                  
                  await whatsappService.sendMessage(replyMessage);
                  
                  // Store auto-reply message
                  await storage.createMessage({
                    phoneNumber,
                    content: autoReply,
                    direction: 'outbound',
                    conversationId: conversation.id,
                    isAutoReply: true,
                    status: 'sent',
                  });
                }

                // Broadcast real-time updates
                broadcastMessage({
                  type: 'incoming_message',
                  data: incomingMessage,
                });
              }
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('Error');
    }
  });

  // Webhook verification
  app.get('/api/webhook', async (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('Webhook verification request:', { mode, token, challenge });

      const verifyTokenSetting = await storage.getSetting('whatsapp_verify_token');
      const expectedToken = verifyTokenSetting?.value || 'secretwebhook';
      
      console.log('Expected token:', expectedToken, 'Received token:', token);

      if (mode === 'subscribe' && token === expectedToken) {
        console.log('Webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        console.log('Webhook verification failed');
        res.status(403).send('Forbidden');
      }
    } catch (error) {
      console.error('Webhook verification error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  return httpServer;
}