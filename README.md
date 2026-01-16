# Court Booker ( っ'-')╮ =͟͟͞͞🏀

Automated basketball court reservation system with availability checking, booking automation, and mobile-friendly web interface.

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Supabase account
- Browserless.io account (for cloud browser automation)

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   Create `.env` in the root directory:
   ```env
   # User credentials
   USER1_EMAIL=your-email@example.com
   USER1_PASSWORD=your-password
   
   # Supabase
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   
   # Optional: Browserless.io (for cloud browser)
   BROWSERLESS_TOKEN=your-browserless-token
   ```

3. **Build shared package:**
   ```bash
   pnpm build
   ```

### Usage

**Check availability (CLI):**
```bash
pnpm check
```

**Run web app:**
```bash
cd web
pnpm dev
```
Then open http://localhost:3001

**Features:**
- 📱 Mobile-responsive carousel (2 dates at a time with arrows)
- 🖥️ Desktop grid view (all dates at once)
- 🔔 Toast notifications for actions (using Sonner)
- 🏀 Basketball animations on refresh/booking
- ✕ Shows fully booked days with "No availabilities" message

### Project Structure

```
court-booker/
├── packages/shared/          # Shared services and utilities (monorepo package)
│   ├── services/            # Core business logic
│   │   ├── reservationChecker.ts  # Chrome automation via Browserless.io
│   │   └── bookingService.ts      # Booking automation
│   ├── utils/               # Utilities (Supabase, browser helpers)
│   └── config.ts            # Configuration and environment variables
├── web/                     # Next.js 14 web application
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # Serverless API routes
│   │   │   ├── availability/  # Availability endpoints
│   │   │   ├── book/       # Booking endpoint
│   │   │   └── users/      # User management
│   │   ├── page.tsx        # Main UI (mobile-responsive with carousel)
│   │   └── layout.tsx      # Root layout with metadata & Sonner toasts
│   ├── public/             # Static assets (favicon, og-image)
│   └── lib/                # Web-specific utilities
├── scripts/                 # CLI scripts
│   └── check-now.ts        # One-off availability check
├── docs/                    # Documentation
│   ├── SYSTEM_ARCHITECTURE.md  # Complete technical overview
│   ├── CURSOR.md           # AI agent guidelines
│   └── CLAUDE.md           # System architecture notes
└── .github/workflows/       # GitHub Actions
    └── court-checker.yml   # Scheduled checks (6x daily)
```

### Key Features

**Mobile UI:**
- Carousel navigation (2 dates at a time)
- Left/right arrows to browse dates
- Vertical stacking for easy scrolling
- Fully booked days shown with ✕ symbol

**Desktop UI:**
- Horizontal grid showing all dates
- Scrollable time slots per date
- Fully booked days included in grid

**Notifications:**
- Loading states for refresh/booking
- Success/error toasts with Sonner
- Basketball animations 🏀

### Documentation

See the `docs/` folder for detailed documentation:
- **SYSTEM_ARCHITECTURE.md** - Complete technical overview
- **CURSOR.md** - Development guidelines
- **CLAUDE.md** - System notes and architecture
- **FIXES_SUMMARY.md** - Recent bug fixes and improvements

## Troubleshooting

**"No availability data found":**
- Run `pnpm check` to fetch fresh data
- Check Supabase for data in `availability_snapshots` table
- Verify environment variables are set correctly

**Chrome automation fails:**
- Check Browserless.io token if using cloud browser
- Ensure credentials are correct in `.env`
- Try running locally without Browserless.io

**Web app not showing data:**
- Verify Supabase credentials in `web/.env.local`
- Check browser console for errors
- Ensure data exists in Supabase `availability_snapshots` table
- Hard refresh browser (Cmd+Shift+R) to clear cache

**GitHub Actions failing:**
- Check Browserless.io token is valid
- Verify all secrets are set in GitHub repository settings
- Review workflow logs in Actions tab
- Ensure Playwright browsers install correctly

### Deployment

**Vercel (Web App):**
- Deployed from `web/` directory
- Automatic deployments on push to main
- Environment variables set in Vercel dashboard

**GitHub Actions (Scheduled Checks):**
- Runs every 2 hours (9x daily)
- 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM, 12 AM PST
- ~270 checks/month (27% of Browserless.io free tier)

**Browserless.io Usage:**
- Free tier: 1,000 checks/month
- Current usage: ~270 automated + ~730 for manual refreshes
- Checking: Next 10 days of availability (extended from 7 days)
