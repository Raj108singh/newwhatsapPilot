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

    // Clean values by removing quotes if present
    const cleanValue = (value: string) => {
      if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        return JSON.parse(value);
      }
      return value;
    };

    if (tokenSetting?.value) this.token = cleanValue(tokenSetting.value as string);
    if (phoneNumberIdSetting?.value) this.phoneNumberId = cleanValue(phoneNumberIdSetting.value as string);
    if (businessAccountIdSetting?.value) this.businessAccountId = cleanValue(businessAccountIdSetting.value as string);
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
        requestMessage: message
      });
      throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
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

  async sendBulkTemplateMessages(recipients: string[], template: any, parameters: any[] = [], campaignId?: string, broadcastProgress?: (progress: any) => void): Promise<any[]> {
    console.log('=== SEND BULK TEMPLATE MESSAGES CALLED ===');
    console.log('Recipients count:', recipients.length);
    console.log('Template name:', template?.name);
    console.log('Parameters:', parameters);
    
    await this.updateCredentials();
    
    console.log('=== CREDENTIALS UPDATED ===');
    console.log('Sending bulk template messages with credentials:', {
      tokenPrefix: this.token.substring(0, 10) + '...',
      phoneNumberId: this.phoneNumberId,
      businessAccountId: this.businessAccountId,
      hasToken: !!this.token,
      hasPhoneNumberId: !!this.phoneNumberId
    });

    if (!this.token || !this.phoneNumberId) {
      throw new Error('WhatsApp credentials not properly configured');
    }

    const results = [];
    const startTime = Date.now();
    console.log('=== STARTING TO SEND TO RECIPIENTS ===');
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`=== PROCESSING RECIPIENT ${i + 1}/${recipients.length}: ${recipient} ===`);
      
      try {
        const templateComponents = this.buildTemplateComponents(template.components as any[], parameters);
        console.log('Built template components for recipient:', JSON.stringify(templateComponents, null, 2));
        
        const message = {
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: template.name,
            language: {
              code: template.language,
            },
            components: templateComponents,
          },
        };

        console.log('=== SENDING MESSAGE TO WHATSAPP API ===');
        console.log('Message payload:', JSON.stringify(message, null, 2));
        console.log('API URL:', `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`);

        const result = await this.sendMessage(message);
        console.log('=== WhatsApp API SUCCESS ===');
        console.log('Result:', JSON.stringify(result, null, 2));
        
        results.push({ recipient, success: true, result });

        // Parse template components if they're stored as string for message storage
        const parsedTemplateComponents = typeof template.components === 'string' 
          ? JSON.parse(template.components) 
          : template.components;
        
        // Store complete template message with actual content
        const bodyComponent = parsedTemplateComponents?.find((c: any) => c.type === 'BODY');
        let actualContent = bodyComponent?.text || `Template: ${template.name}`;
        
        // Replace template parameters in content for display
        if (parameters.length > 0 && actualContent.includes('{{')) {
          parameters.forEach((param, index) => {
            actualContent = actualContent.replace(`{{${index + 1}}}`, param);
          });
        }
        
        console.log('=== STORING MESSAGE IN DATABASE ===');
        console.log('Storing template message:', {
          recipient,
          content: actualContent,
          templateName: template.name
        });
        
        const storedMessage = await storage.createMessage({
          phoneNumber: recipient.replace('+', ''), // Remove + for consistency
          content: actualContent,
          direction: 'outbound',
          messageType: 'template',
          status: 'sent',
          templateId: template.id,
          templateData: template.components as any,
        });
        
        console.log('=== MESSAGE STORED SUCCESSFULLY ===');
        console.log('Template message stored with ID:', storedMessage.id);

        // Broadcast progress update after each successful send
        if (broadcastProgress) {
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          const processed = i + 1;
          const remaining = recipients.length - processed;
          const avgTimePerMessage = elapsedTime / processed;
          const estimatedTimeRemaining = Math.round((remaining * avgTimePerMessage) / 1000); // in seconds
          
          broadcastProgress({
            campaignId,
            totalRecipients: recipients.length,
            processed,
            remaining,
            successCount: results.filter(r => r.success).length + 1, // +1 for current success
            failedCount: results.filter(r => !r.success).length,
            progressPercent: Math.round((processed / recipients.length) * 100),
            estimatedTimeRemaining,
            currentRecipient: recipient
          });
        }

      } catch (error) {
        console.error(`=== FAILED TO SEND MESSAGE TO ${recipient} ===`);
        console.error('Error details:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ recipient, success: false, error: errorMessage });
        
        // Store failed message for tracking
        try {
          await storage.createMessage({
            phoneNumber: recipient,
            content: `Failed to send template: ${template.name}. Error: ${errorMessage}`,
            direction: 'outbound',
            messageType: 'template',
            status: 'failed',
            templateId: template.id,
          });
        } catch (storageError) {
          console.error('Failed to store failed message:', storageError);
        }
      }
    }

    console.log('=== BULK SEND COMPLETE ===');
    console.log('Total results:', results.length);
    console.log('Success count:', results.filter(r => r.success).length);
    console.log('Failed count:', results.filter(r => !r.success).length);
    
    return results;
  }

  // Build template components with proper structure for WhatsApp API
  buildTemplateComponents(templateComponents: any[] | string, parameters: any[] = []): any[] {
    if (!templateComponents) return [];
    
    // Parse JSON string if needed
    const parsedComponents = typeof templateComponents === 'string' 
      ? JSON.parse(templateComponents) 
      : templateComponents;
    
    const components: any[] = [];
    let paramIndex = 0;
    
    parsedComponents.forEach((component: any) => {
      // Handle HEADER components (TEXT, IMAGE, VIDEO, DOCUMENT)
      if (component.type === "HEADER") {
        if (component.format === "TEXT" && component.text) {
          const headerMatches = component.text.match(/\{\{(\d+)\}\}/g);
          if (headerMatches && parameters.length > paramIndex) {
            components.push({
              type: "header",
              parameters: headerMatches.map(() => ({
                type: "text",
                text: parameters[paramIndex++] || ""
              }))
            });
          }
        } else if (component.format === "IMAGE") {
          // For IMAGE headers, we need to handle them even without parameters
          // Use example image from template or require parameter
          if (parameters.length > paramIndex && parameters[paramIndex]) {
            components.push({
              type: "header",
              parameters: [{
                type: "image",
                image: { link: parameters[paramIndex++] }
              }]
            });
          } else if (component.example && component.example.header_handle && component.example.header_handle[0]) {
            // Use the example image from the template itself
            components.push({
              type: "header",
              parameters: [{
                type: "image",
                image: { link: component.example.header_handle[0] }
              }]
            });
          }
        } else if (component.format === "VIDEO") {
          if (parameters.length > paramIndex && parameters[paramIndex]) {
            components.push({
              type: "header",
              parameters: [{
                type: "video",
                video: { link: parameters[paramIndex++] }
              }]
            });
          }
        } else if (component.format === "DOCUMENT") {
          if (parameters.length > paramIndex && parameters[paramIndex]) {
            components.push({
              type: "header",
              parameters: [{
                type: "document",
                document: { 
                  link: parameters[paramIndex++],
                  filename: parameters[paramIndex] || "document.pdf"
                }
              }]
            });
            if (parameters[paramIndex]) paramIndex++; // Skip filename if provided
          }
        }
      }
      
      // Handle BODY components with variable substitution
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
      
      // Handle BUTTONS components (URL, PHONE_NUMBER, QUICK_REPLY, COPY_CODE, FLOW)
      if (component.type === "BUTTONS" && component.buttons) {
        component.buttons.forEach((button: any, buttonIndex: number) => {
          if (button.type === "URL" && button.url) {
            const urlMatches = button.url.match(/\{\{(\d+)\}\}/g);
            if (urlMatches && parameters.length > paramIndex) {
              components.push({
                type: "button",
                sub_type: "url",
                index: buttonIndex.toString(),
                parameters: urlMatches.map(() => ({
                  type: "text",
                  text: parameters[paramIndex++] || ""
                }))
              });
            }
          } else if (button.type === "COPY_CODE" && button.example) {
            // Copy code buttons need the code parameter
            if (parameters.length > paramIndex) {
              components.push({
                type: "button",
                sub_type: "copy_code",
                index: buttonIndex.toString(),
                parameters: [{
                  type: "coupon_code",
                  coupon_code: parameters[paramIndex++] || button.example[0] || ""
                }]
              });
            }
          } else if (button.type === "FLOW" && button.flow_action_data) {
            // Flow buttons with dynamic parameters
            const flowData = button.flow_action_data;
            if (flowData.flow_action_payload && parameters.length > paramIndex) {
              const flowPayload = typeof flowData.flow_action_payload === 'string' 
                ? JSON.parse(flowData.flow_action_payload) 
                : flowData.flow_action_payload;
              
              components.push({
                type: "button",
                sub_type: "flow",
                index: buttonIndex.toString(),
                parameters: [{
                  type: "action",
                  action: {
                    flow_token: parameters[paramIndex++] || flowPayload.flow_token || "",
                    flow_action_data: flowPayload
                  }
                }]
              });
            }
          }
          // PHONE_NUMBER and QUICK_REPLY buttons don't need parameters
        });
      }
      
      // Handle FOOTER components (rarely used but for completeness)
      if (component.type === "FOOTER" && component.text) {
        const footerMatches = component.text.match(/\{\{(\d+)\}\}/g);
        if (footerMatches && parameters.length > paramIndex) {
          components.push({
            type: "footer",
            parameters: footerMatches.map(() => ({
              type: "text",
              text: parameters[paramIndex++] || ""
            }))
          });
        }
      }
    });
    
    console.log('Built template components:', JSON.stringify(components, null, 2));
    return components;
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

  // Statistics endpoint
  app.get('/api/stats', authenticate, async (req, res) => {
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
        let value = setting.value;
        // Parse JSON values if they are strings with quotes
        if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          value = JSON.parse(value);
        }
        settingsMap[setting.key] = value;
      });

      // Check WhatsApp configuration
      const whatsappConfigured = !!(
        settingsMap.whatsapp_token && 
        settingsMap.whatsapp_phone_number_id &&
        settingsMap.whatsapp_business_account_id
      );

      // Use the correct public domain for webhook URL
      const publicDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const webhookUrl = `https://${publicDomain}/api/webhook`;

      res.json({
        ...settingsMap,
        whatsappConfigured,
        webhookUrl,
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
        
        // Ensure we store the value without extra quotes
        let cleanValue = value as string;
        if (typeof cleanValue === 'string' && cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
          cleanValue = cleanValue.slice(1, -1);
        }
        
        await storage.createOrUpdateSetting(settingKey, cleanValue);
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

  // Campaigns API
  app.get('/api/campaigns', authenticate, async (req: any, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ error: 'Failed to get campaigns' });
    }
  });

  app.get('/api/campaigns/:id', authenticate, async (req: any, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json(campaign);
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  });

  // Bulk Messaging API
  app.post('/api/send-bulk', authenticate, async (req: any, res) => {
    console.log('=== BULK MESSAGE REQUEST RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('User:', req.user);
    console.log('Request body:', req.body);
    
    try {
      const { templateId, recipients, parameters = [], campaignName } = req.body;

      console.log('Bulk message request received:', {
        templateId,
        recipients,
        parameters,
        campaignName,
        user: req.user?.username || 'unknown'
      });

      if (!templateId || !recipients || !Array.isArray(recipients)) {
        console.log('Missing required fields in bulk message request');
        res.status(400).json({ error: 'Missing required fields: templateId, recipients' });
        return;
      }

      // Get template details for logging
      const template = await storage.getTemplate(templateId);
      console.log('Template details:', {
        name: template?.name,
        language: template?.language,
        components: template?.components
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Create campaign
      let campaign;
      try {
        campaign = await storage.createCampaign({
          name: campaignName || `Campaign ${new Date().toISOString()}`,
          templateId,
          recipients,
          totalRecipients: recipients.length,
          status: 'running',
        });
        console.log('Campaign created successfully:', campaign.id);
        
        if (!campaign || !campaign.id) {
          throw new Error('Campaign creation failed - no campaign returned');
        }
      } catch (campaignError) {
        console.error('Campaign creation failed:', campaignError);
        res.status(500).json({ 
          error: 'Failed to create campaign',
          details: campaignError instanceof Error ? campaignError.message : 'Unknown error'
        });
        return;
      }

      console.log('Starting bulk message sending:', { 
        templateId, 
        recipientsCount: recipients.length, 
        parametersCount: parameters.length,
        parameters: parameters 
      });

      // Verify WhatsApp credentials before attempting to send
      try {
        await whatsappService.updateCredentials();
        console.log('WhatsApp credentials verified successfully');
      } catch (credError) {
        console.error('WhatsApp credentials verification failed:', credError);
        await storage.updateCampaign(campaign.id, {
          status: 'failed',
        });
        res.status(400).json({ 
          error: 'WhatsApp credentials not configured properly. Please check Settings.',
          details: credError instanceof Error ? credError.message : 'Unknown error'
        });
        return;
      }

      // Start sending messages in background
      console.log('About to call sendBulkMessages...');
      console.log('WhatsApp service initialized, calling sendBulkMessages with:', {
        recipients: recipients,
        templateId: templateId,
        parameters: parameters
      });

      // Use the enhanced WhatsApp service to send bulk messages
      console.log('=== STARTING BULK MESSAGE SENDING ===');
      console.log('Template object:', JSON.stringify(template, null, 2));
      console.log('Recipients array:', recipients);
      console.log('Parameters array:', parameters);
      
      whatsappService.sendBulkTemplateMessages(recipients, template, parameters, campaign.id, (progress) => {
        // Broadcast real-time progress updates
        broadcastMessage({
          type: 'campaign_progress',
          data: progress,
        });
      })
        .then(async (results) => {
          console.log('=== BULK MESSAGES COMPLETED ===');
          console.log('Results:', JSON.stringify(results, null, 2));
          const successCount = results.filter(r => r.success).length;
          const failedCount = results.filter(r => !r.success).length;

          // Log detailed results for debugging
          results.forEach((result, index) => {
            console.log(`Message ${index + 1} - ${result.recipient}:`, result.success ? 'SUCCESS' : `FAILED: ${result.error}`);
          });

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
          console.error('=== BULK MESSAGES FAILED ===');
          console.error('Error details:', error);
          console.error('Stack trace:', error.stack);
          
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

  return httpServer;
}