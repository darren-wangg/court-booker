# Gmail Push Notifications Setup Guide

This guide will help you set up Gmail Push Notifications for real-time booking processing in your Court Booker system.

## Overview

Gmail Push Notifications allow your system to receive instant notifications when new emails arrive, enabling real-time processing of booking requests instead of polling every few minutes.

## Prerequisites

1. **Google Cloud Project** with Gmail API enabled
2. **Gmail API credentials** (Client ID, Client Secret, Refresh Token)
3. **Public webhook URL** (for receiving notifications)
4. **Google Cloud Pub/Sub** topic for notifications

## Step 1: Set Up Google Cloud Pub/Sub

### 1.1 Create a Pub/Sub Topic

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Pub/Sub** → **Topics**
3. Click **Create Topic**
4. Name it `court-booker-notifications` (or your preferred name)
5. Click **Create**

### 1.2 Grant Gmail Permission

1. In your Pub/Sub topic, go to **Permissions**
2. Click **Add Principal**
3. Add: `gmail-api-push@system.gserviceaccount.com`
4. Assign role: **Pub/Sub Publisher**
5. Click **Save**

## Step 2: Set Up Webhook Server

### 2.1 Local Development (using ngrok)

For local development, use ngrok to create a public URL:

```bash
# Install ngrok
npm install -g ngrok

# Start your webhook server
pnpm run start-webhook

# In another terminal, expose your local server
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 2.2 Production Deployment

For production, deploy your webhook server to a service like:

- **Heroku** (free tier available)
- **Railway** (free tier available)
- **Render** (free tier available)
- **DigitalOcean App Platform**

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Gmail Push Notifications
GMAIL_PROJECT_ID=your-google-cloud-project-id
GMAIL_TOPIC_NAME=court-booker-notifications
WEBHOOK_URL=https://your-domain.com/gmail/webhook

# Existing Gmail API credentials
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
```

## Step 4: Set Up Push Notifications

Run the setup script:

```bash
pnpm run setup-push
```

This will:

- Initialize Gmail API connection
- Set up the watch request
- Configure push notifications to your webhook

## Step 5: Start the Webhook Server

```bash
pnpm run start-webhook
```

The server will:

- Start on port 3000 (or your configured PORT)
- Listen for Gmail push notifications
- Process booking requests in real-time
- Send confirmation emails

## Step 6: Test the System

1. **Send a test booking email**:

   - Reply to an availability email
   - Include date and time: "September 7, 2025, 5 - 6 PM"

2. **Check the webhook logs**:

   - You should see the notification received
   - Booking processing should start immediately
   - Confirmation email should be sent

3. **Verify the booking**:
   - Check your amenity website
   - Confirm the booking was made

## Monitoring and Maintenance

### Watch Request Expiration

Gmail watch requests expire after 7 days. The system will automatically refresh them, but you can also manually refresh:

```bash
pnpm run setup-push
```

### Health Check

Your webhook server provides a health check endpoint:

```
GET https://your-domain.com/health
```

### Manual Booking Check

You can manually trigger a booking check:

```bash
curl -X POST https://your-domain.com/gmail/check-bookings
```

## Troubleshooting

### Common Issues

1. **"Invalid Gmail request"**

   - Check your webhook URL is accessible
   - Verify Gmail can reach your server

2. **"Watch request failed"**

   - Ensure Pub/Sub topic exists
   - Check Gmail has Publisher permission
   - Verify project ID is correct

3. **"No booking requests found"**
   - Check email subject contains "Re: Avalon Court Availability"
   - Verify email is in the inbox
   - Check Gmail API credentials

### Debug Mode

Enable debug logging:

```bash
DEBUG=* pnpm run start-webhook
```

## Benefits of Push Notifications

✅ **Real-time Processing**: Bookings processed immediately  
✅ **No Polling**: Eliminates wasteful API calls  
✅ **Free Tier Friendly**: Stays well within Gmail API limits  
✅ **Reliable**: Gmail handles delivery guarantees  
✅ **Scalable**: Can handle multiple users efficiently

## Security Considerations

- **HTTPS Required**: Gmail only sends notifications to HTTPS endpoints
- **Request Validation**: Implement proper signature verification in production
- **Rate Limiting**: Consider implementing rate limiting for your webhook
- **Authentication**: Secure your webhook endpoints appropriately

## Cost Analysis

**Gmail API Usage**:

- Watch request: ~1 quota unit per day
- Email processing: ~5 quota units per email
- **Total**: Minimal usage, well within free tier

**Infrastructure**:

- Webhook server: Free tier hosting available
- Pub/Sub: Free tier includes 10GB/month
- **Total**: Can run completely free
