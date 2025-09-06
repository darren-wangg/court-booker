# Railway Deployment Guide

This guide will help you deploy your Court Booker webhook server to Railway for 24/7 real-time booking processing.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Environment Variables**: All required credentials configured

## Step 1: Deploy to Railway

### Option A: Deploy from GitHub

1. **Connect to Railway**:

   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `court-booker` repository

2. **Configure Deployment**:
   - Railway will automatically detect it's a Node.js project
   - The `start` script in `package.json` will be used
   - Railway will run `npm start` which starts the webhook server

### Option B: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy from your project directory
railway up
```

## Step 2: Configure Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add these environment variables:

```env
# Amenity website credentials
EMAIL=your-email@example.com
PASSWORD=your-password

# Gmail SMTP for sending emails
GMAIL_SMTP_USER=courtbooker824@gmail.com
GMAIL_SMTP_PASSWORD=your-16-character-app-password

# Notification email (where availability emails are sent)
NOTIFICATION_EMAIL=your-notification-email@example.com

# Gmail API for receiving booking requests
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Gmail Push Notifications
GMAIL_PROJECT_ID=your-google-cloud-project-id
GMAIL_TOPIC_NAME=court-booker-notifications
WEBHOOK_URL=https://your-railway-app.railway.app/gmail/webhook

# Optional settings
HEADLESS_MODE=true
```

## Step 3: Get Your Railway URL

1. After deployment, Railway will provide a URL like:
   `https://your-app-name.railway.app`

2. **Update your webhook URL**:
   - Go to Railway Variables
   - Update `WEBHOOK_URL` to: `https://your-app-name.railway.app/gmail/webhook`

## Step 4: Set Up Gmail Push Notifications

```bash
# In your local project directory
pnpm run setup-push
```

This will configure Gmail to send notifications to your Railway webhook.

## Step 5: Test Your Deployment

### Health Check

```bash
curl https://your-app-name.railway.app/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "service": "Court Booker Gmail Webhook"
}
```

### Manual Booking Check

```bash
curl -X POST https://your-app-name.railway.app/gmail/check-bookings
```

## Step 6: Monitor Your Deployment

### Railway Dashboard

- **Deployments**: View deployment history and logs
- **Metrics**: Monitor CPU, memory, and network usage
- **Logs**: Real-time application logs

### Application Logs

```bash
# View logs in Railway CLI
railway logs

# Or view in Railway dashboard
```

## Railway-Specific Features

### Automatic Deployments

- Railway automatically deploys when you push to your main branch
- No manual deployment needed

### Environment Management

- Easy environment variable management
- Support for different environments (staging, production)

### Scaling

- Railway automatically handles scaling
- Free tier includes 500 hours/month

### Custom Domains

- Add custom domains in Railway dashboard
- SSL certificates automatically provisioned

## Troubleshooting

### Common Issues

1. **"No start command found"**

   - Ensure `package.json` has a `start` script
   - Check that `npm start` runs the webhook server

2. **"Port binding failed"**

   - Railway automatically sets the PORT environment variable
   - Your app should use `process.env.PORT || 3000`

3. **"Environment variables not found"**

   - Check Railway Variables tab
   - Ensure all required variables are set

4. **"Gmail push notifications not working"**
   - Verify WEBHOOK_URL is set to your Railway URL
   - Run `pnpm run setup-push` to reconfigure

### Debug Commands

```bash
# Check deployment status
railway status

# View recent logs
railway logs --tail

# Connect to your Railway app
railway connect
```

## Cost Analysis

**Railway Free Tier**:

- 500 hours/month (enough for 24/7 operation)
- 1GB RAM
- 1GB disk space
- Custom domains included

**Total Cost**: $0/month for basic usage

## Security Considerations

- **HTTPS**: Railway provides automatic SSL certificates
- **Environment Variables**: Securely stored in Railway dashboard
- **Access Control**: Railway provides team management features

## Next Steps

1. **Set up monitoring**: Use Railway's built-in metrics
2. **Configure alerts**: Set up notifications for failures
3. **Backup strategy**: Railway handles automatic backups
4. **Custom domain**: Add your own domain if needed

Your Court Booker webhook is now running 24/7 on Railway with real-time Gmail push notifications!
