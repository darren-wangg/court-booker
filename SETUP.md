# Court Reservation Checker

## System Architecture Overview

This project consists of two main systems:

### 1. **Reservation Checker System**

- **Technology**: Puppeteer + GitHub Actions + Resend API
- **Function**: Monitors court availability every 2 hours
- **Output**: Email notifications with available time slots

### 2. **Email Booking System**

- **Technology**: Gmail API + Puppeteer + Resend API
- **Function**: Processes email replies and automatically books courts
- **Input**: Natural language email replies with date/time
- **Output**: Confirmation emails with booking status

## GitHub Actions Deployment

This project uses GitHub Actions for automated scheduling, providing more frequent execution and better reliability than traditional cron jobs.

## Email Integration with Resend

### 1. Get Resend API Key

1. Go to [resend.com](https://resend.com) and sign up
2. Get your API key from the dashboard
3. Add it to your `.env` file:

```bash
RESEND_API_KEY=re_your_api_key_here
NOTIFICATION_EMAIL=your-email@example.com
```

### 2. Domain Setup (Important!)

Resend requires a verified domain to send emails. You have two options:

#### Option A: Use Resend's Test Domain (Quick Setup)

1. In your Resend dashboard, go to "Domains"
2. Use the test domain they provide (e.g., `resend.dev`)
3. Update the `from` field in `src/reservationChecker.js` line 532:

```javascript
from: 'Court Booker <onboarding@resend.dev>',
```

#### Option B: Use Your Own Domain (Recommended)

1. Add your domain in Resend dashboard
2. Add the required DNS records
3. Update the `from` field to use your domain:

```javascript
from: 'Court Booker <noreply@yourdomain.com>',
```

## How the Systems Work

### Reservation Checker Process

1. **GitHub Actions Trigger**: Runs every 2 hours automatically
2. **Browser Launch**: Puppeteer starts headless Chrome
3. **Login**: Automatically logs into amenity website
4. **HTML Parsing**: Extracts reservation data from table structures
5. **Data Analysis**: Compares available vs booked time slots
6. **Email Report**: Sends formatted availability report (only at 2 PM & 10 PM PST)

### Email Booking Process

1. **Gmail Monitoring**: Checks for replies to availability emails
2. **Email Parsing**: Extracts date/time from natural language
3. **Booking Automation**: Uses Puppeteer to fill booking form
4. **Confirmation**: Sends success/error emails

### Technical Details

**HTML Parsing Strategy**:

- Handles complex nested table structures
- Manages pagination with "Show More" buttons
- Extracts date headers and time slots
- Generates all possible time slots (10 AM - 10 PM)

**Email Parsing Intelligence**:

- Supports multiple date formats (September 7, 2025, 9/7/2025, etc.)
- Handles various time formats (5 - 6 PM, 17:00 - 18:00, etc.)
- Uses regex patterns for robust parsing
- Validates parsed data before booking

## GitHub Actions Setup

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/court-booker.git
git push -u origin main
```

### 2. Set Repository Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

- `EMAIL` - Your email
- `PASSWORD` - Your password
- `RESEND_API_KEY` - Your Resend API key
- `NOTIFICATION_EMAIL` - Email to receive notifications

### 3. Test the Workflow

1. Go to the **Actions** tab in your repository
2. Select "Court Availability Checker" workflow
3. Click **Run workflow** to test manually
4. Check the logs to ensure everything works correctly

## Local Testing

### Test Email Functionality

```bash
# Make sure your .env file has the email settings
pnpm check
```

## Schedule Configuration

The GitHub Actions workflow runs every 3 hours by default. To modify the schedule, edit `.github/workflows/court-checker.yml`:

```yaml
schedule:
  - cron: "0 */3 * * *" # Every 3 hours (current)
  - cron: "0 */6 * * *" # Every 6 hours
  - cron: "0 9,15,21 * * *" # At 9 AM, 3 PM, and 9 PM daily
  - cron: "0 9 * * *" # Once daily at 9 AM
```

**Note**: GitHub Actions has a minimum interval of 5 minutes for scheduled workflows.

## Troubleshooting

### Email Not Sending

1. Check your Resend API key is correct in GitHub repository secrets
2. Verify your domain is set up properly in Resend dashboard
3. Check the `from` email address matches your verified domain
4. Look at GitHub Actions logs for error messages

### GitHub Actions Not Running

1. Check the Actions tab in your GitHub repository
2. Verify all repository secrets are set correctly
3. Make sure the cron schedule is valid (minimum 5 minutes)
4. Check if your repository is public (required for free GitHub Actions)

### Puppeteer Issues in GitHub Actions

1. GitHub Actions has a 6-hour timeout limit (much better than Vercel's 60 seconds)
2. The workflow installs Chrome dependencies automatically
3. If you get timeout errors, try reducing the timeout values in `src/config.js`
4. Check the Actions logs for detailed error messages
