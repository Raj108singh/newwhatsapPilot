#!/bin/bash
echo "🚀 Starting WhatsApp Pro in Production Mode..."
echo "✅ SSL disabled for database connection"
echo "Using port 3000 to avoid conflicts..."

# Kill any process on port 5000 or 3000
sudo fuser -k 5000/tcp 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true

# Start with port 3000 and SSL disabled
PORT=3000 NODE_ENV=production node dist/index.js
