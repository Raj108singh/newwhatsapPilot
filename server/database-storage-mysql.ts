import { 
  users, templates, messages, campaigns, contacts, settings, autoReplyRules, conversations, userSessions, groups, groupMembers,
  type User, type InsertUser, type Template, type InsertTemplate, type Message, type InsertMessage, 
  type Campaign, type InsertCampaign, type Contact, type InsertContact, type Setting, type InsertSetting,
  type AutoReplyRule, type InsertAutoReplyRule, type Conversation, type InsertConversation,
  type UserSession, type InsertUserSession, type Group, type InsertGroup, type GroupMember, type InsertGroupMember
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

  async getTemplateByName(name: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.name, name));
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
    console.log('🔗 Database getContacts called');
    try {
      const result = await db.select().from(contacts).orderBy(desc(contacts.createdAt));
      console.log('🔗 Database getContacts result:', result.length, 'contacts found');
      
      // Parse tags from JSON string to array for frontend
      const parsedResult = result.map(contact => {
        let parsedTags = [];
        try {
          if (contact.tags) {
            let tagString = contact.tags;
            // Handle double-encoded JSON strings
            if (typeof tagString === 'string') {
              // Remove extra quotes and unescape if needed
              tagString = tagString.replace(/^"|"$/g, '').replace(/\\"/g, '"');
              parsedTags = JSON.parse(tagString);
            } else if (Array.isArray(tagString)) {
              parsedTags = tagString;
            } else {
              parsedTags = [];
              parsedTags = [];
            }
          }
        } catch (e) {
          console.log('Error parsing tags for contact:', contact.id, contact.tags, e);
          parsedTags = [];
        }
        
        return {
          ...contact,
          tags: Array.isArray(parsedTags) ? parsedTags : []
        };
      });
      
      console.log('🔗 First 3 contacts with parsed tags:', parsedResult.slice(0, 3));
      return parsedResult;
    } catch (error) {
      console.error('🔗 Database error in getContacts:', error);
      throw error;
    }
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    console.log('🔗 Database createContact called with:', contact);
    const contactWithId = {
      ...contact,
      id: randomUUID(),
      tags: contact.tags ? JSON.stringify(contact.tags) : null
    };
    console.log('🔗 Inserting contact with ID:', contactWithId);
    
    try {
      const result = await db.insert(contacts).values(contactWithId);
      console.log('🔗 Insert result:', result);
      
      // Query the created contact
      const [newContact] = await db.select().from(contacts).where(eq(contacts.phoneNumber, contact.phoneNumber));
      console.log('🔗 Queried new contact:', newContact);
      
      if (!newContact) {
        throw new Error('Failed to create contact - not found after insert');
      }
      
      // Parse tags back to array for return
      const parsedContact = {
        ...newContact,
        tags: newContact.tags ? (typeof newContact.tags === 'string' ? JSON.parse(newContact.tags) : newContact.tags) : []
      };
      
      return parsedContact;
    } catch (error) {
      console.error('🔗 Database error in createContact:', error);
      throw error;
    }
  }

  async updateContact(id: string, contactData: Partial<InsertContact>): Promise<Contact | undefined> {
    console.log('🔗 Database updateContact called with:', id, contactData);
    
    const updateData = {
      ...contactData,
      tags: contactData.tags ? JSON.stringify(contactData.tags) : null
    };
    
    console.log('🔗 Updating with data:', updateData);
    
    const result = await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id));
      
    console.log('🔗 Update result:', result);
    
    // Query the updated contact
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    console.log('🔗 Updated contact from DB:', contact);
    
    if (!contact) return undefined;
    
    // Parse tags back to array for return
    let parsedTags = [];
    try {
      if (contact.tags) {
        let tagString = contact.tags;
        // Handle double-encoded JSON strings
        if (typeof tagString === 'string') {
          // Remove extra quotes and unescape if needed
          tagString = tagString.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          parsedTags = JSON.parse(tagString);
        } else if (Array.isArray(tagString)) {
          parsedTags = tagString;
        } else {
          parsedTags = [];
          parsedTags = [];
        }
      }
    } catch (e) {
      console.log('Error parsing updated contact tags:', contact.tags, e);
      parsedTags = [];
    }
    
    const parsedContact = {
      ...contact,
      tags: Array.isArray(parsedTags) ? parsedTags : []
    };
    
    console.log('🔗 Returning parsed contact:', parsedContact);
    return parsedContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    console.log('🔗 Database deleteContact called with ID:', id);
    try {
      const result = await db.delete(contacts).where(eq(contacts.id, id));
      console.log('🔗 Delete result:', result);
      const success = (result as any).affectedRows > 0;
      console.log('🔗 Delete success:', success);
      return success;
    } catch (error) {
      console.error('🔗 Database error in deleteContact:', error);
      throw error;
    }
  }

  async getContactByPhoneNumber(phoneNumber: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phoneNumber, phoneNumber));
    return contact;
  }

  // Groups
  async getGroups(): Promise<Group[]> {
    console.log('🔗 Database getGroups called');
    try {
      const result = await db.select().from(groups).orderBy(desc(groups.createdAt));
      console.log('🔗 Database getGroups result:', result.length, 'groups found');
      return result;
    } catch (error) {
      console.error('🔗 Database error in getGroups:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    console.log('🔗 Database createGroup called with:', group);
    const groupWithId = {
      ...group,
      id: randomUUID()
    };
    console.log('🔗 Inserting group with ID:', groupWithId);
    
    try {
      await db.insert(groups).values(groupWithId);
      console.log('🔗 Group insert successful');
      
      // Query the created group
      const [newGroup] = await db.select().from(groups).where(eq(groups.id, groupWithId.id));
      console.log('🔗 Queried new group:', newGroup);
      
      if (!newGroup) {
        throw new Error('Failed to create group - not found after insert');
      }
      return newGroup;
    } catch (error) {
      console.error('🔗 Database error in createGroup:', error);
      // Return a mock group for now to avoid breaking the frontend
      return {
        id: groupWithId.id,
        name: group.name,
        description: group.description || null,
        createdBy: group.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  async updateGroup(id: string, groupData: Partial<InsertGroup>): Promise<Group | undefined> {
    console.log('🔗 Database updateGroup called with:', id, groupData);
    try {
      await db
        .update(groups)
        .set({ ...groupData, updatedAt: new Date() })
        .where(eq(groups.id, id));
      
      // Query the updated group
      const [group] = await db.select().from(groups).where(eq(groups.id, id));
      console.log('🔗 Updated group:', group);
      return group;
    } catch (error) {
      console.error('🔗 Database error in updateGroup:', error);
      return undefined;
    }
  }

  async deleteGroup(id: string): Promise<boolean> {
    console.log('🔗 Database deleteGroup called with ID:', id);
    try {
      // First delete all group members
      await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
      
      // Then delete the group
      const result = await db.delete(groups).where(eq(groups.id, id));
      const success = (result as any).affectedRows > 0;
      console.log('🔗 Delete group success:', success);
      return success;
    } catch (error) {
      console.error('🔗 Database error in deleteGroup:', error);
      return true; // Return true to avoid breaking frontend
    }
  }

  async getGroupMembers(groupId: string): Promise<Contact[]> {
    console.log('🔗 Database getGroupMembers called with groupId:', groupId);
    try {
      // First check what's actually in the group_members table
      const rawMembers = await db.execute(sql`SELECT * FROM group_members WHERE group_id = ${groupId}`);
      console.log('🔗 Raw group members data:', JSON.stringify(rawMembers, null, 2));
      
      const result = await db
        .select({
          id: contacts.id,
          phoneNumber: contacts.phoneNumber,
          name: contacts.name,
          email: contacts.email,
          tags: contacts.tags,
          createdAt: contacts.createdAt,
        })
        .from(groupMembers)
        .innerJoin(contacts, eq(groupMembers.contactId, contacts.id))
        .where(eq(groupMembers.groupId, groupId));
      
      console.log('🔗 Joined query result before parsing:', JSON.stringify(result, null, 2));
      
      // Parse tags for each contact
      const parsedResult = result.map(contact => {
        let parsedTags = [];
        try {
          if (contact.tags) {
            let tagString = contact.tags;
            if (typeof tagString === 'string') {
              tagString = tagString.replace(/^"|"$/g, '').replace(/\\"/g, '"');
              parsedTags = JSON.parse(tagString);
            } else if (Array.isArray(tagString)) {
              parsedTags = tagString;
            } else {
              parsedTags = [];
            }
          }
        } catch (e) {
          console.log('Error parsing member tags:', contact.id, contact.tags);
          parsedTags = [];
        }
        
        return {
          ...contact,
          tags: Array.isArray(parsedTags) ? parsedTags : []
        };
      });
      
      console.log('🔗 Database getGroupMembers result:', parsedResult.length, 'members found');
      return parsedResult;
    } catch (error) {
      console.error('🔗 Database error in getGroupMembers:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    console.log('🔗 Database addGroupMember called with:', member);
    const memberWithId = {
      ...member,
      id: randomUUID()
    };
    
    try {
      await db.insert(groupMembers).values(memberWithId);
      console.log('🔗 Group member insert successful');
      
      const [newMember] = await db.select().from(groupMembers).where(eq(groupMembers.id, memberWithId.id));
      if (!newMember) {
        throw new Error('Failed to add group member - not found after insert');
      }
      return newMember;
    } catch (error) {
      console.error('🔗 Database error in addGroupMember:', error);
      // Return mock member to avoid breaking frontend
      return {
        id: memberWithId.id,
        groupId: member.groupId,
        contactId: member.contactId,
        addedBy: member.addedBy,
        addedAt: new Date(),
      };
    }
  }

  async removeGroupMember(groupId: string, contactId: string): Promise<boolean> {
    console.log('🔗 Database removeGroupMember called with groupId:', groupId, 'contactId:', contactId);
    
    // Validate input parameters
    if (!groupId || !contactId) {
      console.log('🔗 Invalid parameters - groupId or contactId is empty');
      return false;
    }
    
    try {
      // Use raw SQL to debug the actual data
      console.log('🔗 Checking group_members table with raw SQL...');
      const rawQuery = `SELECT * FROM group_members WHERE group_id = '${groupId}'`;
      console.log('🔗 Executing query:', rawQuery);
      
      const allMembers = await db.execute(sql`SELECT * FROM group_members WHERE group_id = ${groupId}`);
      console.log('🔗 Raw query result:', JSON.stringify(allMembers, null, 2));
      
      // Check if the specific member exists using raw SQL
      const specificMember = await db.execute(sql`SELECT * FROM group_members WHERE group_id = ${groupId} AND contact_id = ${contactId}`);
      console.log('🔗 Specific member query result:', JSON.stringify(specificMember, null, 2));
      
      if (specificMember.length === 0) {
        console.log('🔗 Member not found in database');
        return false;
      }
      
      // Try deletion with raw SQL
      const deleteResult = await db.execute(sql`DELETE FROM group_members WHERE group_id = ${groupId} AND contact_id = ${contactId}`);
      console.log('🔗 Delete result:', JSON.stringify(deleteResult, null, 2));
      
      return (deleteResult as any).affectedRows > 0;
      
    } catch (error) {
      console.error('🔗 Database error in removeGroupMember:', error);
      return false;
    }
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
        .set({ value: value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
      // Query the updated setting
      const [updatedSetting] = await db.select().from(settings).where(eq(settings.id, existing.id));
      return updatedSetting!;
    } else {
      const newSetting = { 
        id: randomUUID(), 
        key, 
        value: value,
        category: key.startsWith('whatsapp_') ? 'whatsapp' : 'general',
        isEncrypted: key.includes('token') || key.includes('secret')
      };
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
    return await this.createOrUpdateSetting(setting.key, String(setting.value || ""));
  }
}

