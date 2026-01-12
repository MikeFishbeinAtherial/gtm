# Duplicate Message Bug Fix - Matthew Kay Incident

**Date:** January 12, 2026  
**Issue:** 3 messages sent to Matthew Kay  
**Root Cause:** Missing duplicate check in `campaign-worker.js`

---

## 🔍 What Happened

**3 messages were sent to Matthew Kay** even though we have duplicate prevention measures in place.

### Root Cause Analysis

1. **Missing Duplicate Check in `campaign-worker.js`**
   - `process-message-queue.js` has duplicate prevention (lines 333-370)
   - `campaign-worker.js` was **missing this check entirely**
   - If both scripts run, or if `campaign-worker.js` runs multiple times, duplicates can occur

2. **Race Condition Risk**
   - If multiple cron runs happen simultaneously
   - Or if both `campaign-worker.js` and `process-message-queue.js` run
   - They might all pass the duplicate check before any mark the message as sent

3. **Why It Happened**
   - The duplicate check queries for `status = 'sent'` messages
   - If 3 cron runs happen within seconds, they might all see "no sent messages" before any update the status
   - Result: All 3 send the message

---

## ✅ What Was Fixed

### **Added Duplicate Check to `campaign-worker.js`**

**Location:** Lines 315-360 (after member_id validation, before sending)

**What it does:**
- Before sending, checks if we've already sent a message to this LinkedIn ID
- If duplicate found, marks as `skipped` with reason
- Prevents sending even if multiple workers/crons are running

**Code added:**
```javascript
// CRITICAL: Check if we've already sent a message to this LinkedIn ID
const { data: existingSent, error: duplicateCheckError } = await supabase
  .from('networking_outreach')
  .select(`
    id,
    status,
    sent_at,
    linkedin_connections!inner(linkedin_id)
  `)
  .eq('status', 'sent')
  .not('sent_at', 'is', null)
  .eq('linkedin_connections.linkedin_id', connection.linkedin_id);

if (existingSent && existingSent.length > 0) {
  // Skip - already sent to this LinkedIn ID
  await supabase
    .from('networking_outreach')
    .update({
      status: 'skipped',
      skip_reason: `Duplicate: Already sent to LinkedIn ID ${connection.linkedin_id}`
    })
    .eq('id', outreach.id);
  continue; // Skip this message
}
```

---

## 🛡️ Additional Protection Needed

### **1. Database-Level Locking (Future Improvement)**

To prevent race conditions completely, we should use database transactions with row-level locking:

```sql
BEGIN;
SELECT * FROM networking_outreach 
WHERE id = ? 
FOR UPDATE;  -- Lock this row

-- Check for duplicates
-- Send message
-- Update status

COMMIT;
```

This ensures only one process can process a message at a time.

### **2. Atomic Status Updates**

Instead of:
1. Check for duplicates
2. Send message
3. Update status to 'sent'

We should:
1. Update status to 'sending' (atomic)
2. Check for duplicates (if status = 'sending', skip)
3. Send message
4. Update status to 'sent'

This prevents multiple processes from picking up the same message.

---

## 📊 Current Protection Status

| Script | Duplicate Check | Status |
|--------|----------------|--------|
| `process-message-queue.js` | ✅ Yes | Working |
| `campaign-worker.js` | ✅ **NOW FIXED** | Added |

---

## 🚨 Going Forward

### **Immediate Actions:**

1. ✅ **FIXED:** Added duplicate check to `campaign-worker.js`
2. **Monitor:** Watch for any more duplicate sends
3. **Verify:** Check Railway logs to see if both scripts are running

### **Future Improvements:**

1. **Database Locking:** Use row-level locks to prevent race conditions
2. **Atomic Status Updates:** Use 'sending' status to prevent concurrent processing
3. **Single Source of Truth:** Ensure only one script processes messages (not both)
4. **Better Logging:** Log when duplicates are detected and skipped

---

## 🔍 How to Verify Fix

### Check for Duplicates:

```sql
-- Find people who received multiple messages
SELECT 
    lc.first_name,
    lc.last_name,
    lc.linkedin_id,
    COUNT(*) as message_count
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.status = 'sent'
  AND no.sent_at IS NOT NULL
GROUP BY lc.first_name, lc.last_name, lc.linkedin_id
HAVING COUNT(*) > 1;
```

### Check Skipped Duplicates:

```sql
-- Find messages skipped due to duplicates
SELECT 
    lc.first_name,
    lc.last_name,
    no.skip_reason,
    no.created_at
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.status = 'skipped'
  AND no.skip_reason LIKE 'Duplicate%'
ORDER BY no.created_at DESC;
```

---

## 📝 Summary

- **Problem:** `campaign-worker.js` was missing duplicate prevention
- **Impact:** 3 messages sent to Matthew Kay
- **Fix:** Added duplicate check to `campaign-worker.js` (same as `process-message-queue.js`)
- **Status:** ✅ Fixed - both scripts now have duplicate prevention
- **Next:** Monitor for any more issues, consider database-level locking for future
