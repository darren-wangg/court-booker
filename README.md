# Court Booker

Automated amenity reservation system with availability checking and booking automation - **100% serverless!**

## 🚀 Features

- **Automated Availability Checking**: Runs 4x daily via GitHub Actions to check court availability for the next 7 days
- **Web Dashboard**: Modern Next.js frontend to view availability and trigger bookings
- **Automated Booking**: Browser automation via Browserless.io cloud service
- **Data Storage**: Supabase database to store availability snapshots and history
- **Fully Serverless**: No servers to manage - runs entirely on Vercel + Browserless.io!

---

## 🏗️ System Architecture

### Data Flow

1. **GitHub Actions** (scheduled 4x daily) → Runs `check-now.ts` script
2. **Availability Check** → Connects to Browserless.io cloud browser → Scrapes amenity website
3. **Data Storage** → Saves results to Supabase `availability_snapshots` table
4. **Web Frontend** → Next.js app fetches latest data from Supabase
5. **Booking** → User triggers booking via web UI → Next.js API route → Browserless.io → Amenity website

### Components

- **Backend Scripts**: TypeScript scripts for availability checking (`src/scripts/check-now.ts`)
- **Browser Automation**: Browserless.io cloud browser service (no local Chrome needed!)
- **API Routes**: Next.js serverless functions that call services directly (`web/app/api/`)
- **Frontend**: Next.js app deployed on Vercel (`web/`)
- **Database**: Supabase PostgreSQL for availability snapshots

---

## 💻 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Browser Automation**: Playwright/Puppeteer + **Browserless.io** cloud browser service
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**:
  - **Vercel** - Frontend + API routes (fully serverless)
  - **GitHub Actions** - Scheduled availability checks
  - **Browserless.io** - Cloud browser automation (no local Chrome!)

---

## 🚀 Deployment

**👉 See [DEPLOYMENT_SIMPLE.md](./DEPLOYMENT_SIMPLE.md) for complete deployment instructions!**

Quick overview:

### 1. Supabase Setup
- Create Supabase project
- Run `supabase-schema.sql` to create table
- Get API keys

### 2. Browserless.io Setup
- Sign up at [browserless.io](https://www.browserless.io/)
- Get API token (free tier available!)
- No server or Chrome installation needed!

### 3. GitHub Actions
- Add secrets: `BROWSERLESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, user credentials
- Workflow runs automatically 4x daily

### 4. Vercel Deployment
- Import GitHub repo
- Set root directory to `web`
- Add environment variables (including `BROWSERLESS_TOKEN`)
- Deploy!

**Total time: ~30 minutes**

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- pnpm (or npm)
- Browserless.io account (free tier works!)
- Supabase project

### Setup

1. **Install dependencies**
   ```bash
   pnpm install
   cd web && pnpm install
   ```

2. **Environment variables**

   Create `.env` in root:
   ```env
   # Browserless.io (REQUIRED)
   BROWSERLESS_TOKEN=your-browserless-token

   # User credentials
   USER1_EMAIL=your-amenity-email@example.com
   USER1_PASSWORD=your-amenity-password

   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Optional
   AMENITY_URL=https://www.avalonaccess.com/...
   ```

3. **Test availability check**
   ```bash
   pnpm check
   ```

   You should see:
   ```
   ☁️ Browserless.io token detected - using cloud browser service
   ✅ Connected to Browserless.io cloud browser
   ```

4. **Run frontend**
   ```bash
   cd web
   pnpm dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

---

## 📝 Usage

### Run availability check locally

```bash
pnpm check
# or for a specific user:
pnpm check 2
```

### Frontend development

```bash
cd web
pnpm dev
```

### Build for production

```bash
# Root project
pnpm build

# Web frontend
cd web
pnpm build
```

---

## 📦 Project Structure

```
court-booker/
├── src/
│   ├── scripts/
│   │   └── check-now.ts              # CLI availability check script
│   ├── services/
│   │   ├── reservationChecker.ts    # Core availability checking (with Browserless support)
│   │   └── bookingService.ts        # Booking automation (with Browserless support)
│   ├── utils/
│   │   ├── cloudChrome.ts           # Cloud-optimized Chrome config (fallback)
│   │   ├── playwrightBrowser.ts     # Playwright browser wrapper (Browserless connector)
│   │   └── supabaseClient.ts        # Supabase database operations
│   ├── config.ts                     # Configuration management
│   └── api/
│       └── worker-server.ts          # [DEPRECATED] Old DigitalOcean worker (no longer used)
├── web/                              # Next.js frontend (deployed on Vercel)
│   ├── app/
│   │   ├── api/                     # Serverless API routes
│   │   │   ├── book/route.ts        # Booking endpoint (calls BookingService directly)
│   │   │   └── availability/
│   │   │       ├── latest/route.js  # Fetch latest from Supabase
│   │   │       └── refresh/route.ts # Trigger check (calls ReservationChecker directly)
│   │   ├── page.tsx                 # Main UI
│   │   └── layout.tsx               # Layout
│   └── package.json                 # Web dependencies
├── .github/
│   └── workflows/
│       └── court-checker.yml         # Scheduled availability checks (4x daily)
├── DEPLOYMENT_SIMPLE.md             # 📖 Deployment guide (start here!)
├── MIGRATION_FROM_DIGITALOCEAN.md   # Migration guide from old setup
├── CLAUDE.md                         # Architecture documentation for coding agents
├── supabase-schema.sql              # Database schema
└── package.json                      # Root dependencies
```

---

## 🐛 Troubleshooting

### Availability check fails
- ✅ Verify `BROWSERLESS_TOKEN` is set correctly
- ✅ Check Browserless.io dashboard for usage/errors
- ✅ Verify user credentials are correct
- ✅ Check amenity URL is valid

### Booking fails
- ✅ Check Vercel function logs (Deployments → Functions)
- ✅ Verify all environment variables are set in Vercel
- ✅ Test availability check first to ensure Browserless connection works
- ✅ Check Browserless.io dashboard for session logs

### No data in Supabase
- ✅ Verify GitHub Actions ran successfully (Actions tab)
- ✅ Check workflow logs for errors
- ✅ Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- ✅ Ensure table exists (run `supabase-schema.sql`)

### Browserless.io connection errors
- ✅ Verify token has no extra spaces
- ✅ Check account status (free tier hours remaining?)
- ✅ Try running `pnpm check` locally to debug
- ✅ Check Browserless.io status page

**See [DEPLOYMENT_SIMPLE.md](./DEPLOYMENT_SIMPLE.md#-troubleshooting) for more help.**

---

## 💰 Cost Breakdown

### Free Tier (Testing)
- Supabase: Free (up to 500MB)
- GitHub Actions: Free (2,000 minutes/month)
- **Browserless.io: Free (6 hours/month)** 🎉
- Vercel: Free (Hobby plan)
- **Total: $0/month** ✨

### Production (Light Use)
- Supabase: Free or $25/mo (Pro)
- GitHub Actions: Free
- **Browserless.io: $9/mo (100 hours)** 🚀
- Vercel: Free or $20/mo (Pro)
- **Total: $9-54/month**

**Much simpler and more reliable than self-hosted Chrome!**

---

## 📚 Documentation

- **[DEPLOYMENT_SIMPLE.md](./DEPLOYMENT_SIMPLE.md)** - Complete serverless deployment guide
- **[MIGRATION_FROM_DIGITALOCEAN.md](./MIGRATION_FROM_DIGITALOCEAN.md)** - Migrating from old setup
- **[CLAUDE.md](./CLAUDE.md)** - Architecture and coding guidelines
- **[supabase-schema.sql](./supabase-schema.sql)** - Database schema

---

## 🔄 Migrating from DigitalOcean?

If you previously used the DigitalOcean worker setup:

1. Sign up for Browserless.io
2. Update Vercel env vars (add `BROWSERLESS_TOKEN`, remove `WORKER_URL`)
3. Update GitHub Actions secrets (add `BROWSERLESS_TOKEN`)
4. Pull latest code
5. Destroy DigitalOcean droplet

**See [MIGRATION_FROM_DIGITALOCEAN.md](./MIGRATION_FROM_DIGITALOCEAN.md) for detailed steps.**

---

## ⚠️ Disclaimer

This tool automates interaction with amenity booking websites for personal use only.
- Use responsibly and respect rate limits
- Don't abuse the service
- Respect the amenity provider's terms of service
- Intended for authorized users only

---

## 🎯 What's New (v2.0 - Serverless)

**Major improvements:**
- ✅ **Removed DigitalOcean dependency** - No more server management!
- ✅ **Added Browserless.io** - Cloud browser via WebSocket
- ✅ **Direct service calls** - Next.js API routes call services directly
- ✅ **Simpler deployment** - 3 steps instead of 4
- ✅ **Better error handling** - Improved logging
- ✅ **TypeScript API routes** - Better type safety
- ✅ **Comprehensive docs** - Multiple deployment guides

**Deprecated:**
- ❌ `worker-server.ts` (Express API on DigitalOcean)
- ❌ `WORKER_URL` and `WORKER_SECRET` env vars
- ❌ SSH/PM2 server management

---

Made with ❤️ for automated court booking
