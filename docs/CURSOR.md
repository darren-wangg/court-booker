## Court Booker - AI Agent Guidelines

**Last Updated:** January 2026

This document provides context for AI agents (Cursor, Cascade, etc.) when working on the Court Booker codebase. It summarizes the real flows, where to make changes, and guardrails to keep the system stable.

If you are an AI editing this codebase, **read this once before making non-trivial changes**.

## Key Features

1. **Automated Availability Checking**
   - GitHub Actions: 9x daily (8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM, 12 AM PST)
   - Browserless.io cloud browser (60s timeout, WebSocket connection)
   - Scrapes amenity website for next 10 days (10 AM - 10 PM slots)
   - Saves to Supabase with `user_id=null` for CLI checks
   - ~270 checks/month (27% of free tier)

2. **Mobile-Responsive Web Dashboard**
   - **Mobile**: Carousel with 2 dates, left/right arrows, page indicator
   - **Desktop**: Horizontal grid with all dates visible
   - **Both**: Fully booked days shown with ✕ and "No availabilities"
   - Toast notifications (Sonner) for all actions
   - Basketball animations on refresh/booking
   - React Query for data fetching and caching

3. **Booking Automation**
   - Browserless.io cloud browser automation
   - Form filling and submission
   - Toast notifications for status
   - Amenity site sends confirmation email

4. **Social Media Integration**
   - Open Graph metadata for link sharing
   - Twitter card support
   - Basketball favicon and og-image
   - Custom title: "Court Booker ( っ'-')╮ =͟͟͞͞🏀"

## Where to Make Changes

### Availability Checking Logic
- `packages/shared/services/reservationChecker.ts` - Core scraping and parsing
- `scripts/check-now.ts` - CLI entry point
- `.github/workflows/court-checker.yml` - Scheduled runs (9x daily, every 2 hours)
- Browserless.io connection: `initializeBrowserlessChrome()` method
- `getNext10Days()` method - Generates next 10 days to check

### Database
- `packages/shared/utils/supabaseClient.ts` - Supabase operations
- `web/app/api/availability/latest/route.ts` - Fetch latest with `user_id OR null` logic
- `supabase-schema.sql` - Database schema
- Table: `availability_snapshots` with JSONB `data` column

### Frontend
- `web/app/page.tsx` - Main UI (mobile carousel + desktop grid)
- `web/app/layout.tsx` - Root layout (metadata, Sonner Toaster)
- `web/app/api/` - Serverless API routes
- `web/app/queries/useAvailabilities.ts` - React Query hooks
- `web/public/` - Static assets (favicon, og-image)

### Booking Logic
- `packages/shared/services/bookingService.ts` - Booking automation
- `web/app/api/book/route.ts` - API endpoint
- Toast notifications in `web/app/page.tsx`

## Environment Variables

### Root `.env` (CLI & GitHub Actions)
```env
BROWSERLESS_TOKEN=your-token
USER1_EMAIL=user@example.com
USER1_PASSWORD=password
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

### Web `.env.local` (Next.js)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
BROWSERLESS_TOKEN=your-token
USER1_EMAIL=user@example.com
USER1_PASSWORD=password
```

## Guardrails

- **DO NOT** remove Browserless.io integration (required for cloud browser)
- **DO NOT** add local Chrome/Puppeteer to web package (serverless incompatible)
- **DO NOT** hardcode credentials or API keys
- **DO NOT** remove environment variable checks in config.ts
- **DO NOT** modify Supabase schema without updating docs
- **DO NOT** remove mobile responsive classes (breaks mobile UI)
- **DO NOT** remove Sonner Toaster from layout.tsx (breaks notifications)
- **DO NOT** change GitHub Actions schedule without considering Browserless.io limits
- **DO NOT** remove `user_id OR null` logic from latest API route (breaks CLI data access)

## Current System State

- **Architecture**: 100% Serverless (Vercel + Browserless.io + Supabase + GitHub Actions)
- **Browser Automation**: Browserless.io cloud service (WebSocket connection)
- **Frontend**: Next.js 14 with React Query, Tailwind CSS, Sonner toasts
- **Database**: Supabase PostgreSQL with JSONB columns
- **Scheduled Jobs**: GitHub Actions (9x daily, every 2 hours during waking hours)
- **Mobile UI**: Responsive carousel (2 dates at a time) with arrows
- **Desktop UI**: Horizontal grid showing all dates
- **Notifications**: Sonner toast library for user feedback
