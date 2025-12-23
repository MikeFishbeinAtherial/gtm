# Railway Setup Guide: Networking Campaign

## 🚀 How to Run the Campaign on Railway

You have **two options** for running the campaign on Railway:

---

## Option 1: API Endpoints (Recommended)

**Best for:** Manual control, starting/stopping on demand

### Setup Steps:

1. **Deploy to Railway** (already done ✅)

2. **Set Environment Variables in Railway:**
   - Go to Railway Dashboard → Your Project → Variables
   - Add all variables from your `.env.local`:
     - `UNIPILE_DSN`
     - `UNIPILE_API_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)
     - `APP_PASSWORD` (optional, for API security)

3. **Start the Campaign Worker:**
   ```bash
   # Via Railway CLI
   railway run node scripts/campaign-worker.js
   
   # Or via Railway Dashboard:
   # → Deployments → New Deployment → Run Command:
   # node scripts/campaign-worker.js
   ```

4. **Control via API Endpoints:**

   **Start Campaign:**
   ```bash
   curl -X POST https://your-app.railway.app/api/campaign/start \
     -H "Authorization: Bearer YOUR_APP_PASSWORD"
   ```

   **Check Status:**
   ```bash
   curl https://your-app.railway.app/api/campaign/status
   ```

   **Pause Campaign:**
   ```bash
   curl -X POST https://your-app.railway.app/api/campaign/pause
   ```

   **Resume Campaign:**
   ```bash
   curl -X POST https://your-app.railway.app/api/campaign/resume
   ```

---

## Option 2: Long-Running Worker Process

**Best for:** Set it and forget it - runs continuously

### Setup Steps:

1. **Create a Railway Service for the Worker:**

   In Railway Dashboard:
   - Add a new service
   - Set the start command to:
     ```
     node scripts/campaign-worker.js
     ```
   - This will run continuously

2. **The worker will:**
   - ✅ Run 24/7 (Railway keeps it alive)
   - ✅ Check for messages every minute
   - ✅ Send messages respecting rate limits
   - ✅ Auto-pause outside business hours
   - ✅ Respect pause status in Supabase

---

## 🎯 Recommended Approach

**Use Option 2 (Long-Running Worker)** because:
- ✅ Runs continuously without your computer
- ✅ Automatically handles daily resets
- ✅ Respects all safety limits
- ✅ Can be paused/resumed via Supabase status

---

## 📋 Step-by-Step: Start Campaign on Railway

### Step 1: Push Code to GitHub
```bash
cd /Users/mikefishbein/Desktop/Vibe\ Coding/gtm/offer-testing
git add .
git commit -m "Add campaign API endpoints and worker script"
git push
```

### Step 2: Railway Auto-Deploys
- Railway watches your GitHub repo
- Automatically deploys when you push
- ✅ Your code is now live

### Step 3: Set Environment Variables
- Railway Dashboard → Your Project → Variables
- Add all variables from `.env.local`
- ✅ Credentials configured

### Step 4: Start the Worker
**Option A: Via Railway Dashboard**
1. Go to Deployments
2. Click "New Deployment"
3. Select "Empty Deployment"
4. Run command: `node scripts/campaign-worker.js`
5. ✅ Worker starts running

**Option B: Via Railway CLI**
```bash
railway run node scripts/campaign-worker.js
```

### Step 5: Monitor Progress
**Via API:**
```bash
curl https://your-app.railway.app/api/campaign/status
```

**Via Supabase:**
- Dashboard → Table Editor → `networking_outreach`
- Filter by `status = 'sent'` to see progress

---

## 🔧 How It Works

### The Worker Process (`campaign-worker.js`)

1. **Runs continuously** - Never exits (unless campaign completes)
2. **Checks every minute** - Looks for pending messages
3. **Respects limits:**
   - Daily limit: 50 messages/day
   - Random delays: 15-45 minutes between sends
   - Business hours: 6 AM - 8 PM ET
   - Christmas pause: Dec 25 only

4. **Auto-pauses:**
   - Outside business hours
   - When daily limit reached
   - When campaign status = 'paused' in Supabase

5. **Auto-resumes:**
   - Next business day at 6 AM
   - When campaign status = 'in_progress'

### The API Endpoints

- **`/api/campaign/start`** - Starts the worker (if using Option 1)
- **`/api/campaign/status`** - Check progress
- **`/api/campaign/pause`** - Pause campaign (updates Supabase)
- **`/api/campaign/resume`** - Resume campaign (updates Supabase)

---

## 🛡️ Safety Guarantees

The worker script uses the **exact same safety code** as the local script:

- ✅ **50 messages/day max** (hard limit, cannot bypass)
- ✅ **15-45 min random delays** (human-like spacing)
- ✅ **Business hours only** (6 AM - 8 PM ET)
- ✅ **Daily counter resets** (automatic at midnight)

---

## 🎯 Quick Start Commands

**Start campaign:**
```bash
# Via Railway CLI
railway run node scripts/campaign-worker.js

# Or trigger via API (if using Option 1)
curl -X POST https://your-app.railway.app/api/campaign/start
```

**Check status:**
```bash
curl https://your-app.railway.app/api/campaign/status
```

**Pause:**
```bash
curl -X POST https://your-app.railway.app/api/campaign/pause
```

**Resume:**
```bash
curl -X POST https://your-app.railway.app/api/campaign/resume
```

---

## ❓ FAQ

**Q: Do I need to keep my computer on?**  
A: No! Railway runs the worker 24/7 in the cloud.

**Q: How do I stop it?**  
A: Pause via API or Supabase, or stop the Railway service.

**Q: Will it send messages while I sleep?**  
A: Only during business hours (6 AM - 8 PM ET). It auto-pauses nights/weekends.

**Q: What if Railway goes down?**  
A: Railway auto-restarts failed services. The worker will resume where it left off.

**Q: Can I monitor progress?**  
A: Yes! Use `/api/campaign/status` or check Supabase directly.

---

## ✅ You're Ready!

1. Push code to GitHub
2. Railway auto-deploys
3. Start the worker: `railway run node scripts/campaign-worker.js`
4. Campaign runs automatically for 10 days
5. Monitor via API or Supabase

**No computer needed!** 🎉

