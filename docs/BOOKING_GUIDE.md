# Booking Guide

**Last Updated:** January 2026

## Overview

The booking flow uses environment variables for user credentials. No password input is required from the user - credentials are securely stored in `.env` files.

---

## How It Works

### 1. User Clicks "Book"
```
User selects a time slot
  ↓
Clicks "Book" button
  ↓
Frontend sends request with userId
  ↓
Backend looks up credentials from env variables
  ↓
BookingService automates the booking
```

### 2. Credential Lookup

**Environment Variables:**
```bash
USER1_EMAIL=user1@example.com
USER1_PASSWORD=password1

USER2_EMAIL=user2@example.com
USER2_PASSWORD=password2
```

**Backend Logic:**
```typescript
// BookingService constructor
constructor(userId: number | null = null) {
  this.user = getUser(userId); // Looks up from env variables
}
```

---

## Testing the Booking Flow

### Test with Web UI

```bash
cd web && pnpm dev
# Open http://localhost:3001
# Select a user from dropdown
# Click "Book" on any available slot
# Watch toast notifications for status
```

### Test with Script (Recommended for Debugging)

```bash
# Build shared package first
pnpm build

# Run test script
npx tsx scripts/test-booking.ts
```

This will:
1. Initialize browser
2. Login with USER1 credentials
3. Navigate to booking page
4. Select date and time
5. **NOT submit** (for safety)

---

## Debugging HTML Selectors

If booking fails, the HTML structure may have changed. Here's how to debug:

### 1. Check Current Selectors

**Login Page:**
```typescript
// Email field
'input[type="text"]'
'input[name="UserName"]'

// Password field
'input[type="password"]'

// Submit button
'button[type="submit"]'
```

**Booking Page:**
```typescript
// Date input
'#resv-date'

// Calendar
'#ui-datepicker-div'
'.ui-datepicker-calendar td[data-handler="selectDay"]'

// Time dropdowns
'#SelStartTime'
'#SelEndTime'

// Submit button
'#submit-new-reservation'
```

### 2. Inspect Website

1. Open amenity website in browser
2. Open DevTools (F12)
3. Inspect the element that's failing
4. Check the actual selector (ID, class, name)
5. Update in `packages/shared/services/bookingService.ts`

### 3. Add Debug Screenshots

Add to bookingService.ts after each step:

```typescript
await this.page.screenshot({ 
  path: `debug-step-${Date.now()}.png`,
  fullPage: true 
});
```

---

## Common Issues

### "Email field not found"
- Website changed login form structure
- Update selectors in `findEmailField()` method

### "Date not found in calendar"
- Calendar not fully loaded
- Increase wait time or add better waiting logic
- Check if calendar HTML structure changed

### "Time dropdown not found"
- Dropdown IDs changed
- Verify `#SelStartTime` and `#SelEndTime` still exist

### "Submit button not found"
- Button ID changed from `#submit-new-reservation`
- Inspect page and update selector

---

## File Reference

**Key Files:**
- `web/app/page.tsx` - Booking UI and button
- `web/app/queries/useAvailabilities.ts` - Booking mutation
- `web/app/api/book/route.ts` - Booking API endpoint
- `packages/shared/services/bookingService.ts` - Automation logic
- `packages/shared/config.ts` - User credential lookup
- `scripts/test-booking.ts` - Test script

**Selector Locations:**
- Login: Lines 212-260 in bookingService.ts
- Date: Lines 266-327 in bookingService.ts
- Time: Lines 332-364 in bookingService.ts
- Submit: Lines 379-434 in bookingService.ts

---

## Environment Setup

### Required Variables

```bash
# User credentials (add more as needed)
USER1_EMAIL=your-email@example.com
USER1_PASSWORD=your-password

USER2_EMAIL=another-email@example.com
USER2_PASSWORD=another-password

# Browserless.io for cloud browser
BROWSERLESS_TOKEN=your-token

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key

# Amenity website
AMENITY_URL=https://www.avalonaccess.com/...
```

### Add to Multiple Locations

1. Root `.env` - For CLI and scripts
2. `web/.env.local` - For Next.js web app
3. GitHub Secrets - For automated checks
4. Vercel Environment Variables - For production

---

## Next Steps

1. **Test the flow:**
   ```bash
   npx tsx scripts/test-booking.ts
   ```

2. **If it fails, check which step:**
   - Login? → Update login selectors
   - Date? → Update calendar selectors
   - Time? → Update dropdown selectors
   - Submit? → Update button selector

3. **Update selectors in:**
   `packages/shared/services/bookingService.ts`

4. **Rebuild and test:**
   ```bash
   pnpm build
   npx tsx scripts/test-booking.ts
   ```

5. **Test in web UI:**
   ```bash
   cd web && pnpm dev
   ```

---

## Security Notes

✅ **Credentials stored in environment variables only**
✅ **Never sent to frontend**
✅ **Never stored in database**
✅ **Only used transiently during booking**

⚠️ **Important:**
- Keep `.env` files out of git (already in `.gitignore`)
- Use different credentials for testing vs production
- Rotate passwords periodically
