# LinkedIn ID Fix Guide

**Date:** January 12, 2026  
**Issue:** Failed messages (422 errors) due to missing/invalid LinkedIn IDs

---

## 📊 Database Schema

### Column Used for LinkedIn ID

**Table:** `linkedin_connections`  
**Column:** `linkedin_id` (TEXT, UNIQUE, NOT NULL)

This is the column that stores LinkedIn's internal member ID (format: `urn:li:person:xxx` or just the member ID string).

**Related Column:** `linkedin_url` (TEXT) - Stores the public profile URL

---

## 🎯 Happy New Year Campaign

**Campaign Name:** `networking-holidays-2025`  
**Campaign Type:** Networking campaign (1st-degree connections)

### What We Used:

1. **CSV Import:** Your CSV had LinkedIn URLs but **no LinkedIn IDs**
2. **Temporary IDs:** The import script created temporary IDs like `temp_xxxxx` or used the username from the URL
3. **Problem:** Unipile API requires the actual LinkedIn member ID (not username) to send messages

---

## 🔍 How LinkedIn IDs Work

### LinkedIn URL vs LinkedIn ID

**LinkedIn URL (what you have):**
```
https://www.linkedin.com/in/pvomocil
https://www.linkedin.com/in/daverubinstein
```

**LinkedIn ID (what Unipile needs):**
```
urn:li:person:ABC123XYZ  (or just ABC123XYZ)
```

### The Problem:

- **CSV had:** LinkedIn URLs (e.g., `linkedin.com/in/pvomocil`)
- **Unipile needs:** LinkedIn member IDs (e.g., `urn:li:person:ABC123`)
- **What happened:** We stored the username (`pvomocil`) or a temp ID, but Unipile can't send to that

---

## ✅ Solution: Get LinkedIn IDs from Unipile

### Method 1: From Unipile Relations (Recommended)

Unipile's `/users/relations` endpoint returns all your 1st-degree connections with their member IDs. We can match by URL:

```javascript
// Get all relations
GET /users/relations?account_id=xxx

// Match by URL
relations.find(rel => {
  const relUrl = rel.public_profile_url;
  return relUrl.includes(username);
});

// Get member_id
const memberId = match.member_id || match.id;
```

### Method 2: From Unipile Profile Endpoint

If not in relations, try the profile endpoint:

```javascript
POST /linkedin/profile
{
  "account_id": "xxx",
  "profile_url": "https://linkedin.com/in/pvomocil"
}

// Response includes:
{
  "id": "urn:li:person:ABC123",
  ...
}
```

---

## 🛠️ Fix Script

I've created a script to fix the failed messages:

**File:** `scripts/fix-failed-messages-linkedin-ids.js`

### What It Does:

1. **Finds failed messages** from `networking-holidays-2025` campaign
2. **Gets LinkedIn IDs** from Unipile API (tries relations first, then profile endpoint)
3. **Updates database** with correct `linkedin_id` in `linkedin_connections` table
4. **Resets messages** to `pending` status with new `scheduled_at` (tomorrow at 9 AM)

### How to Run:

```bash
cd offer-testing
node scripts/fix-failed-messages-linkedin-ids.js
```

### What to Expect:

```
🔧 Fixing Failed Messages - Getting LinkedIn IDs from Unipile

📡 Fetching Unipile account...
✅ Using LinkedIn account: Mike Fishbein (eSaTTfPuRx6t131-4hjfSg)

📋 Finding networking-holidays-2025 campaign...
✅ Found campaign: networking-holidays-2025 (xxx)

🔍 Finding failed messages...
📊 Found 2 failed message(s)

👤 Processing: Pete Vomocil 💛
   URL: https://www.linkedin.com/in/pvomocil
   Current ID: pvomocil
   Error: HTTP 422: Recipient cannot be reached
   🔍 Trying to get member ID from Unipile relations...
   ✅ Found member ID from relations: urn:li:person:ABC123
   📝 Updating linkedin_id in database...
   ✅ Updated linkedin_id to: urn:li:person:ABC123
   📅 Rescheduling to: 2026-01-13T09:00:00.000Z
   ✅ Message reset to pending and rescheduled

📊 Summary:
   ✅ Fixed and rescheduled: 2
   ❌ Still failed: 0
   ⏭️  Skipped: 0
   📊 Total processed: 2
```

---

## 📝 Manual Fix (If Script Doesn't Work)

### Step 1: Find Failed Messages

```sql
SELECT 
  no.id,
  no.status,
  no.skip_reason,
  lc.first_name,
  lc.last_name,
  lc.linkedin_url,
  lc.linkedin_id
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
JOIN networking_campaign_batches ncb ON no.batch_id = ncb.id
WHERE ncb.name = 'networking-holidays-2025'
  AND no.status = 'failed';
```

### Step 2: Get LinkedIn ID from Unipile

Use the Unipile API or dashboard to find the member ID for each URL.

### Step 3: Update LinkedIn ID

```sql
UPDATE linkedin_connections
SET linkedin_id = 'urn:li:person:ABC123',
    updated_at = NOW()
WHERE linkedin_url = 'https://www.linkedin.com/in/pvomocil';
```

### Step 4: Reset Message to Pending

```sql
UPDATE networking_outreach
SET status = 'pending',
    scheduled_at = NOW() + INTERVAL '1 day',
    skip_reason = NULL,
    updated_at = NOW()
WHERE id = 'message-id-here';
```

---

## 🔄 Future Prevention

### When Importing CSV:

1. **Use `import-networking-contacts.js`** - This script:
   - Matches CSV contacts with Unipile relations
   - Gets real member IDs from Unipile
   - Stores correct `linkedin_id` in database

2. **Or use `regenerate-networking-messages.js`** - This script:
   - Re-matches connections with Unipile relations
   - Updates `linkedin_id` for existing connections
   - Regenerates messages with correct IDs

### Best Practice:

Always verify `linkedin_id` is not:
- A username (e.g., `pvomocil`)
- A temp ID (e.g., `temp_xxxxx`)
- NULL or empty

It should be:
- A member ID (e.g., `urn:li:person:ABC123`)
- Or a valid Unipile identifier

---

## 📊 Current Status

### Failed Messages (422 Errors):

The errors you saw:
- `pvomocil` - LinkedIn ID was username, not member ID
- `daverubinstein` - LinkedIn ID was username, not member ID

**Root Cause:** CSV import stored username instead of member ID

**Solution:** Run the fix script to get real member IDs from Unipile

---

## ✅ Next Steps

1. **Run the fix script:**
   ```bash
   node scripts/fix-failed-messages-linkedin-ids.js
   ```

2. **Verify the fix:**
   ```sql
   SELECT 
     lc.first_name,
     lc.linkedin_url,
     lc.linkedin_id,
     no.status,
     no.scheduled_at
   FROM networking_outreach no
   JOIN linkedin_connections lc ON no.connection_id = lc.id
   WHERE no.batch_id = (SELECT id FROM networking_campaign_batches WHERE name = 'networking-holidays-2025')
   ORDER BY no.scheduled_at;
   ```

3. **Monitor cron logs** - Messages should send successfully after rescheduling

---

**Last Updated:** January 12, 2026
