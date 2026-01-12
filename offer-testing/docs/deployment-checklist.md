# Deployment Checklist - Atherial Campaign

## ✅ Pre-Deployment Checklist

### 1. Code Changes Complete
- ✅ Variant 5 added to message templates
- ✅ 200 messages updated with Variant 5 (firstname filled in)
- ✅ Do Not Message table created
- ✅ 26 people added to do_not_message table
- ✅ Their messages removed from campaign (971 remaining)
- ✅ Resend notification timing updated (7am, noon, 4pm, 7pm ET)
- ✅ Script checks do_not_message before generating messages

### 2. Database Migrations Applied
- ✅ `do_not_message` table created
- ✅ All 26 people added to exclusion list
- ✅ Messages deleted for excluded people

### 3. Message Status
- **Total messages:** 971
- **Status:** All pending (ready to send)
- **Variants:** Randomly distributed (1-5)
- **Scheduled:** 6-16 minutes apart
- **Timeline:** ~8 days total

## 🚀 Deployment Steps

### Step 1: Push to GitHub

```bash
# Check what files changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Add variant 5, do_not_message table, update digest timing to 7am/noon/4pm/7pm ET"

# Push to main branch
git push origin main
```

### Step 2: Verify Railway Deployment

1. **Go to Railway Dashboard:**
   - https://railway.app → Your Project

2. **Check Deployment:**
   - Go to "Deployments" tab
   - Wait for new deployment to complete
   - Check logs for any errors

3. **Verify Environment Variables:**
   - Go to "Variables" tab
   - Ensure all required vars are set:
     - `UNIPILE_DSN`
     - `UNIPILE_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `RESEND_API_KEY`
     - `NOTIFICATION_EMAIL`
     - `SUMBLE_API_KEY`

### Step 3: Configure Cron Job (CRITICAL!)

**Railway Dashboard → Settings → Cron Schedule:**

1. **Schedule:** `*/5 * * * *` (every 5 minutes) ✅ Should already be set

2. **Command:** Set to:
   ```
   cd offer-testing && node scripts/process-message-queue.js
   ```
   OR:
   ```
   node offer-testing/scripts/process-message-queue.js
   ```

3. **Verify:**
   - Click "Run now" to test
   - Check logs immediately
   - Should see: `🚀 Message Queue Processor Starting...`

### Step 4: Test Cron Job

1. **Manual Test:**
   - Railway Dashboard → Cron Runs
   - Click "Run now"
   - Check logs

2. **Expected Log Output:**
   ```
   🚀 Message Queue Processor Starting...
   ⏰ Current time: [timestamp]
   🔧 Environment check:
      UNIPILE_DSN: SET
      UNIPILE_API_KEY: SET
      ...
   🔍 Checking for due messages...
   📤 Found X due networking message(s)
   ```

3. **Verify Messages Send:**
   - Check Supabase: `networking_outreach` table
   - Status should change from `pending` → `sent`
   - `sent_at` timestamp should be populated

### Step 5: Monitor First Few Messages

1. **Check Email Notifications:**
   - You should receive digest emails at 7am, noon, 4pm, 7pm ET
   - First digest will include all messages sent since last digest

2. **Check Database:**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'sent') as sent,
     COUNT(*) FILTER (WHERE status = 'pending') as pending,
     COUNT(*) FILTER (WHERE status = 'failed') as failed
   FROM networking_outreach
   WHERE batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1');
   ```

3. **Check Unipile:**
   - Go to Unipile dashboard
   - Verify messages are appearing in sent messages

## 📊 Post-Deployment Verification

### Verify Variant 5 Messages
```sql
SELECT 
  COUNT(*) as variant_5_count,
  COUNT(*) FILTER (WHERE personalized_message LIKE '%going great%') as has_variant_5_content
FROM networking_outreach
WHERE personalization_notes LIKE 'Variant 5%'
AND batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1');
```

### Verify Do Not Message List
```sql
SELECT COUNT(*) as blocked_count
FROM do_not_message;
-- Should be 26
```

### Verify Excluded People Don't Have Messages
```sql
SELECT COUNT(*) as excluded_messages
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
JOIN do_not_message dnm ON lc.linkedin_url = dnm.linkedin_url
WHERE no.batch_id = (SELECT id FROM networking_campaign_batches WHERE slug = 'atherial-ai-roleplay-2025-q1');
-- Should be 0
```

### Verify Digest Timing
- Check logs for: `📭 Next digest email will be sent at: [time] ET`
- Should show one of: 7am, noon, 4pm, or 7pm ET

## ⚠️ Common Issues

### Cron Not Running
- **Check:** Railway Dashboard → Settings → Cron Schedule → Command
- **Fix:** Set command to: `cd offer-testing && node scripts/process-message-queue.js`

### Messages Not Sending
- **Check:** `scheduled_at <= NOW()` in database
- **Check:** Unipile account is connected
- **Check:** Rate limits not exceeded

### Digest Emails Not Coming
- **Check:** `RESEND_API_KEY` and `NOTIFICATION_EMAIL` are set
- **Check:** Logs show digest check happening
- **Wait:** Emails only send at 7am, noon, 4pm, 7pm ET

## 📝 Summary

**Ready to Deploy:**
- ✅ 971 messages ready (26 excluded people removed)
- ✅ Variant 5 included and personalized
- ✅ Do Not Message system active
- ✅ Digest emails scheduled for 7am, noon, 4pm, 7pm ET
- ✅ Script updated to check exclusions

**Next Actions:**
1. Push to GitHub
2. Wait for Railway deployment
3. Verify cron command in Railway Settings
4. Test with "Run now"
5. Monitor first few messages
