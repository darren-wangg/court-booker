# Migration Guide: DigitalOcean → Browserless.io

This guide helps you migrate from the old DigitalOcean worker setup to the new serverless Browserless.io architecture.

---

## 🎯 What Changed

### Old Architecture (DigitalOcean)
```
Web UI → Vercel Next.js → HTTP call to DigitalOcean droplet → worker-server.ts → BookingService/ReservationChecker → Puppeteer (local Chrome) → Website
```

### New Architecture (Browserless)
```
Web UI → Vercel Next.js API Routes → BookingService/ReservationChecker → Browserless.io (cloud Chrome via WebSocket) → Website
```

**Key differences:**
- ❌ **Removed**: DigitalOcean droplet, worker-server.ts, local Chrome binaries
- ✅ **Added**: Browserless.io cloud browser service
- ✅ **Simplified**: Direct service calls from Next.js API routes

---

## 📋 Migration Steps

### Step 1: Sign Up for Browserless.io

1. Go to [browserless.io](https://www.browserless.io/)
2. Sign up for an account
3. Get your API token from the dashboard
4. Choose a plan (free tier available for testing)

### Step 2: Update Vercel Environment Variables

1. Go to Vercel → Your project → **Settings** → **Environment Variables**
2. **Add** these new variables:
   ```
   BROWSERLESS_TOKEN = your-browserless-token
   USER1_EMAIL = your-email@example.com
   USER1_PASSWORD = your-password
   ```
3. **Remove** these old variables (no longer needed):
   ```
   WORKER_URL (was pointing to your droplet)
   WORKER_SECRET
   ```
4. Redeploy: **Deployments** → Click **...** → **Redeploy**

### Step 3: Update GitHub Actions Secrets

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **Add** new secret:
   ```
   BROWSERLESS_TOKEN = your-browserless-token
   ```
3. Verify these exist:
   ```
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   USER1_EMAIL
   USER1_PASSWORD
   ```

### Step 4: Pull Latest Code

```bash
git pull origin main
```

The latest code includes:
- ✅ Browserless.io support in `BookingService` and `ReservationChecker`
- ✅ Updated Next.js API routes (direct service calls)
- ✅ TypeScript API routes instead of JavaScript

### Step 5: Install Dependencies (if running locally)

```bash
# Root project
pnpm install

# Web directory
cd web
pnpm install
```

### Step 6: Test Locally (Optional)

Create `.env` file in root:
```env
BROWSERLESS_TOKEN=your-browserless-token
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
USER1_EMAIL=your-email@example.com
USER1_PASSWORD=your-password
AMENITY_URL=https://www.avalonaccess.com/...
```

Test availability check:
```bash
pnpm check
```

You should see:
```
☁️ Browserless.io token detected - using cloud browser service
🔗 WebSocket endpoint: wss://production-sfo.browserless.io?token=[TOKEN_HIDDEN]
✅ Connected to Browserless.io cloud browser
```

### Step 7: Decommission DigitalOcean Droplet

Once everything is working:

1. **Stop the worker server** on your droplet:
   ```bash
   pm2 stop worker-api
   pm2 delete worker-api
   pm2 save
   ```

2. **Backup any important data** (if needed)

3. **Destroy the droplet** in DigitalOcean dashboard

4. **Cancel billing** for the droplet

🎉 **You're now saving $6-12/month and have zero server management!**

---

## ✅ Verification Checklist

After migration, verify:

### GitHub Actions
- [ ] Workflow runs successfully
- [ ] Logs show "Browserless.io token detected"
- [ ] Data appears in Supabase
- [ ] No errors about worker API

### Vercel Deployment
- [ ] Frontend loads correctly
- [ ] Latest availability data displays
- [ ] **Refresh** button works (triggers new check)
- [ ] **Book** button works (if slots available)
- [ ] Function logs show Browserless connection (no worker API calls)

### Browserless.io
- [ ] Dashboard shows API usage
- [ ] No connection errors
- [ ] Session duration is reasonable (60-120 seconds per check)

---

## 🔧 Troubleshooting

### "Failed to connect to Browserless.io"

**Check:**
- Token is correct (copy/paste from Browserless dashboard)
- No extra spaces in token
- Browserless account is active
- Free tier hours remaining (if using free plan)

**Fix:**
```bash
# Verify token locally
echo $BROWSERLESS_TOKEN
# Should print your token, no spaces
```

### "Worker API not configured" Error

This means your Vercel deployment still has old code.

**Fix:**
1. Pull latest code: `git pull origin main`
2. Push to GitHub: `git push`
3. Vercel auto-deploys OR manually redeploy in Vercel dashboard

### API Routes Return 500 Error

Check Vercel function logs:
1. Vercel → **Deployments** → Click latest
2. Click **Functions** tab
3. Find `/api/book` or `/api/availability/refresh`
4. Click to view logs
5. Look for errors about missing env vars or Browserless connection

**Common fixes:**
- Add missing env vars in Vercel
- Verify `BROWSERLESS_TOKEN` is set correctly
- Check user credentials are correct

### GitHub Actions Still Using Worker API

Update `.github/workflows/court-checker.yml` to ensure it has `BROWSERLESS_TOKEN` secret:

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  BROWSERLESS_TOKEN: ${{ secrets.BROWSERLESS_TOKEN }}
  # ... other vars
```

---

## 📊 Before vs After

### Infrastructure
| Aspect | Before (DigitalOcean) | After (Browserless) |
|--------|----------------------|---------------------|
| Servers | DigitalOcean droplet | None (serverless) |
| Chrome | Self-hosted (Puppeteer) | Cloud (Browserless) |
| Scaling | Manual (resize droplet) | Auto (Browserless) |
| Maintenance | SSH, PM2, updates | None |
| Monitoring | Manual logs, PM2 | Vercel + Browserless dashboards |

### Cost
| Component | Before | After |
|-----------|--------|-------|
| Compute | $6-12/mo (droplet) | $0 (Vercel free) |
| Browser | Included | $0-9/mo (Browserless) |
| Database | $0-25/mo (Supabase) | $0-25/mo (Supabase) |
| **Total** | **$6-37/mo** | **$0-34/mo** |

### Complexity
| Task | Before | After |
|------|--------|-------|
| Initial setup | SSH, install deps, PM2 | Copy token to Vercel |
| Updates | SSH, git pull, PM2 restart | Git push (auto-deploy) |
| Debugging | SSH, check logs, PM2 logs | Vercel dashboard logs |
| Scaling | Resize droplet | Automatic |

---

## 🎉 Benefits of New Architecture

1. **Zero server management**: No SSH, no PM2, no OS updates
2. **Better reliability**: Browserless handles browser crashes/hangs
3. **Easier debugging**: Vercel function logs are easier to read
4. **Auto-scaling**: Browserless scales automatically
5. **Simpler deployment**: Just push to GitHub
6. **Lower maintenance**: No server to monitor
7. **Better DX**: Local development with Browserless works great

---

## 🚨 Rollback Plan (if needed)

If you need to rollback to DigitalOcean:

1. Redeploy old code with worker API calls
2. Restart your DigitalOcean droplet
3. Update Vercel env vars to point to worker API
4. Remove `BROWSERLESS_TOKEN` from Vercel

But honestly, **you won't need to rollback**. Browserless is more reliable! 🚀

---

## ❓ FAQ

**Q: Can I keep my DigitalOcean droplet as backup?**
A: Yes! You can run both simultaneously. Just don't use the worker API in Vercel.

**Q: What if Browserless.io goes down?**
A: They have 99.9% uptime SLA. But you can always add fallback to local Chrome in the code.

**Q: Will this work with my custom amenity URL?**
A: Yes! Just set `AMENITY_URL` env var as before.

**Q: Do I need to change my database schema?**
A: No! Supabase schema remains the same.

**Q: Can I still run checks locally?**
A: Yes! Just add `BROWSERLESS_TOKEN` to your local `.env` file.

---

## 📞 Need Help?

Check these resources:
- [DEPLOYMENT_SIMPLE.md](./DEPLOYMENT_SIMPLE.md) - Full deployment guide
- [CLAUDE.md](./CLAUDE.md) - Architecture documentation
- Vercel logs: Deployments → Click deployment → Functions
- Browserless docs: https://docs.browserless.io/

**Still stuck?** Open an issue on GitHub with:
- Error message
- Vercel function logs
- Browserless.io dashboard screenshot
