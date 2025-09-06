# Avalon Court Booker - System Architecture

## Complete System Overview

This document provides a comprehensive technical overview of the Avalon Court Booker system, including detailed flow diagrams and component interactions.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AVALON COURT BOOKER SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Actions│    │   Puppeteer      │    │   Amenity Site  │
│   (Every 2hrs)  │───▶│   Browser        │───▶│   Login & Parse │
│                 │    │   Automation     │    │   HTML Tables   │
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
         │
         ▼ (User replies with date/time)
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gmail API     │    │   Email Parser   │    │   Booking       │
│   Monitoring    │───▶│   Intelligence   │───▶│   Service       │
│   (Every 5min)  │    │   (Multi-format) │    │   Orchestrator  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OAuth2 Auth   │    │   Date/Time      │    │   Puppeteer     │
│   & Token Mgmt  │    │   Parsing        │    │   Booking Bot   │
│   (Refresh Tokens)│   │   (Regex Engine) │    │   (Form Fill)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Email         │    │   Booking        │    │   Amenity Site  │
│   Processing    │    │   Request        │    │   Form Submit   │
│   (Mark as Read)│    │   Validation     │    │   & Confirmation│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Confirmation  │    │   Success/Error  │    │   Booking       │
│   Email         │    │   Handling       │    │   Confirmation  │
│   (HTML Format) │    │   & Logging      │    │   Page          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Component Details

### 1. Reservation Checker System

#### GitHub Actions Workflow

- **Trigger**: Cron schedule every 2 hours (`0 */2 * * *`)
- **Environment**: Ubuntu latest with Node.js 18
- **Dependencies**: Chrome installation for Puppeteer
- **Smart Throttling**: Only sends emails at 2 PM and 10 PM PST

#### Puppeteer Browser Automation

- **Browser**: Headless Chrome with sandbox disabled
- **Login Strategy**: Multiple selector fallbacks for email/password fields
- **Navigation**: Waits for network idle and element visibility
- **Error Handling**: Comprehensive timeout and retry logic

#### HTML Parsing Engine

- **Table Structure**: Handles nested reservation tables
- **Pagination**: Clicks "Show More" buttons to load all data
- **Data Extraction**: Parses date headers and time slots
- **Time Generation**: Creates all possible slots (10 AM - 10 PM)

### 2. Email Booking System

#### Gmail API Integration

- **Authentication**: OAuth2 with refresh token management
- **Monitoring**: Checks for unread emails every 5 minutes
- **Filtering**: Identifies replies to availability emails
- **Processing**: Marks emails as read after processing

#### Email Parser Intelligence

- **Date Patterns**: Multiple regex patterns for various formats
- **Time Patterns**: Handles 12-hour and 24-hour formats
- **Validation**: Ensures parsed data is complete and valid
- **Error Recovery**: Graceful handling of parsing failures

#### Booking Automation

- **Form Navigation**: Automatically fills date and time fields
- **Calendar Interaction**: Clicks correct dates in calendar widget
- **Submission**: Handles form submission and confirmation
- **Error Detection**: Identifies booking failures and success

## Data Flow

### Availability Checking Flow

1. **Trigger**: GitHub Actions cron schedule
2. **Initialization**: Launch Puppeteer browser
3. **Authentication**: Login to amenity website
4. **Data Collection**: Parse all reservation tables
5. **Analysis**: Compare available vs booked slots
6. **Reporting**: Generate HTML email report
7. **Delivery**: Send via Gmail SMTP (if scheduled time)

### Booking Processing Flow

1. **Monitoring**: Gmail API checks for new emails
2. **Detection**: Identify booking request emails
3. **Parsing**: Extract date and time from email body
4. **Validation**: Verify parsed data is complete
5. **Booking**: Use Puppeteer to fill booking form
6. **Confirmation**: Send success/error email notification

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
