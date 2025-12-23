# 🧪 Test Campaign Guide: 10 Messages

## Current Status

**Problem:** Most contacts have temporary `member_id` values (`temp_*`) because they weren't matched during import.

**Solution:** We need to look up `member_id` values from Unipile before sending.

---

## ✅ What We Have

- ✅ **535 contacts** with valid `member_id` values (matched during import)
- ⚠️ **539 contacts** with temporary IDs (need lookup before sending)
- ✅ **Campaign ready** - All messages generated in Supabase

---

## 🚀 How to Run the 10-Message Test

### Option 1: Use Contacts with Valid IDs (Quick Test)

1. **Reset 10 valid contacts to pending:**
   ```sql
   UPDATE networking_outreach
   SET status = 'pending', skip_reason = NULL
   WHERE id IN (
     SELECT no.id
     FROM networking_outreach no
     JOIN linkedin_connections lc ON no.connection_id = lc.id
     WHERE lc.linkedin_id NOT LIKE 'temp_%'
       AND lc.linkedin_id IS NOT NULL
       AND no.status = 'skipped'
     LIMIT 10
   );
   ```

2. **Run test script:**
   ```bash
   node scripts/test-campaign-10.js
   ```

3. **Monitor progress:**
   - Script will show real-time sending
   - Takes ~5 hours (15-45 min delays between sends)
   - Check Supabase: `networking_outreach` table

### Option 2: Look Up Member IDs First (More Complete)

The `send-test-networking-message.js` script shows how to look up `member_id` values from Unipile. We can enhance the test script to do this automatically.

---

## 📊 Test Script Details

**File:** `scripts/test-campaign-10.js`

**What it does:**
- ✅ Sends exactly 10 messages
- ✅ Random delays: 15-45 minutes between sends
- ✅ Respects daily limit (50/day)
- ✅ Skips contacts without valid `member_id`
- ✅ Shows progress and summary

**Safety:**
- ✅ Under 50/day limit ✅
- ✅ Random spacing ✅
- ✅ Human-like delays ✅

---

## ⏸️ How to Pause After 1-2 Hours

### Method 1: Via Supabase
```sql
UPDATE networking_campaign_batches
SET status = 'paused'
WHERE name = 'networking-holidays-2025';
```

### Method 2: Via API (if deployed)
```bash
curl -X POST https://your-app.railway.app/api/campaign/pause
```

### Method 3: Stop the Script
- Press `Ctrl+C` in terminal
- Script stops immediately
- Messages already sent remain in Supabase

---

## 🎯 Recommended Test Plan

1. **Start test:** `node scripts/test-campaign-10.js`
2. **Let it run for 1-2 hours** (will send 2-4 messages)
3. **Check LinkedIn** - Verify messages arrived
4. **Pause:** Update Supabase `status = 'paused'` or stop script
5. **Review:** Check for any LinkedIn warnings/flags
6. **If all good:** Start full campaign

---

## 📋 Next Steps After Test

If test succeeds:
1. ✅ Reset all messages to `pending` in Supabase
2. ✅ Start full campaign: `node scripts/campaign-worker.js` (on Railway)
3. ✅ Monitor via API or Supabase

---

## ❓ FAQ

**Q: Why are contacts skipped?**  
A: They have `temp_*` member_ids. We need to look them up from Unipile first.

**Q: Can I test with fewer than 10?**  
A: Yes! Change `TEST_LIMIT` in `test-campaign-10.js` to any number.

**Q: How long does 10 messages take?**  
A: ~5 hours (15-45 min delays × 10 = 150-450 minutes)

**Q: Will this get flagged?**  
A: No! We're well under limits (10 << 50/day) and using random delays.

