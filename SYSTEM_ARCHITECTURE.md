# Court Booker - System Architecture

## Complete System Overview

This document provides a comprehensive technical overview of the Court Booker system, including detailed flow diagrams and component interactions for the **new web-based architecture**.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            COURT BOOKER SYSTEM                                  │
│                    (Web UI + Serverless + Supabase Architecture)               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATED AVAILABILITY CHECKING FLOW                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Actions│    │   Reservation    │    │   Amenity Site  │
│   (4x per day)  │───▶│   Checker        │───▶│   Login & Parse │
│   Cron Trigger  │    │   Service        │    │   HTML Tables   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Puppeteer/    │    │   HTML Parsing   │    │   Reservation   │
│   Playwright    │    │   & Data Extract │    │   Data Tables   │
│   Browser       │    │   Engine         │    │   Structure     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Availability  │    │   Time Slot     │    │   Supabase      │
│   Data          │    │   Analysis       │    │   Database       │
│   Generation    │    │   (10AM-10PM)    │    │   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   availability_       │
                    │   snapshots table     │
                    │   (JSONB data)        │
                    └────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         WEB UI INTERACTION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Supabase      │    │   User Views    │
│   Web App       │───▶│   Database      │───▶│   Availability │
│   (Frontend)    │    │   (Read Latest) │    │   Table         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   "Refresh"     │    │   Next.js API    │    │   Worker API    │
│   Button Click  │───▶│   Route         │───▶│   (Droplet)     │
│                 │    │   /api/refresh  │    │   Runs Check    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   ReservationChecker   │
                    │   → Supabase Save     │
                    └────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BOOKING FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Clicks   │    │   Next.js API     │    │   Worker API    │
│   "Book" Button │───▶│   /api/book       │───▶│   (Droplet)     │
│   on Time Slot  │    │   Route           │    │   Runs Booking  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Date + Time   │    │   Booking        │    │   Amenity Site  │
│   Validation    │    │   Service        │───▶│   Form Submit   │
│                 │    │   (Puppeteer)    │    │   & Confirmation│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Success/Error │    │   Amenity Site   │    │   User Receives │
│   Response      │    │   Confirmation   │    │   Confirmation  │
│   to Frontend   │    │   Email (auto)   │    │   Email         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## System Components

### 1. **Automated Availability Checking** (GitHub Actions)

**Location**: `.github/workflows/court-checker.yml`

**Flow**:
1. GitHub Actions cron triggers (4x per day)
2. Runs `src/scripts/check-now.js`
3. `ReservationChecker` launches Puppeteer/Playwright
4. Logs into amenity website
5. Scrapes reservation tables for next 7 days
6. Generates availability data (available vs booked slots)
7. **Saves to Supabase** `availability_snapshots` table
8. No email sending (removed from system)

**Key Files**:
- `src/scripts/check-now.js` - Entry point
- `src/services/reservationChecker.js` - Core scraping logic
- `src/utils/supabaseClient.js` - Supabase integration

### 2. **Supabase Database**

**Schema**: `supabase-schema.sql`

**Table**: `availability_snapshots`
- `id` (UUID, primary key)
- `created_at` (timestamp)
- `checked_at` (timestamp)
- `source` (text: 'github-cron', 'manual-refresh', 'api')
- `user_id` (integer, nullable)
- `total_available_slots` (integer)
- `success` (boolean)
- `data` (JSONB) - Full availability result
- `dates` (JSONB) - Array of date objects with slots

**Indexes**:
- `checked_at DESC` - Fast latest query
- `user_id` - User-specific queries
- `source` - Filter by source

### 3. **Next.js Web Application**

**Location**: `web/` directory

**Frontend** (`web/app/page.js`):
- React component with Tailwind CSS
- Fetches latest availability from Supabase
- Displays availability table
- "Refresh" button triggers new check
- "Book" button for each available slot

**API Routes**:
- `GET /api/availability/latest` - Fetch latest snapshot from Supabase
- `POST /api/availability/refresh` - Trigger availability check (calls worker)
- `POST /api/book` - Book a time slot (calls worker)

**Key Files**:
- `web/app/page.js` - Main UI component
- `web/app/api/availability/latest/route.js` - Latest snapshot API
- `web/app/api/availability/refresh/route.js` - Refresh trigger API
- `web/app/api/book/route.js` - Booking API
- `web/lib/supabase.js` - Supabase client helpers

### 4. **Worker API Server** (DigitalOcean Droplet)

**Location**: `src/api/worker-server.js`

**Purpose**: Runs Puppeteer operations (can't easily run in serverless)

**Endpoints**:
- `GET /health` - Health check
- `POST /api/check-availability` - Run ReservationChecker
- `POST /api/book` - Run BookingService

**Authentication**: Bearer token via `WORKER_SECRET`

**Why Separate?**:
- Puppeteer/Chrome requires significant resources
- Serverless functions have time/memory limits
- Droplet provides stable environment for browser automation

### 5. **Booking Service**

**Location**: `src/services/bookingService.js`

**Flow**:
1. Receives `{date, time, userId}` from API
2. Launches Puppeteer browser
3. Logs into amenity website
4. Navigates to booking form
5. Fills date and time fields
6. Handles calendar widget
7. Submits booking form
8. Returns success/failure

**Note**: Amenity site sends confirmation email automatically (no need for our email service)

## Data Flow

### Availability Check Flow

```
GitHub Actions (Cron)
    ↓
check-now.js
    ↓
ReservationChecker.checkAvailability()
    ↓
Puppeteer → Amenity Site → HTML Parsing
    ↓
Availability Data (JSON)
    ↓
saveAvailabilitySnapshot() → Supabase
    ↓
availability_snapshots table
```

### Web UI Flow

```
User Opens Web App
    ↓
GET /api/availability/latest
    ↓
Supabase Query (latest snapshot)
    ↓
Display Table in React Component
    ↓
User Clicks "Refresh"
    ↓
POST /api/availability/refresh
    ↓
HTTP Call → Worker API (Droplet)
    ↓
ReservationChecker.checkAvailability()
    ↓
Save to Supabase
    ↓
Frontend Refreshes (fetches latest)
```

### Booking Flow

```
User Clicks "Book" Button
    ↓
POST /api/book {date, time}
    ↓
HTTP Call → Worker API (Droplet)
    ↓
BookingService.bookTimeSlot()
    ↓
Puppeteer → Amenity Site → Submit Form
    ↓
Success/Failure Response
    ↓
Frontend Shows Result
    ↓
Amenity Site Sends Confirmation Email (automatic)
```

## Technology Stack

### Backend (Node.js)
- **Puppeteer/Playwright**: Browser automation
- **Cheerio**: HTML parsing
- **Express**: Worker API server
- **@supabase/supabase-js**: Database client

### Frontend (Next.js)
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **Tailwind CSS**: Styling
- **@supabase/supabase-js**: Database client

### Infrastructure
- **GitHub Actions**: Automated availability checks (free tier)
- **Supabase**: PostgreSQL database (free tier)
- **Vercel/Cloudflare**: Next.js hosting (free tier)
- **DigitalOcean Droplet**: Worker API server ($5-7/month)

### Removed Components
- ❌ Gmail API integration
- ❌ Gmail Push Notifications
- ❌ Email parsing and booking handler
- ❌ Resend/Gmail SMTP email sending
- ❌ Express webhook server for Gmail

## Environment Variables

### Backend (Node.js)
```env
# User Credentials
USER1_EMAIL=your-email@example.com
USER1_PASSWORD=your-password

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker API
WORKER_SECRET=your-secret-key
WORKER_PORT=3001

# Amenity
AMENITY_URL=https://www.avalonaccess.com/...
```

### Frontend (Next.js)
```env
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (server-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker API
WORKER_URL=https://your-droplet-ip:3001
WORKER_SECRET=your-secret-key

# Optional API Security
API_SECRET_KEY=your-api-secret
```

## Deployment Architecture

### GitHub Actions
- **Purpose**: Automated availability checks
- **Schedule**: 4x per day (configurable)
- **Cost**: Free (within limits)
- **Output**: Writes to Supabase

### Supabase
- **Purpose**: Data storage
- **Cost**: Free tier (500MB database, 2GB bandwidth)
- **Location**: Managed PostgreSQL

### Next.js App (Vercel/Cloudflare)
- **Purpose**: Web UI and API routes
- **Cost**: Free tier
- **Functions**: Serverless API routes

### Worker API (DigitalOcean)
- **Purpose**: Puppeteer operations
- **Cost**: $5-7/month (basic droplet)
- **Port**: 3001 (internal, or expose with nginx)

## Security Considerations

### API Authentication
- Worker API uses Bearer token (`WORKER_SECRET`)
- Next.js API routes can use `API_SECRET_KEY` header
- Supabase RLS policies for database access

### Credential Management
- Environment variables for all secrets
- GitHub Secrets for Actions
- Vercel/Cloudflare environment variables
- Never commit credentials to git

## Performance Considerations

### GitHub Actions
- **Free Tier**: 2,000 minutes/month
- **Current Usage**: ~4 runs/day × ~5 min = ~20 min/day = ~600 min/month
- **Well within limits**

### Supabase
- **Free Tier**: 500MB storage, 2GB bandwidth
- **Current Usage**: Minimal (small JSONB snapshots)
- **Well within limits**

### Puppeteer
- **Resource Intensive**: Requires memory and CPU
- **Solution**: Run on dedicated droplet (not serverless)
- **Timeout**: 5 minutes max per operation

## Low-Level System Design

### How Availability Checking Works

1. **Browser Initialization**:
   - Puppeteer launches headless Chrome
   - Configures browser with optimized flags
   - Sets timeouts and viewport

2. **Login Process**:
   - Navigates to amenity URL
   - Waits for login form
   - Fills email/password fields
   - Submits and waits for navigation

3. **Table Detection**:
   - Waits for reservation table to load
   - Uses multiple selector strategies (fallback)
   - Handles dynamic content loading

4. **Pagination**:
   - Clicks "Show More" buttons repeatedly
   - Loads all reservations across pages
   - Handles errors gracefully

5. **Data Extraction**:
   - Parses HTML table rows
   - Extracts date, time, and status
   - Groups by date and categorizes (available/booked)

6. **Time Slot Generation**:
   - Generates all possible slots (10 AM - 10 PM)
   - Compares against scraped reservations
   - Identifies available vs booked slots

7. **Data Storage**:
   - Formats as JSON structure
   - Saves to Supabase as JSONB
   - Includes metadata (timestamp, source, user)

### How Booking Works

1. **Request Validation**:
   - Validates date format
   - Parses time string to 24-hour format
   - Validates user credentials

2. **Browser Session**:
   - Launches new Puppeteer instance
   - Logs into amenity site
   - Navigates to booking page

3. **Form Interaction**:
   - Clicks date input (opens calendar)
   - Selects target date in calendar widget
   - Selects start time from dropdown
   - Selects end time from dropdown

4. **Submission**:
   - Clicks submit button
   - Waits for confirmation
   - Detects success/failure

5. **Response**:
   - Returns result to API
   - Frontend displays success/error
   - Amenity site sends confirmation email

### Database Schema Design

**Why JSONB?**
- Flexible schema for availability data
- Can store nested date/slot structures
- Easy to query and update
- PostgreSQL JSONB is performant

**Table Structure**:
```sql
availability_snapshots (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  checked_at TIMESTAMPTZ,
  source TEXT,              -- 'github-cron', 'api', 'manual-refresh'
  user_id INTEGER,
  total_available_slots INTEGER,
  success BOOLEAN,
  data JSONB,               -- Full result object
  dates JSONB               -- Array of date objects
)
```

**Query Pattern**:
```sql
-- Get latest snapshot
SELECT * FROM availability_snapshots
WHERE success = true
ORDER BY checked_at DESC
LIMIT 1;

-- Get latest per user
SELECT DISTINCT ON (user_id) *
FROM availability_snapshots
WHERE success = true
ORDER BY user_id, checked_at DESC;
```

## API Endpoints

### Next.js API Routes

**GET `/api/availability/latest`**
- Fetches most recent snapshot from Supabase
- Optional `?userId=1` query parameter
- Returns: `{ success: true, data: {...} }`

**POST `/api/availability/refresh`**
- Triggers new availability check
- Calls Worker API via HTTP
- Returns: `{ success: true, message: "..." }`

**POST `/api/book`**
- Books a time slot
- Body: `{ date: "2025-01-15", time: "5:00 PM - 6:00 PM", userId?: 1 }`
- Calls Worker API via HTTP
- Returns: `{ success: true, data: {...} }`

### Worker API (Droplet)

**GET `/health`**
- Health check endpoint
- Returns: `{ status: "healthy", ... }`

**POST `/api/check-availability`**
- Runs ReservationChecker
- Body: `{ userId?: 1 }`
- Saves result to Supabase
- Returns: `{ success: true, data: {...} }`

**POST `/api/book`**
- Runs BookingService
- Body: `{ date: "2025-01-15", time: "5:00 PM - 6:00 PM", userId?: 1 }`
- Returns: `{ success: true, data: {...} }`

## Error Handling

### Availability Check Errors
- Browser launch failures → Logged, saved as failed snapshot
- Login failures → Retry logic, error saved
- Table parsing errors → Fallback selectors, error logged
- Supabase save failures → Logged but doesn't fail check

### Booking Errors
- Invalid date/time → 400 error, user-friendly message
- Browser failures → 500 error, logged
- Booking form errors → Detected and returned
- Network timeouts → Retry logic in BookingService

## Monitoring & Logging

### GitHub Actions
- Workflow logs show execution details
- Artifacts uploaded on failure
- Success/failure notifications

### Supabase
- Database logs (via Supabase dashboard)
- Query performance metrics
- Storage usage tracking

### Worker API
- Console logging for all operations
- Error logging with stack traces
- Health check endpoint for monitoring

### Next.js
- Server-side logging in API routes
- Client-side error boundaries
- Vercel/Cloudflare function logs

## Cost Analysis

### Current Setup
- **GitHub Actions**: $0 (free tier)
- **Supabase**: $0 (free tier)
- **Vercel/Cloudflare**: $0 (free tier)
- **DigitalOcean Droplet**: $5-7/month
- **Total**: ~$5-7/month

### Alternative (Fully Serverless)
- Use Browserless.io instead of droplet: ~$75/month
- Or use Vercel Chrome: Free but limited
- **Recommendation**: Keep droplet for cost-effectiveness

## Future Enhancements

### Potential Improvements
- **Real-time Updates**: Supabase Realtime subscriptions
- **User Authentication**: Supabase Auth for multi-user
- **Booking History**: Track all booking attempts
- **Analytics**: Booking success rates, popular times
- **Mobile App**: React Native using same API
- **Notifications**: Push notifications for new availability

## Migration Notes

### Removed Components
- All Gmail API code (`emailParser.js`, `gmailPushService.js`)
- All email sending code (`emailService.js`, `resendEmailService.js`, `gmailSmtpService.js`)
- All webhook code (`gmailWebhook.js`, `start-webhook.js`)
- All email-related scripts

### New Components
- Supabase integration (`supabaseClient.js`)
- Next.js web app (`web/` directory)
- Worker API server (`worker-server.js`)
- Updated `check-now.js` to save to Supabase

### Configuration Changes
- Removed: All `GMAIL_*`, `RESEND_*`, `SMTP_*` env vars
- Added: `SUPABASE_*`, `WORKER_*` env vars
- Simplified: Only user credentials and amenity URL needed
