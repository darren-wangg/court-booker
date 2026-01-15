# Setup Guide - New Web Architecture

## Overview

This guide will help you set up the new simplified architecture:
- **Supabase** for data storage
- **Next.js** web app for UI
- **Worker API** on DigitalOcean for Puppeteer operations
- **GitHub Actions** for automated checks

## Step 1: Set Up Supabase

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login
3. Create a new project
4. Note your project URL and API keys

### 1.2 Create Database Table

1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `supabase-schema.sql`
3. Run the SQL to create the `availability_snapshots` table

### 1.3 Get API Keys

From Supabase dashboard → Settings → API:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon key**: Public key (for client-side)
- **service_role key**: Secret key (for server-side/admin)

## Step 2: Update Environment Variables

### 2.1 Backend (Node.js) - `.env`

```env
# User Credentials
USER1_EMAIL=your-email@example.com
USER1_PASSWORD=your-password

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker API (for droplet)
WORKER_SECRET=your-random-secret-key-here
WORKER_PORT=3001

# Amenity
AMENITY_URL=https://www.avalonaccess.com/...
```

### 2.2 Frontend (Next.js) - `web/.env.local`

```env
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (server-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker API
WORKER_URL=http://your-droplet-ip:3001
# Or if using HTTPS: https://your-droplet-ip:3001
WORKER_SECRET=your-random-secret-key-here

# Optional API Security
API_SECRET_KEY=another-secret-key
```

### 2.3 GitHub Actions - Repository Secrets

Add these secrets in GitHub → Settings → Secrets:
- `USER1_EMAIL`
- `USER1_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AMENITY_URL`

## Step 3: Update GitHub Actions Workflow

Update `.github/workflows/court-checker.yml`:

1. Remove all Gmail/Resend environment variables
2. Add Supabase variables:
   ```yaml
   SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
   SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
   ```

3. The workflow will now save to Supabase instead of sending emails

## Step 4: Set Up Worker API on Droplet

### 4.1 Install Dependencies

```bash
ssh root@your-droplet-ip
cd /opt/court-booker
npm install
# or
pnpm install
```

### 4.2 Update .env

Add to your droplet's `.env`:
```env
WORKER_SECRET=your-random-secret-key-here
WORKER_PORT=3001
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4.3 Start Worker API

```bash
# Using PM2
pm2 start src/api/worker-server.js --name worker-api
pm2 save

# Or directly
node src/api/worker-server.js
```

### 4.4 Test Worker API

```bash
# Health check
curl http://localhost:3001/health

# Test availability check (with auth)
curl -X POST http://localhost:3001/api/check-availability \
  -H "Authorization: Bearer your-worker-secret" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'
```

## Step 5: Set Up Next.js App

### 5.1 Install Dependencies

```bash
cd web
npm install
# or
pnpm install
```

### 5.2 Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

### 5.3 Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Visit `http://localhost:3000` to see the web app.

### 5.4 Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set environment variables in Vercel dashboard
5. Deploy

## Step 6: Test the System

### 6.1 Test Automated Check

1. Wait for GitHub Actions to run (or trigger manually)
2. Check Supabase dashboard → Table Editor → `availability_snapshots`
3. You should see a new row with availability data

### 6.2 Test Web UI

1. Open your deployed Next.js app
2. You should see the latest availability data
3. Click "Refresh" button
4. Check that it triggers a new check

### 6.3 Test Booking

1. Click "Book" on an available slot
2. Check worker API logs
3. Verify booking was processed

## Troubleshooting

### Supabase Connection Issues

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check Supabase dashboard for connection logs
- Verify RLS policies allow your service role

### Worker API Not Responding

- Check if worker is running: `pm2 list`
- Check logs: `pm2 logs worker-api`
- Verify `WORKER_SECRET` matches in both places
- Check firewall allows port 3001

### Next.js API Routes Failing

- Verify `WORKER_URL` is correct
- Check `WORKER_SECRET` matches
- Verify worker API is accessible from Vercel
- Check Vercel function logs

## Architecture Summary

```
┌─────────────────┐
│  GitHub Actions │───▶ ReservationChecker ──▶ Supabase
│  (4x/day)       │
└─────────────────┘

┌─────────────────┐
│   Next.js App   │───▶ GET /api/availability/latest ──▶ Supabase
│   (Vercel)      │
│                 │───▶ POST /api/availability/refresh ──▶ Worker API
│                 │───▶ POST /api/book ──▶ Worker API
└─────────────────┘

┌─────────────────┐
│  Worker API     │───▶ ReservationChecker ──▶ Supabase
│  (Droplet)      │───▶ BookingService ──▶ Amenity Site
└─────────────────┘
```

## Next Steps

1. ✅ Set up Supabase and run schema
2. ✅ Update environment variables
3. ✅ Deploy worker API to droplet
4. ✅ Deploy Next.js app to Vercel
5. ✅ Test end-to-end flow
6. ✅ Remove old Gmail/email code (already done)

## Cost Summary

- **Supabase**: Free tier (500MB, 2GB bandwidth)
- **Vercel**: Free tier (100GB bandwidth)
- **GitHub Actions**: Free tier (2,000 min/month)
- **DigitalOcean**: $5-7/month (basic droplet)
- **Total**: ~$5-7/month
