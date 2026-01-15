## Court Booker

An automated system that checks amenity court availability and enables bookings through a modern web interface.

### Features

- **Automated Availability Checking**: Runs 4 times daily via GitHub Actions to check court availability for the next 7 days
- **Web Dashboard**: Modern Next.js frontend to view availability and trigger bookings
- **Automated Booking**: Browser automation to book available time slots
- **Data Storage**: Supabase database to store availability snapshots and history

---

## System Architecture

### Data Flow

1. **GitHub Actions** (scheduled 4x daily) → Runs `check-now.js` script
2. **Availability Check** → Scrapes amenity website using Playwright/Puppeteer
3. **Data Storage** → Saves results to Supabase `availability_snapshots` table
4. **Web Frontend** → Next.js app fetches latest data from Supabase
5. **Booking** → User triggers booking via web UI → Worker API → Browser automation

### Components

- **Backend Scripts**: Node.js scripts for availability checking (`src/scripts/check-now.js`)
- **Worker API**: Express server on DigitalOcean droplet for Puppeteer operations (`src/api/worker-server.js`)
- **Frontend**: Next.js app with serverless functions (`web/`)
- **Database**: Supabase PostgreSQL for availability snapshots

---

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Browser Automation**: Playwright (primary), Puppeteer (fallback)
- **Frontend**: Next.js, React, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: 
  - GitHub Actions for scheduled checks
  - Vercel/Cloudflare Workers for frontend
  - DigitalOcean droplet for worker API

---

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# User credentials (multi-user support)
USER1_EMAIL=your-amenity-email@example.com
USER1_PASSWORD=your-amenity-password
# USER2_EMAIL, USER2_PASSWORD, etc. for additional users

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker API (for DigitalOcean droplet)
WORKER_SECRET=your-secret-token
WORKER_PORT=3001

# Optional
AMENITY_URL=https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=...
HEADLESS_MODE=true
```

### 3. Database Setup

Run the SQL schema in `supabase-schema.sql` to create the `availability_snapshots` table.

### 4. GitHub Actions

Configure repository secrets with your environment variables, and the workflow will automatically run availability checks 4 times daily.

### 5. Worker API (DigitalOcean Droplet)

Deploy the worker server to handle Puppeteer operations:

```bash
pnpm run worker
```

This starts the Express server that the Next.js serverless functions will call.

### 6. Frontend (Next.js)

Navigate to the `web/` directory and follow the setup instructions in `web/README.md`.

---

## Usage

### Local Availability Check

```bash
pnpm check
# or for a specific user:
node src/scripts/check-now.js 2
```

### Start Worker API

```bash
pnpm run worker
```

### Frontend Development

```bash
cd web
pnpm install
pnpm dev
```

---

## Project Structure

```
court-booker/
├── src/
│   ├── api/
│   │   └── worker-server.ts      # Express API for Puppeteer operations
│   ├── scripts/
│   │   └── check-now.ts           # Availability check script
│   ├── services/
│   │   ├── reservationChecker.ts # Core availability checking logic
│   │   └── bookingService.ts     # Booking automation
│   ├── utils/
│   │   ├── cloudChrome.ts        # Cloud-optimized Chrome config
│   │   ├── playwrightBrowser.ts  # Playwright browser wrapper
│   │   └── supabaseClient.ts     # Supabase client helper
│   └── config.ts                  # Configuration management
├── web/                           # Next.js frontend
│   ├── app/                      # Next.js app directory
│   │   ├── api/                  # Serverless API routes
│   │   └── page.js               # Main page
│   └── ...
├── .github/
│   └── workflows/
│       └── court-checker.yml      # Scheduled availability checks
└── supabase-schema.sql           # Database schema
```

---

## Troubleshooting

- **Availability check fails**: Verify credentials and amenity URL in `.env`
- **Supabase connection issues**: Check `SUPABASE_URL` and key variables
- **Worker API not responding**: Ensure the server is running on the droplet and `WORKER_SECRET` matches
- **Browser automation errors**: Check resource constraints on the droplet; may need to adjust Chrome launch options

For detailed architecture information, see `SYSTEM_ARCHITECTURE.md`.
