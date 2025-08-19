-- WhatsApp Pro Complete Database Export
-- Generated on: 2025-08-19 18:46:00 UTC
-- All data exported from PostgreSQL database

-- Create database structure (if needed)
CREATE DATABASE IF NOT EXISTS whatsapp_pro;
USE whatsapp_pro;

-- ================================
-- TABLE STRUCTURE AND DATA: USERS
-- ================================

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert users data
INSERT INTO users (id, username, password, email, name, role, is_active, last_login, created_at, updated_at) VALUES
('49ed5d57-ddfe-473b-a9fc-618c5e4a1435', 'admin', '$2b$10$cs47u.LTAOeSAN6Tk2VqyO5tlRqSx669WIHJM8LR5HmIDkO866a9O', 'admin@whatsapppro.com', 'Administrator', 'admin', TRUE, '2025-08-19 18:28:51.232', '2025-08-19 18:27:31.746059', '2025-08-19 18:28:51.232');

-- ================================
-- TABLE STRUCTURE AND DATA: TEMPLATES
-- ================================

DROP TABLE IF EXISTS templates;
CREATE TABLE templates (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'pending',
    components JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert templates data
INSERT INTO templates (id, name, category, language, status, components, created_at, updated_at) VALUES
('57bebd41-2172-4f25-8255-b1f312bc0fbf', 'offer', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Stone Sense Interior"},{"type":"BODY","text":"Looking to give your home or office a stunning new look? ✨\r\nStoneSense Interior offers premium interior design and stone décor solutions tailored to your style and budget.📞 Book a free consultation today and let''s bring your vision to life!"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"visit","url":"https://stonesenseinterior.com/"}]}]', '2025-08-19 18:31:52.323277', '2025-08-19 18:31:52.323277'),
('a08a3141-9b8d-44bc-8e9b-524337e64d1d', 'stonesenseinterior', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Welcome to Stone Sense interior limited"},{"type":"BODY","text":"We offer marble and granite specialists Wall cladding fireplace flower pots custom water features"},{"type":"FOOTER","text":"Thanks dear for contacting us"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"Any assistances","url":"https://app.stonesenseinterior.com/"}]}]', '2025-08-19 18:31:52.385444', '2025-08-19 18:31:52.385444'),
('994fc7df-cc48-4562-9813-9f09e6a2b1ea', 'intro_catalog_offer', 'marketing', 'en_US', 'approved', '[{"type":"BODY","text":"Now shop for your favourite products right here on WhatsApp! Get Rs {{1}} off on all orders above {{2}}Rs! Valid for your first {{3}} orders placed on WhatsApp!","example":{"body_text":[["100","400","3"]]}},{"type":"FOOTER","text":"Best grocery deals on WhatsApp!"},{"type":"BUTTONS","buttons":[{"type":"CATALOG","text":"View catalog"}]}]', '2025-08-19 18:31:52.431388', '2025-08-19 18:31:52.431388'),
('e8f2805e-e460-4f35-875d-0ad42259d420', 'welcome', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Stone Sense Interior"},{"type":"BODY","text":"Discover premium interior solutions with Stone Sense Interior. Transform your space today!"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"Visit","url":"https://google.com/"}]}]', '2025-08-19 18:31:52.475671', '2025-08-19 18:31:52.475671'),
('08ed00d2-399b-4ac4-9106-7b38f3e835cc', 'welcome_message', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"IMAGE","example":{"header_handle":["https://scontent.whatsapp.net/v/t61.29466-34/491840701_688491470315202_6982794825170912121_n.jpg?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=3yM_lOJdQwQQ7kNvwFQG1SG&_nc_oc=AdmBAAFwsM5pYSEJHqoGN5q-RQuAvk3rks5beJr4LI3NWYbGfG_k0E4nMlrXOTS5e3M&_nc_zt=3&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&_nc_gid=o4y9Onr6REGWc2A69G0XEQ&oh=01_Q5Aa2QF9mM6Ilg-U4BMLNGaYw_a3ZRlrYl9iU9A4Syj9E4Efgw&oe=68CC4FAE"]}},{"type":"BODY","text":"Welcome to *Stone Sense Interior Ltd!* We specialize in granite and marble solutions that elevate your space. Visit *stonesenseinterior.com* to explore our services or call us today!\""},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Now","phone_number":"+256753799137"}]}]', '2025-08-19 18:31:52.520985', '2025-08-19 18:31:52.520985'),
('ea62e37e-16e1-46e4-8e54-6c6189dcb240', 'indiana', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"welcome to indiana"},{"type":"BODY","text":"we offer flower pots"},{"type":"FOOTER","text":"Thanks dear for contacting us"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"Any assistances","url":"https://app.stonesenseinterior.com/"}]}]', '2025-08-19 18:31:52.566131', '2025-08-19 18:31:52.566131'),
('59e4b93e-b7d0-406f-abf6-6d3985cb3440', 'catalogs', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Stonesense Interior Ltd Product Catalog"},{"type":"BODY","text":"Discover Endless Possibilities with *Stone Sense Interior Ltd!*\nLooking to enhance your space with *premium* granite and marble solutions? Explore our wide range of *products and services*, tailored to bring elegance and durability to your interiors.\n👉 *Access our catalog now*"},{"type":"BUTTONS","buttons":[{"type":"MPM","text":"View items"}]}]', '2025-08-19 18:31:52.61132', '2025-08-19 18:31:52.61132'),
('e541f024-9060-41f0-897f-d750ccf86cd0', 'reminder_for_regular_services', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Reminder"},{"type":"BODY","text":"Is your marble surface losing its shine? Schedule a polishing service today with *Stone Sense Interior Ltd* to give it a refreshed look. Contact us now for details!"},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Now","phone_number":"+256753799137"}]}]', '2025-08-19 18:31:52.656676', '2025-08-19 18:31:52.656676'),
('bfcfd737-a331-488a-b5e6-302fb9dfe39b', 'payment_reminder', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Payment Reminder"},{"type":"BODY","text":"Dear Customer, this is a friendly reminder of your *pending payment * due . Please contact us  for any questions. *_Thank you!_*"},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Now","phone_number":"+256753799137"}]}]', '2025-08-19 18:31:52.702145', '2025-08-19 18:31:52.702145'),
('b0782048-f492-42f5-ab70-555ce47a7a8d', 'free_quote_message', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"IMAGE","example":{"header_handle":["https://scontent.whatsapp.net/v/t61.29466-34/491918089_1483453836393759_7826202985228312895_n.jpg?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=LwfhvX-FvZEQ7kNvwFf4Zre&_nc_oc=AdmRCVnAEeKMbthbXZTAZwNJ3yXqterj6jS42iuvIkttqy5owqzDGaHA6pUZpUESaWU&_nc_zt=3&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&_nc_gid=o4y9Onr6REGWc2A69G0XEQ&oh=01_Q5Aa2QFyHz_VojKzczbiJL4gFt_vNpm75zKSVMCQAPeAF-oHxg&oe=68CC2ADA"]}},{"type":"BODY","text":"Thinking of a new look for your space? Get a FREE quote for granite or marble services today! Contact us or visit *stonesenseinterior.com.*"},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Contact Us","phone_number":"+256753799137"},{"type":"URL","text":"Visit Now","url":"https://stonesenseinterior.com/"}]}]', '2025-08-19 18:31:52.747211', '2025-08-19 18:31:52.747211');

-- ================================
-- TABLE STRUCTURE AND DATA: MESSAGES
-- ================================

DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    phone_number TEXT,
    content TEXT,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'pending',
    status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    template_id VARCHAR(255),
    template_data JSON,
    media_url TEXT,
    buttons JSON,
    is_auto_reply BOOLEAN DEFAULT FALSE,
    auto_reply_trigger_id VARCHAR(255),
    conversation_id VARCHAR(255),
    whatsapp_message_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert messages data
INSERT INTO messages (id, phone_number, content, direction, message_type, status, status_updated_at, template_id, template_data, media_url, buttons, is_auto_reply, auto_reply_trigger_id, conversation_id, whatsapp_message_id, created_at) VALUES
('fe939fc5-892f-4e73-9f30-c5752abeeacc', '918318868521', 'we offer flower pots', 'outbound', 'template', 'sent', '2025-08-19 18:32:19.387601', 'ea62e37e-16e1-46e4-8e54-6c6189dcb240', '[{"type":"HEADER","format":"TEXT","text":"welcome to indiana"},{"type":"BODY","text":"we offer flower pots"},{"type":"FOOTER","text":"Thanks dear for contacting us"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"Any assistances","url":"https://app.stonesenseinterior.com/"}]}]', NULL, NULL, FALSE, NULL, NULL, NULL, '2025-08-19 18:32:19.387601'),
('fe9a1ad9-e0b5-4d1c-8843-c8a7a9d2cca0', '918318868521', 'Ok', 'inbound', 'text', 'received', '2025-08-19 18:33:23.827387', NULL, NULL, NULL, NULL, FALSE, NULL, '4c487164-dd05-4558-81dd-77ee42111f97', NULL, '2025-08-19 18:33:23.827387'),
('f622ded6-2add-4eac-af85-96be243d92f9', '918318868521', 'hi', 'outbound', 'text', 'sent', '2025-08-19 18:34:14.012391', NULL, NULL, NULL, NULL, FALSE, NULL, '4c487164-dd05-4558-81dd-77ee42111f97', NULL, '2025-08-19 18:34:14.012391'),
('bebe2a53-cb92-41b0-aa0b-f6345253f713', '918318868521', 'Hi', 'inbound', 'text', 'received', '2025-08-19 18:34:23.533478', NULL, NULL, NULL, NULL, FALSE, NULL, '4c487164-dd05-4558-81dd-77ee42111f97', NULL, '2025-08-19 18:34:23.533478'),
('e8c5ab62-832a-4953-a6a3-7c1b852f3330', '918318868521', 'ol', 'inbound', 'text', 'received', '2025-08-19 18:34:54.893763', NULL, NULL, NULL, NULL, FALSE, NULL, '4c487164-dd05-4558-81dd-77ee42111f97', NULL, '2025-08-19 18:34:54.893763'),
('5174edbe-7009-4cf2-9960-97a62912629e', '918318868521', 'By', 'inbound', 'text', 'received', '2025-08-19 18:36:13.474307', NULL, NULL, NULL, NULL, FALSE, NULL, '4c487164-dd05-4558-81dd-77ee42111f97', NULL, '2025-08-19 18:36:13.474307');

-- ================================
-- TABLE STRUCTURE AND DATA: CAMPAIGNS
-- ================================

DROP TABLE IF EXISTS campaigns;
CREATE TABLE campaigns (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT NOT NULL,
    template_id VARCHAR(255),
    recipients JSON,
    status TEXT DEFAULT 'draft',
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Insert campaigns data
INSERT INTO campaigns (id, name, template_id, recipients, status, total_recipients, sent_count, delivered_count, failed_count, scheduled_at, created_at, completed_at) VALUES
('40de20d4-fd2b-42a3-9dd1-6602c1dd1412', 'test', 'ea62e37e-16e1-46e4-8e54-6c6189dcb240', '["+918318868521"]', 'completed', 1, 1, 1, 0, NULL, '2025-08-19 18:32:18.270856', NULL);

-- ================================
-- TABLE STRUCTURE AND DATA: CONVERSATIONS
-- ================================

DROP TABLE IF EXISTS conversations;
CREATE TABLE conversations (
    id VARCHAR(255) PRIMARY KEY,
    phone_number TEXT NOT NULL,
    contact_name TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    assigned_to VARCHAR(255),
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert conversations data
INSERT INTO conversations (id, phone_number, contact_name, last_message, last_message_at, unread_count, status, assigned_to, tags, created_at, updated_at) VALUES
('4c487164-dd05-4558-81dd-77ee42111f97', '918318868521', '918318868521', 'By', '2025-08-19 18:36:13.502', 1, 'active', NULL, NULL, '2025-08-19 18:33:23.776036', '2025-08-19 18:36:13.502');

-- ================================
-- TABLE STRUCTURE AND DATA: CONTACTS
-- ================================

DROP TABLE IF EXISTS contacts;
CREATE TABLE contacts (
    id VARCHAR(255) PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: No contacts data found in current database

-- ================================
-- TABLE STRUCTURE AND DATA: SETTINGS
-- ================================

DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    id VARCHAR(255) PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSON,
    category TEXT DEFAULT 'general',
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert settings data
INSERT INTO settings (id, key, value, category, is_encrypted, created_at, updated_at) VALUES
('92ec6d21-78ad-4083-900e-f3ffedf1afbc', 'whatsapp_token', '"EACEUw1YCh7cBPNWErQx15ZAUN74QTPhtl9PPYZC9hR7ZA5aKMr0KrduFILDaF4ElLxZCt24aQeLVobbj1f7t7mAQjRxC87UVnilFdX0zODga1k7h8OZCZCp7fJcOvlDqPGLR6ZC0TSheLogoYbkR5FBgWX925EZCLaZCIThQVnsoOlRzZCtN3UdTmX5jZC6ISvGfgwc"', 'whatsapp', TRUE, '2025-08-19 18:31:11.95916', '2025-08-19 18:31:11.95916'),
('be48bad2-1f01-425a-9db5-dd9a1a27c6f9', 'whatsapp_phone_number_id', '"636589589532430"', 'whatsapp', FALSE, '2025-08-19 18:31:12.056648', '2025-08-19 18:31:12.056648'),
('08c1b088-092d-432d-84fb-c4f9344b4c97', 'whatsapp_verify_token', '"secretwebhook"', 'whatsapp', TRUE, '2025-08-19 18:31:12.145753', '2025-08-19 18:31:12.145753'),
('dbdd2fa7-440d-4a90-ac7a-9fb618a4471b', 'whatsapp_business_account_id', '"1372721233974205"', 'whatsapp', FALSE, '2025-08-19 18:31:12.235833', '2025-08-19 18:31:12.235833');

-- ================================
-- TABLE STRUCTURE: AUTO_REPLY_RULES (empty)
-- ================================

DROP TABLE IF EXISTS auto_reply_rules;
CREATE TABLE auto_reply_rules (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT NOT NULL,
    trigger TEXT,
    trigger_type TEXT DEFAULT 'keyword',
    reply_message TEXT,
    template_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    conditions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- TABLE STRUCTURE: USER_SESSIONS (empty)
-- ================================

DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    token TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- SUMMARY OF EXPORTED DATA
-- ================================

/*
EXPORTED DATA SUMMARY:
- Users: 1 record (admin user)
- Templates: 10 records (all WhatsApp Business templates)
- Messages: 6 records (conversation history)
- Campaigns: 1 record (test campaign)
- Conversations: 1 record (active conversation)
- Contacts: 0 records
- Settings: 4 records (WhatsApp API configuration)
- Auto Reply Rules: 0 records
- User Sessions: 0 records

ADMIN LOGIN CREDENTIALS:
Username: admin
Password: admin123
Email: admin@whatsapppro.com

WHATSAPP BUSINESS API SETTINGS:
- Token: (encrypted in database)
- Phone Number ID: 636589589532430
- Business Account ID: 1372721233974205
- Webhook Verify Token: (encrypted in database)

EXPORT COMPLETED: 2025-08-19 18:46:00 UTC
*/