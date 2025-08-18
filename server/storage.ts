import { type User, type InsertUser, type Template, type InsertTemplate, type Message, type InsertMessage, type Campaign, type InsertCampaign, type Contact, type InsertContact, type Setting, type InsertSetting } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, templates, messages, campaigns, contacts, settings } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  getMessagesByPhoneNumber(phoneNumber: string): Promise<Message[]>;

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

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.messages = new Map();
    this.campaigns = new Map();
    this.contacts = new Map();
    this.settings = new Map();

    // Initialize with sample data
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

    const orderTemplate: Template = {
      id: randomUUID(),
      name: "Order Confirmation",
      category: "transactional",
      language: "en",
      status: "approved",
      components: [
        {
          type: "BODY",
          text: "Your order #{{1}} has been confirmed! Expected delivery: {{2}}. Track your order: {{3}}"
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(welcomeTemplate.id, welcomeTemplate);
    this.templates.set(orderTemplate.id, orderTemplate);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
      status: insertTemplate.status || 'pending',
      language: insertTemplate.language || 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, templateUpdate: Partial<InsertTemplate>): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;

    const updated: Template = {
      ...existing,
      ...templateUpdate,
      updatedAt: new Date(),
    };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      status: insertMessage.status || 'sent',
      messageType: insertMessage.messageType || 'text',
      templateId: insertMessage.templateId || null,
      templateData: insertMessage.templateData || null,
      mediaUrl: insertMessage.mediaUrl || null,
      buttons: insertMessage.buttons || null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByPhoneNumber(phoneNumber: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.phoneNumber === phoneNumber)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      status: insertCampaign.status || 'pending',
      sentCount: insertCampaign.sentCount || 0,
      deliveredCount: insertCampaign.deliveredCount || 0,
      failedCount: insertCampaign.failedCount || 0,
      scheduledAt: insertCampaign.scheduledAt || null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, campaignUpdate: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const existing = this.campaigns.get(id);
    if (!existing) return undefined;

    const updated: Campaign = {
      ...existing,
      ...campaignUpdate,
    };
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

  async updateContact(id: string, contactUpdate: Partial<InsertContact>): Promise<Contact | undefined> {
    const existing = this.contacts.get(id);
    if (!existing) return undefined;

    const updated: Contact = {
      ...existing,
      ...contactUpdate,
    };
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

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db
      .insert(templates)
      .values({
        ...insertTemplate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return template;
  }

  async updateTemplate(id: string, templateUpdate: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [updated] = await db
      .update(templates)
      .set({ ...templateUpdate, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return db.select().from(messages);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        createdAt: new Date(),
      })
      .returning();
    return message;
  }

  async getMessagesByPhoneNumber(phoneNumber: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.phoneNumber, phoneNumber));
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns);
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        ...insertCampaign,
        createdAt: new Date(),
      })
      .returning();
    return campaign;
  }

  async updateCampaign(id: string, campaignUpdate: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updated] = await db
      .update(campaigns)
      .set(campaignUpdate)
      .where(eq(campaigns.id, id))
      .returning();
    return updated || undefined;
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return db.select().from(contacts);
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values({
        ...insertContact,
        createdAt: new Date(),
      })
      .returning();
    return contact;
  }

  async updateContact(id: string, contactUpdate: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updated] = await db
      .update(contacts)
      .set(contactUpdate)
      .where(eq(contacts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    if (setting && setting.value) {
      // Parse JSON value and handle potential double-encoding
      try {
        let value = setting.value;
        if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          value = JSON.parse(value);
        }
        return { ...setting, value };
      } catch (error) {
        console.error('Error parsing setting value:', error);
        return setting;
      }
    }
    return setting || undefined;
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    // Ensure value is stored as a plain string, not JSON-encoded
    const valueToStore = typeof insertSetting.value === 'string' ? insertSetting.value : JSON.stringify(insertSetting.value);
    
    const existing = await this.getSetting(insertSetting.key);
    if (existing) {
      return this.updateSetting(insertSetting.key, valueToStore) as Promise<Setting>;
    }

    const [setting] = await db
      .insert(settings)
      .values({
        ...insertSetting,
        value: valueToStore,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return setting;
  }

  async updateSetting(key: string, value: any): Promise<Setting | undefined> {
    const [updated] = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();
    return updated || undefined;
  }

  async deleteSetting(key: string): Promise<boolean> {
    const result = await db.delete(settings).where(eq(settings.key, key));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

// Use DatabaseStorage in production, MemStorage for development
export const storage = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
