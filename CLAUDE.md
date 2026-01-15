## Purpose

This file tells coding agents (Claude, Cursor, etc.) how to work effectively in this repo and what the **current, real** system architecture looks like.

Keep responses **concrete and action-oriented**: prefer editing existing services/scripts over inventing new entry points.

## High-level System Overview

This is an automated amenity reservation system that:

- **Checks availability** for the next 7 days using **Playwright/Puppeteer** against the amenity site
- **Stores results** in **Supabase** database for persistence and history
- **Provides a web UI** (Next.js) for viewing availability and triggering bookings
- **Automates bookings** through browser automation when users request them via the web interface

Two major flows:

- **Availability flow**: GitHub Actions → `check-now.js` → `ReservationChecker` → amenity site (browser automation) → Supabase
- **Booking flow**: Web UI → Next.js API route → Worker API (DigitalOcean) → `BookingService` → amenity site → confirmation

## Current Tooling & Runtime Stack

- **Node.js** with **TypeScript** and **pnpm**
- **Playwright** (`src/utils/playwrightBrowser.ts`) as the primary browser driver, with **Puppeteer** + **CloudChrome** as compatibility layers
- **Supabase** for data persistence (`src/utils/supabaseClient.ts`)
- **Next.js** for the frontend web application (`web/`)
- **Express** worker server (`src/api/worker-server.ts`) running on DigitalOcean droplet for Puppeteer operations
- **GitHub Actions** for scheduled availability checks (4x daily)

## Core Services & Where to Hook Changes

When modifying behavior, prefer adjusting these existing services:

- **`src/services/reservationChecker.ts`**
  - Heart of the availability flow
  - Uses `PlaywrightBrowser`, `CloudChrome`, and multiple selector strategies to:
    - Login → load tables (with aggressive CI + cloud hacks)
    - Click "show more" repeatedly and dedupe results across pages
    - Generate canonical time slots (10AM–10PM) and compute available vs booked
  - Returns structured availability data (no email sending)

- **`src/services/bookingService.ts`**
  - Handles **actual bookings** against the amenity site
  - Does: browser init → login → datepicker interaction → time dropdown selection → submit + success detection
  - Called by the Worker API when booking requests come from the web UI

- **`src/utils/supabaseClient.ts`**
  - Handles all Supabase database operations
  - Functions: `saveAvailabilitySnapshot`, `getLatestSnapshot`, `getRecentSnapshots`
  - Used by `check-now.js` and the Worker API

- **`src/api/worker-server.ts`**
  - Express server running on DigitalOcean droplet
  - Exposes `/api/check-availability` and `/api/book` endpoints
  - Called by Next.js serverless functions
  - Handles authentication via `WORKER_SECRET`

- **`src/config.ts`**
  - Central config: parses **multi-user** envs (USER1_EMAIL, USER2_EMAIL, …) with a legacy single-user fallback
  - Exposes: `users`, `getUser(id)`, `amenityUrl`, scheduling pattern, headless mode

## Entry Points & How to Run Things

Use **these** entry points instead of creating new CLIs:

- **CLI scripts** (see `package.json`):
  - `pnpm check` → `node src/scripts/check-now.js [userId?]`
    - Runs a one-off availability check for a particular user (or default user)
    - Saves results to Supabase
  - `pnpm run worker` → `node src/api/worker-server.js`
    - Starts the Express worker API server on the droplet

- **GitHub Actions**:
  - `.github/workflows/court-checker.yml` runs `check-now.js` 4 times daily
  - Configured via repository secrets

- **Next.js API Routes** (in `web/app/api/`):
  - `/api/availability/latest` - Fetch latest availability from Supabase
  - `/api/availability/refresh` - Trigger availability check via Worker API
  - `/api/book` - Trigger booking via Worker API

- **Worker API endpoints** (when worker server is running):
  - `POST /api/check-availability` - Run availability check
  - `POST /api/book` - Execute booking
  - `GET /health` - Health check

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

- **Worker API**
  - `WORKER_SECRET` - Authentication token for Worker API
  - `WORKER_PORT` - Port for worker server (default: 3001)

- **Amenity + browser**
  - `AMENITY_URL` – allows overriding the amenity URL
  - `HEADLESS_MODE` – set to `'true'` for headless

- **Runtime flags**
  - `NODE_ENV` – affects cloud/production behavior (CloudChrome paths, longer timeouts, aggressive fallbacks)
  - `GITHUB_ACTIONS` – toggles CI-specific timeouts, header tweaks, and table-loading strategies

When you add new behavior, **honor these flags** instead of adding ad-hoc reads of `process.env`.

## How Coding Agents Should Work Here

- **Prefer editing existing services**:
  - Availability changes → `ReservationChecker`
  - Booking mechanics → `BookingService`
  - Database operations → `supabaseClient`
  - API endpoints → `worker-server` or Next.js API routes

- **Don't create parallel stacks**:
  - Do **not** add another HTTP server; extend `worker-server.ts` or Next.js API routes
  - Do **not** bypass `config.getUser()` for anything user-specific
  - Do **not** add direct database queries; use `supabaseClient` helpers

- **Be cautious with browser behavior**:
  - The system is heavily tuned for flaky CI/cloud environments (resource constraints, EAGAIN, protocol errors)
  - When changing selectors or navigation:
    - Keep existing fallbacks
    - Avoid tightening timeouts without strong reason
    - Prefer adding robust logging over removing it

- **Testing / debugging pattern**:
  - Local one-off availability: `pnpm check`
  - Worker API: `pnpm run worker` then test endpoints
  - Frontend: `cd web && pnpm dev`

## Non-goals / Things to Avoid

- Do **not** introduce email sending; the amenity site sends confirmations
- Do **not** remove cloud/CI hacks in `ReservationChecker` and `CloudChrome` without supplying an equivalent or better robustness strategy
- Do **not** hardcode credentials or URLs; always use env + `src/config.ts`
- Do **not** assume GitHub Actions is the only scheduler; manual triggers via web UI are first-class
