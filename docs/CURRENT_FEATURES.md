# Court Booker - Current Features & Implementation

**Last Updated:** January 2026

## 🎯 Overview

Court Booker is a fully functional basketball court reservation system with automated availability checking, booking automation, and a mobile-responsive web interface.

---

## ✅ Implemented Features

### 1. **Automated Availability Checking**

**How it works:**
- GitHub Actions runs every 2 hours (9x daily)
- Connects to Browserless.io cloud browser service
- Scrapes amenity website for next 7 days
- Saves results to Supabase database

**Schedule:**
- 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM, 12 AM PST
- ~270 checks/month (27% of Browserless.io free tier)

**Implementation:**
- `packages/shared/services/reservationChecker.ts` - Core logic
- `.github/workflows/court-checker.yml` - GitHub Actions workflow
- Browserless.io WebSocket connection for cloud browser

---

### 2. **Mobile-Responsive Web Interface**

**Mobile (< 768px):**
- **Carousel navigation** - Shows 2 dates at a time
- **Left/right arrows** - Navigate between date pages
- **Page indicator** - "1 / 4" shows current position
- **Vertical stacking** - Easy scrolling within each date card
- **Compact header** - Abbreviated timestamp, stacked controls

**Desktop (≥ 768px):**
- **Horizontal grid** - All dates visible at once
- **Scrollable columns** - Each date has scrollable time slots
- **Full header** - Complete timestamp and horizontal controls

**Both:**
- **Fully booked days** - Shown with ✕ symbol and "No availabilities" message
- **Basketball emoji** - ( っ'-')╮ =͟͟͞͞🏀 in header
- **Responsive breakpoints** - Tailwind CSS `md:` prefix

**Implementation:**
- `web/app/page.tsx` - Main UI component with carousel state
- Mobile: `grid-cols-2` with carousel pagination
- Desktop: Dynamic grid columns based on date count

---

### 3. **Toast Notifications (Sonner)**

**Refresh Action:**
```
Loading: "Fetching latest availability..."
Success: "Availability updated!"
Error: "Failed to refresh: [error message]"
```

**Booking Action:**
```
Loading: "Booking court..."
Success: "Court booked for [date] at [time]! 🏀"
Error: "Booking failed: [error message]"
```

**Features:**
- Auto-dismiss after a few seconds
- Smooth animations
- Rich colors (green for success, red for error)
- Top-center positioning

**Implementation:**
- `web/app/layout.tsx` - Toaster component
- `web/app/page.tsx` - Toast triggers in handlers
- Library: `sonner` package

---

### 4. **Social Media Metadata**

**Open Graph (Facebook, LinkedIn, etc.):**
- Title: "Court Booker ( っ'-')╮ =͟͟͞͞🏀"
- Description: "Book a reservation and get some buckets."
- Image: Basketball artwork (500x500)
- URL: https://court-booker.vercel.app

**Twitter Card:**
- Summary card with image
- Same title and description
- Basketball image preview

**Favicon:**
- Basketball image in browser tabs
- Apple touch icon for mobile home screens

**Implementation:**
- `web/app/layout.tsx` - Metadata export
- `web/public/favicon.jpg` - Favicon
- `web/public/og-image.jpg` - Social sharing image

---

### 5. **Data Management**

**Supabase Database:**
- Table: `availability_snapshots`
- Stores: dates, available/booked slots, timestamps
- JSONB column for flexible data structure

**Query Logic:**
- Fetches latest snapshot by `created_at` DESC
- Includes `user_id=X OR user_id IS NULL` for CLI-saved data
- Cache control headers to prevent stale data

**Implementation:**
- `packages/shared/utils/supabaseClient.ts` - Database operations
- `web/app/api/availability/latest/route.ts` - API endpoint
- `web/app/queries/useAvailabilities.ts` - React Query hooks

---

### 6. **User Management**

**Multi-User Support:**
- Supports up to 4 users via environment variables
- User selection dropdown in web UI
- Each user has separate credentials

**Configuration:**
```env
USER1_EMAIL=user1@example.com
USER1_PASSWORD=password1
USER2_EMAIL=user2@example.com
USER2_PASSWORD=password2
```

**Implementation:**
- `packages/shared/config.ts` - User configuration
- `web/app/api/users/route.ts` - User list endpoint
- `web/app/page.tsx` - User selection dropdown

---

### 7. **Booking Automation**

**Process:**
1. User clicks "Book" button on time slot
2. Frontend sends request to `/api/book`
3. API route calls `BookingService`
4. Connects to Browserless.io
5. Logs into amenity site
6. Fills out booking form
7. Submits and confirms

**Features:**
- Toast notifications for status
- Basketball animation on booking
- Error handling with detailed messages
- Amenity site sends confirmation email

**Implementation:**
- `packages/shared/services/bookingService.ts` - Booking logic
- `web/app/api/book/route.ts` - API endpoint
- Browserless.io for cloud browser automation

---

### 8. **Manual Refresh**

**How it works:**
- "Refresh Times" button in web UI
- Triggers immediate availability check
- Shows loading toast while checking
- Updates UI with fresh data after 2-second delay

**Features:**
- Basketball bounce animation
- Loading state on button
- Success/error toast notifications
- React Query cache invalidation

**Implementation:**
- `web/app/page.tsx` - Refresh button handler
- `web/app/api/availability/refresh/route.ts` - API endpoint
- `web/app/queries/useAvailabilities.ts` - Mutation hook

---

## 🏗️ Architecture

**Serverless Stack:**
- **Frontend:** Vercel (Next.js 14)
- **API Routes:** Vercel serverless functions
- **Browser Automation:** Browserless.io cloud service
- **Database:** Supabase (PostgreSQL)
- **Scheduled Jobs:** GitHub Actions

**Monorepo Structure:**
- `packages/shared/` - Core services (TypeScript)
- `web/` - Next.js application
- `scripts/` - CLI tools
- `docs/` - Documentation

---

## 📊 Current Status

**✅ Fully Functional:**
- Automated availability checking (9x daily, next 7 days)
- Mobile-responsive web interface
- Manual refresh with toast notifications
- Booking automation
- Multi-user support
- Social media metadata

**🔧 Recent Improvements:**
- Mobile carousel navigation (2 dates at a time)
- Sonner toast notifications
- Fully booked days now visible
- Fixed user_id matching in Supabase queries
- Added favicon and Open Graph metadata
- Fixed GitHub Actions Playwright install

**📈 Usage Stats:**
- Browserless.io: ~270 automated checks/month
- ~730 checks remaining for manual refreshes
- Well within free tier limits (27% usage)

---

## 🎨 UI/UX Features

**Visual Elements:**
- Basketball emoji in header: ( っ'-')╮ =͟͟͞͞🏀
- Basketball animations on actions
- Blue theme color (#3B82F6)
- Clean, modern design with Tailwind CSS
- Smooth transitions and hover effects

**Accessibility:**
- Mobile-friendly touch targets
- Clear visual feedback
- Disabled state styling
- Error messages in toasts

**Performance:**
- React Query for data caching
- Next.js optimizations
- Lazy loading where appropriate
- Efficient re-renders

---

## 🔐 Security

**Environment Variables:**
- Credentials stored in `.env` files
- GitHub Secrets for Actions
- Vercel environment variables for deployment
- No hardcoded sensitive data

**API Security:**
- Optional API secret for refresh endpoint
- Supabase Row Level Security (RLS)
- HTTPS everywhere

---

## 📱 Browser Support

**Tested On:**
- Chrome/Edge (desktop & mobile)
- Safari (desktop & mobile)
- Firefox (desktop)

**Responsive Breakpoints:**
- Mobile: < 768px (carousel view)
- Desktop: ≥ 768px (grid view)

---

## 🚀 Deployment

**Production:**
- Web app: https://court-booker.vercel.app
- Automatic deployments on push to main
- GitHub Actions runs on schedule

**Local Development:**
- Web: `cd web && pnpm dev` → http://localhost:3001
- CLI: `pnpm check` → Runs availability check

---

## 📝 Next Steps (Optional Enhancements)

**Potential Future Features:**
- Email notifications for new availability
- Booking history tracking
- Calendar view for availability
- Push notifications
- Dark mode
- Booking cancellation
- Recurring booking patterns

**Note:** Current system is fully functional and production-ready!
