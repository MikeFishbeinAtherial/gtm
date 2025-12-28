# ✅ Start Campaign on Railway

## Step 1: Verify Railway Auto-Deployed

1. Go to **Railway Dashboard** → Your Project
2. Click **"Deployments"** tab
3. Look for latest deployment (should show your recent commit)
4. Status should be **"Active"** ✅

**If you see a new deployment:** ✅ Code is deployed!

---

## Step 2: Start the Campaign Worker

### Method 1: Railway Dashboard (Recommended)

1. Railway Dashboard → Your Project
2. Click **"+ New"** → **"Service"**
3. Select **"Empty Service"**
4. Set **Start Command** to:
   ```
   node scripts/test-campaign-10.js
   ```
5. Click **"Deploy"**
6. ✅ Worker starts running!

### Method 2: Railway CLI

```bash
railway run node scripts/test-campaign-10.js
```

---

## Step 3: Watch It Work

### Railway Logs:
- Railway Dashboard → Your Worker Service → **"Logs"** tab
- You'll see:
  ```
  🧪 TEST CAMPAIGN - 10 Messages Only
  📤 [1/10] Sending to: [Name]
  ✅ Sent successfully
  ⏳ Next send in 23m 45s
  ```

### Supabase:
- Dashboard → Table Editor → `networking_outreach`
- Filter: `status = 'sent'`
- Watch the count increase

---

## ✅ Safety Confirmed

- ✅ **Won't re-send:** Only processes `status = 'pending'` (skips the 2 already sent)
- ✅ **Under 50/day:** Hard limit enforced
- ✅ **Random delays:** 15-45 minutes between sends
- ✅ **Business hours:** 6 AM - 8 PM ET only

---

## 📊 Current Status

- **Already sent:** 2 messages ✅
- **Pending:** 9 messages (will complete the 10-message test)
- **Total in campaign:** 539 messages (for full campaign later)

---

## 🎯 What Happens

1. Worker starts on Railway
2. Queries Supabase for `status = 'pending'` messages
3. Sends messages one by one (15-45 min delays)
4. Updates status to `sent` after each message
5. **Skips the 2 already sent** ✅

---

## ⏸️ To Pause Anytime

**Via Supabase:**
```sql
UPDATE networking_campaign_batches
SET status = 'paused'
WHERE name = 'networking-holidays-2025';
```

**Via Railway:**
- Dashboard → Your Worker Service → **"Stop"**

---

## 🚀 Ready!

Run this command:
```bash
railway run node scripts/test-campaign-10.js
```

Or use Railway Dashboard to create a new service.

**Your computer can be closed - Railway runs it!** 🎉

