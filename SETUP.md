# Avalon Court Booker Setup

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
from: 'Avalon Court Booker <onboarding@resend.dev>',
```

#### Option B: Use Your Own Domain (Recommended)

1. Add your domain in Resend dashboard
2. Add the required DNS records
3. Update the `from` field to use your domain:

```javascript
from: 'Avalon Court Booker <noreply@yourdomain.com>',
```

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy to Vercel

```bash
vercel
```

### 3. Set Environment Variables

In your Vercel dashboard, add these environment variables:

- `AVALON_EMAIL` - Your Avalon Access email
- `AVALON_PASSWORD` - Your Avalon Access password
- `RESEND_API_KEY` - Your Resend API key
- `NOTIFICATION_EMAIL` - Email to receive notifications

### 4. Test the Deployment

```bash
# Test the API endpoint
curl -X POST https://your-app.vercel.app/api/check-availability

# Test the cron job
curl https://your-app.vercel.app/api/cron
```

## Local Testing

### Test Email Functionality

```bash
# Make sure your .env file has the email settings
pnpm check
```

### Test API Endpoint Locally

```bash
# Start Vercel dev server
vercel dev

# Test the endpoint
curl -X POST http://localhost:3000/api/check-availability
```

## Cron Schedule

The cron job runs every 3 hours (`0 */3 * * *`). You can modify this in `vercel.json`:

- `0 */3 * * *` - Every 3 hours
- `0 */6 * * *` - Every 6 hours
- `0 9,15,21 * * *` - At 9 AM, 3 PM, and 9 PM daily
- `0 9 * * *` - Once daily at 9 AM

## Troubleshooting

### Email Not Sending

1. Check your Resend API key is correct
2. Verify your domain is set up properly
3. Check the `from` email address matches your verified domain
4. Look at Vercel function logs for error messages

### Cron Job Not Running

1. Check Vercel cron logs in the dashboard
2. Verify `CRON_SECRET` environment variable is set
3. Make sure the cron schedule is valid

### Puppeteer Issues on Vercel

1. Vercel has a 60-second timeout limit
2. The app is configured to run headless by default
3. If you get timeout errors, try reducing the timeout values in `src/config.js`
