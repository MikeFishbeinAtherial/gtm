# 🚀 How to Start the Campaign on Railway

## Quick Answer

**You don't need to keep your computer on!** Railway runs the campaign worker 24/7 in the cloud.

---

## 📋 Step-by-Step Instructions

### Step 1: Push Code to GitHub

```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
git add .
git commit -m "Add campaign worker and API endpoints for Railway"
git push
```

Railway will automatically deploy when you push.

---

### Step 2: Verify Environment Variables in Railway

Go to Railway Dashboard → Your Project → Variables

Make sure these are set:
- ✅ `UNIPILE_DSN`
- ✅ `UNIPILE_API_KEY`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)

---

### Step 3: Start the Campaign Worker

**Option A: Railway Dashboard (Easiest)**

1. Go to Railway Dashboard → Your Project
2. Click **"Deployments"** tab
3. Click **"New Deployment"** → **"Empty Deployment"**
4. In the command field, enter:
   ```
   node scripts/campaign-worker.js
   ```
5. Click **"Deploy"**
6. ✅ Worker starts running!

**Option B: Railway CLI**

```bash
railway run node scripts/campaign-worker.js
```

---

## 🎯 What Happens Next

Once started, the worker will:

1. ✅ **Run continuously** - Never stops (Railway keeps it alive)
2. ✅ **Check every minute** - Looks for pending messages
3. ✅ **Send messages** - Respecting all safety limits:
   - Max 50/day
   - Random 15-45 min delays
   - Business hours only (6 AM - 8 PM ET)
   - Auto-pause on Dec 25
4. ✅ **Auto-pause/resume** - Based on business hours and daily limits
5. ✅ **Complete automatically** - When all 539 messages are sent

**You can close your computer - Railway runs it!**

---

## 📊 Monitor Progress

### Option 1: API Endpoint
```bash
curl https://your-app.railway.app/api/campaign/status
```

Returns JSON with:
- Campaign status
- Messages sent/pending/failed
- Progress percentage

### Option 2: Supabase Dashboard
- Go to Supabase → Table Editor → `networking_outreach`
- Filter by `status = 'sent'` to see progress
- Count rows to see how many sent

### Option 3: Railway Logs
- Railway Dashboard → Your Deployment → Logs
- See real-time sending activity

---

## ⏸️ Pause/Resume Campaign

### Via API:
```bash
# Pause
curl -X POST https://your-app.railway.app/api/campaign/pause

# Resume
curl -X POST https://your-app.railway.app/api/campaign/resume

# Check status
curl https://your-app.railway.app/api/campaign/status
```

### Via Supabase:
Update `networking_campaign_batches` table:
- Set `status = 'paused'` to pause
- Set `status = 'in_progress'` to resume

The worker checks this status every minute.

---

## 🛑 Stop the Campaign

**Option 1: Pause via API**
```bash
curl -X POST https://your-app.railway.app/api/campaign/pause
```

**Option 2: Stop Railway Service**
- Railway Dashboard → Your Deployment → Stop

**Option 3: Update Supabase**
- Set campaign `status = 'paused'` in Supabase

---

## ✅ Summary

**To Start:**
1. Push code to GitHub ✅
2. Railway auto-deploys ✅
3. Run: `railway run node scripts/campaign-worker.js` ✅
4. Campaign runs for 10 days automatically ✅

**No computer needed!** Railway handles everything.

---

## 🔗 Your Railway URLs

After deployment, your endpoints will be:
- **Status:** `https://your-app.railway.app/api/campaign/status`
- **Start:** `https://your-app.railway.app/api/campaign/start`
- **Pause:** `https://your-app.railway.app/api/campaign/pause`
- **Resume:** `https://your-app.railway.app/api/campaign/resume`

Find your Railway app URL in the Railway Dashboard.

