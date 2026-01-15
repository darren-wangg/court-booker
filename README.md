## Court Booker

An automated system that:

- Checks amenity court availability for the next 7 days using **Playwright/Puppeteer**.
- Sends HTML availability reports via a unified email service (currently backed by **Resend**).
- Listens to a **Gmail inbox** for:
  - “Check availability” style emails (manual triggers).
  - Natural-language **booking requests** (direct or as replies to availability emails).
- Automates booking through the amenity website using browser automation.

The system can be driven by:

- **CLI scripts** (`pnpm check`, `pnpm book`, etc.).
- An **Express webhook server** (for Gmail push notifications + manual HTTP triggers).
- An **API route** (`api/check-availability.js`) suitable for serverless platforms.

---

## System Overview

### Phase 1: Availability Checking 🔍

- **Triggers**
  - One-off via CLI: `pnpm check` (`src/scripts/check-now.js`).
  - HTTP via API route: `POST api/check-availability.js`.
  - Optionally via GitHub Actions (if configured) calling the script or API.

- **What happens**
  - Browser automation (via `ReservationChecker` and `PlaywrightBrowser` / `CloudChrome`) logs in to the amenity site.
  - Robust table parsing and pagination (with CI/cloud-specific fallbacks) pulls reservation rows.
  - Time slot analysis computes availability from **10 AM–10 PM** for the next **7 days**.
  - An HTML availability report is generated (via `src/email-templates/availabilities.js`).
  - If email sending is enabled, the report is delivered via `EmailService` (Resend-backed) to user-specific notification emails.

### Phase 2: Email Booking & Manual Triggers 📧

- **Gmail integration**
  - Gmail API (OAuth2 + refresh token) reads from the configured inbox.
  - **Push notifications**:
    - Gmail → Pub/Sub topic → your `WEBHOOK_URL` → Express webhook (`/gmail/webhook`).
    - Managed by `src/services/gmailPushService.js` and scripts:
      - `src/scripts/setup-gmail-push.js`
      - `src/scripts/renew-gmail-push.js`
  - **Polling backup**:
    - `src/scripts/poll-emails.js` and webhook endpoints (`/gmail/poll`, `/gmail/process-emails`) can be used when push is unavailable.

- **Email flows**
  - `src/emailParser.js`:
    - Detects:
      - Manual “check now” messages (“check”, “check availability”, etc.).
      - Direct booking requests (emails containing “book” + date/time text).
      - Replies to availability emails (subject contains `Re: ... Avalon Court Availability`).
    - Parses:
      - Dates like “Sunday September 7, 2025”, “9/7/2025”, “2025-09-07”.
      - Times like “5 - 6 PM”, “5:00 - 6:00 PM”, “17:00 - 18:00”.
    - Returns `{ bookingRequests, manualTriggers }` per inbox scan.

  - `src/emailBookingHandler.js`:
    - For **manual triggers**:
      - Applies a cooldown (5 minutes) to avoid repeated expensive checks.
      - Runs `ReservationChecker` inline for the identified user.
      - Sends an availability report email back to that user.
    - For **booking requests**:
      - Creates a `BookingService` instance for the relevant user.
      - Automates login → datepicker selection → time dropdowns → submit.
      - Sends success/error notifications via `EmailService`.

  - `src/webhook/gmailWebhook.js` (Express):
    - `POST /gmail/webhook`: Gmail push entrypoint → runs `EmailBookingHandler.checkAndProcessBookings()`.
    - `POST /gmail/check-bookings`, `/gmail/poll`, `/gmail/process-emails`: HTTP triggers for email processing (useful for cron, debugging, or fallback).
    - `POST /gmail/check-availability`: manually trigger an availability check for a specific user via HTTP.
    - `GET /health`: basic health and runtime info.

---

## Tech Stack & Key Tools

- **Runtime**
  - Node.js, `pnpm` for package management.

- **Browser automation**
  - `playwright` via `src/utils/playwrightBrowser.js` (primary).
  - `puppeteer` and `src/utils/cloudChrome.js` for compatibility in constrained/cloud environments.

- **Email**
  - `resend` via `src/services/resendEmailService.js` (current primary sender).
  - `src/services/emailService.js` is the **single abstraction** all code should call to send email.
  - `src/services/gmailSmtpService.js` remains for legacy Gmail SMTP flows (used when Gmail SMTP env vars are provided).

- **Gmail & Push**
  - `googleapis` for Gmail API and push notifications.
  - `src/services/gmailPushService.js` for watch setup/refresh/stop.

- **Web Server**
  - `express` in `src/webhook/gmailWebhook.js` for webhook + manual HTTP endpoints.

---

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Create your `.env`**

   Use `src/.env.template` as a guide (see that file for the full list). Core variables:

   ```env
   # Primary user (legacy single-user config)
   EMAIL=your-amenity-email@example.com
   PASSWORD=your-amenity-password
   NOTIFICATION_EMAIL=where-to-send-reports@example.com

   # Optional multi-user format
   USER1_EMAIL=your-amenity-email@example.com
   USER1_PASSWORD=your-amenity-password
   USER1_NOTIFICATION_EMAIL=where-to-send-reports@example.com
   # USER2_EMAIL, USER2_PASSWORD, etc...

   # Resend (recommended email provider)
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL="Court Booker <no-reply@example.com>"

   # Gmail API for reading inbox (booking + “check” emails)
   GMAIL_CLIENT_ID=your_gmail_client_id
   GMAIL_CLIENT_SECRET=your_gmail_client_secret
   GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
   GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

   # Gmail Push Notifications → Pub/Sub → Webhook
   GMAIL_PROJECT_ID=your_google_cloud_project_id
   GMAIL_TOPIC_NAME=court-booker-notifications
   WEBHOOK_URL=https://your-domain.com/gmail/webhook

   # Optional overrides
   AMENITY_URL=https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf
   HEADLESS_MODE=true
   SEND_EMAIL=true
   SMTP_BYPASS=false
   ```

   For detailed Gmail push setup and deployment instructions, see `src/setup/GMAIL_PUSH_SETUP.md` and `src/setup/RAILWAY_DEPLOYMENT.md`.

3. **Set up Gmail API (OAuth)**

   ```bash
   pnpm run setup-gmail
   ```

   This will guide you through creating credentials and output `GMAIL_REFRESH_TOKEN` + the other required env values.

4. **Set up Gmail Push Notifications**

   ```bash
   # Configure Pub/Sub topic + webhook
   pnpm run setup-push

   # Later, to force renew the watch:
   pnpm run renew-push
   ```

5. **Start the webhook server (for real-time processing)**

   ```bash
   pnpm start
   # -> node src/scripts/start-webhook.js
   ```

6. **Optional: GitHub Actions**

   If you use GitHub Actions for scheduled checking, configure repository secrets to match your `.env` values (EMAIL/PASSWORD, Gmail credentials, Resend API key, etc.) and have the workflow call either:

   - `pnpm check`, or
   - the deployed API route (`POST /api/check-availability`).

---

## Usage

### Local Commands

- **One-off availability check for default user**

  ```bash
  pnpm check
  # or, for a specific user ID (from config.users):
  node src/scripts/check-now.js 2
  ```

- **Run booking + manual trigger processing once**

  ```bash
  pnpm book
  # -> node src/scripts/check-bookings.js
  ```

- **Poll inbox without push (debug / backup)**

  ```bash
  node src/scripts/poll-emails.js
  ```

### Webhook / HTTP Endpoints

When `pnpm start` is running:

- `GET /health` – check server and process health.
- `POST /gmail/webhook` – Gmail push entrypoint (target of your Pub/Sub push).
- `POST /gmail/check-bookings` – manual run of the booking handler.
- `POST /gmail/check-availability` – manual availability check (optionally per user).
- `POST /gmail/poll` or `/gmail/process-emails` – polling-style email processing.
- `POST /gmail/test-smtp` – test/diagnose email transport.

### API Route (Serverless-style)

- `POST /api/check-availability`
  - Body: none (current implementation ignores request body).
  - Response:
    - `200` with `{ success, totalAvailableSlots, checkedAt }` when successful.
    - `503` with `fallbackMode: true` when Chrome cannot start due to resource constraints.

### Booking via Email

1. Receive an availability email with open time slots.
2. Send a booking request email (either as reply or direct email) such as:

   ```text
   September 7, 2025
   5 - 6 PM
   ```

3. The system:
   - Parses the date/time.
   - Logs into the amenity site and attempts the booking.
   - Sends a confirmation or error email back.

### Manual “Check Now” via Email

- Send an email to the monitored Gmail inbox with a short subject/body like:

  ```text
  Subject: check
  Body: check availability
  ```

- The system:
  - Treats this as a manual trigger.
  - Runs a full availability check (subject to cooldown).
  - Emails the report back to the relevant user.

---

## Troubleshooting

- **Login fails**
  - Verify amenity credentials (`EMAIL`, `PASSWORD` or `USER*_EMAIL`, `USER*_PASSWORD`).
  - Check selector logic in `ReservationChecker.login()` if the site markup has changed.

- **No tables / no availability data**
  - See logs around “reservation table” selectors and CI/cloud loading hacks in `ReservationChecker`.
  - Ensure the amenity URL is correct and not behind additional auth or captchas.

- **Emails not sending**
  - Confirm `RESEND_API_KEY` is valid and `SEND_EMAIL=true`.
  - For SMTP-based flows, verify `GMAIL_SMTP_USER` and `GMAIL_SMTP_PASSWORD`.
  - Check logs from `EmailService` / `ResendEmailService`.

- **Gmail API / push issues**
  - Run `pnpm run debug-webhook` to verify:
    - Gmail API connectivity.
    - Push watch status.
    - Email parser behavior.
    - Webhook health.
  - For invalid_grant / token issues, re-run `pnpm run setup-gmail`.

- **Chrome / Playwright fails to launch (EAGAIN, Resource temporarily unavailable, Target closed)**
  - The system will often fall back and/or report `fallbackMode: true`.
  - On constrained hosts, you may need to:
    - Reduce competing processes.
    - Increase memory/CPU.
    - Rely more on Browserless/cloud Chrome if configured.

---

## Key Source Files (Quick Map)

- **Availability**
  - `src/services/reservationChecker.js` – main availability logic.
  - `src/email-templates/availabilities.js` – availability email HTML.

- **Booking**
  - `src/services/bookingService.js` – booking automation.
  - `src/email-templates/booking.js` – booking confirmation templates (if present).

- **Email + Gmail**
  - `src/services/emailService.js` – unified email abstraction.
  - `src/services/resendEmailService.js` – Resend integration.
  - `src/services/gmailSmtpService.js` – Gmail SMTP integration (legacy/optional).
  - `src/emailParser.js` – Gmail API + booking/manual trigger parsing.
  - `src/emailBookingHandler.js` – orchestrator for email-driven behavior.

- **Webhook & Scripts**
  - `src/webhook/gmailWebhook.js` – Express webhook + debug endpoints.
  - `src/scripts/check-now.js` – one-off availability.
  - `src/scripts/check-bookings.js` – process booking/manual emails.
  - `src/scripts/start-webhook.js` – start webhook server.
  - `src/scripts/setup-gmail-auth.js` – OAuth setup helper.
  - `src/scripts/setup-gmail-push.js`, `src/scripts/renew-gmail-push.js` – push watch management.
  - `src/scripts/debug-gmail-webhook.js` – end-to-end Gmail/webhook diagnostics.

For a deeper architectural description (sequence diagrams, flow breakdowns), see `SYSTEM_ARCHITECTURE.md`.
