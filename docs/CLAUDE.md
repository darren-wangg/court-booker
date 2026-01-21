## Purpose

This file tells coding agents (Claude, Cursor, etc.) how to work effectively in this repo and what the **current, real** system architecture looks like.

Keep responses **concrete and action-oriented**: prefer editing existing services/scripts over inventing new entry points.

## High-level System Overview

This is an automated amenity reservation system that:

- **Checks availability** for the next 7 days using **Playwright/Puppeteer** against the amenity site
- **Stores results** in **Supabase** database for persistence and history
- **Provides a web UI** (Next.js) for viewing availability and triggering bookings
- **Automates bookings** through browser automation when users request them via the web interface
- **Runs 100% serverless** using **Browserless.io** for cloud browser automation (no DigitalOcean droplet needed!)

Two major flows:

- **Availability flow (GitHub Actions)**: GitHub Actions → `check-now.ts` → `ReservationChecker` → local Playwright browser → amenity site → Supabase
- **Availability flow (Vercel)**: Web UI refresh → Next.js API route → `ReservationChecker` → Browserless.io (cloud browser) → amenity site → Supabase
- **Booking flow**: Web UI → Next.js API route → `BookingService` → Browserless.io (cloud browser) → amenity site → confirmation

## Current Tooling & Runtime Stack

- **Node.js** with **TypeScript** and **pnpm**
- **Playwright-core** (`packages/shared/utils/playwrightBrowser.ts`) as the sole browser driver
  - Lightweight (API only, no bundled browsers)
  - Works in serverless (Vercel) with Browserless.io
  - Works locally/in GitHub Actions with installed Playwright browsers
- **Browserless.io** for cloud browser automation in Vercel serverless
- **Supabase** for data persistence (`packages/shared/utils/supabaseClient.ts`)
- **Next.js** for the frontend web application (`web/`) - deployed on Vercel
- **GitHub Actions** for scheduled availability checks (uses local Playwright, not Browserless)
- **No dedicated server needed** - everything runs serverless!

## Core Services & Where to Hook Changes

When modifying behavior, prefer adjusting these existing services:

- **`packages/shared/services/reservationChecker.ts`**
  - Heart of the availability flow
  - Uses `PlaywrightBrowser` with multiple selector strategies to:
    - Login → load tables (with aggressive CI + cloud hacks)
    - Click "show more" repeatedly and dedupe results across pages
    - Generate canonical time slots (10AM–10PM) and compute available vs booked
  - Auto-detects `BROWSERLESS_TOKEN` env var and connects to cloud browser via WebSocket
  - Falls back to local Playwright browser when no token (GitHub Actions, local dev)
  - Returns structured availability data (no email sending)

- **`packages/shared/services/bookingService.ts`**
  - Handles **actual bookings** against the amenity site
  - Does: browser init → login → datepicker interaction → time dropdown selection → submit + success detection
  - Auto-detects `BROWSERLESS_TOKEN` env var and connects to cloud browser via WebSocket
  - Called directly by Next.js API routes (`web/app/api/booking/route.ts`)

- **`packages/shared/utils/supabaseClient.ts`**
  - Handles all Supabase database operations
  - Functions: `saveAvailabilitySnapshot`, `getLatestSnapshot`, `getRecentSnapshots`
  - Used by `check-now.ts` and the API routes

- **`packages/shared/utils/playwrightBrowser.ts`**
  - Unified browser interface for both local and remote (Browserless.io) browsers
  - `connect(wsEndpoint)` - Connect to Browserless.io via WebSocket
  - `launch(options)` - Launch local Chromium browser
  - Returns Puppeteer-compatible page interface for consistency

- **`src/config.ts`**
  - Central config: parses **multi-user** envs (USER1_EMAIL, USER2_EMAIL, …) with a legacy single-user fallback
  - Exposes: `users`, `getUser(id)`, `amenityUrl`, scheduling pattern, headless mode

## Entry Points & How to Run Things

Use **these** entry points instead of creating new CLIs:

- **CLI scripts** (see `package.json`):
  - `pnpm check` → `ts-node src/scripts/check-now.ts [userId?]`
    - Runs a one-off availability check for a particular user (or default user)
    - Saves results to Supabase
    - Uses Browserless.io if `BROWSERLESS_TOKEN` is set

- **GitHub Actions**:
  - `.github/workflows/court-checker.yml` runs `check-now.ts` 4 times daily
  - Configured via repository secrets
  - Uses Browserless.io for browser automation

- **Next.js API Routes** (in `web/app/api/`) - All serverless on Vercel:
  - `/api/availability/latest` - Fetch latest availability from Supabase
  - `/api/availability/refresh` - Trigger availability check directly (calls `ReservationChecker`)
  - `/api/book` - Trigger booking directly (calls `BookingService`)
  - All routes use Browserless.io for browser automation

## Environment & Secrets (current behavior)

Environment is centralized via `src/config.ts` (plus `.env`/deployment secrets). Key pieces:

- **User credentials**
  - Multi-user:
    - `USER1_EMAIL`, `USER1_PASSWORD`
    - `USER2_EMAIL`, ...
  - Legacy single-user:
    - `EMAIL`, `PASSWORD`

- **Supabase**
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

- **Browserless.io (REQUIRED for serverless)**
  - `BROWSERLESS_TOKEN` - API token from Browserless.io
  - Sign up at https://www.browserless.io/ (free tier available!)
  - Auto-detected by both `ReservationChecker` and `BookingService`

- **Amenity + browser**
  - `AMENITY_URL` – allows overriding the amenity URL
  - `HEADLESS_MODE` – set to `'true'` for headless (local dev only)

- **Runtime flags**
  - `NODE_ENV` – affects cloud/production behavior (CloudChrome paths, longer timeouts, aggressive fallbacks)
  - `GITHUB_ACTIONS` – toggles CI-specific timeouts, header tweaks, and table-loading strategies

- **Deprecated (no longer needed)**
  - `WORKER_SECRET` - Was for DigitalOcean worker API (now removed)
  - `WORKER_PORT` - Was for worker server (now removed)

When you add new behavior, **honor these flags** instead of adding ad-hoc reads of `process.env`.

## How Coding Agents Should Work Here

- **Prefer editing existing services**:
  - Availability changes → `ReservationChecker`
  - Booking mechanics → `BookingService`
  - Database operations → `supabaseClient`
  - API endpoints → Next.js API routes (`web/app/api/`)

- **Don't create parallel stacks**:
  - Do **not** add another HTTP server; extend Next.js API routes
  - Do **not** bypass `config.getUser()` for anything user-specific
  - Do **not** add direct database queries; use `supabaseClient` helpers
  - Do **not** create new browser automation logic; use existing services

- **Be cautious with browser behavior**:
  - The system is heavily tuned for flaky CI/cloud environments (resource constraints, EAGAIN, protocol errors)
  - When changing selectors or navigation:
    - Keep existing fallbacks
    - Avoid tightening timeouts without strong reason
    - Prefer adding robust logging over removing it

- **Testing / debugging pattern**:
  - Local one-off availability: `pnpm check` (uses Browserless if token is set)
  - Frontend: `cd web && pnpm dev`
  - API routes: Test via frontend or curl to `http://localhost:3000/api/book`
  - All browser automation uses Browserless.io in production

## Non-goals / Things to Avoid

- Do **not** introduce email sending; the amenity site sends confirmations
- Do **not** remove cloud/CI hacks in `ReservationChecker` without supplying an equivalent or better robustness strategy
- Do **not** hardcode credentials or URLs; always use env + `packages/shared/config.ts`
- Do **not** assume GitHub Actions is the only scheduler; manual triggers via web UI are first-class
- Do **not** reintroduce the DigitalOcean worker server pattern; use Browserless.io for browser automation
- Do **not** add puppeteer or heavy browser dependencies to the web package; use playwright-core only
- Do **not** try to launch local Chrome in Vercel serverless; use Browserless.io
