#!/bin/bash

# Quick deployment - uploads all new files to droplet

DROPLET_HOST="${1:-$DROPLET_HOST}"
SSH_USER="${2:-${SSH_USER:-root}}"

if [ -z "$DROPLET_HOST" ]; then
    echo "❌ Droplet IP/hostname required"
    echo ""
    echo "Usage: ./quick-deploy.sh <droplet-ip> [ssh-user]"
    echo "   or: export DROPLET_HOST=your-ip && ./quick-deploy.sh"
    exit 1
fi

PROJECT_DIR="/opt/court-booker"

echo "🚀 Quick Deploy to Droplet"
echo "=========================="
echo "Target: $SSH_USER@$DROPLET_HOST:$PROJECT_DIR"
echo ""

# Create directories on remote if they don't exist
ssh "$SSH_USER@$DROPLET_HOST" "mkdir -p $PROJECT_DIR/src/scripts"

# Upload files
echo "📤 Uploading files..."

# New scripts
scp src/scripts/debug-gmail-webhook.js "$SSH_USER@$DROPLET_HOST:$PROJECT_DIR/src/scripts/" && echo "  ✅ debug-gmail-webhook.js"
scp src/scripts/renew-gmail-push.js "$SSH_USER@$DROPLET_HOST:$PROJECT_DIR/src/scripts/" && echo "  ✅ renew-gmail-push.js"
scp src/scripts/test-check-email.js "$SSH_USER@$DROPLET_HOST:$PROJECT_DIR/src/scripts/" && echo "  ✅ test-check-email.js"

# Updated files
scp src/emailParser.js "$SSH_USER@$DROPLET_HOST:$PROJECT_DIR/src/" && echo "  ✅ emailParser.js"
scp package.json "$SSH_USER@$DROPLET_HOST:$PROJECT_DIR/" && echo "  ✅ package.json"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test on droplet:"
echo "   ssh $SSH_USER@$DROPLET_HOST"
echo "   cd $PROJECT_DIR"
echo "   node src/scripts/debug-gmail-webhook.js"
echo ""
