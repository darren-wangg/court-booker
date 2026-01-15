# API Routes

Next.js serverless API routes for the Court Booker application.

All routes run serverless on Vercel and use **Browserless.io** for browser automation.

---

## Available Endpoints

### `POST /api/book`
Books a court time slot using browser automation.

**Request:**
```json
{
  "date": "2025-01-15",
  "time": "5:00 PM - 6:00 PM",
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking completed successfully",
  "data": {
    "success": true,
    "bookingRequest": { ... },
    "result": { ... }
  }
}
```

**How it works:**
1. Validates input (date, time, user)
2. Calls `BookingService` directly
3. `BookingService` connects to Browserless.io via WebSocket
4. Automates booking on amenity website
5. Returns result

---

### `POST /api/availability/refresh`
Triggers a new availability check.

**Request:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Availability check completed",
  "data": {
    "nextSevenDays": [ ... ],
    "summary": { ... }
  }
}
```

**How it works:**
1. Calls `ReservationChecker` directly
2. `ReservationChecker` connects to Browserless.io
3. Scrapes amenity website for next 7 days
4. Saves results to Supabase
5. Returns availability data

---

### `GET /api/availability/latest`
Fetches the latest availability snapshot from Supabase.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "user_id": 1,
    "checked_at": "2025-01-14T20:00:00Z",
    "availability_data": { ... },
    "source": "github_actions"
  }
}
```

**How it works:**
1. Queries Supabase for latest snapshot
2. Returns cached availability data
3. No browser automation (just database read)

---

## Architecture

### Old (DigitalOcean Worker)
```
Next.js API Route → HTTP call to DigitalOcean droplet → worker-server.ts → BookingService/ReservationChecker
```

### New (Browserless.io)
```
Next.js API Route → BookingService/ReservationChecker (direct import) → Browserless.io (WebSocket)
```

**Benefits:**
- ✅ No external HTTP calls
- ✅ Faster response times
- ✅ Better error handling
- ✅ Simpler debugging
- ✅ No server management

---

## Environment Variables

Required in Vercel:

```env
# Browserless.io (CRITICAL!)
BROWSERLESS_TOKEN=your-token

# User credentials
USER1_EMAIL=your-email
USER1_PASSWORD=your-password

# Supabase
SUPABASE_SERVICE_ROLE_KEY=your-key
SUPABASE_URL=https://xxxxx.supabase.co

# Optional
NODE_ENV=production
AMENITY_URL=https://...
```

---

## Development

### Test API routes locally

```bash
cd web
pnpm dev
```

Then use curl or Postman:

```bash
# Test booking
curl -X POST http://localhost:3000/api/book \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-01-15","time":"5:00 PM - 6:00 PM","userId":1}'

# Test availability refresh
curl -X POST http://localhost:3000/api/availability/refresh \
  -H "Content-Type: application/json" \
  -d '{"userId":1}'

# Get latest availability
curl http://localhost:3000/api/availability/latest
```

---

## Debugging

### View Vercel logs

1. Go to Vercel dashboard
2. Click **Deployments**
3. Click latest deployment
4. Click **Functions** tab
5. Find your API route
6. View logs

### Common issues

**"Failed to connect to Browserless.io"**
- Check `BROWSERLESS_TOKEN` is set in Vercel env vars
- Verify token is valid in Browserless.io dashboard
- Check free tier hours remaining

**"Browser page not available"**
- Browserless connection failed
- Check Vercel function logs for details
- Verify WebSocket connection is allowed

**"Invalid time format"**
- Time must be in format: `"5:00 PM - 6:00 PM"`
- Or object: `{"startHour": 17, "endHour": 18}`

---

## File Organization

```
web/app/api/
├── book/
│   ├── route.ts              # Booking endpoint (TypeScript)
│   └── route.js.old          # Old worker-based version (backup)
├── availability/
│   ├── latest/
│   │   └── route.js          # Get latest from Supabase
│   └── refresh/
│       ├── route.ts          # Trigger availability check (TypeScript)
│       └── route.js.old      # Old worker-based version (backup)
├── book-worker/              # [DEPRECATED] Old worker-based booking
└── availability/refresh-worker/  # [DEPRECATED] Old worker-based refresh
```

**Note:** `.old` and `*-worker` routes are kept for reference but not used.

---

## Migration Notes

If migrating from worker-server.ts approach:

1. **Old routes** made HTTP calls to DigitalOcean droplet
2. **New routes** import and call services directly
3. **No changes** needed to frontend code (same endpoint URLs)
4. **Much faster** - no HTTP round trip to external server

See [MIGRATION_FROM_DIGITALOCEAN.md](../../../MIGRATION_FROM_DIGITALOCEAN.md) for full migration guide.
