-- WhatsApp Pro Database Export
-- Generated: $(date)

-- Export Users
COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;

-- Export Templates  
COPY (SELECT * FROM templates) TO STDOUT WITH CSV HEADER;

-- Export Messages
COPY (SELECT * FROM messages) TO STDOUT WITH CSV HEADER;

-- Export Campaigns
COPY (SELECT * FROM campaigns) TO STDOUT WITH CSV HEADER;

-- Export Contacts
COPY (SELECT * FROM contacts) TO STDOUT WITH CSV HEADER;

-- Export Settings
COPY (SELECT * FROM settings) TO STDOUT WITH CSV HEADER;
