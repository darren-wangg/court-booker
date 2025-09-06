# Avalon Court Booker

A comprehensive automated system that checks for available court reservations and enables email-based booking. Powered by Puppeteer, GitHub Actions, Gmail API, and Gmail SMTP for a seamless reservation making experience.

## System Overview

This system consists of two main phases that work together to provide a complete court booking solution:

### Phase 1: **Availability Checking** 🔍

- 🔄 **Automated Monitoring**: Runs every 2 hours via GitHub Actions
- 🌐 **Browser Automation**: Uses Puppeteer to login and scrape amenity website
- 📅 **Data Extraction**: Parses HTML tables to extract reservation data
- ⏰ **Time Slot Analysis**: Identifies available slots (10 AM - 10 PM)
- 📧 **Smart Notifications**: Sends emails only at 2 PM & 10 PM PST
- 🎯 **Complete Coverage**: Handles pagination to load all reservations
- 📱 **Professional Emails**: HTML-formatted availability reports

### Phase 2: **Email Booking System** 📧

- 📬 **Gmail Monitoring**: Checks for booking requests every 5 minutes
- 🧠 **Natural Language Processing**: Parses date/time from various formats
- 🤖 **Automated Booking**: Uses Puppeteer to fill and submit booking forms
- ✅ **Confirmation System**: Sends success/error notifications
- 🔐 **Secure Authentication**: OAuth2 for Gmail API access
- 👥 **Multi-user Support**: Handles multiple court bookers
- 🛡️ **Error Handling**: Comprehensive error management and recovery

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
   # Amenity website credentials
   EMAIL=your-email@example.com
   PASSWORD=your-password

   # Gmail SMTP for sending emails
   GMAIL_SMTP_USER=your-gmail@gmail.com
   GMAIL_SMTP_PASSWORD=your-16-character-app-password

   # Notification email (where availability emails are sent)
   NOTIFICATION_EMAIL=your-notification-email@example.com

   # Gmail API for receiving booking requests
   GMAIL_CLIENT_ID=your_gmail_client_id
   GMAIL_CLIENT_SECRET=your_gmail_client_secret
   GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
   ```

3. **Set up Gmail SMTP:**

   - Enable 2-Factor Authentication on your Gmail account
   - Generate an App-Specific Password for "Court Booker"
   - Add the credentials to your `.env` file

4. **Set up Gmail API:**

   ```bash
   pnpm run setup-gmail
   ```

5. **Set up GitHub Actions:**

   - Push this repository to GitHub
   - Go to your repository Settings → Secrets and variables → Actions
   - Add these repository secrets:
     - `EMAIL` - Your amenity website email
     - `PASSWORD` - Your amenity website password
     - `GMAIL_SMTP_USER` - Your Gmail address
     - `GMAIL_SMTP_PASSWORD` - Your Gmail app-specific password
     - `NOTIFICATION_EMAIL` - Email to receive notifications
     - `GMAIL_CLIENT_ID` - Your Gmail API client ID
     - `GMAIL_CLIENT_SECRET` - Your Gmail API client secret
     - `GMAIL_REFRESH_TOKEN` - Your Gmail API refresh token

6. **Optional configuration:**
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

## Complete Step-by-Step Process

### Phase 1: Availability Checking (Every 2 Hours)

#### 1. **GitHub Actions Trigger**

- **Schedule**: Cron job runs every 2 hours (`0 */2 * * *`)
- **Environment**: Ubuntu with Node.js 18 and Chrome
- **Execution**: Runs `src/scripts/check-now.js`

#### 2. **Reservation Checker Service**

- **Browser Launch**: Puppeteer starts headless Chrome with optimized settings
- **Website Navigation**: Goes to amenity website
- **Authentication**: Logs in using stored credentials with multiple selector strategies
- **Data Collection**: Parses HTML tables to extract reservation data
- **Pagination**: Clicks "Show More" buttons to load all available reservations
- **Analysis**: Generates time slots (10 AM - 10 PM) and compares with booked slots

#### 3. **Smart Email Throttling**

- **Timing**: Only sends emails at 2 PM and 10 PM PST
- **Purpose**: Prevents spam while maintaining useful notifications
- **Logging**: Always logs availability data regardless of email timing

#### 4. **Gmail SMTP Service**

- **Email Generation**: Creates HTML-formatted availability reports
- **Delivery**: Sends via Gmail SMTP using app-specific password
- **Formatting**: Professional design with responsive layout
- **Recipients**: Delivers to configured notification emails

### Phase 2: Email Booking Processing (Every 5 Minutes)

#### 1. **Gmail API Monitoring**

- **Frequency**: Checks for unread emails every 5 minutes
- **Authentication**: Uses OAuth2 with refresh token management
- **Filtering**: Identifies replies to availability emails
- **Multi-user**: Processes emails from all configured users

#### 2. **Email Parser Intelligence**

- **Natural Language**: Extracts date/time from various formats
- **Supported Formats**:
  - **Dates**: "September 7, 2025", "Sep 7, 2025", "9/7/2025", "2025-09-07"
  - **Times**: "5 - 6 PM", "5:00 - 6:00 PM", "17:00 - 18:00"
- **Validation**: Ensures parsed data is complete and valid
- **Error Handling**: Graceful handling of parsing failures

#### 3. **Email Booking Handler**

- **Orchestration**: Coordinates the complete booking process
- **User Management**: Handles multi-user configurations
- **Validation**: Validates booking requests before processing
- **Error Management**: Comprehensive error handling and logging

#### 4. **Booking Service**

- **Browser Instance**: Launches new Puppeteer browser for booking
- **Authentication**: Logs into amenity website
- **Form Navigation**: Goes to booking form
- **Data Entry**: Fills date and time fields automatically
- **Calendar Interaction**: Handles date picker widgets
- **Submission**: Submits booking form and detects results

#### 5. **Confirmation System**

- **Success Notifications**: Sends confirmation emails for successful bookings
- **Error Notifications**: Sends error emails for failed attempts
- **Email Management**: Marks processed emails as read
- **Logging**: Records all booking attempts and results

## How It Works - Technical Flow

### Availability Checking Process

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
GitHub Actions (Every 2hrs) → Puppeteer → Amenity Site → HTML Parsing → Gmail SMTP → Email Report
                                                                              ↓
User Reply → Gmail API → Email Parser → Booking Service → Puppeteer → Gmail SMTP → Confirmation
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
- **Email not sending**: Verify your Gmail SMTP credentials and notification email in repository secrets

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
