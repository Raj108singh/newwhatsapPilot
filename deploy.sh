#!/bin/bash

# WhatsApp Pro VPS Deployment Script
echo "=========================================="
echo "WhatsApp Pro VPS Deployment Package"
echo "=========================================="

# Create deployment directory
DEPLOY_DIR="whatsapp-pro-deployment"
echo "Creating deployment package..."

# Clean previous deployment
rm -rf $DEPLOY_DIR
rm -f whatsapp-pro-vps.tar.gz

# Create deployment structure
mkdir -p $DEPLOY_DIR

# Copy production files
echo "Copying production build files..."
cp -r dist/ $DEPLOY_DIR/
cp package-production.json $DEPLOY_DIR/package.json
cp start.sh $DEPLOY_DIR/
cp install.sh $DEPLOY_DIR/
cp README-DEPLOYMENT.md $DEPLOY_DIR/
cp whatsapp_pro_mysql_export.sql $DEPLOY_DIR/

# Set permissions
chmod +x $DEPLOY_DIR/start.sh
chmod +x $DEPLOY_DIR/install.sh

# Create tarball
echo "Creating deployment package: whatsapp-pro-vps.tar.gz"
tar -czf whatsapp-pro-vps.tar.gz $DEPLOY_DIR/

# Cleanup
rm -rf $DEPLOY_DIR

echo ""
echo "=========================================="
echo "Deployment Package Created Successfully!"
echo "=========================================="
echo ""
echo "File: whatsapp-pro-vps.tar.gz"
echo "Size: $(du -h whatsapp-pro-vps.tar.gz | cut -f1)"
echo ""
echo "VPS Deployment Instructions:"
echo "1. Upload whatsapp-pro-vps.tar.gz to your VPS"
echo "2. Extract: tar -xzf whatsapp-pro-vps.tar.gz"
echo "3. Enter directory: cd whatsapp-pro-deployment"
echo "4. Run installation: ./install.sh"
echo "5. Start application: ./start.sh"
echo ""
echo "Application will be available on port 5000"
echo "Default login: admin/admin123"
echo ""