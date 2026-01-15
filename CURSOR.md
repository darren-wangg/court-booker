## Purpose

This file is the **source of truth for Cursor / coding agents** working in this repository. It summarizes the real flows, where to make changes, and guardrails to keep the system stable.

If you are an AI editing this codebase, **read this once before making non-trivial changes**.

## What this system does (today)

- Checks court availability on the Avalon amenity site for the next 7 days.
- Sends HTML availability reports via a unified email service that uses **Resend**.
- Listens to a Gmail inbox for:
  - **“Check availability” / “check” emails** → runs an on-demand availability check and emails results.
  - **Booking requests** (either replies to availability emails or direct “book …” messages) → runs automated bookings.
- Supports **multiple users** via `USER1_EMAIL`, `USER2_EMAIL`, etc., with per-user credentials + notification emails.
- Operates via:
  - Scripts (`pnpm check`, `pnpm book`, etc.).
  - An Express webhook server.
  - An API route `api/check-availability.js`.

## Where the real logic lives

When asked to “update logic” or “fix behavior”, prefer these files:

- **Availability checking**
  - `src/services/reservationChecker.js`
    - Browser automation, login, table scraping, pagination, time-slot generation, email reporting.
    - Uses `PlaywrightBrowser` and `CloudChrome` for CI/cloud robustness.
    - Has aggressive logging and multiple fallback strategies — **don’t delete these lightly**.

- **Email sending**
  - `src/services/emailService.js`
    - Single entry point for sending emails from anywhere.
    - Wraps `src/services/resendEmailService.js` (Resend API).
    - Honors `SMTP_BYPASS` (log only) and handles most error logging.
  - `src/services/gmailSmtpService.js` exists but is more legacy; prefer `EmailService` for new flows.

- **Gmail + email parsing**
  - `src/emailParser.js`
    - Connects to Gmail API using credentials in `src/config.js`.
    - Parses:
      - Manual “check availability” triggers.
      - Direct booking requests.
      - Replies to availability emails.
    - Produces structured `{ bookingRequests, manualTriggers }` objects.

- **Email-orchestrated behavior**
  - `src/emailBookingHandler.js`
    - Orchestrates everything triggered by Gmail:
      - Manual triggers → run `ReservationChecker` inline → send availability email.
      - Booking requests → `BookingService.bookTimeSlot`.
    - Implements **cooldowns** so availability checks are not spammed.

- **Booking automation**
  - `src/services/bookingService.js`
    - Chrome/Playwright-backed automation against the amenity booking UI (date picker, time dropdowns, submit, confirmation detection).

- **Webhook server**
  - `src/webhook/gmailWebhook.js`
    - Express app that exposes:
      - `POST /gmail/webhook` – Gmail push notifications entrypoint.
      - `POST /gmail/check-bookings`, `/gmail/poll`, `/gmail/process-emails` – manual email-processing triggers.
      - `POST /gmail/check-availability` – HTTP-triggered availability check + email.
      - `GET /health` – health/status.

- **Configuration**
  - `src/config.js`
    - Parses env vars into structured `users` + `getUser(id)`.
    - Exposes amenity URL, Gmail credentials, webhook URL, scheduling pattern, etc.
    - **All new env-driven behavior should go through here.**

## How to run things locally

Use these commands (from `package.json`):

```bash
# Install deps
pnpm install

# Start the webhook server (Express)
pnpm start              # -> node src/scripts/start-webhook.js

# One-off availability check for default user
pnpm check              # -> node src/scripts/check-now.js

# Process inbox booking + manual trigger emails once
pnpm book               # -> node src/scripts/check-bookings.js

# Gmail API & push setup
pnpm run setup-gmail    # interactive OAuth to get refresh token
pnpm run setup-push     # setup Gmail push → webhook
pnpm run renew-push     # force renew the watch

# Debug helpers
pnpm run debug-webhook
pnpm run test-check-email
```

The `api/check-availability.js` route is a serverless-style handler; on platforms like Vercel, it runs the same `ReservationChecker` flow when hit via HTTP POST.

## Environment & configuration expectations

Configuration is centralized in `src/config.js`. Important environment vars:

- **Users**
  - Legacy single user:
    - `EMAIL`, `PASSWORD`, `NOTIFICATION_EMAIL`
  - Multi-user (preferred):
    - `USER1_EMAIL`, `USER1_PASSWORD`, `USER1_NOTIFICATION_EMAIL`
    - `USER2_EMAIL`, ...

- **Amenity site & browser**
  - `AMENITY_URL`
  - `HEADLESS_MODE`

- **Email sending**
  - `RESEND_API_KEY` (required for Resend).
  - `RESEND_FROM_EMAIL` (optional).
  - `SEND_EMAIL` (`true`/`false`, default `true`).
  - `SMTP_BYPASS` (when `true`, just log emails instead of sending).

- **Gmail API / push**
  - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_REDIRECT_URI`
  - `GMAIL_PROJECT_ID`, `GMAIL_TOPIC_NAME`, `WEBHOOK_URL`

- **Runtime flags**
  - `NODE_ENV` – production vs dev; toggles CloudChrome behavior and timeouts.
  - `GITHUB_ACTIONS` – CI-specific timeouts and loading hacks.

When adding new knobs, expose them via `src/config.js` and document them here or in `SYSTEM_ARCHITECTURE.md`.

## Guardrails for agents

- **Reuse existing abstractions**
  - Availability → modify `ReservationChecker` and email templates.
  - Booking behavior → `BookingService`.
  - Email transport → `EmailService` + templates.
  - Gmail integration → `EmailParser`, `GmailPushService`, `GmailWebhook`.

- **Avoid introducing parallel stacks**
  - Don’t add another HTTP server; extend the existing Express app.
  - Don’t bypass `EmailService` to talk directly to Nodemailer/Resend.
  - Don’t reimplement user parsing; use `config.users` / `config.getUser`.

- **Be careful with browser stability hacks**
  - Timeouts, retries, and alternative selectors are tuned to survive CI / low-resource VPS environments.
  - If you must simplify, replace them with equally robust logic, not bare-bones `page.goto` + single selector.

- **Deployment assumptions**
  - Webhook server is expected to run on a **long-lived host** (e.g. DigitalOcean droplet).
  - Gmail push notifications drive real-time behavior; polling exists as a backup.
  - GitHub Actions may still be used for scheduled checks; treat it as one of several schedulers.

## How to explain this project (for agent answers)

When summarizing for the user:

- Emphasize: **two main flows** – availability checking and email-driven automation.
- Call out: **Resend-based email stack**, **Playwright/CloudChrome** for browser automation, **Gmail push + webhook** for real-time events.
- Mention: **multi-user support** and manual “check now” via simple emails or HTTP calls.

