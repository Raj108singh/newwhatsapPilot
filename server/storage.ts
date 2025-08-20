import { 
  users, templates, messages, campaigns, contacts, settings, autoReplyRules, conversations, userSessions,
  type User, type InsertUser, type Template, type InsertTemplate, type Message, type InsertMessage, 
  type Campaign, type InsertCampaign, type Contact, type InsertContact, type Setting, type InsertSetting,
  type AutoReplyRule, type InsertAutoReplyRule, type Conversation, type InsertConversation,
  type UserSession, type InsertUserSession
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // Users & Authentication
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(token: string): Promise<UserSession | undefined>;
  deleteUserSession(token: string): Promise<boolean>;
  deleteUserSessions(userId: string): Promise<boolean>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  // Messages
  getMessages(): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, message: Partial<InsertMessage>): Promise<Message | undefined>;
  getMessagesByPhoneNumber(phoneNumber: string): Promise<Message[]>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;

  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByPhoneNumber(phoneNumber: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;

  // Auto Reply Rules
  getAutoReplyRules(): Promise<AutoReplyRule[]>;
  getAutoReplyRule(id: string): Promise<AutoReplyRule | undefined>;
  createAutoReplyRule(rule: InsertAutoReplyRule): Promise<AutoReplyRule>;
  updateAutoReplyRule(id: string, rule: Partial<InsertAutoReplyRule>): Promise<AutoReplyRule | undefined>;
  deleteAutoReplyRule(id: string): Promise<boolean>;
  getActiveAutoReplyRules(): Promise<AutoReplyRule[]>;

  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;

  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;

  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: any): Promise<Setting | undefined>;
  deleteSetting(key: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private templates: Map<string, Template>;
  private messages: Map<string, Message>;
  private campaigns: Map<string, Campaign>;
  private contacts: Map<string, Contact>;
  private settings: Map<string, Setting>;
  private conversations: Map<string, Conversation>;
  private autoReplyRules: Map<string, AutoReplyRule>;
  private userSessions: Map<string, UserSession>;

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.messages = new Map();
    this.campaigns = new Map();
    this.contacts = new Map();
    this.settings = new Map();
    this.conversations = new Map();
    this.autoReplyRules = new Map();
    this.userSessions = new Map();
    this.initSampleData();
  }

  private initSampleData() {
    // Sample templates
    const welcomeTemplate: Template = {
      id: randomUUID(),
      name: "Welcome Message",
      category: "marketing",
      language: "en",
      status: "approved",
      components: [
        {
          type: "BODY",
          text: "Hi {{1}}, welcome to our platform! We're excited to have you on board. Get started with your free trial: {{2}}"
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(welcomeTemplate.id, welcomeTemplate);
  }

  // Users & Authentication
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "admin",
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated: User = { ...existing, ...userData };
    this.users.set(id, updated);
    return updated;
  }

  // User Sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const id = randomUUID();
    const userSession: UserSession = { 
      ...session, 
      id,
      isActive: session.isActive !== undefined ? session.isActive : true,
      createdAt: new Date(),
    };
    this.userSessions.set(session.token, userSession);
    return userSession;
  }

  async getUserSession(token: string): Promise<UserSession | undefined> {
    const session = this.userSessions.get(token);
    return session?.isActive ? session : undefined;
  }

  async deleteUserSession(token: string): Promise<boolean> {
    const session = this.userSessions.get(token);
    if (session) {
      session.isActive = false;
      return true;
    }
    return false;
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    let updated = false;
    for (const session of this.userSessions.values()) {
      if (session.userId === userId && session.isActive) {
        session.isActive = false;
        updated = true;
      }
    }
    return updated;
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = {
      ...insertTemplate,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, templateData: Partial<InsertTemplate>): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;

    const updated: Template = { ...existing, ...templateData, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      statusUpdatedAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async updateMessage(id: string, messageData: Partial<InsertMessage>): Promise<Message | undefined> {
    const existing = this.messages.get(id);
    if (!existing) return undefined;

    const updated: Message = { ...existing, ...messageData, statusUpdatedAt: new Date() };
    this.messages.set(id, updated);
    return updated;
  }

  async getMessagesByPhoneNumber(phoneNumber: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.phoneNumber === phoneNumber);
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.conversationId === conversationId);
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByPhoneNumber(phoneNumber: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(c => c.phoneNumber === phoneNumber);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, conversationData: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const existing = this.conversations.get(id);
    if (!existing) return undefined;

    const updated: Conversation = { ...existing, ...conversationData, updatedAt: new Date() };
    this.conversations.set(id, updated);
    return updated;
  }

  // Auto Reply Rules
  async getAutoReplyRules(): Promise<AutoReplyRule[]> {
    return Array.from(this.autoReplyRules.values());
  }

  async getAutoReplyRule(id: string): Promise<AutoReplyRule | undefined> {
    return this.autoReplyRules.get(id);
  }

  async createAutoReplyRule(insertRule: InsertAutoReplyRule): Promise<AutoReplyRule> {
    const id = randomUUID();
    const rule: AutoReplyRule = {
      ...insertRule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.autoReplyRules.set(id, rule);
    return rule;
  }

  async updateAutoReplyRule(id: string, ruleData: Partial<InsertAutoReplyRule>): Promise<AutoReplyRule | undefined> {
    const existing = this.autoReplyRules.get(id);
    if (!existing) return undefined;

    const updated: AutoReplyRule = { ...existing, ...ruleData, updatedAt: new Date() };
    this.autoReplyRules.set(id, updated);
    return updated;
  }

  async deleteAutoReplyRule(id: string): Promise<boolean> {
    return this.autoReplyRules.delete(id);
  }

  async getActiveAutoReplyRules(): Promise<AutoReplyRule[]> {
    return Array.from(this.autoReplyRules.values()).filter(r => r.isActive);
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      createdAt: new Date(),
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, campaignData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const existing = this.campaigns.get(id);
    if (!existing) return undefined;

    const updated: Campaign = { ...existing, ...campaignData };
    this.campaigns.set(id, updated);
    return updated;
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      ...insertContact,
      id,
      name: insertContact.name || null,
      email: insertContact.email || null,
      tags: insertContact.tags || null,
      createdAt: new Date(),
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, contactData: Partial<InsertContact>): Promise<Contact | undefined> {
    const existing = this.contacts.get(id);
    if (!existing) return undefined;

    const updated: Contact = { ...existing, ...contactData };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    return Array.from(this.settings.values()).find(setting => setting.key === key);
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(insertSetting.key);
    if (existing) {
      return this.updateSetting(insertSetting.key, insertSetting.value) as Promise<Setting>;
    }

    const id = randomUUID();
    const setting: Setting = {
      ...insertSetting,
      id,
      category: insertSetting.category || 'general',
      isEncrypted: insertSetting.isEncrypted || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.settings.set(id, setting);
    return setting;
  }

  async updateSetting(key: string, value: any): Promise<Setting | undefined> {
    const existing = await this.getSetting(key);
    if (!existing) return undefined;

    const updated: Setting = {
      ...existing,
      value,
      updatedAt: new Date(),
    };
    this.settings.set(existing.id, updated);
    return updated;
  }

  async deleteSetting(key: string): Promise<boolean> {
    const existing = await this.getSetting(key);
    if (!existing) return false;
    return this.settings.delete(existing.id);
  }
}

// Temporarily use in-memory storage while VPS MySQL is being configured
// TODO: Switch to DatabaseStorage when VPS MySQL accepts external connections
export const storage = new MemStorage();