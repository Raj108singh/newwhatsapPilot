-- WhatsApp Pro Database Export
-- Generated on: 2025-08-18T22:59:11.745Z
-- Export format: MySQL 8.0 compatible

SET FOREIGN_KEY_CHECKS = 0;
SET AUTOCOMMIT = 0;
START TRANSACTION;

-- Table structure for users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(255) UNIQUE,
  `email` VARCHAR(255),
  `password_hash` TEXT,
  `avatar_url` TEXT,
  `company_name` VARCHAR(255),
  `company_logo_url` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for templates
DROP TABLE IF EXISTS `templates`;
CREATE TABLE `templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255),
  `language` VARCHAR(10),
  `category` VARCHAR(100),
  `components` JSON,
  `status` VARCHAR(50) DEFAULT 'APPROVED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for messages
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `phone_number` VARCHAR(20),
  `content` TEXT,
  `direction` VARCHAR(20),
  `message_type` VARCHAR(50) DEFAULT 'text',
  `template_id` VARCHAR(36),
  `template_data` JSON,
  `status` VARCHAR(50) DEFAULT 'sent',
  `whatsapp_message_id` VARCHAR(255),
  `buttons` JSON,
  `media_url` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for campaigns
DROP TABLE IF EXISTS `campaigns`;
CREATE TABLE `campaigns` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255),
  `template_id` VARCHAR(36),
  `recipients` JSON,
  `total_recipients` INT,
  `sent_count` INT DEFAULT 0,
  `delivered_count` INT DEFAULT 0,
  `failed_count` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'draft',
  `scheduled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for contacts
DROP TABLE IF EXISTS `contacts`;
CREATE TABLE `contacts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `phone_number` VARCHAR(20) UNIQUE,
  `name` VARCHAR(255),
  `email` VARCHAR(255),
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for settings
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(255) UNIQUE,
  `value` JSON,
  `category` VARCHAR(100) DEFAULT 'general',
  `is_encrypted` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for conversations
DROP TABLE IF EXISTS `conversations`;
CREATE TABLE `conversations` (
  `id` VARCHAR(36) PRIMARY KEY,
  `phone_number` VARCHAR(20) UNIQUE,
  `contact_name` VARCHAR(255),
  `last_message` TEXT,
  `last_message_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `unread_count` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'active',
  `assigned_to` VARCHAR(36),
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
