## Purpose

This file is the **source of truth for Cursor / coding agents** working in this repository. It summarizes the real flows, where to make changes, and guardrails to keep the system stable.

If you are an AI editing this codebase, **read this once before making non-trivial changes**.

## What this system does (today)

- Checks court availability on the amenity site for the next 7 days using browser automation
- Stores availability snapshots in Supabase database
- Provides a web UI (Next.js) for viewing availability and triggering bookings
- Automates bookings through browser automation when requested via the web interface
- Runs scheduled availability checks 4 times daily via GitHub Actions

## Where the real logic lives

When asked to "update logic" or "fix behavior", prefer these files:

- **Availability checking**
  - `src/services/reservationChecker.ts`
    - Browser automation, login, table scraping, pagination, time-slot generation
    - Uses `PlaywrightBrowser` and `CloudChrome` for CI/cloud robustness
    - Has aggressive logging and multiple fallback strategies — **don't delete these lightly**
    - Returns structured data (no email sending)

- **Booking automation**
  - `src/services/bookingService.ts`
    - Chrome/Playwright-backed automation against the amenity booking UI (date picker, time dropdowns, submit, confirmation detection)

- **Database operations**
  - `src/utils/supabaseClient.ts`
    - All Supabase interactions
    - Functions: `saveAvailabilitySnapshot`, `getLatestSnapshot`, `getRecentSnapshots`

- **Worker API**
  - `src/api/worker-server.ts`
    - Express app that exposes:
      - `POST /api/check-availability` – Run availability check
      - `POST /api/book` – Execute booking
      - `GET /health` – Health check
    - Runs on DigitalOcean droplet for stable Puppeteer operations

- **Configuration**
  - `src/config.ts`
    - Parses env vars into structured `users` + `getUser(id)`
    - Exposes amenity URL, scheduling pattern, etc.
    - **All new env-driven behavior should go through here.**

- **Frontend**
  - `web/app/page.js` – Main UI page
  - `web/app/api/` – Next.js serverless API routes

## How to run things locally

Use these commands (from `package.json`):

```bash
# Install deps
pnpm install

# One-off availability check for default user
pnpm check              # -> node src/scripts/check-now.js

# Start worker API server (for Puppeteer operations)
pnpm run worker         # -> node src/api/worker-server.js
```

For the frontend:

```bash
cd web
pnpm install
pnpm dev
```

The GitHub Actions workflow (`.github/workflows/court-checker.yml`) automatically runs availability checks 4 times daily.

## Environment & configuration expectations

Configuration is centralized in `src/config.ts`. Important environment vars:

- **Users**
  - Multi-user (preferred):
    - `USER1_EMAIL`, `USER1_PASSWORD`
    - `USER2_EMAIL`, ...
  - Legacy single user:
    - `EMAIL`, `PASSWORD`

- **Supabase**
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

- **Worker API**
  - `WORKER_SECRET` – Authentication token
  - `WORKER_PORT` – Server port (default: 3001)

- **Amenity site & browser**
  - `AMENITY_URL`
  - `HEADLESS_MODE`

- **Runtime flags**
  - `NODE_ENV` – production vs dev; toggles CloudChrome behavior and timeouts
  - `GITHUB_ACTIONS` – CI-specific timeouts and loading hacks

When adding new knobs, expose them via `src/config.ts` and document them here or in `SYSTEM_ARCHITECTURE.md`.

## Guardrails for agents

- **Reuse existing abstractions**
  - Availability → modify `ReservationChecker`
  - Booking behavior → `BookingService`
  - Database operations → `supabaseClient`
  - API endpoints → `worker-server` or Next.js API routes

- **Avoid introducing parallel stacks**
  - Don't add another HTTP server; extend the existing Express app or Next.js API routes
  - Don't bypass `supabaseClient` to talk directly to Supabase
  - Don't reimplement user parsing; use `config.users` / `config.getUser`

- **Be careful with browser stability hacks**
  - Timeouts, retries, and alternative selectors are tuned to survive CI / low-resource VPS environments
  - If you must simplify, replace them with equally robust logic, not bare-bones `page.goto` + single selector

- **Deployment assumptions**
  - Worker API is expected to run on a **long-lived host** (e.g. DigitalOcean droplet)
  - GitHub Actions runs scheduled availability checks
  - Next.js frontend can be deployed to Vercel or Cloudflare Workers

## How to explain this project (for agent answers)

When summarizing for the user:

- Emphasize: **two main flows** – availability checking (GitHub Actions → Supabase) and booking (Web UI → Worker API → Browser automation)
- Call out: **Playwright/CloudChrome** for browser automation, **Supabase** for data persistence, **Next.js** for web UI
- Mention: **multi-user support** and scheduled checks via GitHub Actions
