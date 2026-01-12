# Implementing Connection Campaigns Table

## Step 1: Create the Table (Run in Supabase SQL Editor)

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `create-connection-campaigns-schema.sql`
4. Run the SQL

This will:
- Create the `connection_campaigns` table
- Create indexes
- Create helper views and functions
- Migrate existing data from `networking_outreach`

## Step 2: Verify Migration

After running the SQL, verify the migration:

```sql
-- Check table exists
SELECT COUNT(*) FROM connection_campaigns;

-- Should match the count from networking_outreach
SELECT COUNT(*) FROM networking_outreach;

-- Sample data
SELECT 
    lc.full_name,
    ccb.name as campaign_name,
    cc.message_status,
    cc.message
FROM connection_campaigns cc
JOIN linkedin_connections lc ON cc.connection_id = lc.id
JOIN networking_campaign_batches ccb ON cc.campaign_id = ccb.id
LIMIT 10;
```

## Step 3: Test Queries

### "Which campaigns is a person in?"
```sql
SELECT 
    ccb.name as campaign_name,
    cc.message_status,
    cc.sent_at
FROM connection_campaigns cc
JOIN networking_campaign_batches ccb ON cc.campaign_id = ccb.id
WHERE cc.connection_id = (
    SELECT id FROM linkedin_connections WHERE full_name = 'John Doe'
);
```

### "Who's in a specific campaign?"
```sql
SELECT 
    lc.full_name,
    cc.message_status,
    cc.message
FROM connection_campaigns cc
JOIN linkedin_connections lc ON cc.connection_id = lc.id
WHERE cc.campaign_id = 'd38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8';
```

### Use the helper view
```sql
SELECT * FROM connections_with_campaigns 
WHERE full_name = 'John Doe';
```

### Use the helper function
```sql
SELECT * FROM get_connection_campaigns('connection-uuid-here');
```
