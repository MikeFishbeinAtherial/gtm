# Networking Campaign - Quick Start Checklist

Use this checklist to get your networking campaign up and running.

## Phase 1: Setup (Do This First)

- [ ] **Fix Unipile Connection**
  - Go to Unipile dashboard and find your correct DSN
  - Test with curl (see docs/unipile-setup.md)
  - Update .env.local with correct UNIPILE_DSN

- [ ] **Create .env.local file**
  ```bash
  UNIPILE_API_KEY=2HdAnLfuG.8z5MjY+YB9oo3jxLmwpWbHTcvsJ6anI4dQj2uDG3XKo=
  UNIPILE_DSN=<your-correct-dsn>
  NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
  SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
  ```

- [ ] **Set up Supabase tables**
  - Open Supabase SQL Editor
  - Run scripts/setup-networking-schema.sql

- [ ] **Test Unipile connection**
  ```bash
  node scripts/test-unipile-simple.js
  ```
  Should show your connected LinkedIn account

## Phase 2: Pull Your Data

- [ ] **Sync LinkedIn connections and messages**
  ```bash
  npx ts-node --esm scripts/sync-linkedin.ts
  ```
  This pulls all your 1st-degree connections and message history

- [ ] **Verify data in Supabase**
  - Check linkedin_connections table
  - Check linkedin_messages table
  - Should see all your connections

## Phase 3: Prepare for Outreach

- [ ] **Mark people to skip**
  - Family members
  - Close personal friends
  - People you talk to regularly
  
  ```sql
  UPDATE linkedin_connections
  SET skip_outreach = TRUE, skip_reason = 'family'
  WHERE full_name IN ('Name 1', 'Name 2');
  ```

- [ ] **Set priorities** (optional but helpful)
  ```sql
  UPDATE linkedin_connections
  SET priority = 'high'
  WHERE <your criteria>;
  ```

- [ ] **Add tags** (optional)
  ```sql
  UPDATE linkedin_connections
  SET tags = ARRAY['college', 'friend']
  WHERE <your criteria>;
  ```

## Phase 4: Create Campaign

- [ ] **Write your message template**
  - Keep it warm and personal
  - No hard pitch
  - Holiday wishes + soft mention of services
  - See docs/networking-campaign-guide.md for examples

- [ ] **Create campaign batch in Supabase**
  ```sql
  INSERT INTO networking_campaign_batches (...)
  -- See guide for full SQL
  ```

- [ ] **Identify first batch** (20-30 people)
  ```sql
  SELECT * FROM networking_contacts_ready
  WHERE recency_category IN ('stale', 'very_stale')
  AND priority != 'low'
  LIMIT 30;
  ```

## Phase 5: Personalize & Send

- [ ] **Personalize each message**
  - Don't send generic messages!
  - Mention: where you met, their work, past conversation
  
- [ ] **Create outreach records**
  ```sql
  INSERT INTO networking_outreach (
    batch_id,
    connection_id,
    personalized_message,
    status
  ) VALUES (...);
  ```

- [ ] **Send messages** (20-25 per day max)
  - Send manually via LinkedIn (safest)
  - Space throughout the day
  - Business hours only

- [ ] **Mark as sent**
  ```sql
  UPDATE networking_outreach
  SET status = 'sent', sent_at = NOW()
  WHERE id = '...';
  ```

## Phase 6: Track & Follow Up

- [ ] **Check for replies daily**

- [ ] **Update database when people respond**
  ```sql
  UPDATE networking_outreach
  SET 
    status = 'replied',
    replied_at = NOW(),
    reply_text = '...',
    reply_sentiment = 'positive'
  WHERE id = '...';
  ```

- [ ] **Follow up on interested replies**
  - Book calls
  - Share more info
  - Ask for referrals

- [ ] **Track metrics**
  ```sql
  SELECT * FROM networking_batch_performance;
  ```

## Important Reminders

⚠️ **Rate Limits**: Max 40 LinkedIn messages/day (stay at 20-25 to be safe)

⚠️ **Personalization**: Don't send the same message to everyone

⚠️ **No Spam**: Skip people you talk to regularly

⚠️ **Timing**: Only send during business hours

⚠️ **Be Genuine**: This is about relationships, not just leads

## Quick Reference Commands

**Test Unipile:**
```bash
node scripts/test-unipile-simple.js
```

**Sync LinkedIn data:**
```bash
npx ts-node --esm scripts/sync-linkedin.ts
```

**See contacts ready for outreach:**
```sql
SELECT * FROM networking_contacts_ready LIMIT 50;
```

**See campaign performance:**
```sql
SELECT * FROM networking_batch_performance;
```

**See recent replies:**
```sql
SELECT 
  lc.full_name,
  no.reply_text,
  no.replied_at
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.status = 'replied'
ORDER BY no.replied_at DESC;
```

## Need Help?

- **Unipile issues**: See docs/unipile-setup.md
- **Full guide**: See docs/networking-campaign-guide.md
- **Database schema**: See scripts/setup-networking-schema.sql

---

## Current Status

Update this as you complete steps:

- [x] Created database schema
- [x] Created sync scripts
- [x] Created documentation
- [ ] Fixed Unipile connection
- [ ] Synced LinkedIn data
- [ ] Categorized connections
- [ ] Created campaign batch
- [ ] Sent first messages
- [ ] Tracked responses

**Next immediate step**: Fix your Unipile DSN and test the connection

