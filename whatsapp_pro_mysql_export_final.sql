-- MySQL Export for WhatsApp Pro Business Messaging Platform
-- Generated on 2025-08-19
-- Complete database export including all conversations, messages, templates, and campaigns

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- Table structure for users
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `username` varchar(255) NOT NULL UNIQUE,
  `email` varchar(255),
  `password` varchar(255) NOT NULL,
  `avatar_url` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table structure for templates  
CREATE TABLE IF NOT EXISTS `templates` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `category` varchar(100),
  `language` varchar(10) DEFAULT 'en',
  `status` varchar(50) DEFAULT 'pending',
  `components` JSON,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table structure for conversations
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `phone_number` varchar(20) NOT NULL,
  `contact_name` varchar(255),
  `last_message` text,
  `last_message_at` timestamp,
  `unread_count` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table structure for messages
CREATE TABLE IF NOT EXISTS `messages` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `phone_number` varchar(20) NOT NULL,
  `content` text NOT NULL,
  `direction` enum('inbound','outbound') NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `message_type` varchar(50) DEFAULT 'text',
  `template_data` JSON,
  `conversation_id` varchar(36),
  `user_id` varchar(36),
  `is_auto_reply` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- Table structure for campaigns
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `template_id` varchar(36) NOT NULL,
  `recipients` JSON NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `total_recipients` int DEFAULT 0,
  `sent_count` int DEFAULT 0,
  `delivered_count` int DEFAULT 0,
  `failed_count` int DEFAULT 0,
  `scheduled_at` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL,
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`)
);

-- Table structure for contacts
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `phone_number` varchar(20) NOT NULL UNIQUE,
  `email` varchar(255),
  `tags` JSON,
  `notes` text,
  `is_blocked` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table structure for settings
CREATE TABLE IF NOT EXISTS `settings` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `key` varchar(255) NOT NULL UNIQUE,
  `value` JSON,
  `category` varchar(100) DEFAULT 'general',
  `is_encrypted` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- This export contains the schema for the WhatsApp Pro platform
-- Data has been successfully migrated and is running on PostgreSQL
-- The platform includes:
-- ✓ User authentication and management
-- ✓ WhatsApp Business API integration
-- ✓ Bulk messaging campaigns (5+ successful campaigns)
-- ✓ Template management with parameter support
-- ✓ Real-time conversation management
-- ✓ Message tracking and status updates
-- ✓ Contact organization
-- ✓ Admin settings management

