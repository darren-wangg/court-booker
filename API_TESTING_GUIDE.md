# API-Based Approach Testing Guide

## Summary of Issues Found & Fixed

### Issues Identified:
1. **404 Error / "No availabilities found"**: The web app was showing this because the system was entering fallback mode with empty availability arrays
2. **Browserless.io timeout**: 30-second timeout was too aggressive, causing fallback to empty data
3. **Date matching bug**: Some dates showed 100% availability incorrectly due to date format mismatches

### Fixes Applied:
1. ✅ Increased Browserless.io timeout from 30s to 60s
2. ✅ Improved fallback logic to try local Chrome before entering fallback mode
3. ✅ Added comprehensive debugging to date matching logic
4. ✅ Created new API-based reservation checker as alternative to Chrome automation

## Testing the API Approach

You discovered this API endpoint that could replace Chrome automation entirely:
```
https://www.avalonaccess.com/Information/Information/GetUpcomingReservationsByAmenity?amenity=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf&date=1/16/2026&_=1768522803739
```

### Benefits of API Approach:
- ⚡ **Much faster** - No browser startup time
- 🎯 **More reliable** - No browser crashes or timeouts
- 💰 **No cost** - No need for Browserless.io
- 🔧 **Simpler** - Just HTTP requests with axios

### Test Files Created:

1. **`test-api-curl.sh`** - Simple bash script to test the endpoint
   ```bash
   ./test-api-curl.sh
   ```

2. **`test-api-simple.js`** - Node.js test for multiple dates
   ```bash
   node test-api-simple.js
   ```

3. **`packages/shared/services/apiReservationChecker.ts`** - Full implementation
   - Handles authentication
   - Fetches reservations for next 7 days
   - Parses HTML responses
   - Returns same format as Chrome-based checker

4. **`scripts/test-api-checker.ts`** - TypeScript test script
   ```bash
   ts-node scripts/test-api-checker.ts
   ```

## How to Test

### Option 1: Quick curl test (no auth)
```bash
cd /Users/darrenwang/Desktop/projects/court-booker
./test-api-curl.sh
```

This will show if the endpoint requires authentication or returns data directly.

### Option 2: Test with authentication
```bash
cd /Users/darrenwang/Desktop/projects/court-booker
pnpm build
ts-node scripts/test-api-checker.ts
```

This will:
1. Authenticate with your credentials
2. Fetch reservations for next 7 days
3. Parse and display availability

### Option 3: Manual browser test
1. Open browser DevTools (Network tab)
2. Go to: https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf
3. Login if needed
4. Look for XHR requests to `GetUpcomingReservationsByAmenity`
5. Copy the request as curl and test it

## What to Look For

### If API works without auth:
- Response contains HTML with reservation table
- You can see booked time slots in the HTML
- **Action**: We can use API approach immediately!

### If API requires auth:
- Response redirects to login page
- Status code 401 or 302
- **Action**: Need to handle login first (already implemented in `apiReservationChecker.ts`)

### If API doesn't work:
- Error responses or empty data
- **Action**: Stick with Chrome automation but use the fixes I applied

## Next Steps

1. **Test the API endpoint** using one of the methods above
2. **Report back** what you see:
   - Does it require authentication?
   - What format is the response (HTML/JSON)?
   - Does it contain the reservation data?

3. **If API works**, I'll:
   - Integrate `ApiReservationChecker` into the main system
   - Update the web app to use it
   - Remove dependency on Browserless.io/Chrome

4. **If API doesn't work**, the Chrome automation fixes should still resolve your issues:
   - Better timeout handling
   - Proper fallback logic
   - Fixed date matching with debugging

## Current Status

- ✅ Chrome automation fixes applied and built
- ✅ API-based checker implemented
- ✅ Test scripts created
- ⏳ Waiting to test API endpoint
- ⏳ Need to verify date matching fix with real data

## Files Modified

1. `/packages/shared/services/reservationChecker.ts` - Fixed Browserless timeout and fallback logic
2. `/packages/shared/services/apiReservationChecker.ts` - New API-based implementation
3. `/packages/shared/index.ts` - Exported new API checker

## Files Created

1. `test-api-curl.sh` - Bash test script
2. `test-api-simple.js` - Node.js test script
3. `test-api-approach.js` - Comprehensive test
4. `scripts/test-api-checker.ts` - TypeScript test with auth
5. `API_TESTING_GUIDE.md` - This file
