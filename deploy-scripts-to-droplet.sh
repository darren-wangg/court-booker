#!/bin/bash

# Script to deploy new debugging scripts to DigitalOcean droplet

if [ -z "$1" ]; then
    echo "Usage: ./deploy-scripts-to-droplet.sh <droplet-ip-or-hostname> [ssh-user]"
    echo ""
    echo "Example:"
    echo "  ./deploy-scripts-to-droplet.sh 123.456.789.0"
    echo "  ./deploy-scripts-to-droplet.sh your-domain.com root"
    exit 1
fi

DROPLET_HOST="$1"
SSH_USER="${2:-root}"
PROJECT_DIR="/opt/court-booker"

echo "🚀 Deploying Scripts to Droplet"
echo "================================"
echo "Droplet: $SSH_USER@$DROPLET_HOST"
echo "Project: $PROJECT_DIR"
echo ""

# Files to deploy
FILES=(
    "src/scripts/debug-gmail-webhook.js"
    "src/scripts/renew-gmail-push.js"
    "src/scripts/test-check-email.js"
    "src/emailParser.js"
    "package.json"
)

echo "📤 Uploading files..."
echo ""

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
        scp "$file" "$SSH_USER@$DROPLET_HOST:$PROJECT_DIR/$file"
    else
        echo "  ❌ $file (not found)"
    fi
done

echo ""
echo "✅ Files uploaded!"
echo ""
echo "💡 Next steps (SSH into droplet):"
echo "   ssh $SSH_USER@$DROPLET_HOST"
echo "   cd $PROJECT_DIR"
echo "   node src/scripts/debug-gmail-webhook.js"
echo ""
