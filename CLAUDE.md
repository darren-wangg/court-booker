## Purpose

This file tells coding agents (Claude, Cursor, etc.) how to work effectively in this repo and what the **current, real** system architecture looks like.

Keep responses **concrete and action-oriented**: prefer editing existing services/scripts over inventing new entry points.

## High-level System Overview

This is an automated amenity reservation system that:

- **Checks availability** for the next 7 days using **Playwright/Puppeteer** against the Avalon amenity site.
- **Sends HTML availability emails** via a unified `EmailService` that currently uses **Resend** (not raw Gmail SMTP in most flows).
- **Processes booking + “check now” requests** sent to a Gmail inbox using the **Gmail API**, **push notifications → webhook**, and a **polling script** as backup.

Two major flows:

- **Availability flow**: scripts + API route → `ReservationChecker` → amenity site (browser automation) → availability results → email report.
- **Email flow**: Gmail inbox → `EmailParser` → `EmailBookingHandler` → `BookingService` or manual availability check → email confirmations/reports.

## Current Tooling & Runtime Stack

- **Node** with **pnpm**.
- **Playwright** (`src/utils/playwrightBrowser.js`) as the primary browser driver, with **Puppeteer** + **CloudChrome** as compatibility layers depending on environment.
- **Resend** for sending most emails (`src/services/resendEmailService.js` via `src/services/emailService.js`).
- **Gmail API** (`googleapis`) for:
  - Reading emails and parsing booking / “check availability” requests.
  - Gmail push notifications → Google Pub/Sub topic → HTTP webhook.
- **Express** webhook server (`src/webhook/gmailWebhook.js`) for real-time Gmail push handling + manual REST endpoints.
- Optional / legacy pieces that still exist:
  - **Gmail SMTP** (`src/services/gmailSmtpService.js`) – used where SMTP credentials are required, but new work should favor the unified `EmailService` interface.
  - GitHub Actions scheduler (see `.github/workflows` if present) – may trigger availability checks via `check-now.js` or the API route.

## Core Services & Where to Hook Changes

When modifying behavior, prefer adjusting these existing services:

- **`src/services/reservationChecker.js`**
  - Heart of the availability flow.
  - Uses `PlaywrightBrowser`, `CloudChrome`, and multiple selector strategies to:
    - Login → load tables (with aggressive CI + cloud hacks).
    - Click “show more” repeatedly and dedupe results across pages.
    - Generate canonical time slots (10AM–10PM) and compute available vs booked.
  - Sends email reports via `EmailService` (which wraps Resend) when `config.sendEmail` and SMTP-like config allow.

- **`src/services/bookingService.js`**
  - Handles **actual bookings** against the amenity site.
  - Does: browser init → login → datepicker interaction → time dropdown selection → submit + success detection.
  - Called by `EmailBookingHandler` per-user.

- **`src/emailParser.js`**
  - Talks to Gmail API; parses inbox messages into:
    - **Manual triggers** (“check”, “check availability”, etc.) → run an on-demand availability check + email.
    - **Booking requests** (either direct “book …” or replies to availability emails) → structured `{ date, time }`.
  - Tracks `processedEmails` to avoid double-processing.
  - Infers which **configured user** an email belongs to from `from` + notification email addresses.

- **`src/emailBookingHandler.js`**
  - Orchestrator for all email-driven actions.
  - On each run:
    - Uses `EmailParser.checkForBookingRequests()` to pull **manual triggers + booking requests**.
    - For manual triggers: runs an **inline availability check** via `ReservationChecker` and emails results (with cooldown).
    - For booking requests: instantiates `BookingService` per user and executes `bookTimeSlot`.
  - This is your main entry point for “change how email-triggered behavior works”.

- **`src/services/emailService.js` + `src/services/resendEmailService.js`**
  - Unified interface for sending email from anywhere in the app.
  - Today, this is backed by **Resend**, with optional `SMTP_BYPASS` mode for dry-run logging.
  - Any new email flows should go through here instead of talking directly to Nodemailer or external APIs.

- **`src/services/gmailPushService.js`**
  - Encapsulates Gmail `users.watch`, `stop`, and watch refresh logic.
  - Called by:
    - `src/scripts/setup-gmail-push.js`
    - `src/scripts/renew-gmail-push.js`

- **`src/webhook/gmailWebhook.js`**
  - **Express server** that handles:
    - `/gmail/webhook` – Gmail push notifications → `EmailBookingHandler.checkAndProcessBookings()`.
    - `/gmail/check-bookings` `/gmail/poll` `/gmail/process-emails` – manual HTTP triggers to run email processing.
    - `/gmail/check-availability` – HTTP endpoint to run an availability check + optional email for a specific user.
    - `/gmail/test-smtp` – diagnostics for email transport.
    - `/health` – health and heartbeat information.
  - It enforces a 5-minute cooldown between availability checks to avoid spam.

- **`src/config.js`**
  - Central config: parses **multi-user** envs (USER1_EMAIL, USER2_EMAIL, …) with a legacy single-user fallback.
  - Exposes:
    - `users`, `getUser(id)`
    - `amenityUrl`, scheduling pattern, headless mode
    - Gmail client/refresh tokens, push topic/project, webhook URL
    - Generic email flags: `notificationEmail`, `sendEmail`.

## Entry Points & How to Run Things

Use **these** entry points instead of creating new CLIs:

- **CLI scripts** (see `package.json`):
  - `pnpm start` → `node src/scripts/start-webhook.js`
    - Starts the Express webhook server on `PORT` (default 3000).
  - `pnpm check` → `node src/scripts/check-now.js [userId?]`
    - Runs a one-off availability check for a particular user (or default user).
  - `pnpm book` → `node src/scripts/check-bookings.js`
    - Runs the email booking handler once over the inbox.
  - `pnpm run setup-gmail` → `node src/scripts/setup-gmail-auth.js`
    - Interactive OAuth flow to obtain a refresh token.
  - `pnpm run setup-push` → `node src/scripts/setup-gmail-push.js`
  - `pnpm run renew-push` → `node src/scripts/renew-gmail-push.js`
  - `pnpm run debug-webhook` → `node src/scripts/debug-gmail-webhook.js`
  - `pnpm run test-check-email` → `node src/scripts/test-check-email.js` (see file for behavior).

- **API route**:
  - `api/check-availability.js` (e.g. Vercel-style serverless function)
    - Accepts `POST` and runs `ReservationChecker.checkAvailability()`.
    - Handles common Chrome resource errors by returning a 503 with `fallbackMode: true`.

- **Webhook HTTP endpoints** (when webhook server is running):
  - `POST /gmail/webhook` – Gmail push target.
  - `POST /gmail/check-bookings` – manual run of booking handler.
  - `POST /gmail/check-availability` – manual availability check for a specific user.
  - `POST /gmail/poll` or `/gmail/process-emails` – polling-style backup if push fails.

## Environment & Secrets (current behavior)

Environment is centralized via `src/config.js` (plus `.env`/deployment secrets). Key pieces:

- **User credentials**
  - Single-user legacy:
    - `EMAIL`, `PASSWORD`, `NOTIFICATION_EMAIL`
  - Multi-user:
    - `USER1_EMAIL`, `USER1_PASSWORD`, `USER1_NOTIFICATION_EMAIL`
    - `USER2_EMAIL`, ...

- **Amenity + browser**
  - `AMENITY_URL` – allows overriding the Avalon amenity URL.
  - `HEADLESS_MODE` – set to `'true'` for headless.

- **Email sending**
  - **Resend**:
    - `RESEND_API_KEY` (required for Resend to work).
    - `RESEND_FROM_EMAIL` (optional nicer “from” address).
  - **Legacy Gmail SMTP** (still referenced by some checks, but new flows should not depend on this directly):
    - `GMAIL_SMTP_USER`, `GMAIL_SMTP_PASSWORD`.
  - Control flag:
    - `SEND_EMAIL` – `'true'`/`'false'` (default: emails **enabled**).
    - `SMTP_BYPASS` – when `'true'`, `EmailService` logs instead of sending.

- **Gmail API + push**
  - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_REDIRECT_URI`.
  - `GMAIL_PROJECT_ID`, `GMAIL_TOPIC_NAME`, `WEBHOOK_URL` – for Gmail → Pub/Sub → webhook wiring.

- **Runtime flags**
  - `NODE_ENV` – affects cloud/production behavior (CloudChrome paths, longer timeouts, aggressive fallbacks).
  - `GITHUB_ACTIONS` – toggles CI-specific timeouts, header tweaks, and table-loading strategies.

When you add new behavior, **honor these flags** instead of adding ad-hoc reads of `process.env`.

## How Coding Agents Should Work Here

- **Prefer editing existing services**:
  - Availability changes → `ReservationChecker`.
  - Booking mechanics → `BookingService`.
  - Email content/behavior → `EmailService` + templates in `src/email-templates`.
  - Gmail logic → `EmailParser`, `GmailPushService`, or `GmailWebhook`.

- **Don’t create parallel stacks**:
  - Do **not** add another HTTP server; extend `gmailWebhook.js`.
  - Do **not** directly use `nodemailer` or `resend` from random files; go through `EmailService`.
  - Do **not** bypass `config.getUser()` for anything user-specific.

- **Be cautious with browser behavior**:
  - The system is heavily tuned for flaky CI/cloud environments (resource constraints, EAGAIN, protocol errors).
  - When changing selectors or navigation:
    - Keep existing fallbacks.
    - Avoid tightening timeouts without strong reason.
    - Prefer adding robust logging over removing it.

- **Testing / debugging pattern**:
  - Local one-off availability: `pnpm check`.
  - Local booking handler pass: `pnpm book`.
  - Webhook + push integration:
    - Run `pnpm start` (webhook server).
    - Run `pnpm run setup-push` or `pnpm run renew-push`.
    - Send “Check” or booking emails and watch logs / `/health`.

## Non-goals / Things to Avoid

- Do **not** introduce a database unless explicitly requested; everything is stateless right now.
- Do **not** remove cloud/CI hacks in `ReservationChecker` and `CloudChrome` without supplying an equivalent or better robustness strategy.
- Do **not** hardcode credentials or URLs; always use env + `src/config.js`.
- Do **not** assume GitHub Actions is the only scheduler; webhook + manual triggers are first-class.
