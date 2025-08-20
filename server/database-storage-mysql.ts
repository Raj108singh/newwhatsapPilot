import { 
  users, templates, messages, campaigns, contacts, settings, autoReplyRules, conversations, userSessions,
  type User, type InsertUser, type Template, type InsertTemplate, type Message, type InsertMessage, 
  type Campaign, type InsertCampaign, type Contact, type InsertContact, type Setting, type InsertSetting,
  type AutoReplyRule, type InsertAutoReplyRule, type Conversation, type InsertConversation,
  type UserSession, type InsertUserSession
} from "@shared/schema";
import { db } from "./db-mysql";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Users & Authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userWithId = {
      ...insertUser,
      id: randomUUID()
    };
    await db.insert(users).values(userWithId);
    // MySQL doesn't support .returning(), so we query the created user
    const [user] = await db.select().from(users).where(eq(users.username, insertUser.username));
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id));
    // Query the updated user
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // User Sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const sessionWithId = {
      ...session,
      id: randomUUID()
    };
    await db.insert(userSessions).values(sessionWithId);
    // Query the created session
    const [userSession] = await db.select().from(userSessions).where(eq(userSessions.token, session.token));
    if (!userSession) {
      throw new Error('Failed to create user session');
    }
    return userSession;
  }

  async getUserSession(token: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), eq(userSessions.isActive, true)));
    return session;
  }

  async deleteUserSession(token: string): Promise<boolean> {
    const result = await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.token, token));
    return (result as any).affectedRows > 0;
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    const result = await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));
    return (result as any).affectedRows > 0;
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const templateWithId = {
      ...template,
      id: randomUUID()
    };
    await db.insert(templates).values(templateWithId);
    // Query the created template
    const [newTemplate] = await db.select().from(templates).where(eq(templates.name, template.name));
    if (!newTemplate) {
      throw new Error('Failed to create template');
    }
    return newTemplate;
  }

  async updateTemplate(id: string, templateData: Partial<InsertTemplate>): Promise<Template | undefined> {
    await db
      .update(templates)
      .set({ ...templateData, updatedAt: new Date() })
      .where(eq(templates.id, id));
    // Query the updated template
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return (result as any).affectedRows > 0;
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const messageWithId = {
      ...message,
      id: randomUUID()
    };
    await db.insert(messages).values(messageWithId);
    
    // Update conversation
    if (message.conversationId) {
      await this.updateConversation(message.conversationId, {
        lastMessage: message.content,
        lastMessageAt: new Date(),
        unreadCount: message.direction === 'inbound' ? 1 : 0,
      });
    }
    
    // Query the created message
    const [newMessage] = await db.select().from(messages).where(eq(messages.phoneNumber, message.phoneNumber)).orderBy(desc(messages.createdAt)).limit(1);
    if (!newMessage) {
      throw new Error('Failed to create message');
    }
    return newMessage;
  }

  async updateMessage(id: string, messageData: Partial<InsertMessage>): Promise<Message | undefined> {
    await db
      .update(messages)
      .set({ ...messageData, statusUpdatedAt: new Date() })
      .where(eq(messages.id, id));
    // Query the updated message
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesByPhoneNumber(phoneNumber: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.phoneNumber, phoneNumber))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt));
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.lastMessageAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationByPhoneNumber(phoneNumber: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.phoneNumber, phoneNumber));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const conversationWithId = {
      ...conversation,
      id: randomUUID()
    };
    await db.insert(conversations).values(conversationWithId);
    // Query the created conversation
    const [newConversation] = await db.select().from(conversations).where(eq(conversations.phoneNumber, conversation.phoneNumber));
    if (!newConversation) {
      throw new Error('Failed to create conversation');
    }
    return newConversation;
  }

  async updateConversation(id: string, conversationData: Partial<InsertConversation>): Promise<Conversation | undefined> {
    await db
      .update(conversations)
      .set({ ...conversationData, updatedAt: new Date() })
      .where(eq(conversations.id, id));
    // Query the updated conversation
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  // Auto Reply Rules
  async getAutoReplyRules(): Promise<AutoReplyRule[]> {
    return await db.select().from(autoReplyRules).orderBy(desc(autoReplyRules.createdAt));
  }

  async createAutoReplyRule(rule: InsertAutoReplyRule): Promise<AutoReplyRule> {
    const ruleWithId = {
      ...rule,
      id: randomUUID()
    };
    await db.insert(autoReplyRules).values(ruleWithId);
    // Query the created rule
    const [newRule] = await db.select().from(autoReplyRules).where(eq(autoReplyRules.trigger, rule.trigger));
    if (!newRule) {
      throw new Error('Failed to create auto reply rule');
    }
    return newRule;
  }

  async updateAutoReplyRule(id: string, ruleData: Partial<InsertAutoReplyRule>): Promise<AutoReplyRule | undefined> {
    await db
      .update(autoReplyRules)
      .set({ ...ruleData, updatedAt: new Date() })
      .where(eq(autoReplyRules.id, id));
    // Query the updated rule
    const [rule] = await db.select().from(autoReplyRules).where(eq(autoReplyRules.id, id));
    return rule;
  }

  async deleteAutoReplyRule(id: string): Promise<boolean> {
    await db.delete(autoReplyRules).where(eq(autoReplyRules.id, id));
    return true;
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const campaignWithId = {
      ...campaign,
      id: randomUUID()
    };
    await db.insert(campaigns).values(campaignWithId);
    // Query the created campaign
    const [newCampaign] = await db.select().from(campaigns).where(eq(campaigns.name, campaign.name));
    if (!newCampaign) {
      throw new Error('Failed to create campaign');
    }
    return newCampaign;
  }

  async updateCampaign(id: string, campaignData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    await db
      .update(campaigns)
      .set(campaignData)
      .where(eq(campaigns.id, id));
    // Query the updated campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const contactWithId = {
      ...contact,
      id: randomUUID()
    };
    await db.insert(contacts).values(contactWithId);
    // Query the created contact
    const [newContact] = await db.select().from(contacts).where(eq(contacts.phoneNumber, contact.phoneNumber));
    if (!newContact) {
      throw new Error('Failed to create contact');
    }
    return newContact;
  }

  async updateContact(id: string, contactData: Partial<InsertContact>): Promise<Contact | undefined> {
    await db
      .update(contacts)
      .set(contactData)
      .where(eq(contacts.id, id));
    // Query the updated contact
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return (result as any).affectedRows > 0;
  }

  async getContactByPhoneNumber(phoneNumber: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phoneNumber, phoneNumber));
    return contact;
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async createOrUpdateSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
      // Query the updated setting
      const [updatedSetting] = await db.select().from(settings).where(eq(settings.id, existing.id));
      return updatedSetting!;
    } else {
      const newSetting = { id: randomUUID(), key, value };
      await db.insert(settings).values(newSetting);
      // Query the created setting
      const [createdSetting] = await db.select().from(settings).where(eq(settings.key, key));
      if (!createdSetting) {
        throw new Error('Failed to create setting');
      }
      return createdSetting;
    }
  }

  async updateSetting(id: string, value: string): Promise<Setting | undefined> {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.id, id));
    // Query the updated setting
    const [setting] = await db.select().from(settings).where(eq(settings.id, id));
    return setting;
  }

  async deleteSetting(id: string): Promise<boolean> {
    const result = await db.delete(settings).where(eq(settings.id, id));
    return (result as any).affectedRows > 0;
  }

  // Missing methods implementation
  async getAutoReplyRule(id: string): Promise<AutoReplyRule | undefined> {
    const [rule] = await db.select().from(autoReplyRules).where(eq(autoReplyRules.id, id));
    return rule;
  }

  async getActiveAutoReplyRules(): Promise<AutoReplyRule[]> {
    return await db.select().from(autoReplyRules).where(eq(autoReplyRules.isActive, true)).orderBy(desc(autoReplyRules.createdAt));
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    return await this.createOrUpdateSetting(setting.key, setting.value || "");
  }
}

