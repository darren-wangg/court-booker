# Court Booker

Automated amenity reservation system for checking and booking court availability.

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Supabase account
- Browserless.io account (optional, for cloud browser)

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
Then open http://localhost:3000

### Project Structure

```
court-booker/
├── packages/shared/          # Shared services and utilities
│   ├── services/            # Core business logic
│   │   ├── reservationChecker.ts  # Chrome automation for checking availability
│   │   └── bookingService.ts      # Booking automation
│   ├── utils/               # Utilities (Supabase, browser helpers)
│   └── config.ts            # Configuration and environment variables
├── web/                     # Next.js web application
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   └── page.tsx        # Main UI
│   └── lib/                # Web-specific utilities
├── scripts/                 # CLI scripts
│   └── check-now.ts        # One-off availability check
└── docs/                    # Documentation
    ├── CURSOR.md           # AI agent guidelines
    ├── CLAUDE.md           # System architecture notes
    └── SYSTEM_ARCHITECTURE.md  # Detailed architecture
```

### Documentation

See the `docs/` folder for detailed documentation:
- **SYSTEM_ARCHITECTURE.md** - Complete technical overview
- **CURSOR.md** - Development guidelines
- **CLAUDE.md** - System notes and architecture

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
- Verify Supabase credentials in `.env.local`
- Check browser console for errors
- Ensure data exists in Supabase
