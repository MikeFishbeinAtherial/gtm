# 🚀 Start Campaign on Railway - Quick Guide

## ✅ Code is Pushed to GitHub

Railway should auto-deploy when you push. Let's verify and start the campaign.

---

## Step 1: Verify Railway Deployment

1. Go to Railway Dashboard → Your Project
2. Check "Deployments" tab
3. Look for latest deployment (should show your recent commit)
4. ✅ If deployed, you're ready!

---

## Step 2: Start the Campaign Worker

### Option A: Railway Dashboard (Easiest)

1. Railway Dashboard → Your Project
2. Click **"+ New"** → **"Service"**
3. Select **"Empty Service"**
4. Set **Start Command** to:
   ```
   node scripts/test-campaign-10.js
   ```
   (For 10-message test)
   
   OR for full campaign:
   ```
   node scripts/campaign-worker.js
   ```
5. Click **"Deploy"**
6. ✅ Worker starts running!

### Option B: Railway CLI

```bash
# For 10-message test
railway run node scripts/test-campaign-10.js

# OR for full campaign (all pending messages)
railway run node scripts/campaign-worker.js
```

---

## Step 3: Monitor Progress

### Via Railway Logs:
- Railway Dashboard → Your Worker Service → **"Logs"** tab
- See real-time: "📤 Sending to: [Name]", "✅ Sent successfully"

### Via Supabase:
- Dashboard → Table Editor → `networking_outreach`
- Filter: `status = 'sent'` to see progress

### Via API:
```bash
curl https://your-app.railway.app/api/campaign/status
```

---

## ✅ Safety Guarantees

- ✅ **Won't re-send**: Only queries `status = 'pending'` (skips `sent`)
- ✅ **Under 50/day**: Hard limit enforced
- ✅ **Random delays**: 15-45 minutes between sends
- ✅ **Business hours**: 6 AM - 8 PM ET only

---

## 📊 Current Status

- **Sent so far:** 2 messages
- **Pending:** 9 messages (for 10-message test)
- **Ready to resume:** Yes!

---

## 🎯 What Happens Next

1. Worker starts on Railway
2. Checks Supabase for `status = 'pending'` messages
3. Sends messages one by one (15-45 min delays)
4. Updates status to `sent` after each message
5. **Won't touch the 2 already sent** ✅

---

## ⏸️ To Pause

**Via Supabase:**
```sql
UPDATE networking_campaign_batches
SET status = 'paused'
WHERE name = 'networking-holidays-2025';
```

**Via API:**
```bash
curl -X POST https://your-app.railway.app/api/campaign/pause
```

---

## 🚀 Ready to Start!

Run this command:
```bash
railway run node scripts/test-campaign-10.js
```

Or use Railway Dashboard to create a new service with that start command.

