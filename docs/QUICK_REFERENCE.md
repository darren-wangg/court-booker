# Court Booker - Quick Reference Guide

**Last Updated:** January 2026

## 🚀 Quick Commands

```bash
# Install dependencies
pnpm install

# Build shared package
pnpm build

# Run availability check (CLI)
pnpm check

# Run web app locally
cd web && pnpm dev
# Open http://localhost:3001

# Deploy to Vercel (automatic on git push)
git push origin main
```

---

## 📁 File Structure (Key Files Only)

```
court-booker/
├── packages/shared/
│   ├── services/
│   │   ├── reservationChecker.ts    # ⭐ Core availability checking
│   │   └── bookingService.ts        # ⭐ Booking automation
│   ├── utils/
│   │   └── supabaseClient.ts        # Database operations
│   └── config.ts                    # Environment config
│
├── web/
│   ├── app/
│   │   ├── page.tsx                 # ⭐ Main UI (mobile carousel + desktop grid)
│   │   ├── layout.tsx               # ⭐ Metadata + Sonner toasts
│   │   ├── api/
│   │   │   ├── availability/latest/route.ts  # Fetch latest data
│   │   │   ├── availability/refresh/route.ts # Trigger check
│   │   │   └── book/route.ts        # Booking endpoint
│   │   └── queries/useAvailabilities.ts  # React Query hooks
│   └── public/
│       ├── favicon.jpg              # Basketball favicon
│       └── og-image.jpg             # Social sharing image
│
├── scripts/
│   └── check-now.ts                 # CLI availability check
│
├── .github/workflows/
│   └── court-checker.yml            # ⭐ Scheduled checks (9x daily)
│
└── docs/
    ├── CURRENT_FEATURES.md          # ⭐ Feature list
    ├── CURSOR.md                    # AI agent guidelines
    └── SYSTEM_ARCHITECTURE.md       # Technical details
```

---

## 🔑 Environment Variables

### Root `.env` (for CLI & GitHub Actions)
```env
BROWSERLESS_TOKEN=your-browserless-token
USER1_EMAIL=your-amenity-email@example.com
USER1_PASSWORD=your-amenity-password
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### `web/.env.local` (for Next.js)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
BROWSERLESS_TOKEN=your-browserless-token
USER1_EMAIL=your-amenity-email@example.com
USER1_PASSWORD=your-amenity-password
```

---

## 🎯 How It Works

### 1. Automated Checks (GitHub Actions)
```
GitHub Actions (cron) 
  → runs scripts/check-now.ts
  → connects to Browserless.io
  → scrapes amenity website
  → saves to Supabase
```

**Schedule:** 9x daily (8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM, 12 AM PST)
**Days Checked:** Next 7 days

### 2. Web UI
```
User opens web app
  → Next.js fetches from Supabase
  → Displays in mobile carousel OR desktop grid
  → User clicks "Refresh" or "Book"
  → API route triggers action
  → Toast notification shows result
```

### 3. Data Flow
```
Browserless.io → ReservationChecker → Supabase → Next.js API → React UI
```

---

## 📱 UI Behavior

### Mobile (< 768px)
- Shows 2 dates at a time
- Left/right arrows to navigate
- Page indicator (e.g., "1 / 4")
- Vertical stacking within cards

### Desktop (≥ 768px)
- Shows all dates in horizontal grid
- Scrollable time slots per column
- Full header with complete timestamp

### Both
- Fully booked days show ✕ and "No availabilities"
- Toast notifications for all actions
- Basketball animations 🏀

---

## 🔧 Common Tasks

### Add a New User
1. Add to `.env`: `USER2_EMAIL=...` and `USER2_PASSWORD=...`
2. Add to `web/.env.local`
3. Add to GitHub Secrets
4. Add to Vercel environment variables
5. User appears in dropdown automatically

### Update GitHub Actions Schedule
Edit `.github/workflows/court-checker.yml`:
```yaml
schedule:
  - cron: "0 16,18,20,22,0,2,4,6,8 * * *"  # Current: 9x daily
```

**Note:** Consider Browserless.io free tier (1,000 checks/month)
**Current usage:** ~270 automated checks/month

### Change Mobile Carousel Items
Edit `web/app/page.tsx`:
```typescript
const datesPerPage = 2  // Change to 3 or 4
```

### Update Social Media Preview
1. Replace `web/public/og-image.jpg` with new image
2. Update metadata in `web/app/layout.tsx`

---

## 🐛 Troubleshooting

### "No availability data found"
```bash
# 1. Run manual check
pnpm check

# 2. Verify Supabase has data
# Check availability_snapshots table

# 3. Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### GitHub Actions Failing
```bash
# Check these in order:
1. Verify BROWSERLESS_TOKEN in GitHub Secrets
2. Check workflow logs in Actions tab
3. Verify all secrets are set correctly
4. Check Browserless.io dashboard for errors
```

### Browserless.io Connection Issues
```bash
# Test locally first:
pnpm check

# If it works locally but not in GitHub Actions:
# - Check token has no extra spaces
# - Verify account has remaining hours
# - Check Browserless.io status page
```

### Web App Not Showing Data
```bash
# 1. Check browser console for errors
# 2. Verify Supabase credentials in web/.env.local
# 3. Test API endpoint:
curl http://localhost:3001/api/availability/latest?userId=1

# 4. Check React Query DevTools (if installed)
```

---

## 📊 Current Stats

**Browserless.io Usage:**
- Free tier: 1,000 checks/month
- Automated checks: ~270/month (9x daily)
- Available for manual: ~730/month
- **Status:** ✅ Well within limits

**GitHub Actions:**
- Runs: 9x daily
- Schedule: Every 2 hours (8 AM - 12 AM PST)
- Days checked: Next 7 days
- Reliability: High (with Playwright browser install fix)

**Deployment:**
- Web: Vercel (automatic on push)
- Database: Supabase (PostgreSQL)
- Browser: Browserless.io (cloud)

---

## 🎨 Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Notifications:** Sonner (toast library)
- **Data Fetching:** React Query (TanStack Query)
- **Database:** Supabase (PostgreSQL with JSONB)
- **Browser Automation:** Playwright + Browserless.io
- **Deployment:** Vercel (serverless)
- **CI/CD:** GitHub Actions

---

## 📚 Documentation

- **CURRENT_FEATURES.md** - Complete feature list with implementation details
- **CURSOR.md** - AI agent guidelines and guardrails
- **SYSTEM_ARCHITECTURE.md** - Technical architecture diagrams
- **FIXES_SUMMARY.md** - Recent bug fixes and improvements
- **README.md** (root) - Quick start guide

---

## 🚨 Important Notes

1. **Never remove Browserless.io integration** - Required for serverless browser automation
2. **Don't change GitHub Actions schedule** without checking Browserless.io limits
3. **Keep `user_id OR null` logic** in API route - CLI saves with null
4. **Don't remove mobile responsive classes** - Breaks mobile UI
5. **Keep Sonner Toaster in layout.tsx** - Required for notifications

---

## 🎯 System Status: ✅ Fully Functional

All features working as expected:
- ✅ Automated availability checking (6x daily)
- ✅ Mobile-responsive web interface
- ✅ Toast notifications
- ✅ Booking automation
- ✅ Multi-user support
- ✅ Social media metadata
- ✅ GitHub Actions deployment

**Last Major Update:** January 2026 - Added mobile carousel, Sonner toasts, and social metadata
