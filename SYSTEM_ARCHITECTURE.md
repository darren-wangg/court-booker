# Court Booker - System Architecture

## Complete System Overview

This document provides a comprehensive technical overview of the Court Booker system, including detailed flow diagrams and component interactions.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            COURT BOOKER SYSTEM                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AVAILABILITY CHECKING FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Actions│    │   Reservation    │    │   Amenity Site  │
│   (Every 2hrs)  │───▶│   Checker        │───▶│   Login & Parse │
│   Cron Trigger  │    │   Service        │    │   HTML Tables   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Smart Email   │    │   HTML Parsing   │    │   Reservation   │
│   Throttling    │    │   & Data Extract │    │   Data Tables   │
│   (2PM & 10PM)  │    │   Engine         │    │   Structure     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gmail SMTP    │    │   Availability   │    │   Time Slot     │
│   Email Service │    │   Report         │    │   Analysis      │
│   (HTML Format) │    │   Generator      │    │   (10AM-10PM)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   User Receives │
│   Availability  │
│   Email Report  │
└─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EMAIL BOOKING FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

         │
         ▼ (User replies with date/time)
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gmail API     │    │   Email Parser   │    │   Email Booking │
│   Monitoring    │───▶│   Intelligence   │───▶│   Handler       │
│   (Every 5min)  │    │   (Multi-format) │    │   Orchestrator  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OAuth2 Auth   │    │   Date/Time      │    │   Booking       │
│   & Token Mgmt  │    │   Parsing        │    │   Service       │
│ (Refresh Tokens)│    │   (Regex Engine) │    │   (Puppeteer)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Email         │    │   Booking        │    │   Amenity Site  │
│   Processing    │    │   Request        │    │   Form Submit   │
│  (Mark as Read) │    │   Validation     │    │   & Confirmation│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Confirmation  │    │   Success/Error  │    │   Booking       │
│   Email         │    │   Handling       │    │   Confirmation  │
│   (HTML Format) │    │   & Logging      │    │   Page          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Complete Step-by-Step System Flow

### Phase 1: Availability Checking (Every 2 Hours)

1. **GitHub Actions Trigger**

   - Cron schedule: `0 */2 * * *` (every 2 hours)
   - Runs on Ubuntu with Node.js 18
   - Executes `src/scripts/check-now.js`

2. **Reservation Checker Service**

   - Launches Puppeteer browser (headless Chrome)
   - Navigates to amenity website
   - Logs in using stored credentials
   - Parses HTML tables for reservation data
   - Handles pagination ("Show More" buttons)
   - Generates time slots (10 AM - 10 PM)
   - Compares available vs booked slots

3. **Smart Email Throttling**

   - Only sends emails at 2 PM and 10 PM PST
   - Prevents spam while maintaining useful notifications
   - Logs availability data regardless of email timing

4. **Gmail SMTP Service**
   - Uses Gmail SMTP with app-specific password
   - Sends HTML-formatted availability reports
   - Includes responsive design and clear formatting
   - Delivers to configured notification email

### Phase 2: Email Booking Processing (Every 5 Minutes)

1. **Gmail API Monitoring**

   - Checks for unread emails every 5 minutes
   - Uses OAuth2 authentication with refresh tokens
   - Filters for replies to availability emails
   - Processes emails from all configured users

2. **Email Parser Intelligence**

   - Extracts date/time from natural language
   - Supports multiple formats:
     - Dates: "September 7, 2025", "Sep 7, 2025", "9/7/2025", "2025-09-07"
     - Times: "5 - 6 PM", "5:00 - 6:00 PM", "17:00 - 18:00"
   - Validates parsed data completeness
   - Handles parsing errors gracefully

3. **Email Booking Handler**

   - Orchestrates the booking process
   - Validates booking requests
   - Manages user-specific configurations
   - Handles multi-user scenarios

4. **Booking Service**

   - Launches new Puppeteer browser instance
   - Logs into amenity website
   - Navigates to booking form
   - Fills date and time fields
   - Handles calendar widget interactions
   - Submits booking form
   - Detects success/failure

5. **Confirmation System**
   - Sends success confirmation emails
   - Sends error notifications for failures
   - Marks processed emails as read
   - Logs all booking attempts

## Core Services Architecture

### 1. Reservation Checker Service (`src/services/reservationChecker.js`)

**Purpose**: Automates the process of checking court availability on the amenity website.

**Key Features**:

- **Browser Automation**: Uses Puppeteer to control headless Chrome
- **Dynamic Login**: Multiple selector strategies for robust login
- **HTML Parsing**: Extracts reservation data from complex table structures
- **Pagination Handling**: Automatically loads all available data
- **Time Slot Generation**: Creates comprehensive availability reports
- **Smart Email Throttling**: Only sends emails at scheduled times

**Process Flow**:

1. Initialize Puppeteer browser with optimized settings
2. Navigate to amenity website and login
3. Parse HTML tables to extract reservation data
4. Handle pagination to load all reservations
5. Generate time slots (10 AM - 10 PM)
6. Compare available vs booked slots
7. Generate HTML email report
8. Send via Gmail SMTP (if scheduled time)

### 2. Booking Service (`src/services/bookingService.js`)

**Purpose**: Automates the court booking process when users reply to availability emails.

**Key Features**:

- **Form Automation**: Fills booking forms automatically
- **Calendar Interaction**: Handles date picker widgets
- **Validation**: Ensures booking data is complete
- **Error Detection**: Identifies booking success/failure
- **Multi-user Support**: Handles different user configurations

**Process Flow**:

1. Initialize new Puppeteer browser instance
2. Login to amenity website
3. Navigate to booking form
4. Fill date and time fields
5. Handle calendar widget interactions
6. Submit booking form
7. Detect and report booking results

### 3. Email Parser (`src/emailParser.js`)

**Purpose**: Monitors Gmail and extracts booking requests from email replies.

**Key Features**:

- **Gmail API Integration**: OAuth2 authentication with refresh tokens
- **Natural Language Processing**: Parses date/time from various formats
- **Multi-format Support**: Handles different date and time formats
- **Validation**: Ensures parsed data is complete and valid
- **Error Recovery**: Graceful handling of parsing failures

**Supported Formats**:

- **Dates**: "September 7, 2025", "Sep 7, 2025", "9/7/2025", "2025-09-07"
- **Times**: "5 - 6 PM", "5:00 - 6:00 PM", "17:00 - 18:00"

**Process Flow**:

1. Initialize Gmail API with OAuth2 credentials
2. Receives a booking email
3. Filter for replies to availability emails
4. Extract and parse date/time information
5. Validate parsed data completeness
6. Mark processed emails as read

### 4. Email Booking Handler (`src/emailBookingHandler.js`)

**Purpose**: Orchestrates the complete email booking process.

**Key Features**:

- **Process Orchestration**: Coordinates all booking components
- **User Management**: Handles multi-user configurations
- **Error Handling**: Comprehensive error management
- **Confirmation System**: Sends success/error notifications
- **Logging**: Detailed logging of all booking attempts

**Process Flow**:

1. Initialize email parser and booking service
2. Process booking requests from email parser
3. Validate booking data
4. Execute booking via booking service
5. Send confirmation emails
6. Handle errors and send error notifications

### 5. Gmail SMTP Service (`src/services/gmailSmtpService.js`)

**Purpose**: Sends HTML-formatted emails via Gmail SMTP.

**Key Features**:

- **SMTP Integration**: Uses Gmail SMTP with app-specific passwords
- **HTML Templates**: Professional email formatting
- **Responsive Design**: Mobile-friendly email layouts
- **Error Handling**: Robust error management
- **Multi-user Support**: Sends to different notification emails

### 6. Email Service (`src/services/emailService.js`)

**Purpose**: Provides a unified interface for email operations.

**Key Features**:

- **Service Abstraction**: Unified email interface
- **Template Integration**: Uses HTML email templates
- **Error Management**: Comprehensive error handling
- **Configuration Management**: Handles email settings

### 7. Configuration Management (`src/config.js`)

**Purpose**: Centralized configuration and environment variable management.

**Key Features**:

- **Environment Variables**: Secure credential management
- **Multi-user Support**: Handles multiple user configurations
- **Validation**: Ensures required settings are present
- **Default Values**: Provides sensible defaults

## Entry Points and Scripts

### 1. Availability Checking Scripts

**`src/scripts/check-now.js`**

- Entry point for immediate availability checking
- Can be run locally or via GitHub Actions
- Supports multi-user configurations
- Handles command-line arguments for user selection

**`api/check-availability.js`**

- API endpoint for availability checking
- Can be triggered via HTTP requests
- Returns JSON response with availability data

### 2. Booking Processing Scripts

**`src/scripts/check-bookings.js`**

- Entry point for booking processing
- Monitors Gmail for booking requests
- Processes all configured users
- Runs continuously with 5-minute intervals

**`src/scripts/setup-gmail-auth.js`**

- Gmail API setup helper
- Handles OAuth2 authorization flow
- Generates refresh tokens for API access
- Interactive setup process

## Email Templates

### 1. Availability Templates (`src/email-templates/availabilities.js`)

**Features**:

- **HTML Formatting**: Professional email design
- **Responsive Layout**: Mobile-friendly design
- **Time Slot Display**: Clear availability presentation
- **User Customization**: Personalized content

### 2. Booking Templates (`src/email-templates/booking.js`)

**Features**:

- **Confirmation Emails**: Success notification templates
- **Error Notifications**: Failure notification templates
- **Booking Details**: Complete booking information
- **Professional Design**: Consistent branding

## GitHub Actions Workflow

### Workflow Configuration

**File**: `.github/workflows/court-checker.yml`

**Features**:

- **Cron Schedule**: Runs every 2 hours (`0 */2 * * *`)
- **Environment**: Ubuntu latest with Node.js 18
- **Dependencies**: Chrome installation for Puppeteer
- **Secrets Management**: Secure credential handling
- **Error Handling**: Comprehensive error logging

**Process**:

1. Checkout repository code
2. Setup Node.js environment
3. Install dependencies
4. Run availability checking script
5. Upload error logs on failure

## Multi-User Support

### Configuration Structure

The system supports multiple users through environment variable prefixes:

```env
# Primary user (default)
EMAIL=user1@example.com
PASSWORD=password1
NOTIFICATION_EMAIL=user1@gmail.com

# Additional users
USER1_EMAIL=user1@example.com
USER1_PASSWORD=password1
USER1_NOTIFICATION_EMAIL=user1@gmail.com

USER2_EMAIL=user2@example.com
USER2_PASSWORD=password2
USER2_NOTIFICATION_EMAIL=user2@gmail.com
```

### Usage Patterns

- **Availability Checking**: Can check for specific users or all users
- **Booking Processing**: Processes all users automatically
- **Email Routing**: Sends notifications to user-specific emails
- **Credential Management**: Secure per-user credential handling

## Configuration Management

### Environment Variables

```bash
# Authentication
EMAIL=your-email@example.com
PASSWORD=your-password

# Amenity Configuration
AMENITY_URL=https://www.avalonaccess.com/...

# Email Services
RESEND_API_KEY=re_your_api_key
NOTIFICATION_EMAIL=your-notification@example.com

# Gmail API
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Browser Configuration
HEADLESS_MODE=true
```

### GitHub Secrets

- `EMAIL`: Amenity website login email
- `PASSWORD`: Amenity website password
- `GMAIL_SMTP_USER`: Gmail address for sending emails
- `GMAIL_SMTP_PASSWORD`: Gmail app-specific password
- `NOTIFICATION_EMAIL`: Email address for notifications
- `GMAIL_CLIENT_ID`: Gmail API client ID
- `GMAIL_CLIENT_SECRET`: Gmail API client secret
- `GMAIL_REFRESH_TOKEN`: Gmail API refresh token
- `GMAIL_REDIRECT_URI`: Gmail API redirect URI

## Error Handling & Recovery

### Reservation Checker

- **Login Failures**: Multiple selector strategies and retry logic
- **Network Issues**: Timeout handling and graceful degradation
- **Parsing Errors**: Fallback strategies for table structure changes
- **Email Failures**: Logging without system failure

### Booking System

- **Authentication Errors**: OAuth2 token refresh handling
- **Parsing Failures**: Detailed error logging and user notification
- **Booking Failures**: Comprehensive error detection and reporting
- **Network Issues**: Retry logic and timeout handling

## Performance Considerations

### GitHub Actions Limits

- **Free Tier**: 2,000 minutes per month
- **Current Usage**: ~360 runs per month (every 2 hours)
- **Optimization**: Smart email throttling reduces unnecessary processing

### Gmail API Limits

- **Quota**: 1 billion quota units per day
- **Current Usage**: Minimal (5-minute checks)
- **Optimization**: Only processes unread emails

### Puppeteer Performance

- **Headless Mode**: Faster execution without GUI
- **Resource Management**: Proper browser cleanup
- **Timeout Optimization**: Balanced between reliability and speed

## Security Considerations

### Credential Management

- **Environment Variables**: Secure storage of sensitive data
- **GitHub Secrets**: Encrypted storage in repository settings
- **OAuth2**: Secure authentication without password storage

### API Security

- **Rate Limiting**: Respects API quotas and limits
- **Error Handling**: No sensitive data in error logs
- **Token Management**: Secure refresh token handling

## Monitoring & Logging

### GitHub Actions

- **Workflow Logs**: Detailed execution logs
- **Artifact Upload**: Error logs on failure
- **Status Notifications**: Success/failure tracking

### Application Logging

- **Console Output**: Detailed progress logging
- **Error Tracking**: Comprehensive error reporting
- **Performance Metrics**: Execution time tracking

## Future Enhancements

### Potential Improvements

- **Database Storage**: Track booking history and patterns
- **Mobile Notifications**: Push notifications for availability
- **Multi-Court Support**: Handle multiple amenity types
