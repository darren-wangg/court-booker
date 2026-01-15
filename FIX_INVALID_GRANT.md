# Fix "invalid_grant" Error

## Problem

The error `invalid_grant` means your Gmail refresh token has expired or is invalid. This happens when:
- The token was revoked
- The token expired (rare, but can happen)
- The OAuth app credentials changed
- The user revoked access

## Solution: Regenerate Gmail Refresh Token

### Option 1: Run Setup Script (Recommended)

**On your droplet:**

```bash
cd /opt/court-booker
node src/scripts/setup-gmail-auth.js
```

This will:
1. Guide you through OAuth flow
2. Generate a new refresh token
3. Save it to your `.env` file

### Option 2: Manual OAuth Flow

If the script doesn't work, do it manually:

1. **Get OAuth URL:**
   ```bash
   # On your droplet
   cd /opt/court-booker
   node -e "
   const {google} = require('googleapis');
   const config = require('./src/config');
   const oauth2Client = new google.auth.OAuth2(
     config.gmailClientId,
     config.gmailClientSecret,
     config.gmailRedirectUri
   );
   const url = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify']
   });
   console.log('Visit this URL:', url);
   "
   ```

2. **Visit the URL** in your browser and authorize

3. **Get the authorization code** from the redirect URL

4. **Exchange for refresh token:**
   ```bash
   # Replace AUTHORIZATION_CODE with the code from step 3
   node -e "
   const {google} = require('googleapis');
   const config = require('./src/config');
   const oauth2Client = new google.auth.OAuth2(
     config.gmailClientId,
     config.gmailClientSecret,
     config.gmailRedirectUri
   );
   oauth2Client.getToken('AUTHORIZATION_CODE', (err, token) => {
     if (err) return console.error('Error:', err);
     console.log('Refresh Token:', token.refresh_token);
   });
   "
   ```

5. **Update .env file:**
   ```bash
   nano .env
   # Update GMAIL_REFRESH_TOKEN with the new token
   ```

### Option 3: Use Local Machine (Easier)

If OAuth flow is easier on your local machine:

1. **On your local machine:**
   ```bash
   cd /path/to/court-booker
   npm run setup-gmail
   # or
   node src/scripts/setup-gmail-auth.js
   ```

2. **Copy the new refresh token** from your local `.env` to droplet:
   ```bash
   # Get token from local .env
   grep GMAIL_REFRESH_TOKEN .env
   
   # SSH into droplet and update
   ssh root@your-droplet-ip
   cd /opt/court-booker
   nano .env
   # Paste the new GMAIL_REFRESH_TOKEN value
   ```

## After Fixing Refresh Token

1. **Restart webhook:**
   ```bash
   pm2 restart webhook
   ```

2. **Test again:**
   ```bash
   node src/scripts/debug-gmail-webhook.js
   ```

3. **Renew push notifications:**
   ```bash
   node src/scripts/renew-gmail-push.js
   ```

## Additional Issues Found

### 1. Webhook URL Using Cloudflare Tunnel

Your webhook URL is: `https://frank-sustainable-opponent-pitch.trycloudflare.com/gmail/webhook`

**Problem:** Cloudflare tunnels are temporary and change. Gmail push notifications need a stable URL.

**Fix:** Update `WEBHOOK_URL` in `.env` to use your actual droplet IP or domain:

```env
# If you have a domain
WEBHOOK_URL=https://your-domain.com/gmail/webhook

# Or use droplet IP with HTTPS (requires reverse proxy like nginx)
WEBHOOK_URL=https://your-droplet-ip/gmail/webhook

# Or use a stable tunnel service
```

### 2. Webhook Server Not Accessible

The health endpoint timed out. Check:

```bash
# On droplet - check if webhook is running
pm2 list
pm2 logs webhook

# Test locally
curl http://localhost:3000/health

# Check if port is open
netstat -tulpn | grep 3000
```

## Quick Fix Checklist

- [ ] Regenerate Gmail refresh token
- [ ] Update `GMAIL_REFRESH_TOKEN` in `.env`
- [ ] Restart webhook: `pm2 restart webhook`
- [ ] Fix `WEBHOOK_URL` to use stable URL (not Cloudflare tunnel)
- [ ] Test: `node src/scripts/debug-gmail-webhook.js`
- [ ] Renew push notifications: `node src/scripts/renew-gmail-push.js`

## If Setup Script Doesn't Work

The setup script might need to be run locally where you can open a browser:

1. **On your local machine:**
   ```bash
   # Make sure you have the same .env values for Gmail Client ID/Secret
   node src/scripts/setup-gmail-auth.js
   ```

2. **Copy the new refresh token to droplet:**
   ```bash
   # On local machine - get the token
   grep GMAIL_REFRESH_TOKEN .env
   
   # SSH to droplet and update
   ssh root@your-droplet-ip
   cd /opt/court-booker
   nano .env
   # Update GMAIL_REFRESH_TOKEN
   ```
