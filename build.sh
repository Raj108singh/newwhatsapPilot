#!/bin/bash

# WhatsApp Pro Production Build Script

echo "🚀 Starting WhatsApp Pro production build..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build client
echo "🏗️ Building client..."
npm run build:client

# Build server
echo "🔧 Building server..."
npm run build:server

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Set executable permissions
echo "🔑 Setting permissions..."
chmod +x build.sh

echo "✅ Build completed successfully!"
echo ""
echo "To start the application in production:"
echo "1. Copy .env.example to .env and configure your environment variables"
echo "2. Install PM2 globally: npm install -g pm2"
echo "3. Start with PM2: npm run start:pm2"
echo "4. View logs: npm run logs:pm2"
echo ""
echo "Production server will run on port 5000"