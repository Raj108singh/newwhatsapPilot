#!/bin/bash

# WhatsApp Pro VPS Installation Script
echo "Installing WhatsApp Pro on VPS..."

# Check Node.js version
echo "Checking Node.js version..."
node --version

# Install dependencies
echo "Installing production dependencies..."
npm install --production

# Create required directories
echo "Setting up directory structure..."
mkdir -p logs
mkdir -p uploads

# Set permissions
echo "Setting file permissions..."
chmod +x start.sh
chmod +x install.sh

# Database setup instructions
echo ""
echo "=========================================="
echo "WhatsApp Pro Installation Complete!"
echo "=========================================="
echo ""
echo "Database Configuration:"
echo "- Host: 103.38.50.233"
echo "- Port: 3306"
echo "- Database: niharsk_whatsapp_raj"
echo "- Username: niharsk_whatsapp_raj"
echo "- Password: niharsk_whatsapp_raj"
echo ""
echo "Default Admin Credentials:"
echo "- Username: admin"
echo "- Password: admin123"
echo ""
echo "To start the application:"
echo "./start.sh"
echo ""
echo "The application will run on port 5000"
echo "Access via: http://your-server-ip:5000"
echo ""