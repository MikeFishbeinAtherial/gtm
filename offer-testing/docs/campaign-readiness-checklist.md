# Campaign Readiness Checklist

**Last Updated:** January 12, 2026

---

## ✅ Pre-Send Checklist

Before sending any LinkedIn campaign, verify:

### 1. LinkedIn Member IDs ✅

**Check:**
```sql
SELECT 
  ncb.name as campaign_name,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN lc.linkedin_id LIKE 'temp_%' THEN 1 END) as temp_ids,
  COUNT(CASE WHEN lc.linkedin_id ~ '^[a-z0-9-]+$' AND lc.linkedin_id NOT LIKE 'urn:%' THEN 1 END) as usernames,
  COUNT(CASE WHEN lc.linkedin_id LIKE 'ACo%' OR lc.linkedin_id LIKE 'urn:%' THEN 1 END) as valid_ids
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
JOIN networking_campaign_batches ncb ON no.batch_id = ncb.id
WHERE ncb.name = 'your-campaign-name'
GROUP BY ncb.name;
```

**Fix if needed:**
```bash
node scripts/fix-campaign-linkedin-ids.js your-campaign-name
```

### 2. No Failed Messages ✅

**Check:**
```sql
SELECT COUNT(*) 
FROM networking_outreach 
WHERE batch_id = (SELECT id FROM networking_campaign_batches WHERE name = 'your-campaign-name')
  AND status = 'failed';
```

**Fix if needed:**
```sql
UPDATE networking_outreach
SET status = 'pending',
    scheduled_at = NOW() + INTERVAL '1 day',
    skip_reason = NULL
WHERE status = 'failed' 
  AND batch_id = (SELECT id FROM networking_campaign_batches WHERE name = 'your-campaign-name');
```

### 3. Messages Scheduled ✅

**Check:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN scheduled_at IS NULL THEN 1 END) as unscheduled,
  MIN(scheduled_at) as first_send,
  MAX(scheduled_at) as last_send
FROM networking_outreach
WHERE batch_id = (SELECT id FROM networking_campaign_batches WHERE name = 'your-campaign-name')
  AND status = 'pending';
```

### 4. Campaign Status ✅

**Check:**
```sql
SELECT name, status, sent_count, total_count
FROM networking_campaign_batches
WHERE name = 'your-campaign-name';
```

**Should be:** `status = 'ready'` or `'in_progress'`

---

## 🚀 Ready to Send?

**All checks pass?** ✅ You're ready!

The cron job will automatically:
- Process pending messages every 5 minutes
- Respect rate limits (5 min spacing, 1 per run)
- Handle errors gracefully
- Update status automatically

---

## 📝 Quick Fix Commands

**Fix LinkedIn IDs for any campaign:**
```bash
node scripts/fix-campaign-linkedin-ids.js <campaign-name>
```

**Reset failed messages:**
```sql
UPDATE networking_outreach
SET status = 'pending', scheduled_at = NOW() + INTERVAL '1 day', skip_reason = NULL
WHERE status = 'failed' AND batch_id = '<campaign-id>';
```

**Check campaign status:**
```sql
SELECT 
  ncb.name,
  COUNT(*) as total,
  COUNT(CASE WHEN no.status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN no.status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN no.status = 'failed' THEN 1 END) as failed
FROM networking_campaign_batches ncb
LEFT JOIN networking_outreach no ON ncb.id = no.batch_id
WHERE ncb.name = 'your-campaign-name'
GROUP BY ncb.name;
```
