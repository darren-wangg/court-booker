# Fix Gmail Webhook & "Check" Email Issues

## Problem Summary

1. Sending "Check" emails to courtbooker824@gmail.com doesn't trigger webhook
2. Manual curl to `/gmail/check-availability` works
3. Need to renew Gmail push notifications
4. Once fixed, can remove GitHub Actions

## Step-by-Step Fix

### Step 1: Debug Current Status

Run the diagnostic script to see what's wrong:

```bash
# On your droplet
cd /opt/court-booker
node src/scripts/debug-gmail-webhook.js
```

This will check:
- ✅ Gmail API connection
- ✅ Gmail push notification status
- ✅ Email parser functionality
- ✅ Webhook endpoint accessibility

### Step 2: Renew Gmail Push Notifications

Gmail push notifications expire after 7 days. Renew them:

```bash
# On your droplet
cd /opt/court-booker
node src/scripts/renew-gmail-push.js
```

Or use npm script:
```bash
npm run renew-push
```

This will:
- Stop the old watch request
- Create a new watch request
- Show expiration time

### Step 3: Verify Webhook URL

Make sure your `WEBHOOK_URL` in `.env` is correct:

```env
WEBHOOK_URL=https://your-droplet-ip-or-domain/gmail/webhook
```

**Important**: 
- Must be HTTPS (Gmail requires HTTPS)
- Must be publicly accessible
- Must point to `/gmail/webhook` endpoint

### Step 4: Test Email Processing

Test if the email parser can find "Check" emails:

```bash
# On your droplet
cd /opt/court-booker
node src/scripts/test-check-email.js
```

This will:
- Check the inbox for "Check" emails
- Show if they're detected
- Show which user they're matched to

### Step 5: Send a Test "Check" Email

1. Send an email to: **courtbooker824@gmail.com**
2. Subject: **"Check"** (or anything with "check" in it)
3. Body: **"check"** (or "check availability")

### Step 6: Manually Trigger Email Processing

Since push notifications might not work immediately, manually trigger:

```bash
# From your local machine or droplet
curl -X POST https://your-droplet-ip/gmail/process-emails
```

Or use the test script:
```bash
# On droplet
node src/scripts/test-check-email.js
```

### Step 7: Check Webhook Logs

Monitor the webhook logs to see if push notifications are received:

```bash
# On your droplet
pm2 logs webhook --lines 100
```

Look for:
- `📧 Received Gmail push notification`
- `🔄 Processing Gmail notification...`
- `🔍 Checking for booking requests and Check email triggers...`
- `🔔 Found manual trigger(s)`

## Troubleshooting

### Issue: Push Notifications Not Received

**Symptoms:**
- No logs showing "Received Gmail push notification"
- Emails arrive but webhook doesn't trigger

**Fixes:**

1. **Check Pub/Sub Topic exists:**
   - Go to Google Cloud Console
   - Navigate to Pub/Sub → Topics
   - Verify `court-booker-notifications` topic exists

2. **Check Gmail Service Account Permission:**
   - In Pub/Sub topic → Permissions
   - Add: `gmail-api-push@system.gserviceaccount.com`
   - Role: **Pub/Sub Publisher**

3. **Verify Webhook URL is accessible:**
   ```bash
   curl https://your-webhook-url/health
   ```

4. **Check firewall:**
   - Ensure port 3000 (or your PORT) is open
   - Or use a reverse proxy (nginx) with HTTPS

### Issue: "Check" Emails Not Detected

**Symptoms:**
- Push notification received
- But no "Check" emails found

**Fixes:**

1. **Check email format:**
   - Subject should contain "check" (case insensitive)
   - OR body should contain "check"
   - Should NOT be a reply (no "Re:" in subject)

2. **Check user identification:**
   - Run: `node src/scripts/test-check-email.js`
   - See if emails are matched to a user
   - If not, check your `.env` has `USER1_EMAIL` set correctly

3. **Clear processed emails cache:**
   - The system tracks processed emails to avoid duplicates
   - If an email was already processed, it won't be processed again
   - Restart PM2 to clear cache: `pm2 restart webhook`

### Issue: User Not Identified

**Symptoms:**
- "Check" email found but user is null
- Error: "Could not identify user for email"

**Fixes:**

1. **Ensure USER1_EMAIL is set in .env:**
   ```env
   USER1_EMAIL=courtbooker824@gmail.com
   USER1_PASSWORD=your-password
   USER1_NOTIFICATION_EMAIL=your-notification@example.com
   ```

2. **The improved logic now handles:**
   - Emails sent TO courtbooker824@gmail.com
   - Uses the first configured user as fallback
   - Works even if sender email doesn't match

## Complete Fix Workflow

```bash
# 1. SSH into droplet
ssh root@your-droplet-ip
cd /opt/court-booker

# 2. Debug current status
node src/scripts/debug-gmail-webhook.js

# 3. Renew Gmail push notifications
node src/scripts/renew-gmail-push.js

# 4. Restart webhook
pm2 restart webhook

# 5. Test email processing
node src/scripts/test-check-email.js

# 6. Send a test "Check" email to courtbooker824@gmail.com

# 7. Manually trigger processing (if push doesn't work)
curl -X POST https://your-droplet-ip/gmail/process-emails

# 8. Check logs
pm2 logs webhook --lines 50
```

## Verification Checklist

- [ ] Gmail API connection works
- [ ] Gmail push notifications are active and not expired
- [ ] Webhook URL is accessible via HTTPS
- [ ] Email parser can find "Check" emails
- [ ] User identification works for emails in inbox
- [ ] Manual trigger works (`/gmail/process-emails`)
- [ ] Push notifications are received (check logs)
- [ ] "Check" emails trigger availability checks

## Once Fixed: Remove GitHub Actions

After verifying everything works:

1. Go to your GitHub repository
2. Navigate to `.github/workflows/`
3. Disable or delete `court-checker.yml`
4. Or comment out the schedule in the workflow file

## Alternative: Use Polling as Backup

If push notifications are unreliable, you can set up polling:

```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * curl -X POST https://your-droplet-ip/gmail/process-emails
```

This ensures emails are checked even if push notifications fail.

## Quick Reference Commands

```bash
# Debug
npm run debug-webhook

# Renew push notifications
npm run renew-push

# Test email processing
npm run test-check-email

# Manual trigger
curl -X POST https://your-droplet-ip/gmail/process-emails

# Check logs
pm2 logs webhook
```
