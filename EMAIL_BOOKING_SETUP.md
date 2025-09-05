# Email Booking Setup Guide

This guide will help you set up the intelligent email booking feature that allows you to respond to availability emails with natural language and automatically book court slots.

## System Overview

The email booking system is a sophisticated automation that combines Gmail API, intelligent parsing, and Puppeteer automation:

### How It Works

1. **Availability Monitoring**: System checks court availability every 2 hours
2. **Email Notification**: You receive formatted availability reports
3. **Natural Language Reply**: You reply with date and time in any format
4. **Intelligent Parsing**: System extracts booking details from your email
5. **Automated Booking**: Puppeteer fills out the booking form automatically
6. **Confirmation**: You receive success/error confirmation emails

### Technical Architecture

```
Gmail API → Email Parser → Booking Service → Puppeteer → Amenity Site
    ↓              ↓              ↓              ↓
OAuth2 Auth → Date/Time Parse → Form Fill → Booking Submit
    ↓              ↓              ↓              ↓
Token Mgmt → Validation → Error Handle → Confirmation
```

## Prerequisites

- Gmail account
- Google Cloud Project (free)
- Node.js and pnpm installed

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Set Up Gmail API

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2.2 Enable Gmail API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on it and press "Enable"

### 2.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Desktop application" as the application type
4. Give it a name (e.g., "Court Booker")
5. Download the JSON file and note the Client ID and Client Secret

### 2.4 Run the Setup Script

```bash
pnpm run setup-gmail
```

Follow the prompts to enter your Client ID, Client Secret, and complete the OAuth flow.

## Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Gmail API Configuration
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Existing variables (keep these)
EMAIL=your_email@example.com
PASSWORD=your_password
AMENITY_URL=your_amenity_url
RESEND_API_KEY=your_resend_api_key
NOTIFICATION_EMAIL=your_notification_email
```

## Step 4: Test the System

### 4.1 Test Email Parsing

Create a test email with the subject "Re: 🏀 Avalon Court Availability 🏀" and body containing:

```
September 7, 2025
5 - 6 PM
```

Then run:

```bash
pnpm run book
```

### 4.2 Test Full Booking Flow

1. Send yourself an availability email (run `pnpm run check`)
2. Reply to that email with a date and time
3. Run `pnpm run book` to process the booking

## Step 5: Set Up Automation

### Option A: GitHub Actions (Recommended)

Add this to your `.github/workflows/email-booking.yml`:

```yaml
name: Email Booking Checker

on:
  schedule:
    - cron: "*/5 * * * *" # Every 5 minutes
  workflow_dispatch:

jobs:
  check-bookings:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Check for booking requests
        env:
          EMAIL: ${{ secrets.EMAIL }}
          PASSWORD: ${{ secrets.PASSWORD }}
          AMENITY_URL: ${{ secrets.AMENITY_URL }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          NOTIFICATION_EMAIL: ${{ secrets.NOTIFICATION_EMAIL }}
          GMAIL_CLIENT_ID: ${{ secrets.GMAIL_CLIENT_ID }}
          GMAIL_CLIENT_SECRET: ${{ secrets.GMAIL_CLIENT_SECRET }}
          GMAIL_REFRESH_TOKEN: ${{ secrets.GMAIL_REFRESH_TOKEN }}
          GMAIL_REDIRECT_URI: ${{ secrets.GMAIL_REDIRECT_URI }}
          HEADLESS_MODE: "true"
        run: npm run book
```

### Option B: Local Cron Job

Add to your crontab:

```bash
# Check for booking requests every 5 minutes
*/5 * * * * cd /path/to/avalon-court-booker && pnpm run book
```

## Usage

### How to Book a Court

1. **Receive availability email**: The system sends you an email with available time slots
2. **Reply with booking request**: Reply to the email with:
   - Date: "September 7, 2025" or "Sep 7, 2025" or "9/7/2025"
   - Time: "5 - 6 PM" or "5:00 - 6:00 PM" or "17:00 - 18:00"
3. **Automatic booking**: The system processes your request and books the slot
4. **Confirmation**: You receive a confirmation email

### Email Processing Flow

1. **Gmail API Monitoring**: System checks for new emails every 5 minutes
2. **Email Detection**: Identifies replies to availability emails by subject line
3. **Content Extraction**: Parses email body to extract date and time
4. **Validation**: Ensures parsed data is valid and complete
5. **Booking Execution**: Uses Puppeteer to automate the booking process
6. **Status Notification**: Sends confirmation or error email

### Intelligent Parsing Features

**Date Recognition**:

- Full month names: "September 7, 2025"
- Abbreviated months: "Sep 7, 2025"
- Numeric formats: "9/7/2025", "09/07/2025"
- ISO format: "2025-09-07"

**Time Recognition**:

- 12-hour format: "5 - 6 PM", "5:00 - 6:00 PM"
- 24-hour format: "17:00 - 18:00"
- Flexible spacing and punctuation
- Automatic AM/PM inference

### Supported Date Formats

- "September 7, 2025"
- "Sep 7, 2025"
- "9/7/2025"
- "2025-09-07"

### Supported Time Formats

- "5 - 6 PM"
- "5:00 - 6:00 PM"
- "17:00 - 18:00" (24-hour format)

## Troubleshooting

### Common Issues

1. **"Gmail API not initialized"**

   - Check your Gmail API credentials
   - Ensure the Gmail API is enabled in Google Cloud Console

2. **"Could not parse date or time"**

   - Check the format of your email reply
   - Ensure you're replying to the correct email thread

3. **"Time slot not found"**

   - The time slot may no longer be available
   - Check the exact time format on the booking website

4. **"Login failed"**
   - Verify your email and password in the .env file
   - Check if the amenity website has changed

### Debug Mode

Run with debug logging:

```bash
DEBUG=* pnpm run book
```

### Manual Testing

Test individual components:

```bash
# Test email parsing only
node -e "
const EmailParser = require('./src/emailParser');
const parser = new EmailParser();
console.log(parser.parseDate('September 7, 2025'));
console.log(parser.parseTime('5 - 6 PM'));
"
```

## Security Notes

- Keep your Gmail API credentials secure
- Use environment variables for all sensitive data
- Regularly rotate your API keys
- Monitor your Gmail API usage in Google Cloud Console

## Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test the Gmail API connection with `pnpm run setup-gmail`
4. Check the booking website for any changes in structure
