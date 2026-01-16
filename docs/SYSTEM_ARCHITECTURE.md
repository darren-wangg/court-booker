# Court Booker - System Architecture

## Complete System Overview

This document provides a comprehensive technical overview of the Court Booker system - a **100% serverless** architecture using **Browserless.io** for cloud browser automation.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            COURT BOOKER SYSTEM                                  │
│                    (Serverless: Vercel + Browserless.io + Supabase)            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATED AVAILABILITY CHECKING FLOW                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Actions│    │   Reservation    │    │ Browserless.io  │
│   (6x per day)  │───▶│   Checker        │───▶│ Cloud Browser   │
│   Cron Trigger  │    │   Service        │    │ (WebSocket)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Playwright    │    │   HTML Parsing   │    │   Amenity Site  │
│   Browser       │    │   & Data Extract │    │   Login & Parse │
│   Automation    │    │   Engine         │    │   HTML Tables   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Time Slot     │    │   Availability   │    │   Supabase      │
│   Analysis      │    │   Data           │    │   Database      │
│   (10AM-10PM)   │    │   Generation     │    │   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   availability_        │
                    │   snapshots table      │
                    │   (JSONB data)         │
                    └────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         WEB UI INTERACTION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Supabase       │    │   User Views    │
│   Web App       │───▶│   Database       │───▶│   Availability  │
│   (Vercel)      │    │   (Read Latest)  │    │   Table         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   "Refresh"     │    │   Next.js API    │    │ Browserless.io  │
│   Button Click  │───▶│   Route          │───▶│ Cloud Browser   │
│                 │    │   /api/refresh   │    │   (WebSocket)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   ReservationChecker   │
                    │   → Supabase Save      │
                    └────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BOOKING FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Clicks   │    │   Next.js API    │    │ Browserless.io  │
│   "Book" Button │───▶│   /api/book      │───▶│ Cloud Browser   │
│   on Time Slot  │    │   Route          │    │   (WebSocket)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Date + Time   │    │   Booking        │    │   Amenity Site  │
│   Validation    │    │   Service        │───▶│   Form Submit   │
│                 │    │   (Playwright)   │    │   & Confirmation│
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

**Schedule**: 6 times daily (9 AM, 12 PM, 3 PM, 6 PM, 9 PM, 12 AM PST)

**Flow**:
1. GitHub Actions cron triggers
2. Runs `src/scripts/check-now.ts`
3. `ReservationChecker` checks for `BROWSERLESS_TOKEN`
4. If Browserless token exists → connects to cloud browser via WebSocket
5. If no token → falls back to local Chrome (GitHub Actions runners)
6. Logs into amenity website via browser automation
7. Scrapes reservation tables for next 7 days
8. Generates availability data (available vs booked slots)
9. **Saves to Supabase** `availability_snapshots` table
10. No email sending (removed from system)

**Key Files**:
- `src/scripts/check-now.ts` - Entry point
- `src/services/reservationChecker.ts` - Core scraping logic with Browserless support
- `src/utils/supabaseClient.ts` - Supabase integration
- `src/utils/playwrightBrowser.ts` - Playwright/Browserless WebSocket connector

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
**Deployment**: Vercel (serverless)

**Frontend** (`web/app/page.tsx`):
- React component with Tailwind CSS
- Fetches latest availability from Supabase
- Displays availability table
- "Refresh" button triggers new check
- "Book" button for each available slot

**API Routes** (serverless functions):
- `GET /api/availability/latest` - Fetch latest snapshot from Supabase
- `POST /api/availability/refresh` - Trigger availability check (calls `ReservationChecker` directly)
- `POST /api/book` - Book a time slot (calls `BookingService` directly)

**Key Files**:
- `web/app/page.tsx` - Main UI component
- `web/app/api/availability/latest/route.js` - Latest snapshot API
- `web/app/api/availability/refresh/route.ts` - Refresh trigger API (TypeScript)
- `web/app/api/book/route.ts` - Booking API (TypeScript)
- `web/lib/supabase.js` - Supabase client helpers

### 4. **Browserless.io Cloud Browser Service**

**Purpose**: Cloud-hosted Chrome browser for automation

**How it works**:
- Both `ReservationChecker` and `BookingService` detect `BROWSERLESS_TOKEN` env var
- Connect to Browserless.io via WebSocket (`wss://production-sfo.browserless.io?token=...`)
- Browserless provides fully-managed Chrome instances
- No local Chrome installation needed
- Handles browser crashes, memory management, scaling

**Benefits**:
- ✅ No server management
- ✅ Auto-scaling
- ✅ Better reliability than self-hosted Chrome
- ✅ Works in Vercel serverless environment
- ✅ Handles resource constraints gracefully

**Cost**: $0-9/month (free tier: 6 hours/month, paid: 100 hours/month)

### 5. **Services**

**`src/services/reservationChecker.ts`**:
- Heart of the availability flow
- Auto-detects `BROWSERLESS_TOKEN` → connects to Browserless.io via WebSocket
- Falls back to local Chrome if no token
- Uses `PlaywrightBrowser` and multiple selector strategies
- Login → load tables → click "show more" → dedupe results → generate time slots
- Returns structured availability data (no email sending)

**`src/services/bookingService.ts`**:
- Handles actual bookings against amenity site
- Auto-detects `BROWSERLESS_TOKEN` → connects to Browserless.io
- Flow: browser init → login → datepicker → time selection → submit → confirmation
- Called directly by Next.js API route (`web/app/api/book/route.ts`)

## Data Flow

### Availability Check Flow

```
GitHub Actions (Cron) or Web UI Refresh
    ↓
check-now.ts or API route
    ↓
ReservationChecker.checkAvailability()
    ↓
Check for BROWSERLESS_TOKEN
    ├─ If exists → Connect to Browserless.io (WebSocket)
    └─ If not → Use local Chrome (GitHub Actions runner)
    ↓
Playwright → Amenity Site → HTML Parsing
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
Direct call to ReservationChecker (same process)
    ↓
Browserless.io → Amenity Site → Parse
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
Direct call to BookingService.bookTimeSlot()
    ↓
Browserless.io → Amenity Site → Submit Form
    ↓
Success/Failure Response
    ↓
Frontend Shows Result
    ↓
Amenity Site Sends Confirmation Email (automatic)
```

## Technology Stack

### Backend (Node.js)
- **Playwright**: Primary browser automation library
- **Puppeteer**: Fallback browser automation
- **Browserless.io**: Cloud browser service (WebSocket connection)
- **@supabase/supabase-js**: Database client

### Frontend (Next.js)
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **@supabase/supabase-js**: Database client

### Infrastructure
- **GitHub Actions**: Automated availability checks (free tier)
- **Supabase**: PostgreSQL database (free tier)
- **Vercel**: Next.js hosting + serverless functions (free tier)
- **Browserless.io**: Cloud browser automation ($0-9/month)

### Removed Components (Legacy)
- ❌ DigitalOcean droplet worker server
- ❌ Express worker-server.ts
- ❌ Gmail API integration
- ❌ Gmail Push Notifications
- ❌ Email parsing and booking handler
- ❌ Resend/Gmail SMTP email sending
- ❌ Local Chrome on dedicated server

## Environment Variables

### GitHub Actions Secrets
```env
# Browserless.io
BROWSERLESS_TOKEN=your-token

# User Credentials
USER1_EMAIL=your-email@example.com
USER1_PASSWORD=your-password

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Amenity
AMENITY_URL=https://www.avalonaccess.com/...
```

### Vercel Environment Variables
```env
# Browserless.io (CRITICAL!)
BROWSERLESS_TOKEN=your-token

# User Credentials
USER1_EMAIL=your-email@example.com
USER1_PASSWORD=your-password

# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (server-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Environment
NODE_ENV=production
```

## Deployment Architecture

### GitHub Actions
- **Purpose**: Automated availability checks
- **Schedule**: 6x per day (9 AM - 12 AM, every 3 hours PST)
- **Cost**: Free (within limits)
- **Output**: Writes to Supabase
- **Browser**: Browserless.io (if token set) or local Chrome on runner

### Supabase
- **Purpose**: Data storage
- **Cost**: Free tier (500MB database, 2GB bandwidth)
- **Location**: Managed PostgreSQL

### Next.js App (Vercel)
- **Purpose**: Web UI and API routes
- **Cost**: Free tier
- **Functions**: Serverless API routes
- **Browser**: Browserless.io via WebSocket (for /api/refresh and /api/book)

### Browserless.io
- **Purpose**: Cloud browser automation
- **Cost**: $0-9/month (free: 6 hrs, paid: 100 hrs)
- **Connection**: WebSocket (wss://)
- **Replaces**: DigitalOcean droplet + local Chrome

## Security Considerations

### API Authentication
- Browserless uses token-based auth (`BROWSERLESS_TOKEN`)
- Next.js API routes can use `API_SECRET_KEY` header (optional)
- Supabase RLS policies for database access

### Credential Management
- Environment variables for all secrets
- GitHub Secrets for Actions
- Vercel environment variables
- Never commit credentials to git

## Performance Considerations

### GitHub Actions
- **Free Tier**: 2,000 minutes/month
- **Current Usage**: ~6 runs/day × ~5 min = ~30 min/day = ~900 min/month
- **Well within limits**

### Supabase
- **Free Tier**: 500MB storage, 2GB bandwidth
- **Current Usage**: Minimal (small JSONB snapshots)
- **Well within limits**

### Browserless.io
- **Free Tier**: 6 hours/month
- **Paid Tier**: 100 hours/month for $9
- **Usage**: ~5 min per check × 6 checks/day = 30 min/day = 15 hours/month
- **Recommendation**: Paid tier ($9/mo) for production

### Vercel
- **Free Tier**: 100GB bandwidth, 100GB-hrs compute
- **Serverless Functions**: 10s timeout (Hobby), 60s (Pro)
- **Current Usage**: Low (API routes are lightweight)
- **Well within limits**

## Cost Analysis

### Current Setup (Serverless)
- **GitHub Actions**: $0 (free tier)
- **Supabase**: $0 (free tier)
- **Vercel**: $0 (free tier)
- **Browserless.io**: $0-9/month (free tier or Starter)
- **Total**: **$0-9/month** 🎉

### Old Setup (DigitalOcean)
- **GitHub Actions**: $0
- **Supabase**: $0
- **Vercel**: $0
- **DigitalOcean Droplet**: $6-12/month
- **Total**: $6-12/month + server management time

**Savings**: $0-3/month + zero server management!

## Migration Notes

### Removed Components
- All email-related code (Gmail API, Resend, SMTP)
- DigitalOcean worker server (`src/api/worker-server.ts` - deprecated)
- Worker API routes (`web/app/api/*-worker/` - removed)
- Old JavaScript route files (`.old` backups - removed)

### New Components
- Browserless.io integration (auto-detected via `BROWSERLESS_TOKEN`)
- TypeScript API routes (`route.ts` instead of `route.js`)
- Direct service calls (no HTTP to external worker)

### Configuration Changes
- Removed: `WORKER_URL`, `WORKER_SECRET`, `WORKER_PORT`, `NOTIFICATION_EMAIL`
- Added: `BROWSERLESS_TOKEN`
- Simplified: Only user credentials and Browserless token needed for automation

---

**For detailed deployment instructions, see [DEPLOYMENT_SIMPLE.md](./DEPLOYMENT_SIMPLE.md).**
