-- WhatsApp Pro MySQL Database Export
-- Generated on 2025-08-20 for PHP Admin Panel
-- Database: niharsk_whatsapp_raj
-- Host: 103.38.50.233:3306

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `username` TEXT NOT NULL,
  `password` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `role` TEXT NOT NULL DEFAULT 'admin',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_username` (`username`(191)),
  UNIQUE KEY `unique_email` (`email`(191)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `templates`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `templates` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `category` TEXT NOT NULL,
  `language` TEXT NOT NULL DEFAULT 'en',
  `status` TEXT NOT NULL DEFAULT 'pending',
  `components` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `contacts`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `contacts` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `phone_number` TEXT NOT NULL,
  `name` TEXT,
  `email` TEXT,
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_phone` (`phone_number`(191)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `conversations`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `phone_number` TEXT NOT NULL,
  `contact_name` TEXT,
  `last_message` TEXT,
  `last_message_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `unread_count` INT NOT NULL DEFAULT 0,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_phone_conv` (`phone_number`(191)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `messages`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `messages` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `phone_number` TEXT NOT NULL,
  `content` TEXT NOT NULL,
  `direction` TEXT NOT NULL,
  `message_type` TEXT NOT NULL DEFAULT 'text',
  `status` TEXT NOT NULL DEFAULT 'sent',
  `status_updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `template_id` varchar(36),
  `template_data` JSON,
  `media_url` TEXT,
  `buttons` JSON,
  `is_auto_reply` BOOLEAN NOT NULL DEFAULT FALSE,
  `auto_reply_trigger_id` varchar(36),
  `conversation_id` varchar(36),
  `whatsapp_message_id` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `campaigns`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `template_id` varchar(36) NOT NULL,
  `recipients` JSON NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `total_recipients` INT NOT NULL,
  `sent_count` INT NOT NULL DEFAULT 0,
  `delivered_count` INT NOT NULL DEFAULT 0,
  `failed_count` INT NOT NULL DEFAULT 0,
  `scheduled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `settings`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `settings` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `setting_key` TEXT NOT NULL,
  `value` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_setting_key` (`setting_key`(191)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `auto_reply_rules`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `auto_reply_rules` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `keyword` TEXT NOT NULL,
  `reply_message` TEXT NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `match_type` TEXT NOT NULL DEFAULT 'contains',
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `user_sessions`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) NOT NULL,
  `token` TEXT NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_token` (`token`(191)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Sample data for admin user
-- --------------------------------------------------------

-- Note: Default admin user will be created automatically when application starts
-- Username: admin
-- Password: admin123 (hashed in database)
-- Email: admin@whatsapppro.com

-- --------------------------------------------------------
-- Database connection details
-- --------------------------------------------------------

-- Host: 103.38.50.233
-- Port: 3306
-- Database: niharsk_whatsapp_raj
-- Username: niharsk_whatsapp_raj
-- Password: niharsk_whatsapp_raj

COMMIT;