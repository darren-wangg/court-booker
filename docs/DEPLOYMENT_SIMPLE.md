# Simplified Deployment Guide (No DigitalOcean Required!)

This guide shows you how to deploy your Court Booker application 100% serverless using **Vercel + Browserless.io**.

**No more DigitalOcean droplet needed!** 🎉

---

## 📋 Overview

Your stack is now super simple:

1. **Supabase** - Database for storing availability data
2. **GitHub Actions** - Automated availability checks (4x daily)
3. **Browserless.io** - Cloud browser service for automation
4. **Vercel** - Frontend + API routes (all serverless!)

**Total cost**: ~$9-19/month (Browserless free tier available!)

---

## ✅ Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for provisioning (~2 minutes)

### 1.2 Create Database Table
1. In Supabase dashboard → **SQL Editor**
2. Copy contents of `supabase-schema.sql`
3. Paste and run
4. Verify: **Table Editor** → You should see `availability_snapshots`

### 1.3 Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key** (for frontend)
   - **service_role key** (for backend - keep secret!)

---

## ✅ Step 2: Browserless.io Setup

### 2.1 Sign Up for Browserless.io
1. Go to [browserless.io](https://www.browserless.io/)
2. Sign up for an account
3. Choose a plan:
   - **Free tier**: 6 hours/month (good for testing)
   - **Starter**: $9/mo (100 hours)
   - **Professional**: $29/mo (500 hours)

### 2.2 Get Your API Token
1. Go to your Browserless.io dashboard
2. Copy your API token (looks like: `a1b2c3d4-e5f6-...`)
3. Keep this secret!

**Why Browserless?**
- ✅ No Chrome binaries to manage
- ✅ Runs in cloud via WebSocket
- ✅ Works with Vercel serverless functions
- ✅ Auto-scales and handles reliability
- ✅ Your code already supports it!

---

## ✅ Step 3: GitHub Actions Setup

### 3.1 Add Repository Secrets
Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...
BROWSERLESS_TOKEN = a1b2c3d4-e5f6-...
USER1_EMAIL = your-email@example.com
USER1_PASSWORD = your-password
AMENITY_URL = https://www.avalonaccess.com/... (optional)
```

**Optional (for multiple users):**
```
USER2_EMAIL
USER2_PASSWORD
```

### 3.2 Test GitHub Actions
1. Go to **Actions** tab
2. Click **Court Availability Checker** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for completion (~2-5 minutes)
5. Check Supabase → data should appear in `availability_snapshots`

---

## ✅ Step 4: Deploy Frontend to Vercel

### 4.1 Import GitHub Repo to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New Project**
3. Import your GitHub repository
4. Configure project:
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `pnpm install` (default)

### 4.2 Add Environment Variables

In Vercel → **Settings** → **Environment Variables**, add:

**Required:**
```
# Supabase (for frontend)
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...

# Supabase (for backend API routes)
SUPABASE_SERVICE_ROLE_KEY = eyJ...

# Browserless.io (CRITICAL!)
BROWSERLESS_TOKEN = a1b2c3d4-e5f6-...

# User credentials (for booking and availability checks)
USER1_EMAIL = your-email@example.com
USER1_PASSWORD = your-password

# Environment
NODE_ENV = production
```

**Optional:**
```
USER2_EMAIL = ...
USER2_PASSWORD = ...
AMENITY_URL = https://www.avalonaccess.com/...
API_SECRET_KEY = random-secret-for-api-security
```

### 4.3 Deploy!
1. Click **Deploy**
2. Wait for build to complete (~2-5 minutes)
3. Visit your deployment URL!

---

## ✅ Step 5: Verify Everything Works

### 5.1 Test the Frontend
1. Open your Vercel deployment URL
2. You should see latest availability data from Supabase
3. Try clicking **Refresh** to trigger a new availability check
4. Try **booking** a slot (if available)

### 5.2 Check GitHub Actions
- [ ] Workflow runs successfully every 6 hours
- [ ] Data appears in Supabase after each run
- [ ] No errors in workflow logs

### 5.3 Check Supabase
- [ ] Table `availability_snapshots` has recent data
- [ ] Timestamps are recent
- [ ] Data looks correct

---

## 🎉 You're Done!

Your Court Booker is now running 100% serverless:

✅ **Supabase** - Database
✅ **GitHub Actions** - Scheduled checks
✅ **Browserless.io** - Cloud browser automation
✅ **Vercel** - Frontend + API routes

**No servers to manage. No DigitalOcean droplet. No SSH. No PM2.**

---

## 🔧 Troubleshooting

### GitHub Actions Fails
- ✅ Check all secrets are set correctly
- ✅ Verify `BROWSERLESS_TOKEN` is valid
- ✅ Check workflow logs for specific errors
- ✅ Verify Browserless.io account has available hours

### Frontend Can't Check Availability or Book
- ✅ Check Vercel logs: **Deployments** → Click latest → **Functions**
- ✅ Verify `BROWSERLESS_TOKEN` is set in Vercel environment variables
- ✅ Verify user credentials are correct
- ✅ Check Browserless.io dashboard for usage/errors

### Browserless.io Connection Fails
- ✅ Verify token is correct (no extra spaces)
- ✅ Check Browserless.io account status (free tier hours remaining?)
- ✅ Verify WebSocket endpoint is accessible
- ✅ Try running `pnpm check` locally with token to debug

### No Data in Supabase
- ✅ Verify GitHub Actions completed successfully
- ✅ Check Supabase service role key is correct
- ✅ Verify table schema matches `supabase-schema.sql`
- ✅ Check Supabase logs for errors

---

## 💰 Cost Breakdown

**Free Tier (Testing):**
- Supabase: Free (up to 500MB)
- GitHub Actions: Free (2,000 minutes/month)
- Browserless.io: Free (6 hours/month)
- Vercel: Free (Hobby plan)
- **Total: $0/month** ✨

**Production (Light Use):**
- Supabase: Free or $25/mo (Pro)
- GitHub Actions: Free
- Browserless.io: $9/mo (100 hours)
- Vercel: Free or $20/mo (Pro)
- **Total: $9-54/month**

**vs. Old DigitalOcean Setup:**
- DigitalOcean Droplet: $6-12/month
- SSH management: Your time
- Server maintenance: Your time
- PM2 configuration: Your time
- **New setup saves time AND is more reliable!**

---

## 📚 Architecture Comparison

### Old (DigitalOcean):
```
GitHub Actions → Supabase
Web UI → Vercel → Worker API (DigitalOcean) → Puppeteer → Website
```

### New (Browserless):
```
GitHub Actions → Browserless.io → Supabase
Web UI → Vercel API Routes → Browserless.io → Website
```

**Benefits:**
- ✅ No server management
- ✅ Auto-scaling
- ✅ Better reliability
- ✅ Simpler architecture
- ✅ Easier debugging
- ✅ Lower maintenance

---

## 🚀 Next Steps

1. **Monitor usage**: Check Browserless.io dashboard regularly
2. **Set up alerts**: Configure Vercel deployment notifications
3. **Adjust schedule**: Modify `.github/workflows/court-checker.yml` if needed
4. **Add more users**: Add `USER2_EMAIL`, etc. to both GitHub and Vercel

**Questions?** Check the logs:
- GitHub Actions: **Actions** tab → Click workflow run
- Vercel: **Deployments** → Click deployment → **Functions** → View logs
- Browserless.io: Dashboard → Usage stats
