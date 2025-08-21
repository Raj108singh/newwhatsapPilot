import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { DatabaseStorage } from "./database-storage-mysql";

const storage = new DatabaseStorage();
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

// Enhanced Auto-reply service with complete chat support
class AutoReplyService {
  private conversationContext = new Map<string, any>();

  getContext(phoneNumber: string) {
    const cleanPhoneNumber = phoneNumber.replace('+', '');
    return this.conversationContext.get(cleanPhoneNumber);
  }

  clearContext(phoneNumber: string): boolean {
    const cleanPhoneNumber = phoneNumber.replace('+', '');
    return this.conversationContext.delete(cleanPhoneNumber);
  }

  async processIncomingMessage(phoneNumber: string, content: string): Promise<string | null> {
    const rules = await storage.getActiveAutoReplyRules();
    const cleanPhoneNumber = phoneNumber.replace('+', '');
    
    console.log(`🔍 Processing auto-reply for "${content}" from ${phoneNumber}`);
    console.log(`📋 Found ${rules.length} active rules:`, rules.map(r => ({ name: r.name, trigger: r.trigger, triggerType: r.triggerType, priority: r.priority, isActive: r.isActive })));
    
    // Get conversation context for this phone number
    const context = this.conversationContext.get(cleanPhoneNumber) || {};
    
    // Sort rules by priority (higher priority first)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      console.log(`🧩 Testing rule: "${rule.name}" (${rule.triggerType}) trigger: "${rule.trigger}"`);
      if (await this.matchesRule(content, rule, context, cleanPhoneNumber)) {
        console.log(`✅ Rule matched: "${rule.name}"`);
        const reply = await this.processReply(rule, content, context, cleanPhoneNumber);
        return reply;
      } else {
        console.log(`❌ Rule "${rule.name}" did not match`);
      }
    }
    
    return null;
  }

  private async matchesRule(content: string, rule: any, context: any, phoneNumber: string): Promise<boolean> {
    const lowerContent = content.toLowerCase().trim();
    const trigger = rule.trigger.toLowerCase();
    
    // Check conditions first
    if (rule.conditions) {
      const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
      
      // Time-based conditions
      if (conditions.timeRange) {
        const currentHour = new Date().getHours();
        const startHour = conditions.timeRange.start || 0;
        const endHour = conditions.timeRange.end || 23;
        if (currentHour < startHour || currentHour > endHour) {
          return false;
        }
      }
      
      // Context-based conditions (for sequential conversations)
      if (conditions.requiresContext && conditions.contextKey) {
        if (!context[conditions.contextKey]) {
          return false;
        }
      }
      
      // Previous message conditions
      if (conditions.afterTrigger) {
        if (!context.lastTriggeredRule || context.lastTriggeredRule !== conditions.afterTrigger) {
          return false;
        }
      }
      
      // Contact tag conditions
      if (conditions.contactTags && conditions.contactTags.length > 0) {
        const contact = await storage.getContactByPhoneNumber(phoneNumber);
        if (!contact || !contact.tags) return false;
        
        const contactTags = Array.isArray(contact.tags) ? contact.tags : [];
        const hasRequiredTag = conditions.contactTags.some((tag: string) => contactTags.includes(tag));
        if (!hasRequiredTag) return false;
      }
    }
    
    switch (rule.triggerType) {
      case 'keyword':
        return lowerContent.includes(trigger);
      
      case 'exact_match':
        return lowerContent === trigger;
      
      case 'starts_with':
        return lowerContent.startsWith(trigger);
      
      case 'numeric':
        // Check if content is a number and matches the trigger range
        const num = parseInt(content.trim());
        if (isNaN(num)) {
          // Also check if trigger contains non-numeric keywords for mixed content
          if (trigger.includes(',')) {
            const keywords = trigger.split(',').map((k: string) => k.trim().toLowerCase());
            return keywords.some((keyword: string) => {
              if (isNaN(parseInt(keyword))) {
                return lowerContent.includes(keyword);
              }
              return false;
            });
          }
          return false;
        }
        
        if (trigger.includes('-')) {
          const [min, max] = trigger.split('-').map((n: string) => parseInt(n.trim()));
          return num >= min && num <= max;
        } else if (trigger.includes(',')) {
          const validNumbers = trigger.split(',').map((n: string) => parseInt(n.trim()));
          return validNumbers.includes(num);
        } else {
          return num === parseInt(trigger);
        }
      
      case 'greeting':
        return /^(hi|hello|hey|good morning|good afternoon|good evening|namaste|start|begin)/i.test(content);
      
      case 'help':
        return /^(help|support|assist|menu|options)/i.test(content);
      
      case 'regex':
        try {
          const regex = new RegExp(trigger, 'i');
          return regex.test(content);
        } catch {
          return false;
        }
      
      case 'contains_any':
        // Trigger should be comma-separated keywords
        const keywords = trigger.split(',').map((k: string) => k.trim());
        return keywords.some((keyword: string) => lowerContent.includes(keyword));
      
      case 'default':
        // Default rule only triggers if no other rule matched
        return !context.hasMatched;
      
      case 'fallback':
        // Fallback for unrecognized inputs
        return true;
      
      default:
        return false;
    }
  }

  private async processReply(rule: any, content: string, context: any, phoneNumber: string): Promise<string> {
    // Update conversation context
    context.lastTriggeredRule = rule.name;
    context.lastTrigger = rule.trigger;
    context.hasMatched = true;
    context.timestamp = new Date().toISOString();
    
    // Handle dynamic content replacement
    let reply = rule.replyMessage;
    
    // Replace dynamic placeholders
    reply = reply.replace(/\{user_input\}/g, content);
    reply = reply.replace(/\{phone_number\}/g, phoneNumber);
    reply = reply.replace(/\{time\}/g, new Date().toLocaleTimeString());
    reply = reply.replace(/\{date\}/g, new Date().toLocaleDateString());
    
    // Handle contact-specific replacements
    const contact = await storage.getContactByPhoneNumber(phoneNumber);
    if (contact) {
      reply = reply.replace(/\{name\}/g, contact.name || 'Customer');
      reply = reply.replace(/\{email\}/g, contact.email || '');
    }
    
    // Handle conditional content based on rule conditions
    if (rule.conditions) {
      const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
      
      if (conditions.customReply) {
        // Handle custom reply logic based on conditions
        if (conditions.customReply.basedOnInput && content.trim().match(/^\d+$/)) {
          const option = parseInt(content.trim());
          if (conditions.customReply.options && conditions.customReply.options[option]) {
            reply = conditions.customReply.options[option];
          }
        }
      }
      
      // Set context for next interaction
      if (conditions.setContext) {
        Object.keys(conditions.setContext).forEach(key => {
          context[key] = conditions.setContext[key];
        });
      }
    }
    
    // Save context for this phone number
    this.conversationContext.set(phoneNumber, context);
    
    return reply;
  }

  // Method to create interactive menu-style auto-replies
  static createInteractiveRule(name: string, trigger: string, menuTitle: string, options: string[], priority: number = 1): any {
    const optionsText = options.map((option, index) => `${index + 1}. ${option}`).join('\n');
    const replyMessage = `${menuTitle}\n\n${optionsText}\n\nPlease reply with the number of your choice (1-${options.length}).`;
    
    return {
      name,
      trigger,
      triggerType: 'keyword',
      replyMessage,
      priority,
      isActive: true,
      conditions: {
        setContext: {
          waitingForOption: true,
          validOptions: Array.from({length: options.length}, (_, i) => i + 1),
          optionMessages: options
        }
      }
    };
  }

  // Method to create follow-up numeric response rules
  static createNumericResponseRule(name: string, parentRule: string, options: {[key: number]: string}, priority: number = 2): any {
    const validNumbers = Object.keys(options).join(',');
    
    return {
      name,
      trigger: validNumbers,
      triggerType: 'numeric',
      replyMessage: 'Processing your selection...',
      priority,
      isActive: true,
      conditions: {
        afterTrigger: parentRule,
        customReply: {
          basedOnInput: true,
          options
        }
      }
    };
  }

  // Method to clear conversation context (useful for admin commands)
  clearContext(phoneNumber: string): boolean {
    return this.conversationContext.delete(phoneNumber.replace('+', ''));
  }

  // Method to get conversation context (for debugging)
  getContext(phoneNumber: string): any {
    return this.conversationContext.get(phoneNumber.replace('+', ''));
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
        
        // Find or create conversation for this phone number
        const cleanPhoneNumber = recipient.replace('+', ''); // Remove + for consistency
        let conversation = await storage.getConversationByPhoneNumber(cleanPhoneNumber);
        
        if (!conversation) {
          console.log('Creating new conversation for:', cleanPhoneNumber);
          conversation = await storage.createConversation({
            phoneNumber: cleanPhoneNumber,
            contactName: cleanPhoneNumber, // Use phone number as name initially
            lastMessage: actualContent,
            lastMessageAt: new Date(),
            unreadCount: 0
          });
        }
        
        console.log('=== STORING MESSAGE IN DATABASE ===');
        console.log('Storing template message:', {
          recipient,
          content: actualContent,
          templateName: template.name,
          conversationId: conversation.id
        });
        
        const storedMessage = await storage.createMessage({
          phoneNumber: cleanPhoneNumber,
          content: actualContent,
          direction: 'outbound',
          messageType: 'template',
          status: 'sent',
          templateId: template.id,
          templateData: template.components as any,
          conversationId: conversation.id,
        });
        
        console.log('=== MESSAGE STORED SUCCESSFULLY ===');
        console.log('Template message stored with ID:', storedMessage.id);
        
        // Update conversation with latest message info
        await storage.updateConversation(conversation.id, {
          lastMessage: actualContent,
          lastMessageAt: new Date()
        });
        
        // Note: Real-time updates handled by webhook endpoint

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

      // Calculate unique template count
      const uniqueTemplateNames = new Set(templates.map(t => t.name));
      const totalTemplates = templates.length;
      const uniqueTemplates = uniqueTemplateNames.size;
      const duplicateTemplates = totalTemplates - uniqueTemplates;

      const stats = {
        messagesSent: messages.filter(m => m.direction === 'outbound').length,
        deliveryRate: 98.5, // This would be calculated from actual delivery statuses
        activeChats: new Set(messages.map(m => m.phoneNumber)).size,
        templates: totalTemplates,
        uniqueTemplates: uniqueTemplates,
        duplicateTemplates: duplicateTemplates,
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
      console.log('🔧 Updating auto-reply rule:', id, 'with data:', ruleData);
      const rule = await storage.updateAutoReplyRule(id, ruleData);
      
      if (!rule) {
        return res.status(404).json({ error: "Auto reply rule not found" });
      }
      
      console.log('✅ Auto-reply rule updated successfully:', rule);
      res.json(rule);
    } catch (error) {
      console.error('❌ Failed to update auto reply rule:', error);
      res.status(500).json({ error: "Failed to update auto reply rule", details: error instanceof Error ? error.message : 'Unknown error' });
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

  // Enhanced Auto-Reply Management APIs
  app.post('/api/auto-reply-rules/create-interactive', authenticate, async (req, res) => {
    try {
      const { name, trigger, menuTitle, options, priority = 1 } = req.body;
      
      if (!name || !trigger || !menuTitle || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: "Missing required fields: name, trigger, menuTitle, options" });
      }
      
      const interactiveRule = AutoReplyService.createInteractiveRule(name, trigger, menuTitle, options, priority);
      const rule = await storage.createAutoReplyRule(interactiveRule);
      
      res.json(rule);
    } catch (error) {
      console.error('Create interactive rule error:', error);
      res.status(500).json({ error: "Failed to create interactive auto reply rule" });
    }
  });

  app.post('/api/auto-reply-rules/create-numeric-response', authenticate, async (req, res) => {
    try {
      const { name, parentRule, options, priority = 2 } = req.body;
      
      if (!name || !parentRule || !options || typeof options !== 'object') {
        return res.status(400).json({ error: "Missing required fields: name, parentRule, options" });
      }
      
      const numericRule = AutoReplyService.createNumericResponseRule(name, parentRule, options, priority);
      const rule = await storage.createAutoReplyRule(numericRule);
      
      res.json(rule);
    } catch (error) {
      console.error('Create numeric response rule error:', error);
      res.status(500).json({ error: "Failed to create numeric response auto reply rule" });
    }
  });

  // Context management for auto-reply conversations
  app.get('/api/auto-reply-context/:phoneNumber', authenticate, async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const context = autoReplyService.getContext(phoneNumber);
      res.json({ context: context || {} });
    } catch (error) {
      res.status(500).json({ error: "Failed to get conversation context" });
    }
  });

  app.delete('/api/auto-reply-context/:phoneNumber', authenticate, async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const success = autoReplyService.clearContext(phoneNumber);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear conversation context" });
    }
  });

  // Test auto-reply system with sample messages
  app.post('/api/auto-reply-rules/test', async (req, res) => {
    try {
      console.log('🧪 Starting auto-reply test...');
      const { phoneNumber = '+918318868521', testMessages } = req.body;
      
      const defaultTestMessages = [
        'Hi 👋', // Should trigger greeting
        'hello 😊', // Should trigger greeting  
        '1', // Should trigger option 1 (Product Info)
        '2', // Should trigger option 2 (Pricing)
        '3', // Should trigger option 3 (Technical Support)
        '4', // Should trigger option 4 (Human Agent)
        'menu 📋', // Should show main menu
        'help ❓', // Should show help
        'demo 🚀', // Should trigger demo request
        'hours 🕒', // Should show business hours
        'xyz123', // Should trigger fallback
        'support 💬' // Should trigger help
      ];
      
      const messagesToTest = testMessages || defaultTestMessages;
      const results = [];
      
      console.log(`🧪 Testing ${messagesToTest.length} messages:`, messagesToTest);
      
      for (const message of messagesToTest) {
        console.log(`\n🧪 Testing message: "${message}"`);
        const reply = await autoReplyService.processIncomingMessage(phoneNumber, message);
        console.log(`🧪 Reply result: "${reply || 'No matching rule found'}"`);
        results.push({
          input: message,
          reply: reply || 'No matching rule found',
          hasReply: !!reply
        });
        
        // Add small delay between tests to simulate real conversation flow
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      res.json({
        phoneNumber,
        testResults: results,
        summary: {
          totalTests: results.length,
          repliedTo: results.filter(r => r.hasReply).length,
          noReply: results.filter(r => !r.hasReply).length
        }
      });
    } catch (error) {
      console.error('Auto-reply test error:', error);
      res.status(500).json({ error: "Failed to test auto-reply system" });
    }
  });

  // Get current conversation context for testing
  app.get('/api/auto-reply-rules/test-context/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const context = autoReplyService.getContext(phoneNumber);
      res.json({ phoneNumber, context: context || {} });
    } catch (error) {
      res.status(500).json({ error: "Failed to get test context" });
    }
  });

  // Clear conversation context for testing
  app.delete('/api/auto-reply-rules/test-context/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const success = autoReplyService.clearContext(phoneNumber);
      res.json({ phoneNumber, cleared: success });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear test context" });
    }
  });

  // Create emoji-enhanced auto-reply rules
  app.post('/api/auto-reply-rules/create-emoji-rules', authenticate, async (req, res) => {
    try {
      const emojiRules = [
        {
          name: '🎉 Welcome with Emojis',
          trigger: 'hi,hello',
          triggerType: 'contains_any',
          replyMessage: '🌟 Hello! 👋 Welcome to our amazing WhatsApp support! 🚀\n\n📋 Choose an option:\n1️⃣ 🛍️ Product Information\n2️⃣ 💰 Pricing & Plans\n3️⃣ 🔧 Technical Support\n4️⃣ 👨‍💼 Speak to Human Agent\n\n💡 Just type the number or ask me anything! ✨',
          priority: 10,
          isActive: true,
          conditions: '{}'
        },
        {
          name: '🛍️ Product Info with Emojis',
          trigger: '1',
          triggerType: 'exact_match',
          replyMessage: '🎯 Great choice! Here\'s our amazing product lineup:\n\n🌟 Premium WhatsApp Business Solution\n• 📤 Bulk messaging capabilities\n• 📊 Advanced analytics & insights\n• 📝 Template management system\n• 📇 Smart contact organization\n• 🤖 AI-powered auto-replies\n\n🤔 Want to know more? Type "menu" 📋 to go back! ✨',
          priority: 9,
          isActive: true,
          conditions: '{}'
        },
        {
          name: '💰 Pricing with Emojis',
          trigger: '2',
          triggerType: 'exact_match',
          replyMessage: '💎 Here are our amazing pricing plans:\n\n🌱 Starter Plan: $29/month\n• 📤 Up to 1,000 messages\n• 📝 Basic templates\n• 📧 Email support\n• 🎯 Perfect for small businesses\n\n🚀 Professional Plan: $79/month\n• 📤 Up to 10,000 messages\n• ⭐ Advanced features\n• 🏃‍♂️ Priority support\n• 📊 Analytics dashboard\n\n🏆 Enterprise Plan: Custom pricing\n• ♾️ Unlimited messages\n• 🔧 Custom integration\n• 👨‍💼 Dedicated support manager\n• 🎨 White-label options\n\nType "menu" 📋 to return! ✨',
          priority: 9,
          isActive: true,
          conditions: '{}'
        },
        {
          name: '🔧 Tech Support with Emojis',
          trigger: '3',
          triggerType: 'exact_match',
          replyMessage: '🛠️ I\'m your tech support wizard! ⚡ Ready to help!\n\n🔍 Common issues we resolve:\n• ⚙️ Setup and configuration\n• 🔗 API integration magic\n• 🚨 Troubleshooting delivery issues\n• ✅ Template approval assistance\n• 📱 Mobile app support\n• 🌐 Webhook configuration\n\n💬 Please describe your issue, or type "menu" 📋 to return! 🎯',
          priority: 9,
          isActive: true,
          conditions: '{}'
        },
        {
          name: '👨‍💼 Human Agent with Emojis',
          trigger: '4',
          triggerType: 'exact_match',
          replyMessage: '🤝 Let me connect you with our amazing human team! 👨‍💼✨\n\n⏰ Our support heroes are available:\n📅 Monday to Friday: 9 AM - 6 PM EST\n☎️ For urgent matters: +1-800-SUPPORT\n📧 Email our experts: support@whatsapppro.com\n💬 Live chat: Available on our website\n\n🎯 A team member will connect with you shortly! ⚡\nType "menu" 📋 to return! 🔄',
          priority: 9,
          isActive: true,
          conditions: '{}'
        },
        {
          name: '📋 Menu with Emojis',
          trigger: 'menu',
          triggerType: 'exact_match',
          replyMessage: '🎯 Welcome back! Here\'s our main menu: ✨\n\n1️⃣ 🛍️ Product Information\n2️⃣ 💰 Pricing & Plans\n3️⃣ 🔧 Technical Support\n4️⃣ 👨‍💼 Speak to Human Agent\n\n🚀 Type the number of your choice or ask me anything else! 💬',
          priority: 8,
          isActive: true,
          conditions: '{}'
        },
        {
          name: '❓ Help with Emojis',
          trigger: 'help',
          triggerType: 'exact_match',
          replyMessage: '🎯 Here\'s how to chat with me! ✨\n\n🔤 Magic Keywords:\n• 👋 hi, hello - Start conversation\n• 📋 menu - Show main options\n• ❓ help - This help message\n• 🚀 demo - Request demo\n• 🕒 hours - Business hours\n• 💬 support - Get help\n\n🔢 Quick Numbers: 1️⃣2️⃣3️⃣4️⃣ for menu options\n\n💡 Or just ask me anything naturally! I\'m smart! 🤖✨\n\nType "menu" 📋 to see all options! 🎊',
          priority: 7,
          isActive: true,
          conditions: '{}'
        }
      ];

      const createdRules = [];
      for (const rule of emojiRules) {
        try {
          const created = await storage.createAutoReplyRule(rule);
          createdRules.push(created);
        } catch (error) {
          console.log(`Rule already exists or error: ${rule.name}`);
        }
      }

      res.json({ 
        message: `Created ${createdRules.length} emoji-enhanced auto-reply rules!`,
        rules: createdRules
      });
    } catch (error) {
      console.error('Error creating emoji rules:', error);
      res.status(500).json({ error: "Failed to create emoji auto-reply rules" });
    }
  });

  // Bulk create sample auto-reply rules
  app.post('/api/auto-reply-rules/create-samples', authenticate, async (req, res) => {
    try {
      const sampleRules = [
        {
          name: "Welcome Greeting",
          trigger: "hi,hello,hey,start",
          triggerType: "contains_any",
          replyMessage: "🙏 Welcome to our WhatsApp support!\n\nHow can I help you today?\n\n1. 📋 Product Information\n2. 💰 Pricing & Plans\n3. 🎯 Technical Support\n4. 📞 Talk to Human Agent\n\nPlease reply with a number (1-4) to continue.",
          priority: 10,
          isActive: true,
          conditions: JSON.stringify({
            setContext: {
              waitingForMainMenu: true,
              validOptions: [1, 2, 3, 4]
            }
          })
        },
        {
          name: "Main Menu Response - Product Info",
          trigger: "1",
          triggerType: "numeric",
          replyMessage: "📋 **Product Information**\n\nOur products include:\n• WhatsApp Business Solutions\n• Marketing Automation Tools\n• Customer Support Platform\n• Analytics & Reporting\n\nWould you like details about any specific product?\n\nType 'menu' to go back to main menu.",
          priority: 9,
          isActive: true,
          conditions: JSON.stringify({
            afterTrigger: "Welcome Greeting"
          })
        },
        {
          name: "Main Menu Response - Pricing",
          trigger: "2",
          triggerType: "numeric",
          replyMessage: "💰 **Pricing & Plans**\n\n• Basic Plan: $29/month\n• Professional: $79/month\n• Enterprise: $199/month\n\n✅ All plans include:\n- Unlimited messages\n- 24/7 support\n- Analytics dashboard\n\nType 'demo' for a free demo or 'menu' for main menu.",
          priority: 9,
          isActive: true,
          conditions: JSON.stringify({
            afterTrigger: "Welcome Greeting"
          })
        },
        {
          name: "Main Menu Response - Technical Support",
          trigger: "3",
          triggerType: "numeric",
          replyMessage: "🎯 **Technical Support**\n\nI can help you with:\n• Account setup issues\n• Integration problems\n• Feature questions\n• Troubleshooting\n\nPlease describe your technical issue and I'll assist you.\n\nType 'menu' to go back to main menu.",
          priority: 9,
          isActive: true,
          conditions: JSON.stringify({
            afterTrigger: "Welcome Greeting",
            setContext: {
              inTechnicalSupport: true
            }
          })
        },
        {
          name: "Main Menu Response - Human Agent",
          trigger: "4",
          triggerType: "numeric",
          replyMessage: "📞 **Connecting to Human Agent**\n\nPlease hold on while I connect you to one of our support representatives.\n\nYour request has been forwarded and someone will be with you shortly.\n\n⏰ Average wait time: 2-5 minutes\n\nType 'menu' if you'd like to try our automated help first.",
          priority: 9,
          isActive: true,
          conditions: JSON.stringify({
            afterTrigger: "Welcome Greeting",
            setContext: {
              requestedHuman: true
            }
          })
        },
        {
          name: "Back to Menu",
          trigger: "menu",
          triggerType: "exact_match",
          replyMessage: "🏠 **Main Menu**\n\nHow can I help you today?\n\n1. 📋 Product Information\n2. 💰 Pricing & Plans\n3. 🎯 Technical Support\n4. 📞 Talk to Human Agent\n\nPlease reply with a number (1-4) to continue.",
          priority: 8,
          isActive: true,
          conditions: JSON.stringify({
            setContext: {
              waitingForMainMenu: true,
              validOptions: [1, 2, 3, 4]
            }
          })
        },
        {
          name: "Help Command",
          trigger: "help",
          triggerType: "help",
          replyMessage: "ℹ️ **Help & Commands**\n\nAvailable commands:\n• 'hi' or 'hello' - Start conversation\n• 'menu' - Show main menu\n• 'help' - Show this help\n• 'demo' - Request a demo\n• Numbers 1-4 - Select menu options\n\nJust type naturally and I'll do my best to help! 😊",
          priority: 7,
          isActive: true
        },
        {
          name: "Demo Request",
          trigger: "demo",
          triggerType: "keyword",
          replyMessage: "🎮 **Free Demo Request**\n\nGreat! I'd be happy to set up a free demo for you.\n\nPlease provide:\n• Your name: {name}\n• Company name\n• Best time to contact\n• Phone number\n\nOr type 'schedule' to book a demo slot directly.",
          priority: 6,
          isActive: true,
          conditions: JSON.stringify({
            setContext: {
              requestingDemo: true
            }
          })
        },
        {
          name: "Business Hours",
          trigger: "hours,timing,available,open",
          triggerType: "contains_any",
          replyMessage: "🕒 **Business Hours**\n\n• Monday - Friday: 9:00 AM - 6:00 PM\n• Saturday: 10:00 AM - 4:00 PM\n• Sunday: Closed\n\n⏰ Current time: {time}\n📅 Current date: {date}\n\n💬 This chat support is available 24/7 for basic queries!",
          priority: 5,
          isActive: true
        },
        {
          name: "Default Fallback",
          trigger: "*",
          triggerType: "fallback",
          replyMessage: "🤔 I didn't quite understand that.\n\nTry typing:\n• 'hi' to start\n• 'menu' for options\n• 'help' for commands\n\nOr just tell me what you need help with! 😊",
          priority: 1,
          isActive: true
        }
      ];

      const createdRules = [];
      for (const rule of sampleRules) {
        try {
          const createdRule = await storage.createAutoReplyRule(rule);
          createdRules.push(createdRule);
        } catch (error) {
          console.log(`Sample rule '${rule.name}' might already exist, skipping...`);
        }
      }
      
      res.json({ 
        message: "Sample auto-reply rules created successfully", 
        created: createdRules.length,
        total: sampleRules.length 
      });
    } catch (error) {
      console.error('Create sample rules error:', error);
      res.status(500).json({ error: "Failed to create sample auto reply rules" });
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
      const { 
        templateId, 
        recipients, 
        parameters = [], 
        campaignName, 
        recipientType, 
        selectedGroups, 
        selectedContacts 
      } = req.body;

      console.log('Bulk message request received:', {
        templateId,
        recipients,
        parameters,
        campaignName,
        recipientType,
        selectedGroups,
        selectedContacts,
        user: req.user?.username || 'unknown'
      });

      if (!templateId) {
        console.log('Missing templateId in bulk message request');
        res.status(400).json({ error: 'Missing required field: templateId' });
        return;
      }

      // Expand recipients based on recipient type
      let finalRecipients = recipients || [];
      
      if (recipientType === 'groups' && selectedGroups && selectedGroups.length > 0) {
        console.log('Fetching recipients from groups:', selectedGroups);
        const groupRecipients = [];
        
        for (const groupId of selectedGroups) {
          try {
            const groupMembers = await storage.getGroupMembers(groupId);
            console.log(`Group ${groupId} has ${groupMembers.length} members`);
            const phoneNumbers = groupMembers.map(member => member.phoneNumber);
            groupRecipients.push(...phoneNumbers);
          } catch (error) {
            console.error(`Failed to fetch members for group ${groupId}:`, error);
          }
        }
        
        finalRecipients = Array.from(new Set(groupRecipients)); // Remove duplicates
        console.log(`Expanded ${selectedGroups.length} groups to ${finalRecipients.length} recipients`);
        
      } else if (recipientType === 'contacts' && selectedContacts && selectedContacts.length > 0) {
        console.log('Fetching recipients from contacts:', selectedContacts);
        const contactRecipients = [];
        
        for (const contactId of selectedContacts) {
          try {
            const contact = await storage.getContact(contactId);
            if (contact) {
              contactRecipients.push(contact.phoneNumber);
            }
          } catch (error) {
            console.error(`Failed to fetch contact ${contactId}:`, error);
          }
        }
        
        finalRecipients = contactRecipients;
        console.log(`Selected ${selectedContacts.length} contacts: ${finalRecipients.length} recipients`);
      }

      if (!finalRecipients || !Array.isArray(finalRecipients) || finalRecipients.length === 0) {
        console.log('No valid recipients found');
        res.status(400).json({ error: 'No valid recipients found' });
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
          recipients: finalRecipients,
          totalRecipients: finalRecipients.length,
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
        recipientsCount: finalRecipients.length, 
        parametersCount: parameters.length,
        parameters: parameters,
        recipientType,
        groupsSelected: selectedGroups?.length || 0,
        contactsSelected: selectedContacts?.length || 0
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
      console.log('Final Recipients array:', finalRecipients);
      console.log('Parameters array:', parameters);
      
      whatsappService.sendBulkTemplateMessages(finalRecipients, template, parameters, campaign.id, (progress) => {
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

  // Contacts API
  app.get('/api/contacts', authenticate, async (req, res) => {
    try {
      console.log('📞 GET /api/contacts - Fetching contacts');
      const contacts = await storage.getContacts();
      console.log('📞 GET /api/contacts - Found contacts:', contacts.length);
      res.json(contacts);
    } catch (error) {
      console.error('❌ GET /api/contacts error:', error);
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.post('/api/contacts', authenticate, async (req, res) => {
    try {
      console.log('📞 POST /api/contacts - Request body:', req.body);
      const contactData = insertContactSchema.parse(req.body);
      console.log('📞 POST /api/contacts - Parsed data:', contactData);
      const contact = await storage.createContact(contactData);
      console.log('📞 POST /api/contacts - Created contact:', contact);
      res.json(contact);
    } catch (error) {
      console.error('❌ POST /api/contacts error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid contact data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create contact', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  });

  app.put('/api/contacts/:id', authenticate, async (req, res) => {
    try {
      console.log('📞 PUT /api/contacts - Contact ID:', req.params.id, 'Data:', req.body);
      const contactData = insertContactSchema.partial().parse(req.body);
      const updatedContact = await storage.updateContact(req.params.id, contactData);
      if (updatedContact) {
        console.log('📞 PUT /api/contacts - Contact updated successfully');
        res.json(updatedContact);
      } else {
        res.status(404).json({ error: 'Contact not found' });
      }
    } catch (error) {
      console.error('❌ PUT /api/contacts error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid contact data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update contact', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  });

  app.delete('/api/contacts/:id', authenticate, async (req, res) => {
    try {
      console.log('📞 DELETE /api/contacts - Contact ID:', req.params.id);
      const success = await storage.deleteContact(req.params.id);
      if (success) {
        console.log('📞 DELETE /api/contacts - Contact deleted successfully');
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Contact not found' });
      }
    } catch (error) {
      console.error('❌ DELETE /api/contacts error:', error);
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  });

  // Groups API
  app.get('/api/groups', authenticate, async (req, res) => {
    try {
      console.log('👥 GET /api/groups - Fetching groups');
      const groups = await storage.getGroups();
      console.log('👥 GET /api/groups - Found groups:', groups.length);
      res.json(groups);
    } catch (error) {
      console.error('❌ GET /api/groups error:', error);
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  app.post('/api/groups', authenticate, async (req: any, res) => {
    try {
      console.log('👥 POST /api/groups - Request body:', req.body);
      const groupData = {
        ...req.body,
        createdBy: req.user.id,
      };
      const group = await storage.createGroup(groupData);
      console.log('👥 POST /api/groups - Created group:', group);
      res.json(group);
    } catch (error) {
      console.error('❌ POST /api/groups error:', error);
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  app.put('/api/groups/:id', authenticate, async (req: any, res) => {
    try {
      console.log('👥 PUT /api/groups/:id - Group ID:', req.params.id, 'Data:', req.body);
      const updatedGroup = await storage.updateGroup(req.params.id, req.body);
      if (updatedGroup) {
        console.log('👥 PUT /api/groups/:id - Group updated successfully');
        res.json(updatedGroup);
      } else {
        res.status(404).json({ error: 'Group not found' });
      }
    } catch (error) {
      console.error('❌ PUT /api/groups/:id error:', error);
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  app.get('/api/groups/:id/members', authenticate, async (req, res) => {
    try {
      console.log('👥 GET /api/groups/:id/members - Group ID:', req.params.id);
      const members = await storage.getGroupMembers(req.params.id);
      console.log('👥 GET /api/groups/:id/members - Found members:', members.length);
      res.json(members);
    } catch (error) {
      console.error('❌ GET /api/groups/:id/members error:', error);
      res.status(500).json({ error: 'Failed to fetch group members' });
    }
  });

  app.post('/api/groups/:id/members', authenticate, async (req: any, res) => {
    try {
      console.log('👥 POST /api/groups/:id/members - Group ID:', req.params.id, 'Body:', req.body);
      const { contactIds } = req.body;
      const results = [];
      
      for (const contactId of contactIds) {
        const member = await storage.addGroupMember({
          groupId: req.params.id,
          contactId,
          addedBy: req.user.id,
        });
        results.push(member);
      }
      
      console.log('👥 POST /api/groups/:id/members - Added members:', results.length);
      res.json(results);
    } catch (error) {
      console.error('❌ POST /api/groups/:id/members error:', error);
      res.status(500).json({ error: 'Failed to add group members' });
    }
  });

  app.delete('/api/groups/:groupId/members/:contactId', authenticate, async (req, res) => {
    try {
      console.log('👥 DELETE /api/groups/:groupId/members/:contactId - Group ID:', req.params.groupId, 'Contact ID:', req.params.contactId);
      const success = await storage.removeGroupMember(req.params.groupId, req.params.contactId);
      if (success) {
        console.log('👥 DELETE /api/groups/:groupId/members/:contactId - Member removed successfully');
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Member not found in group' });
      }
    } catch (error) {
      console.error('❌ DELETE /api/groups/:groupId/members/:contactId error:', error);
      res.status(500).json({ error: 'Failed to remove group member' });
    }
  });

  app.delete('/api/groups/:id', authenticate, async (req, res) => {
    try {
      console.log('👥 DELETE /api/groups/:id - Group ID:', req.params.id);
      const success = await storage.deleteGroup(req.params.id);
      if (success) {
        console.log('👥 DELETE /api/groups/:id - Group deleted successfully');
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Group not found' });
      }
    } catch (error) {
      console.error('❌ DELETE /api/groups/:id error:', error);
      res.status(500).json({ error: 'Failed to delete group' });
    }
  });

  return httpServer;
}