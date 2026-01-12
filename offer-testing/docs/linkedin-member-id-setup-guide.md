# LinkedIn Member ID Setup Guide

**Last Updated:** January 12, 2026  
**Purpose:** How to get LinkedIn member IDs from Unipile for campaigns

---

## 🎯 The Problem

When importing LinkedIn contacts from CSV, you typically only have:
- **LinkedIn URLs** (e.g., `https://linkedin.com/in/john-doe`)
- **Names, companies, etc.**

But Unipile API requires:
- **LinkedIn Member IDs** (e.g., `ACoAAABz-a4B50KjbWZWNBfLlnU_QnJGUY2pQ7U`)

**Without member IDs, messages will fail with 422 errors: "Recipient cannot be reached"**

---

## 🔍 Why "temp_" Prefix Exists

### What Happens During CSV Import:

1. **CSV has URLs, not member IDs**
2. **Import script creates temporary IDs:**
   - If URL available: Uses username (e.g., `john-doe`)
   - If no URL: Creates `temp_xxxxx` hash from name+company

### Why This Causes Problems:

1. **Unipile can't send to usernames** - Needs actual member IDs
2. **Deduplication fails** - Multiple connections can have same username but different member IDs
3. **Messages fail** - 422 errors when trying to send

### Example:

```javascript
// CSV import creates:
linkedin_id: "john-doe"  // ❌ This is a username, not a member ID

// Unipile needs:
linkedin_id: "ACoAAABz-a4B50KjbWZWNBfLlnU_QnJGUY2pQ7U"  // ✅ Real member ID
```

---

## ✅ Solution: Get Member IDs from Unipile

### Step 1: Run the Fix Script

**For a specific campaign:**
```bash
cd offer-testing
node scripts/fix-campaign-linkedin-ids.js <campaign-name>
```

**Examples:**
```bash
# By campaign name
node scripts/fix-campaign-linkedin-ids.js networking-holidays-2025
node scripts/fix-campaign-linkedin-ids.js sales-roleplay-trainer-2025

# By campaign ID
node scripts/fix-campaign-linkedin-ids.js d38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8
```

### What the Script Does:

1. **Fetches all your LinkedIn connections from Unipile** (via `/users/relations`)
2. **Matches CSV contacts to Unipile connections** by:
   - LinkedIn URL (exact match)
   - Username (normalized, ignoring numeric suffixes)
3. **Updates database** with real member IDs
4. **Handles duplicates** - Skips if member ID already exists for another connection

### Step 2: Verify the Fix

```sql
-- Check how many still have invalid IDs
SELECT COUNT(*) 
FROM linkedin_connections lc
JOIN networking_outreach no ON lc.id = no.connection_id
JOIN networking_campaign_batches ncb ON no.batch_id = ncb.id
WHERE ncb.name = 'your-campaign-name'
  AND (
    lc.linkedin_id LIKE 'temp_%' 
    OR lc.linkedin_id ~ '^[a-z0-9-]+$'  -- Looks like username
  );
```

### Step 3: Reset Failed Messages (if any)

```sql
UPDATE networking_outreach
SET status = 'pending',
    scheduled_at = NOW() + INTERVAL '1 day',
    skip_reason = NULL
WHERE status = 'failed' 
  AND batch_id = (SELECT id FROM networking_campaign_batches WHERE name = 'your-campaign-name');
```

---

## 📋 Best Practices for Future Campaigns

### Option 1: Use `import-networking-contacts.js` (Recommended)

This script automatically matches contacts with Unipile relations and gets member IDs:

```bash
node scripts/import-networking-contacts.js your-contacts.json
```

**Benefits:**
- ✅ Automatically gets member IDs from Unipile
- ✅ Matches by URL and username
- ✅ Handles duplicates
- ✅ Creates both `linkedin_connections` and `networking_outreach` records

### Option 2: Import CSV, Then Fix IDs

If you've already imported via CSV:

```bash
# 1. Import CSV (creates temp IDs)
node scripts/import-linkedin-csv.js

# 2. Fix member IDs for your campaign
node scripts/fix-campaign-linkedin-ids.js your-campaign-name
```

### Option 3: Use `regenerate-networking-messages.js`

This script re-matches existing connections with Unipile:

```bash
node scripts/regenerate-networking-messages.js networking-holidays-2025
```

---

## 🔍 How Member ID Lookup Works

### Method 1: Unipile Relations (Fastest)

```javascript
// Get all your 1st-degree connections
GET /users/relations?account_id=xxx

// Response includes:
{
  "items": [
    {
      "member_id": "ACoAAABz-a4B50KjbWZWNBfLlnU_QnJGUY2pQ7U",
      "public_profile_url": "https://linkedin.com/in/john-doe",
      "public_identifier": "john-doe",
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}

// Match by URL or username
const match = relations.find(rel => 
  rel.public_profile_url.includes(username) ||
  rel.public_identifier === username
);
```

### Method 2: Unipile Profile Endpoint (Slower)

```javascript
// Query specific profile
POST /linkedin/profile
{
  "account_id": "xxx",
  "profile_url": "https://linkedin.com/in/john-doe"
}

// Response includes member ID
{
  "id": "ACoAAABz-a4B50KjbWZWNBfLlnU_QnJGUY2pQ7U",
  ...
}
```

**Note:** Method 1 is preferred because it's faster and gets all connections at once.

---

## ⚠️ Common Issues

### Issue 1: "Not found in Unipile relations"

**Cause:** Contact is not in your 1st-degree LinkedIn connections

**Solution:**
- They need to be a 1st-degree connection for Unipile to have their member ID
- Check if they're actually connected on LinkedIn
- If not connected, you can't send them messages via Unipile

### Issue 2: "Duplicate key constraint"

**Cause:** Multiple connection records with same LinkedIn ID

**Solution:**
- Script automatically handles this by checking for existing IDs
- Consider running `cleanup-temp-duplicates.js` to merge duplicates

### Issue 3: "Member ID already exists for another connection"

**Cause:** You have duplicate connection records

**Solution:**
- This is actually OK - means the correct ID is already stored
- The script skips these to avoid duplicates
- Consider cleaning up duplicate records

---

## ✅ Verification Checklist

Before sending a campaign, verify:

- [ ] All connections have valid member IDs (not `temp_` or usernames)
- [ ] No failed messages from previous runs
- [ ] Messages are scheduled appropriately
- [ ] Campaign status is set correctly

**Quick check:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN lc.linkedin_id LIKE 'temp_%' THEN 1 END) as temp_ids,
  COUNT(CASE WHEN lc.linkedin_id ~ '^[a-z0-9-]+$' THEN 1 END) as usernames,
  COUNT(CASE WHEN lc.linkedin_id LIKE 'ACo%' OR lc.linkedin_id LIKE 'urn:%' THEN 1 END) as valid_ids
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.batch_id = (SELECT id FROM networking_campaign_batches WHERE name = 'your-campaign');
```

**All should be valid_ids, temp_ids and usernames should be 0.**

---

## 📝 Summary

1. **Always get member IDs from Unipile** - Don't rely on CSV imports alone
2. **Run fix script after CSV import** - `fix-campaign-linkedin-ids.js`
3. **Use `import-networking-contacts.js`** - For new campaigns (handles IDs automatically)
4. **Verify before sending** - Check that all IDs are valid
5. **Handle duplicates** - Use cleanup scripts if needed

---

**Related Scripts:**
- `scripts/fix-campaign-linkedin-ids.js` - Fix IDs for any campaign
- `scripts/import-networking-contacts.js` - Import with automatic ID lookup
- `scripts/regenerate-networking-messages.js` - Re-match existing connections
- `scripts/cleanup-temp-duplicates.js` - Remove duplicate connection records
