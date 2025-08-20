#!/bin/bash

# WhatsApp Pro VPS Startup Script
echo "Starting WhatsApp Pro Application..."

# Set production environment
export NODE_ENV=production

# Database configuration for VPS
export DATABASE_URL="mysql://niharsk_whatsapp_raj:niharsk_whatsapp_raj@103.38.50.233:3306/niharsk_whatsapp_raj"

# Optional: Individual MySQL connection variables (fallback)
export MYSQL_HOST=103.38.50.233
export MYSQL_PORT=3306
export MYSQL_USER=niharsk_whatsapp_raj
export MYSQL_PASSWORD=niharsk_whatsapp_raj
export MYSQL_DATABASE=niharsk_whatsapp_raj

# Start the application
echo "Launching WhatsApp Pro on port 5000..."
node dist/server/index.js

echo "WhatsApp Pro started successfully!"