# Court Reservation Checker

A two-part automated system that checks for available court reservations and enables email-based booking. Powered by Puppeteer, GitHub Actions, and Gmail API for a seamless reservation making experience.

## System Overview

This system consists of two main components:

### 1. **Reservation Checker** 🔍

- 🔄 Automated login to amenity website using Puppeteer
- 📅 Parses HTML tables to extract reservation data
- ⏰ Identifies available time slots (10 AM - 10 PM)
- 🕐 Runs every 2 hours via GitHub Actions
- 📧 Smart email notifications (only at 2 PM & 10 PM PST)
- 🎯 Handles pagination to load all reservations

### 2. **Email Booking System** 📧

- 📬 Monitors Gmail for booking requests via Gmail API
- 🧠 Intelligent email parsing (multiple date/time formats)
- 🤖 Automated booking using Puppeteer
- ✅ Confirmation emails for successful bookings
- ❌ Error notifications for failed attempts
- 🔐 OAuth2 authentication for secure Gmail access

## Key Features

- **Smart Scheduling**: Runs every 2 hours with intelligent email throttling
- **HTML Parsing**: Robust extraction from complex table structures
- **Multi-format Support**: Handles various date/time formats in emails
- **Error Recovery**: Graceful handling of booking failures
- **Professional Emails**: HTML-formatted notifications with responsive design
- **Free Infrastructure**: Uses GitHub Actions free tier (2,000 minutes/month)

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure credentials:**
   Create a `.env` file in the project root:

   ```env
   EMAIL=your-email@example.com
   PASSWORD=your-password
   RESEND_API_KEY=your-resend-api-key
   NOTIFICATION_EMAIL=your-notification-email@example.com
   ```

3. **Set up GitHub Actions:**

   - Push this repository to GitHub
   - Go to your repository Settings → Secrets and variables → Actions
   - Add these repository secrets:
     - `EMAIL` - Your email
     - `PASSWORD` - Your password
     - `RESEND_API_KEY` - Your Resend API key
     - `NOTIFICATION_EMAIL` - Email to receive notifications

4. **Optional configuration:**
   You can customize these settings in your `.env` file:

   ```env
   # Run browser in headless mode - default: true
   HEADLESS_MODE=true

   # Amenity URL (if different from default)
   AMENITY_URL=https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf
   ```

## Usage

### Automated Scheduling (GitHub Actions)

The tool automatically runs every 3 hours via GitHub Actions. You can also trigger it manually:

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select "Court Availability Checker" workflow
4. Click "Run workflow" button

### Run a single check locally:

```bash
pnpm check
# or
node check-now.js
```

## How It Works

### Reservation Checking Process

1. **Browser Automation**: Puppeteer launches a headless Chrome browser
2. **Login**: Automatically logs into amenity website using stored credentials
3. **HTML Parsing**: Extracts reservation data from complex table structures
4. **Pagination**: Clicks "Show More" buttons to load all available reservations
5. **Data Analysis**: Compares all possible time slots (10 AM - 10 PM) against booked slots
6. **Email Report**: Sends formatted availability report (only at scheduled times)

### Email Booking Process

1. **Gmail Monitoring**: Checks for replies to availability emails every 5 minutes
2. **Email Parsing**: Extracts date and time from natural language responses
3. **Booking Automation**: Uses Puppeteer to navigate booking form and submit
4. **Confirmation**: Sends success/error emails based on booking results

### Technical Architecture

```
GitHub Actions (Every 2hrs) → Puppeteer → Amenity Site → HTML Parsing → Email Report
                                                                    ↓
User Reply → Gmail API → Email Parser → Booking Service → Puppeteer → Confirmation
```

## Schedule Configuration

The GitHub Actions workflow runs every 2 hours by default. To change the schedule, edit `.github/workflows/court-checker.yml`:

```yaml
schedule:
  - cron: "0 */2 * * *" # Every 2 hours (current)
  - cron: "0 */1 * * *" # Every hour
  - cron: "0 12,15,18,21 * * *" # At 12pm, 3pm, 6pm, and 9pm
  - cron: "*/30 * * * *" # Every 30 minutes
```

**Smart Email Throttling**: Emails are only sent at 2 PM and 10 PM PST to avoid spam while maintaining useful notifications.

**Note**: GitHub Actions has a minimum interval of 5 minutes for scheduled workflows.

## Troubleshooting

- **Login fails**: Verify your credentials in GitHub repository secrets
- **No dates available**: The calendar might not have any selectable dates
- **GitHub Actions failing**: Check the Actions tab for error logs
- **Email not sending**: Verify your Resend API key and notification email in repository secrets

## Notes

- The tool generates time slots from 10 AM to 10 PM by default
- You may need to adjust the `generateTimeSlots()` function based on actual amenity hours
- Email notifications are sent when available slots are found
- GitHub Actions provides 2,000 free minutes per month for public repositories

## Usage Examples

### Checking Availability

```bash
# Run availability check locally
pnpm check

# Check for booking requests
pnpm book
```

### Booking via Email

1. **Receive availability email** with available time slots
2. **Reply with booking request**:
   ```
   September 7, 2025
   5 - 6 PM
   ```
3. **System automatically books** the requested slot
4. **Receive confirmation email** with booking details

### Supported Email Formats

- **Dates**: "September 7, 2025", "Sep 7, 2025", "9/7/2025", "2025-09-07"
- **Times**: "5 - 6 PM", "5:00 - 6:00 PM", "17:00 - 18:00"

## System Components

### Core Files

- `src/services/reservationChecker.js` - Main availability checking logic
- `src/services/bookingService.js` - Automated booking functionality
- `src/emailParser.js` - Gmail API integration and email parsing
- `src/emailBookingHandler.js` - Orchestrates the booking process
- `src/config.js` - Configuration management

### Email Templates

- `src/email-templates/availabilities.js` - Availability report templates
- `src/email-templates/booking.js` - Booking confirmation templates

### Scripts

- `src/scripts/check-now.js` - Entry point for availability checking
- `src/scripts/setup-gmail-auth.js` - Gmail API setup helper
- `check-bookings.js` - Entry point for booking processing
