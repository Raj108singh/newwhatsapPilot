import { 
  users, templates, messages, campaigns, contacts, settings, autoReplyRules, conversations, userSessions,
  type User, type InsertUser, type Template, type InsertTemplate, type Message, type InsertMessage, 
  type Campaign, type InsertCampaign, type Contact, type InsertContact, type Setting, type InsertSetting,
  type AutoReplyRule, type InsertAutoReplyRule, type Conversation, type InsertConversation,
  type UserSession, type InsertUserSession
} from "@shared/schema";
import { db } from "./db-mysql";
import { eq, desc, and, or, sql } from "drizzle-orm";
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // User Sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [userSession] = await db.insert(userSessions).values(session).returning();
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
    return result.rowCount > 0;
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    const result = await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));
    return result.rowCount > 0;
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
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }

  async updateTemplate(id: string, templateData: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [template] = await db
      .update(templates)
      .set({ ...templateData, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return template;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return result.rowCount > 0;
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
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Update conversation
    if (message.conversationId) {
      await this.updateConversation(message.conversationId, {
        lastMessage: message.content,
        lastMessageAt: new Date(),
        unreadCount: message.direction === 'inbound' ? 1 : 0,
      });
    }
    
    return newMessage;
  }

  async updateMessage(id: string, messageData: Partial<InsertMessage>): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set({ ...messageData, statusUpdatedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
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
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversation(id: string, conversationData: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...conversationData, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  // Auto Reply Rules
  async getAutoReplyRules(): Promise<AutoReplyRule[]> {
    return await db.select().from(autoReplyRules).orderBy(desc(autoReplyRules.priority));
  }

  async getAutoReplyRule(id: string): Promise<AutoReplyRule | undefined> {
    const [rule] = await db.select().from(autoReplyRules).where(eq(autoReplyRules.id, id));
    return rule;
  }

  async createAutoReplyRule(rule: InsertAutoReplyRule): Promise<AutoReplyRule> {
    const [newRule] = await db.insert(autoReplyRules).values(rule).returning();
    return newRule;
  }

  async updateAutoReplyRule(id: string, ruleData: Partial<InsertAutoReplyRule>): Promise<AutoReplyRule | undefined> {
    const [rule] = await db
      .update(autoReplyRules)
      .set({ ...ruleData, updatedAt: new Date() })
      .where(eq(autoReplyRules.id, id))
      .returning();
    return rule;
  }

  async deleteAutoReplyRule(id: string): Promise<boolean> {
    const result = await db.delete(autoReplyRules).where(eq(autoReplyRules.id, id));
    return result.rowCount > 0;
  }

  async getActiveAutoReplyRules(): Promise<AutoReplyRule[]> {
    return await db
      .select()
      .from(autoReplyRules)
      .where(eq(autoReplyRules.isActive, true))
      .orderBy(desc(autoReplyRules.priority));
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
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, campaignData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(campaignData)
      .where(eq(campaigns.id, id))
      .returning();
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
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: string, contactData: Partial<InsertContact>): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set(contactData)
      .where(eq(contacts.id, id))
      .returning();
    return contact;
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return result.rowCount > 0;
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(desc(settings.createdAt));
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    try {
      // Check if setting exists
      const existingSetting = await this.getSetting(setting.key);
      
      if (existingSetting) {
        // Update existing setting
        const [updatedSetting] = await db
          .update(settings)
          .set({
            value: setting.value,
            category: setting.category || existingSetting.category,
            isEncrypted: setting.isEncrypted !== undefined ? setting.isEncrypted : existingSetting.isEncrypted,
            updatedAt: new Date(),
          })
          .where(eq(settings.key, setting.key))
          .returning();
        return updatedSetting;
      } else {
        // Create new setting
        const [newSetting] = await db.insert(settings).values(setting).returning();
        return newSetting;
      }
    } catch (error) {
      console.error('Settings update error:', error);
      throw error;
    }
  }

  async updateSetting(key: string, value: any): Promise<Setting | undefined> {
    const [setting] = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();
    return setting;
  }

  async deleteSetting(key: string): Promise<boolean> {
    const result = await db.delete(settings).where(eq(settings.key, key));
    return result.rowCount > 0;
  }
}