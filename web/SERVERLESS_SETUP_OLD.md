# Serverless Setup Guide

## Overview

The Next.js app includes API routes for availability checking and booking, but running Puppeteer/Chrome in serverless environments requires special configuration.

## Options for Running Puppeteer in Serverless

### Option 1: Use Browserless.io (Recommended for Production)

Browserless.io provides a managed Chrome service that works well with serverless functions.

1. **Sign up for Browserless.io** (free tier available)
2. **Get your API token**
3. **Update your code** to use Browserless instead of local Puppeteer:

```javascript
// In ReservationChecker or BookingService
const browserlessToken = process.env.BROWSERLESS_TOKEN;
const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`
});
```

### Option 2: Use Vercel Chrome (@vercel/chrome)

Vercel provides a Chrome runtime for serverless functions.

1. **Install @vercel/chrome:**
   ```bash
   npm install @vercel/chrome
   ```

2. **Update your serverless functions** to use Vercel Chrome

### Option 3: Use a Dedicated Worker (Simplest)

Keep Puppeteer on your DigitalOcean droplet and call it via HTTP:

1. **Create a simple Express server** on your droplet that runs ReservationChecker/BookingService
2. **Call it from your Next.js API routes** via HTTP

Example:
```javascript
// In /api/availability/refresh/route.js
const response = await fetch('https://your-droplet-ip/api/check-availability', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.WORKER_SECRET}` }
});
```

### Option 4: Use Cloudflare Workers with Browser API

Cloudflare Workers now support browser automation via their Browser Rendering API.

## Recommended Approach

For simplicity and reliability, I recommend **Option 3** (dedicated worker):

1. Keep your existing DigitalOcean droplet
2. Create a simple Express API on the droplet that exposes:
   - `POST /api/check-availability` - runs ReservationChecker
   - `POST /api/book` - runs BookingService
3. Call these from your Next.js API routes

This avoids the complexity of running Puppeteer in serverless environments while keeping your web UI on Vercel/Cloudflare.

## Implementation Steps

### Step 1: Create Worker API on Droplet

Create `src/api/worker-server.js`:

```javascript
const express = require('express');
const ReservationChecker = require('../services/reservationChecker');
const BookingService = require('../services/bookingService');
const { saveAvailabilitySnapshot } = require('../utils/supabaseClient');

const app = express();
app.use(express.json());

// Simple auth
const WORKER_SECRET = process.env.WORKER_SECRET;

app.post('/api/check-availability', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${WORKER_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = req.body.userId || null;
  const checker = new ReservationChecker(userId);
  
  try {
    const result = await checker.checkAvailability();
    await saveAvailabilitySnapshot(result, 'api', userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/book', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${WORKER_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { date, time, userId } = req.body;
  const bookingService = new BookingService(userId);
  
  try {
    await bookingService.initialize();
    const result = await bookingService.bookTimeSlot({ date, time });
    res.json({ success: result.success, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Worker API running on port 3001');
});
```

### Step 2: Update Next.js API Routes

Update `/api/availability/refresh/route.js` to call the worker:

```javascript
const WORKER_URL = process.env.WORKER_URL || 'http://your-droplet-ip:3001';
const WORKER_SECRET = process.env.WORKER_SECRET;

export async function POST(request) {
  const body = await request.json();
  
  const response = await fetch(`${WORKER_URL}/api/check-availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WORKER_SECRET}`,
    },
    body: JSON.stringify({ userId: body.userId }),
  });
  
  const result = await response.json();
  return Response.json(result);
}
```

## Environment Variables

### Next.js (.env.local)
```
WORKER_URL=https://your-droplet-ip:3001
WORKER_SECRET=your-secret-key
```

### Droplet (.env)
```
WORKER_SECRET=your-secret-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
