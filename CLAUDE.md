# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive automated amenity reservation system that monitors court availability and enables email-based booking. The system consists of two main phases:

### Phase 1: Availability Checking

- **Automated Monitoring**: Runs every 2 hours via GitHub Actions
- **Browser Automation**: Uses Puppeteer to login and scrape amenity website
- **Data Processing**: Parses HTML tables to extract reservation data
- **Smart Notifications**: Sends availability emails at 2 PM and 10 PM PST
- **Professional Reports**: HTML-formatted email notifications

### Phase 2: Email Booking System

- **Gmail Monitoring**: Checks for booking requests
- **Natural Language Processing**: Parses date/time from email replies
- **Automated Booking**: Uses Puppeteer to book requested slots
- **Confirmation System**: Sends success/error notifications
- **Multi-user Support**: Handles multiple court bookers

## Development Commands

### Running the application

```bash
# Run scheduled checks (every 3 hours by default)
pnpm start
# or
node index.js

# Run a single check immediately
pnpm check
# or
node check-now.js
```

### Package management

```bash
# Install dependencies
pnpm install

# Note: No test framework is configured - tests return an error
```

## Architecture

### Core Services

1. **Reservation Checker Service** (`src/services/reservationChecker.js`)

   - **Purpose**: Automates court availability checking
   - **Features**: Browser automation, HTML parsing, pagination handling
   - **Process**: Login → Parse tables → Generate time slots → Send email reports
   - **Scheduling**: Runs every 2 hours via GitHub Actions

2. **Booking Service** (`src/services/bookingService.js`)

   - **Purpose**: Automates court booking when users reply to emails
   - **Features**: Form automation, calendar interaction, validation
   - **Process**: Login → Navigate to form → Fill data → Submit → Detect results
   - **Integration**: Works with email parser for booking requests

3. **Email Parser** (`src/emailParser.js`)

   - **Purpose**: Monitors Gmail and extracts booking requests
   - **Features**: Gmail API integration, natural language processing
   - **Process**: Check emails → Parse date/time → Validate data → Mark as read
   - **Formats**: Supports multiple date/time formats

4. **Email Booking Handler** (`src/emailBookingHandler.js`)

   - **Purpose**: Orchestrates the complete booking process
   - **Features**: Process coordination, user management, error handling
   - **Process**: Initialize services → Process requests → Execute booking → Send confirmations

5. **Gmail SMTP Service** (`src/services/gmailSmtpService.js`)

   - **Purpose**: Sends HTML-formatted emails via Gmail SMTP
   - **Features**: SMTP integration, HTML templates, responsive design
   - **Usage**: Sends availability reports and booking confirmations

6. **Email Service** (`src/services/emailService.js`)

   - **Purpose**: Provides unified interface for email operations
   - **Features**: Service abstraction, template integration, error management

7. **Configuration Management** (`src/config.js`)
   - **Purpose**: Centralized configuration and environment variable management
   - **Features**: Multi-user support, validation, default values

### Entry Points

- `src/scripts/check-now.js` - Availability checking entry point
- `src/scripts/check-bookings.js` - Booking processing entry point
- `src/scripts/setup-gmail-auth.js` - Gmail API setup helper
- `api/check-availability.js` - API endpoint for availability checking

### Key Features

- **Two-Phase System**: Availability checking + Email booking
- **Smart Scheduling**: GitHub Actions every 2 hours with email throttling
- **Natural Language Processing**: Parses date/time from email replies
- **Multi-user Support**: Handles multiple court bookers
- **Professional Emails**: HTML-formatted notifications
- **Error Handling**: Comprehensive error management and recovery
- **OAuth2 Integration**: Secure Gmail API access
- **Browser Automation**: Robust Puppeteer-based automation

## Environment Configuration

Required `.env` file:

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
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Optional settings
AMENITY_URL=https://www.avalonaccess.com/...
HEADLESS_MODE=true
```

## Dependencies

- **puppeteer**: Browser automation
- **googleapis**: Gmail API integration
- **nodemailer**: Email sending via SMTP
- **dotenv**: Environment variable management

## Important Notes

- **Time Slots**: Generated from 10 AM to 10 PM (hourly slots)
- **Scheduling**: GitHub Actions runs every 2 hours
- **Email Throttling**: Only sends emails at 2 PM and 10 PM PST
- **Multi-user Support**: Handles multiple court bookers
- **Browser Settings**: Includes `--no-sandbox` flags for compatibility
- **Error Handling**: Comprehensive logging and error recovery
- **No Tests**: Manual testing required
