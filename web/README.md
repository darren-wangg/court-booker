# Court Booker Web Dashboard

Modern Next.js web interface for checking and booking court reservations.

## Setup

1. **Install dependencies:**
   ```bash
   cd web
   npm install
   # or
   pnpm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Run development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

**Required:**
- `BROWSERLESS_TOKEN` - Browserless.io API token (CRITICAL for serverless browser automation)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side/admin)
- `USER1_EMAIL`, `USER1_PASSWORD` - Court booking credentials

**Optional:**
- `API_SECRET_KEY` - Optional secret for protecting API endpoints
- `AMENITY_URL` - Override default amenity URL

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Next.js can be deployed to any platform that supports Node.js:
- Netlify
- Cloudflare Pages
- Railway
- DigitalOcean App Platform

## API Routes

- `GET /api/availability/latest` - Get latest availability snapshot from Supabase
- `POST /api/availability/refresh` - Trigger new availability check via Browserless.io
- `POST /api/book` - Book a time slot via Browserless.io

All API routes are TypeScript serverless functions that run on Vercel and use Browserless.io for browser automation.

## Architecture

This is a **100% serverless** application:
- **Frontend + API Routes**: Vercel
- **Browser Automation**: Browserless.io (cloud browser via WebSocket)
- **Database**: Supabase

**No servers to manage!** 🎉

## Documentation

For complete deployment instructions, see:
- **[../DEPLOYMENT_SIMPLE.md](../DEPLOYMENT_SIMPLE.md)** - Full deployment guide
- **[../README.md](../README.md)** - Project overview
- **[./app/api/README.md](./app/api/README.md)** - API routes documentation
