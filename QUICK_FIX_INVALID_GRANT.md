# Quick Fix: invalid_grant Error

## The Problem

Your Gmail refresh token has expired or been revoked. This causes:
- ❌ Gmail API connection failures
- ❌ Email parser can't read emails
- ❌ Push notifications can't be set up

## Quick Fix (3 Steps)

### Step 1: Regenerate Refresh Token

**On your droplet:**

```bash
cd /opt/court-booker
node src/scripts/regenerate-refresh-token.js
```

This will:
1. Show you an OAuth URL to visit
2. Ask for the authorization code
3. Generate a new refresh token
4. Show you what to add to `.env`

### Step 2: Update .env File

```bash
nano .env
# Update GMAIL_REFRESH_TOKEN with the new token from Step 1
```

### Step 3: Restart and Test

```bash
pm2 restart webhook
node src/scripts/debug-gmail-webhook.js
```

## Alternative: Use Local Machine

If OAuth is easier on your local machine:

1. **On local machine:**
   ```bash
   node src/scripts/regenerate-refresh-token.js
   ```

2. **Copy the new token to droplet:**
   ```bash
   # Get token from local .env
   grep GMAIL_REFRESH_TOKEN .env
   
   # SSH and update
   ssh root@your-droplet-ip
   cd /opt/court-booker
   nano .env
   # Paste new GMAIL_REFRESH_TOKEN
   ```

## If You Need to Revoke Access First

If you get "token already exists" error:

1. Go to: https://myaccount.google.com/permissions
2. Find "Court Booker" or your app name
3. Click "Remove Access"
4. Run the regenerate script again

## After Fixing

Once the refresh token is fixed:

1. ✅ Gmail connection will work
2. ✅ Email parser will work
3. ✅ You can renew push notifications
4. ✅ "Check" emails will be processed

## Also Fix: Webhook URL

Your webhook URL is using a Cloudflare tunnel which is temporary:

```
https://frank-sustainable-opponent-pitch.trycloudflare.com/gmail/webhook
```

**Fix:** Update `WEBHOOK_URL` in `.env` to a stable URL:

```env
# Option 1: Use your domain (if you have one)
WEBHOOK_URL=https://your-domain.com/gmail/webhook

# Option 2: Use droplet IP with HTTPS (requires nginx reverse proxy)
WEBHOOK_URL=https://your-droplet-ip/gmail/webhook

# Option 3: Use a stable tunnel service
```

Gmail push notifications require a stable HTTPS URL.
