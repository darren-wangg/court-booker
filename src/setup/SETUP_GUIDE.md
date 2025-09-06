# Court Booker Setup Guide

This guide will help you set up the Court Booker system to automatically check for court availability and process email-based booking requests.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Gmail SMTP

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App-Specific Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Enter "Court Booker" as the name
   - Copy the 16-character password

### 3. Set Up Gmail API

```bash
pnpm run setup-gmail
```

Follow the prompts to complete OAuth2 authorization and get your refresh token.

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Amenity website credentials
EMAIL=your-email@example.com
PASSWORD=your-password

# Gmail SMTP for sending emails
GMAIL_SMTP_USER=courtbooker824@gmail.com
GMAIL_SMTP_PASSWORD=your-16-character-app-password

# Notification email (where availability emails are sent)
NOTIFICATION_EMAIL=your-notification-email@example.com

# Gmail API for receiving booking requests (from setup-gmail command)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Optional settings
AMENITY_URL=https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf
HEADLESS_MODE=true
```

### 5. Test the System

```bash
# Test availability checking
pnpm run check

# Test booking processing
pnpm run book
```

## Multi-User Setup

To support multiple users, add additional user configurations:

```env
# User 1 (Primary)
USER1_EMAIL=user1@example.com
USER1_PASSWORD=password1
USER1_NOTIFICATION_EMAIL=user1@gmail.com

# User 2
USER2_EMAIL=user2@example.com
USER2_PASSWORD=password2
USER2_NOTIFICATION_EMAIL=user2@gmail.com

# User 3
USER3_EMAIL=user3@example.com
USER3_PASSWORD=password3
USER3_NOTIFICATION_EMAIL=user3@gmail.com
```

### Multi-User Usage

```bash
# Check availability for specific users
pnpm run check 1  # User 1
pnpm run check 2  # User 2
pnpm run check 3  # User 3

# Process booking requests (all users)
pnpm run book
```

## GitHub Actions Setup

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial setup"
git push origin main
```

### 2. Configure Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

#### Required Secrets

- `EMAIL` - Your amenity website email
- `PASSWORD` - Your amenity website password
- `GMAIL_SMTP_USER` - Your Gmail address
- `GMAIL_SMTP_PASSWORD` - Your Gmail app-specific password
- `NOTIFICATION_EMAIL` - Email to receive notifications
- `GMAIL_CLIENT_ID` - Your Gmail API client ID
- `GMAIL_CLIENT_SECRET` - Your Gmail API client secret
- `GMAIL_REFRESH_TOKEN` - Your Gmail API refresh token
- `GMAIL_REDIRECT_URI` - `http://localhost:3000/oauth2callback`

#### Multi-User Secrets (Optional)

- `USER1_EMAIL` - User 1 amenity email
- `USER1_PASSWORD` - User 1 amenity password
- `USER1_NOTIFICATION_EMAIL` - User 1 notification email
- `USER2_EMAIL` - User 2 amenity email
- `USER2_PASSWORD` - User 2 amenity password
- `USER2_NOTIFICATION_EMAIL` - User 2 notification email
- `USER3_EMAIL` - User 3 amenity email
- `USER3_PASSWORD` - User 3 amenity password
- `USER3_NOTIFICATION_EMAIL` - User 3 notification email

### 3. Enable GitHub Actions

The workflow will automatically run every 2 hours. You can also trigger it manually:

1. Go to your repository → Actions tab
2. Select "Court Availability Checker" workflow
3. Click "Run workflow"

## How It Works

### Availability Checking

1. **Automated**: Runs every 2 hours via GitHub Actions
2. **Smart Throttling**: Only sends emails at 2 PM and 10 PM PST
3. **Data Collection**: Scrapes amenity website for available slots
4. **Email Report**: Sends formatted availability report

### Email Booking

1. **Email Monitoring**: Checks Gmail for booking requests every 5 minutes
2. **Natural Language**: Parses date/time from email replies
3. **Automated Booking**: Uses Puppeteer to book the requested slot
4. **Confirmation**: Sends success/error emails

### Supported Email Formats

**Dates**:

- "Sunday September 7, 2025" (full format with day of week)
- "Sunday 9/7/2025" (numeric with day of week)
- "Sunday 9/7" (numeric with day of week, no year)
- "Sunday Sept 7" (abbreviated month with day of week, no year)
- "September 7, 2025" (traditional format)
- "Sep 7, 2025" (abbreviated month)
- "9/7/2025" (numeric format)
- "2025-09-07" (ISO format)

**Times**: "5 - 6 PM", "5:00 - 6:00 PM", "17:00 - 18:00"

## Troubleshooting

### Common Issues

1. **"Gmail SMTP not configured"**

   - Check your Gmail SMTP credentials in `.env`
   - Ensure you're using an app-specific password

2. **"Gmail API not initialized"**

   - Run `pnpm run setup-gmail` to configure Gmail API
   - Check your Gmail API credentials

3. **"Login failed"**

   - Verify your amenity website credentials
   - Check if the website structure has changed

4. **"Could not parse date or time"**
   - Check the format of your email reply
   - Ensure you're replying to the correct email thread

### Debug Mode

```bash
DEBUG=* pnpm run check
DEBUG=* pnpm run book
```

## Benefits

✅ **Works with any email domain** (Gmail, Yahoo, Outlook, etc.)  
✅ **No custom domain setup required**  
✅ **Reliable delivery** - emails come from your Gmail account  
✅ **Simple configuration** - just environment variables  
✅ **Free** - uses your existing Gmail account  
✅ **Multi-user support** - handle multiple court bookers  
✅ **Automated scheduling** - runs every 2 hours  
✅ **Smart email throttling** - avoids spam

## Security Notes

- **App-specific passwords** are safer than regular passwords
- **2-factor authentication** is required for app passwords
- **Environment variables** keep credentials secure
- **No password storage** in code
- **OAuth2** for secure Gmail API access

## Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test the Gmail API connection with `pnpm run setup-gmail`
4. Check the amenity website for any changes in structure
5. Ensure your Gmail account has 2FA enabled
