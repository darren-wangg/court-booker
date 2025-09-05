# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated Avalon Access amenity reservation checker that monitors court availability and can run on a schedule. The system uses Puppeteer to automate login and scrape reservation data from the Avalon Access website.

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

### Core Components

1. **ReservationChecker** (`src/reservationChecker.js`) - Main automation engine
   - Handles browser automation with Puppeteer
   - Manages login flow with dynamic form field detection
   - Scrapes reservation data by paginating through "show more" links
   - Generates time slots and compares against booked slots
   - Provides comprehensive availability reporting

2. **ReservationScheduler** (`src/scheduler.js`) - Scheduling system
   - Uses node-cron for scheduled execution
   - Validates cron patterns
   - Handles graceful shutdown (SIGINT)
   - Provides both scheduled and on-demand checking

3. **Configuration** (`src/config.js`) - Centralized settings
   - Environment variable management via dotenv
   - Browser configuration (headless mode, timeouts)
   - URL and scheduling configuration

### Entry Points

- `index.js` - Starts scheduled monitoring
- `check-now.js` - Runs single availability check
- `src/scripts/check-now.js` - Alternative entry point for immediate checks

### Key Features

- **Dynamic Form Detection**: Uses multiple selector strategies to find login fields
- **Pagination Handling**: Automatically clicks "show more" to load all reservations
- **Date Matching**: Cross-references scraped reservation dates with target dates
- **Availability Calculation**: Compares generated time slots against booked slots
- **Comprehensive Reporting**: Provides detailed console output with debug information

## Environment Configuration

Required `.env` file:
```env
AVALON_EMAIL=your-email@example.com
AVALON_PASSWORD=your-password
```

Optional configuration:
```env
SCHEDULE_PATTERN=0 */3 * * *  # Cron format
HEADLESS_MODE=true           # Browser visibility
AMENITY_URL=https://www.avalonaccess.com/...
```

## Dependencies

- **puppeteer**: Browser automation
- **node-cron**: Task scheduling
- **dotenv**: Environment variable management

## Important Notes

- Default time slots generated: 8 AM to 10 PM (hourly slots)
- Checks next 7 days by default
- Browser includes `--no-sandbox` flags for compatibility
- Extensive logging for debugging reservation collection
- No tests configured - manual testing required