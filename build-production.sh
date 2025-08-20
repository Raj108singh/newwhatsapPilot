#!/bin/bash

# WhatsApp Pro Production Build Script
echo "🚀 Building WhatsApp Pro for Production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build client
echo "🔨 Building client..."
npm run build:client

# Build server  
echo "⚙️  Building server..."
npx esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js --external:mysql2 --external:dotenv --format=esm --packages=external

# Create production package.json
echo "📝 Creating production package.json..."
cat > dist/package.json << 'EOF'
{
  "name": "whatsapp-pro",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "NODE_ENV=production node server.js"
  },
  "dependencies": {
    "mysql2": "^3.14.3",
    "dotenv": "^17.2.1"
  }
}
EOF

echo "✅ Production build complete!"
echo ""
echo "📁 Production files are in ./dist/ directory"
echo "🚀 To deploy: copy ./dist/ to your production server and run 'npm install && npm start'"