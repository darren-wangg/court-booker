# Deployment Checklist

Complete these steps to fully deploy your Court Booker application.

## ✅ Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to finish provisioning (~2 minutes)

### 1.2 Create Database Table
1. In Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql`
3. Paste and run it in the SQL Editor
4. Verify the table was created: Go to **Table Editor** → You should see `availability_snapshots`

### 1.3 Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (for frontend)
   - **service_role key** (for backend - keep this secret!)

---

## ✅ Step 2: GitHub Actions Setup

### 2.1 Add Repository Secrets
Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

**Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `USER1_EMAIL` - Your amenity login email
- `USER1_PASSWORD` - Your amenity login password
- `AMENITY_URL` - (Optional) Override amenity URL if different from default

**Optional (for multiple users):**
- `USER2_EMAIL`, `USER2_PASSWORD`, etc.
- `USER2_NOTIFICATION_EMAIL`, etc.

**Legacy (if you still use single-user format):**
- `EMAIL`, `PASSWORD`, `NOTIFICATION_EMAIL`

### 2.2 Test GitHub Actions
1. Go to **Actions** tab in your GitHub repo
2. Click **Court Availability Checker** workflow
3. Click **Run workflow** → **Run workflow** (manual trigger)
4. Wait for it to complete and check if data appears in Supabase

---

## ✅ Step 3: Deploy Worker API to DigitalOcean Droplet

### 3.1 SSH into Your Droplet
```bash
ssh root@your-droplet-ip
```

### 3.2 Install Dependencies
```bash
# Navigate to your project directory
cd /opt/court-booker  # or wherever you deployed it

# Install dependencies
pnpm install

# Install TypeScript globally (or use npx)
npm install -g typescript ts-node
```

### 3.3 Create/Update `.env` File
```bash
nano .env
```

Add these variables:
```env
# User credentials
USER1_EMAIL=your-email@example.com
USER1_PASSWORD=your-password

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker API
WORKER_SECRET=your-random-secret-token-here
WORKER_PORT=3001

# Optional
AMENITY_URL=https://www.avalonaccess.com/...
HEADLESS_MODE=true
```

### 3.4 Start Worker API with PM2
```bash
# Install PM2 if not already installed
npm install -g pm2

# Start the worker API
pm2 start "ts-node src/api/worker-server.ts" --name worker-api

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions it prints
```

### 3.5 Test Worker API
```bash
# Health check
curl http://localhost:3001/health

# Test availability check (replace YOUR_SECRET with your WORKER_SECRET)
curl -X POST http://localhost:3001/api/check-availability \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'
```

### 3.6 Configure Firewall (if needed)
```bash
# Allow port 3001
sudo ufw allow 3001/tcp
sudo ufw reload
```

---

## ✅ Step 4: Deploy Frontend to Vercel

### 4.1 Install Vercel CLI (optional)
```bash
npm install -g vercel
```

### 4.2 Deploy via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New Project**
3. Import your GitHub repository
4. Configure the project:
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm build` (or `npm run build`)
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install` (or `npm install`)

### 4.3 Add Environment Variables in Vercel
Go to **Settings** → **Environment Variables** and add:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for API routes)
- `WORKER_API_BASE_URL` - Your DigitalOcean droplet IP/domain (e.g., `http://123.45.67.89:3001`)
- `WORKER_API_SECRET` - Same as `WORKER_SECRET` from your droplet `.env`

**Optional:**
- `NEXT_PUBLIC_AMENITY_URL` - If you want to display it in the UI

### 4.4 Deploy
1. Click **Deploy**
2. Wait for deployment to complete
3. Visit your Vercel URL to see the app

### 4.5 Test the Frontend
1. Open your Vercel deployment URL
2. You should see the latest availability data from Supabase
3. Click **Refresh** button to trigger a new check
4. Try booking a slot (if available)

---

## ✅ Step 5: Verify Everything Works

### 5.1 Check GitHub Actions
- [ ] Workflow runs successfully
- [ ] Data appears in Supabase `availability_snapshots` table

### 5.2 Check Supabase
- [ ] Table `availability_snapshots` exists
- [ ] New rows are being inserted from GitHub Actions
- [ ] Can query data via Supabase dashboard

### 5.3 Check Worker API
- [ ] PM2 shows worker-api as "online"
- [ ] Health check endpoint responds: `curl http://your-droplet-ip:3001/health`
- [ ] Can trigger availability check via API

### 5.4 Check Frontend
- [ ] Vercel deployment is live
- [ ] Can see availability data on the page
- [ ] Refresh button works
- [ ] Booking button works (if slots available)

---

## 🔧 Troubleshooting

### GitHub Actions Fails
- Check that all secrets are set correctly
- Verify Supabase URL and keys are correct
- Check workflow logs for specific errors

### Worker API Not Responding
- Check PM2 status: `pm2 list`
- Check logs: `pm2 logs worker-api`
- Verify firewall allows port 3001
- Check `.env` file has correct values

### Frontend Can't Connect to Worker API
- Verify `WORKER_API_BASE_URL` is correct in Vercel env vars
- Check `WORKER_API_SECRET` matches droplet's `WORKER_SECRET`
- Verify worker API is accessible from internet (not just localhost)
- Check CORS settings if needed

### No Data in Supabase
- Verify GitHub Actions workflow completed successfully
- Check Supabase RLS policies allow inserts
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Supabase logs for errors

---

## 📝 Summary

After completing all steps, you should have:

1. ✅ Supabase database with `availability_snapshots` table
2. ✅ GitHub Actions running automated checks 4x daily
3. ✅ Worker API running on DigitalOcean droplet
4. ✅ Frontend deployed on Vercel
5. ✅ All components communicating correctly

Your system is now fully operational! 🎉
