import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, timestamp, json, int, boolean } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin, user
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templates = mysqlTable("templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  category: text("category").notNull(), // marketing, transactional, utility
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  components: json("components").notNull(), // WhatsApp template components
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  phoneNumber: text("phone_number").notNull(),
  content: text("content").notNull(),
  direction: text("direction").notNull(), // inbound, outbound
  messageType: text("message_type").notNull().default("text"), // text, template, media
  status: text("status").notNull().default("sent"), // sent, delivered, read, failed
  statusUpdatedAt: timestamp("status_updated_at").defaultNow(),
  templateId: varchar("template_id", { length: 36 }),
  templateData: json("template_data"), // Complete template data with all components
  mediaUrl: text("media_url"), // For images, videos, documents
  buttons: json("buttons"), // For interactive buttons
  isAutoReply: boolean("is_auto_reply").notNull().default(false),
  autoReplyTriggerId: varchar("auto_reply_trigger_id", { length: 36 }), // Reference to auto reply trigger
  conversationId: varchar("conversation_id", { length: 36 }), // Group messages by conversation
  whatsappMessageId: text("whatsapp_message_id"), // WhatsApp's message ID for tracking
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = mysqlTable("campaigns", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  templateId: varchar("template_id", { length: 36 }).notNull(),
  recipients: json("recipients").notNull(), // array of phone numbers
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  totalRecipients: int("total_recipients").notNull(),
  sentCount: int("sent_count").notNull().default(0),
  deliveredCount: int("delivered_count").notNull().default(0),
  failedCount: int("failed_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const contacts = mysqlTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  phoneNumber: text("phone_number").notNull().unique(),
  name: text("name"),
  email: text("email"),
  tags: json("tags"), // array of strings
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = mysqlTable("settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  key: text("key").notNull().unique(),
  value: json("value").notNull(),
  category: text("category").notNull().default("general"), // general, whatsapp, notifications, branding
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auto Reply Rules for Chatbot
export const autoReplyRules = mysqlTable("auto_reply_rules", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(), // keyword or phrase to trigger
  triggerType: text("trigger_type").notNull().default("keyword"), // keyword, greeting, default
  replyMessage: text("reply_message").notNull(),
  templateId: varchar("template_id", { length: 36 }), // Use template instead of plain text
  isActive: boolean("is_active").notNull().default(true),
  priority: int("priority").notNull().default(1), // Higher number = higher priority
  conditions: json("conditions"), // Additional conditions (time, sender, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations for grouping messages
export const conversations = mysqlTable("conversations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  phoneNumber: text("phone_number").notNull().unique(),
  contactName: text("contact_name"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  unreadCount: int("unread_count").notNull().default(0),
  status: text("status").notNull().default("active"), // active, archived, blocked
  assignedTo: varchar("assigned_to", { length: 36 }), // User ID who handles this conversation
  tags: json("tags"), // array of strings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Sessions for authentication
export const userSessions = mysqlTable("user_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutoReplyRuleSchema = createInsertSchema(autoReplyRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type AutoReplyRule = typeof autoReplyRules.$inferSelect;
export type InsertAutoReplyRule = z.infer<typeof insertAutoReplyRuleSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type LoginCredentials = z.infer<typeof loginSchema>;

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile update schema
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

// Login page customization schema
export const loginPageSettingsSchema = z.object({
  login_logo: z.string().optional(),
  login_title: z.string().min(1, "Login title is required"),
  login_subtitle: z.string().min(1, "Login subtitle is required"),
  login_welcome_title: z.string().min(1, "Welcome title is required"),
  login_welcome_description: z.string().min(1, "Welcome description is required"),
  login_background_gradient_from: z.string().optional(),
  login_background_gradient_via: z.string().optional(), 
  login_background_gradient_to: z.string().optional(),
  login_feature_1_title: z.string().optional(),
  login_feature_1_description: z.string().optional(),
  login_feature_2_title: z.string().optional(),
  login_feature_2_description: z.string().optional(),
  login_feature_3_title: z.string().optional(),
  login_feature_3_description: z.string().optional(),
});

export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type LoginPageSettings = z.infer<typeof loginPageSettingsSchema>;

// Auth User type for authentication responses
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
}

// Groups table for WhatsApp-style group management
export const groups = mysqlTable('groups', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Group members junction table
export const groupMembers = mysqlTable('group_members', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  groupId: varchar('group_id', { length: 36 }).notNull(),
  contactId: varchar('contact_id', { length: 36 }).notNull(),
  addedBy: varchar('added_by', { length: 36 }).notNull(),
  addedAt: timestamp('added_at').notNull().defaultNow(),
});

// Groups Types
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

// Group Members Types  
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  addedAt: true,
});
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
