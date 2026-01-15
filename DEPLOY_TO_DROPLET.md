# Deploy New Scripts to Droplet

## Quick Deploy (Recommended)

```bash
# From your local machine
./quick-deploy.sh your-droplet-ip
```

This will upload:
- `debug-gmail-webhook.js`
- `renew-gmail-push.js`
- `test-check-email.js`
- Updated `emailParser.js`
- Updated `package.json`

## Manual Deploy

### Option 1: Using SCP (File by File)

```bash
# Set your droplet IP
DROPLET_IP="your-droplet-ip"

# Upload scripts
scp src/scripts/debug-gmail-webhook.js root@$DROPLET_IP:/opt/court-booker/src/scripts/
scp src/scripts/renew-gmail-push.js root@$DROPLET_IP:/opt/court-booker/src/scripts/
scp src/scripts/test-check-email.js root@$DROPLET_IP:/opt/court-booker/src/scripts/

# Upload updated files
scp src/emailParser.js root@$DROPLET_IP:/opt/court-booker/src/
scp package.json root@$DROPLET_IP:/opt/court-booker/
```

### Option 2: Using Git (If you have git on droplet)

```bash
# On your local machine - commit and push
git add src/scripts/debug-gmail-webhook.js
git add src/scripts/renew-gmail-push.js
git add src/scripts/test-check-email.js
git add src/emailParser.js
git add package.json
git commit -m "Add debugging scripts and fix email parser"
git push

# Then on droplet - pull latest
ssh root@your-droplet-ip
cd /opt/court-booker
git pull
```

### Option 3: Copy-Paste Method

If SCP doesn't work, you can copy-paste:

1. **On your local machine**, view the file:
   ```bash
   cat src/scripts/debug-gmail-webhook.js
   ```

2. **SSH into droplet**:
   ```bash
   ssh root@your-droplet-ip
   cd /opt/court-booker
   ```

3. **Create the file**:
   ```bash
   nano src/scripts/debug-gmail-webhook.js
   ```

4. **Paste the content**, save (Ctrl+X, Y, Enter)

5. **Repeat for other files**

## Verify Deployment

After deploying, SSH into droplet and verify:

```bash
ssh root@your-droplet-ip
cd /opt/court-booker

# Check files exist
ls -la src/scripts/debug-gmail-webhook.js
ls -la src/scripts/renew-gmail-push.js
ls -la src/scripts/test-check-email.js

# Test one script
node src/scripts/debug-gmail-webhook.js
```

## Quick Commands Reference

```bash
# Deploy all files
./quick-deploy.sh your-droplet-ip

# Or manually
scp src/scripts/*.js root@your-droplet-ip:/opt/court-booker/src/scripts/
scp src/emailParser.js root@your-droplet-ip:/opt/court-booker/src/
scp package.json root@your-droplet-ip:/opt/court-booker/
```

## After Deployment

Once files are on the droplet:

```bash
# SSH into droplet
ssh root@your-droplet-ip
cd /opt/court-booker

# Run debug script
node src/scripts/debug-gmail-webhook.js

# Renew push notifications
node src/scripts/renew-gmail-push.js

# Test email processing
node src/scripts/test-check-email.js
```
