# Unipile Relations Cache System

**Last Updated:** January 12, 2026  
**Purpose:** Cache Unipile relations locally to avoid repeated API calls

---

## 🎯 The Problem

Every time we need to look up LinkedIn member IDs, we fetch all 7,671+ relations from Unipile API. This:
- Takes 5-10 minutes
- Hits API rate limits
- Slows down scripts significantly

---

## ✅ The Solution: Local Cache

We now store Unipile relations in Supabase so lookups are instant!

### How It Works:

1. **Cache Table:** `unipile_relations_cache`
   - Stores all your LinkedIn connections from Unipile
   - Includes member IDs, URLs, names, etc.
   - Refreshed periodically

2. **Automatic Cache Usage:**
   - Scripts check cache first
   - If cache is fresh (< 7 days old), use it
   - If cache is stale or missing, fetch from API and update cache

3. **Cache Refresh:**
   - Run `cache-unipile-relations.js` daily/weekly
   - Or it auto-refreshes when scripts detect stale cache

---

## 📋 Setup

### Step 1: Create Cache Table

**Already done!** ✅ The migration was applied via Supabase MCP.

### Step 2: Populate Cache

```bash
cd offer-testing
node scripts/cache-unipile-relations.js
```

This will:
- Fetch all relations from Unipile
- Store them in `unipile_relations_cache` table
- Take ~5-10 minutes (one time)

### Step 3: Use Cached Data

All scripts now automatically use the cache:
- `fix-campaign-linkedin-ids.js` - Uses cache if available
- `import-networking-contacts.js` - Uses cache if available
- Any script that needs member IDs

---

## 🔄 Cache Refresh

### When to Refresh:

- **Weekly:** Recommended for active campaigns
- **After new connections:** If you've added many new LinkedIn connections
- **When cache is stale:** Scripts will auto-refresh if cache > 7 days old

### How to Refresh:

```bash
node scripts/cache-unipile-relations.js
```

**What it does:**
- Fetches latest relations from Unipile
- Updates existing records
- Adds new connections
- Removes connections that are no longer in your network

---

## 📊 Cache Status

### Check Cache Freshness:

```sql
SELECT 
    COUNT(*) as total_cached,
    MIN(cached_at) as oldest_cache,
    MAX(cached_at) as newest_cache,
    EXTRACT(EPOCH FROM (NOW() - MAX(cached_at))) / 3600 as hours_old,
    CASE 
        WHEN MAX(cached_at) < NOW() - INTERVAL '7 days' THEN 'NEEDS_REFRESH'
        ELSE 'FRESH'
    END as status
FROM unipile_relations_cache;
```

### Find Member ID from Cache:

```sql
-- By URL
SELECT member_id, full_name, public_profile_url
FROM unipile_relations_cache
WHERE public_profile_url = 'https://linkedin.com/in/john-doe'
   OR public_profile_url = LOWER('https://linkedin.com/in/john-doe/');

-- By username
SELECT member_id, full_name
FROM unipile_relations_cache
WHERE public_identifier = 'john-doe';
```

---

## 🚀 Performance Benefits

### Before (No Cache):
- **Time:** 5-10 minutes to fetch relations
- **API Calls:** 300+ requests (pagination)
- **Rate Limits:** Risk of hitting limits

### After (With Cache):
- **Time:** < 1 second to load from database
- **API Calls:** 0 (uses cache)
- **Rate Limits:** No risk

---

## 📝 Script Updates

All scripts that fetch Unipile relations now:
1. ✅ Check cache first
2. ✅ Use cache if fresh (< 7 days)
3. ✅ Auto-fetch and update cache if stale
4. ✅ Show progress indicators

---

## 🔍 Monitoring

### Check Cache Size:

```sql
SELECT COUNT(*) FROM unipile_relations_cache;
-- Should match your LinkedIn connection count (~7,671)
```

### Check Cache Age:

```sql
SELECT 
    MAX(cached_at) as last_refresh,
    NOW() - MAX(cached_at) as age
FROM unipile_relations_cache;
```

### Find Missing Connections:

```sql
-- Connections in campaigns but not in cache
SELECT DISTINCT lc.linkedin_url
FROM linkedin_connections lc
JOIN networking_outreach no ON lc.id = no.connection_id
LEFT JOIN unipile_relations_cache urc ON urc.public_profile_url = lc.linkedin_url
WHERE urc.id IS NULL
LIMIT 10;
```

---

## 💡 Best Practices

1. **Refresh Weekly:** Keep cache up to date
2. **Monitor Cache Size:** Should match your connection count
3. **Check Cache Age:** Refresh if > 7 days old
4. **Use Helper Function:** `get_member_id_from_cache()` for lookups

---

**Related Files:**
- `scripts/cache-unipile-relations.js` - Populate/refresh cache
- `scripts/create-unipile-cache-table.sql` - Table schema
- `scripts/fix-campaign-linkedin-ids.js` - Uses cache automatically
