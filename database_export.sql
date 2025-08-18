-- WhatsApp Pro Database Export
-- Generated: August 18, 2025
-- Database: PostgreSQL (Replit Environment)

-- ===========================================
-- TABLE STRUCTURES
-- ===========================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'pending',
    components JSON NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    content TEXT NOT NULL,
    direction TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    status TEXT NOT NULL DEFAULT 'sent',
    template_id VARCHAR,
    template_data JSON,
    media_url TEXT,
    buttons JSON,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_id VARCHAR NOT NULL,
    recipients JSON NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total_recipients INTEGER NOT NULL,
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    tags JSON,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSON NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- DATA EXPORTS
-- ===========================================

-- Templates Data (10 WhatsApp templates)
INSERT INTO templates (id, name, category, language, status, components, created_at, updated_at) VALUES
('628ebf18-74a3-4dff-b305-82bff40c6613', 'welcome_message', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"IMAGE","example":{"header_handle":["https://scontent.whatsapp.net/v/t61.29466-34/491840701_688491470315202_6982794825170912121_n.jpg?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=blw_5aUbp1gQ7kNvwHvhsOQ&_nc_oc=AdnpVULqfLz7inXJlgJpeE31LyABarBrUTXQJ7aU7m0ZauMLdIF8MLjGCLXzu3j6x78&_nc_zt=3&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&_nc_gid=eOtDFhAVy9gbqwtIU9GSuA&oh=01_Q5Aa2QFqpPETOIBkJp2FjrqTQCtUtYpZzDGUqfHWul1vjVRh-g&oe=68CAFE2E"]}},{"type":"BODY","text":"Welcome to *Stone Sense Interior Ltd!* We specialize in granite and marble solutions that elevate your space. Visit *stonesenseinterior.com* to explore our services or call us today!"},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Now","phone_number":"+256753799137"}]}]', '2025-08-18 19:06:35.422', '2025-08-18 19:06:35.422'),
('d6581b51-8176-42f1-9378-aaf024cb8419', 'indiana', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"welcome to indiana"},{"type":"BODY","text":"we offer flower pots"},{"type":"FOOTER","text":"Thanks dear for contacting us"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"Any assistances","url":"https://app.stonesenseinterior.com/"}]}]', '2025-08-18 19:06:35.5', '2025-08-18 19:06:35.5'),
('d84627b4-0182-4e22-999b-adf9b37f46be', 'stonesenseinterior', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Welcome to Stone Sense interior limited"},{"type":"BODY","text":"We offer marble and granite specialists Wall cladding fireplace flower pots custom water features"},{"type":"FOOTER","text":"Thanks dear for contacting us"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"Any assistances","url":"https://app.stonesenseinterior.com/"}]}]', '2025-08-18 19:06:35.57', '2025-08-18 19:06:35.57'),
('54dd207d-6bcf-4f68-af33-fdb523cf5a19', 'offer', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Stone Sense Interior"},{"type":"BODY","text":"Looking to give your home or office a stunning new look? ✨\r\nStoneSense Interior offers premium interior design and stone décor solutions tailored to your style and budget.📞 Book a free consultation today and let''s bring your vision to life!"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"visit","url":"https://stonesenseinterior.com/"}]}]', '2025-08-18 19:06:35.641', '2025-08-18 19:06:35.641'),
('972ae3d6-8b41-48b3-9068-f449dba57981', 'catalogs', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Stonesense Interior Ltd Product Catalog"},{"type":"BODY","text":"Discover Endless Possibilities with *Stone Sense Interior Ltd!*\nLooking to enhance your space with *premium* granite and marble solutions? Explore our wide range of *products and services*, tailored to bring elegance and durability to your interiors.\n👉 *Access our catalog now*"},{"type":"BUTTONS","buttons":[{"type":"MPM","text":"View items"}]}]', '2025-08-18 19:06:35.732', '2025-08-18 19:06:35.732'),
('bfb26939-83e8-4fb2-af6a-0c4a92aea234', 'welcome', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Stone Sense Interior"},{"type":"BODY","text":"Discover premium interior solutions with Stone Sense Interior. Transform your space today!"},{"type":"BUTTONS","buttons":[{"type":"URL","text":"Visit","url":"https://google.com/"}]}]', '2025-08-18 19:06:35.803', '2025-08-18 19:06:35.803'),
('39c61425-738d-43bf-8044-12588378dab8', 'reminder_for_regular_services', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Reminder"},{"type":"BODY","text":"Is your marble surface losing its shine? Schedule a polishing service today with *Stone Sense Interior Ltd* to give it a refreshed look. Contact us now for details!"},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Now","phone_number":"+256753799137"}]}]', '2025-08-18 19:06:35.874', '2025-08-18 19:06:35.874'),
('08c752f2-f12e-4caa-9bf6-898a6bf37690', 'payment_reminder', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"TEXT","text":"Payment Reminder"},{"type":"BODY","text":"Dear Customer, this is a friendly reminder of your *pending payment * due . Please contact us  for any questions. *_Thank you!_*"},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Now","phone_number":"+256753799137"}]}]', '2025-08-18 19:06:35.948', '2025-08-18 19:06:35.948'),
('2443f8df-b36d-48fa-90e9-a62f3e79d354', 'free_quote_message', 'marketing', 'en', 'approved', '[{"type":"HEADER","format":"IMAGE","example":{"header_handle":["https://scontent.whatsapp.net/v/t61.29466-34/491918089_1483453836393759_7826202985228312895_n.jpg?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=LwfhvX-FvZEQ7kNvwHcjM1g&_nc_oc=Adnxb3mZkeWE43DRXVM08FkGnRAask-8Z4Wa9TZYKHKRULi6WU6lUiBJUWEwELFFrDE&_nc_zt=3&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&_nc_gid=eOtDFhAVy9gbqwtIU9GSuA&oh=01_Q5Aa2QFKzXBSUjuBaaKwcMBsGNmusIKuRBANMnRAAUfqOWjxYw&oe=68CAD95A"]}},{"type":"BODY","text":"Thinking of a new look for your space? Get a FREE quote for granite or marble services today! Contact us or visit *stonesenseinterior.com.*"},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Contact Us","phone_number":"+256753799137"},{"type":"URL","text":"Visit Now","url":"https://stonesenseinterior.com/"}]}]', '2025-08-18 19:06:36.022', '2025-08-18 19:06:36.022'),
('3b14ff18-f029-400c-a23a-9a1eb56ac0f8', 'intro_catalog_offer', 'marketing', 'en_US', 'approved', '[{"type":"BODY","text":"Now shop for your favourite products right here on WhatsApp! Get Rs {{1}} off on all orders above {{2}}Rs! Valid for your first {{3}} orders placed on WhatsApp!","example":{"body_text":[["100","400","3"]]}},{"type":"FOOTER","text":"Best grocery deals on WhatsApp!"},{"type":"BUTTONS","buttons":[{"type":"CATALOG","text":"View catalog"}]}]', '2025-08-18 19:06:36.094', '2025-08-18 19:06:36.094');

-- Settings Data (WhatsApp configuration)
INSERT INTO settings (id, key, value, category, is_encrypted, created_at, updated_at) VALUES
('1f4ac123-24e5-4a5b-bcbc-33af9c0ddb59', 'whatsapp_token', '"EACEUw1YCh7cBPOQ4V8POKzwEanaXDj9qhHkgaa2FP7tenCeoVM9Q188WDek2ZCZAkZAZCd7Rwrhib3wZB9V4K8w62Sl3b3cxpNHewkGnqkeAZB4IZAPVtLmpaDQMlx3bLW874CJTiyIvyRvuoNBkaURQ8rmqVeh6OQDHZAGTQTGrrRWs2mjCcjztyZBNyHYZC8"', 'whatsapp', TRUE, '2025-08-18 19:05:59.656', '2025-08-18 19:05:59.656'),
('6610f20a-1a4b-4ce1-a832-d2bca944f573', 'whatsapp_phone_number_id', '"636589589532430"', 'whatsapp', FALSE, '2025-08-18 19:05:59.809', '2025-08-18 19:05:59.809'),
('624c7732-f39d-423e-b00d-922d9d3c8231', 'whatsapp_verify_token', '"secretwebhook"', 'whatsapp', TRUE, '2025-08-18 19:05:59.961', '2025-08-18 19:05:59.961'),
('b10bf135-f4a2-47b6-96e3-ff03e0c0805a', 'whatsapp_business_account_id', '"1372721233974205"', 'whatsapp', FALSE, '2025-08-18 19:06:00.107', '2025-08-18 19:06:00.107');

-- ===========================================
-- SUMMARY
-- ===========================================
-- Database Export Complete
-- Tables exported: users, templates, messages, campaigns, contacts, settings
-- Total templates: 10 (all approved WhatsApp Business templates)
-- Total settings: 4 (WhatsApp API configuration)
-- Export date: August 18, 2025