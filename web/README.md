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

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side/admin)
- `API_SECRET_KEY` - Optional secret for protecting API endpoints
- `USER1_EMAIL`, `USER1_PASSWORD` - Court booking credentials (for booking operations)

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

- `GET /api/availability/latest` - Get latest availability snapshot
- `POST /api/availability/refresh` - Trigger new availability check
- `POST /api/book` - Book a time slot

## Next Steps

1. Connect `/api/availability/refresh` to ReservationChecker
2. Connect `/api/book` to BookingService
3. Add authentication if needed
4. Enhance UI with better styling and features
