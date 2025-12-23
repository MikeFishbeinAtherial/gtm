# Railway Campaign Guide: How It Works

## 🎯 The Answer to Your Question

**Q: How do I start the campaign on Railway without keeping my computer on?**

**A:** Railway runs a **long-running worker process** (`campaign-worker.js`) that:
- ✅ Runs 24/7 in the cloud (no computer needed)
- ✅ Checks for messages every minute
- ✅ Sends messages automatically
- ✅ Respects all safety limits
- ✅ Auto-pauses/resumes based on business hours

---

## 🏗️ How Railway Works

### What You Have Now:

1. **Next.js App** - Deployed on Railway
   - Serves your web app
   - Has API endpoints for monitoring

2. **Worker Script** - `campaign-worker.js`
   - Long-running process that sends messages
   - Needs to be started separately

### Two Ways to Run the Worker:

**Option 1: Separate Railway Service (Recommended)**
- Create a new service in Railway
- Set start command: `node scripts/campaign-worker.js`
- Runs continuously, Railway keeps it alive

**Option 2: Railway CLI Command**
- Run: `railway run node scripts/campaign-worker.js`
- Runs until you stop it (or Railway restarts)

---

## 🚀 Step-by-Step: Start Campaign

### Step 1: Push Code to GitHub

```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
git add .
git commit -m "Add campaign worker for Railway"
git push
```

✅ Railway auto-deploys when you push

---

### Step 2: Start the Worker on Railway

**Method A: Railway Dashboard (Easiest)**

1. Go to Railway Dashboard → Your Project
2. Click **"+ New"** → **"Service"**
3. Select **"Empty Service"**
4. Set **Start Command** to:
   ```
   node scripts/campaign-worker.js
   ```
5. Click **"Deploy"**
6. ✅ Worker starts running!

**Method B: Railway CLI**

```bash
railway run node scripts/campaign-worker.js
```

This starts the worker. It will run until you stop it or Railway restarts it.

---

### Step 3: Set Campaign Status to "in_progress"

The worker checks the campaign status in Supabase. Set it to `in_progress`:

**Via API:**
```bash
curl -X POST https://your-app.railway.app/api/campaign/start
```

**Via Supabase:**
- Dashboard → Table Editor → `networking_campaign_batches`
- Update `status` to `in_progress`

**Or it's already set** - The worker will start sending automatically!

---

## 🔄 How the Worker Works

### The Worker Loop:

```
1. Check campaign status in Supabase
   ↓
2. If paused → Wait 1 minute, check again
   ↓
3. If in_progress → Continue
   ↓
4. Check daily limit (50 messages/day)
   ↓
5. Check business hours (6 AM - 8 PM ET)
   ↓
6. Check time since last send (15-45 min delay)
   ↓
7. Get next pending message from Supabase
   ↓
8. Send message via Unipile API
   ↓
9. Update Supabase (status = 'sent')
   ↓
10. Wait random 15-45 minutes
    ↓
11. Repeat from step 1
```

**This loop runs continuously** - Railway keeps the process alive.

---

## 📊 Monitor Progress

### Option 1: API Endpoint
```bash
curl https://your-app.railway.app/api/campaign/status
```

Returns:
```json
{
  "campaign": {
    "status": "in_progress",
    "sent_count": 23,
    "total_target_count": 539
  },
  "stats": {
    "pending": 516,
    "sent": 23,
    "failed": 0
  },
  "progress": {
    "percent_complete": "4.3"
  }
}
```

### Option 2: Supabase Dashboard
- Table Editor → `networking_outreach`
- Filter: `status = 'sent'`
- Count rows = messages sent

### Option 3: Railway Logs
- Railway Dashboard → Your Worker Service → Logs
- See real-time: "Sending to: John Doe", "✅ Sent successfully"

---

## ⏸️ Control the Campaign

### Pause:
```bash
curl -X POST https://your-app.railway.app/api/campaign/pause
```
Or update Supabase: `status = 'paused'`

### Resume:
```bash
curl -X POST https://your-app.railway.app/api/campaign/resume
```
Or update Supabase: `status = 'in_progress'`

### Stop Worker:
- Railway Dashboard → Your Worker Service → Stop
- Or kill the process: `railway run` will stop

---

## 🎯 What Gets Triggered?

**The Trigger:** Starting the worker process

**What Happens:**
1. Worker starts running
2. Checks Supabase every minute
3. Sees campaign status = `in_progress`
4. Starts sending messages
5. Continues until:
   - All messages sent (status → `completed`)
   - Daily limit reached (pauses until tomorrow)
   - Outside business hours (pauses until 6 AM)
   - Campaign paused (stops sending)

**No API endpoint needed to trigger** - The worker runs continuously and checks automatically!

---

## ✅ Summary

**To Start Campaign:**

1. ✅ Push code to GitHub (Railway auto-deploys)
2. ✅ Start worker: `railway run node scripts/campaign-worker.js`
3. ✅ Set campaign status: `in_progress` (via API or Supabase)
4. ✅ Worker automatically starts sending
5. ✅ Runs for 10 days automatically

**No computer needed!** Railway runs everything in the cloud.

---

## 🔗 Your Endpoints

After deployment:
- **Status:** `https://your-app.railway.app/api/campaign/status`
- **Start:** `https://your-app.railway.app/api/campaign/start` (sets status)
- **Pause:** `https://your-app.railway.app/api/campaign/pause`
- **Resume:** `https://your-app.railway.app/api/campaign/resume`

Find your Railway URL in the Railway Dashboard.

