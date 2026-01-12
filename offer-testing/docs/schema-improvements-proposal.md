# Schema Improvements Proposal

## Current Structure

Currently:
- `linkedin_connections` - One record per person
- `networking_campaign_batches` - Campaign definitions
- `networking_outreach` - Links connection to campaign with message

**Problem**: Hard to see which campaigns a connection is in without querying `networking_outreach`.

---

## Proposed Improvements

### Option 1: Junction Table (Recommended) ✅

Create a `connection_campaigns` table that tracks which campaigns each connection is in:

```sql
CREATE TABLE connection_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES linkedin_connections(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES networking_campaign_batches(id) ON DELETE CASCADE,
    
    -- Campaign-specific message for this connection
    message TEXT,
    message_status TEXT DEFAULT 'pending' CHECK (message_status IN (
        'pending', 'sent', 'failed', 'skipped', 'replied'
    )),
    
    -- Campaign-specific timestamps
    sent_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    reply_text TEXT,
    reply_sentiment TEXT,
    
    -- Campaign-specific metadata
    notes TEXT,
    
    -- Ensure one record per connection-campaign pair
    UNIQUE(connection_id, campaign_id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connection_campaigns_connection ON connection_campaigns(connection_id);
CREATE INDEX idx_connection_campaigns_campaign ON connection_campaigns(campaign_id);
```

**Benefits**:
- ✅ Clean many-to-many relationship
- ✅ Easy to query: "Which campaigns is this person in?"
- ✅ Easy to query: "Who's in this campaign?"
- ✅ Each campaign has its own message column
- ✅ Scalable - add new campaigns without schema changes
- ✅ Can migrate existing `networking_outreach` data

**Migration**:
```sql
-- Migrate existing networking_outreach to connection_campaigns
INSERT INTO connection_campaigns (connection_id, campaign_id, message, message_status, sent_at, replied_at, reply_text, reply_sentiment)
SELECT 
    connection_id,
    batch_id as campaign_id,
    personalized_message as message,
    status as message_status,
    sent_at,
    replied_at,
    reply_text,
    reply_sentiment
FROM networking_outreach;
```

---

### Option 2: Campaigns Array Column (Simpler, Less Flexible)

Add a `campaigns` array column to `linkedin_connections`:

```sql
ALTER TABLE linkedin_connections 
ADD COLUMN campaigns UUID[] DEFAULT '{}';

-- Index for array queries
CREATE INDEX idx_linkedin_connections_campaigns ON linkedin_connections USING GIN (campaigns);
```

**Benefits**:
- ✅ Simple - just one column
- ✅ Quick lookup: "Is this person in campaign X?"
- ✅ Easy to update: `UPDATE linkedin_connections SET campaigns = array_append(campaigns, 'campaign-id')`

**Drawbacks**:
- ❌ Can't store campaign-specific message in the connection table
- ❌ Still need `networking_outreach` for messages
- ❌ Less normalized

---

### Option 3: Hybrid Approach (Best of Both)

Use **both**:
1. `campaigns UUID[]` column on `linkedin_connections` for quick lookup
2. `connection_campaigns` table for campaign-specific data (messages, status, etc.)

**Benefits**:
- ✅ Fast lookup: "Which campaigns?" → check array column
- ✅ Detailed data: "What message?" → check junction table
- ✅ Best performance for both use cases

---

## Recommendation: Option 1 (Junction Table)

**Why?**
- Most flexible and scalable
- Follows database normalization best practices
- Each campaign can have its own message per connection
- Easy to add campaign-specific fields later
- Can deprecate `networking_outreach` or keep it for backward compatibility

---

## Implementation Plan

1. **Clean up temp duplicates** (run `cleanup-temp-duplicates.js`)
2. **Create `connection_campaigns` table**
3. **Migrate existing data** from `networking_outreach`
4. **Update import/generation scripts** to use new table
5. **Add helper functions** to query campaigns per connection

---

## Example Queries

### "Which campaigns is John in?"
```sql
SELECT c.name, cc.message_status, cc.sent_at
FROM connection_campaigns cc
JOIN networking_campaign_batches c ON cc.campaign_id = c.id
WHERE cc.connection_id = (SELECT id FROM linkedin_connections WHERE full_name = 'John Doe');
```

### "Who's in the holiday campaign?"
```sql
SELECT lc.full_name, cc.message_status, cc.message
FROM connection_campaigns cc
JOIN linkedin_connections lc ON cc.connection_id = lc.id
WHERE cc.campaign_id = 'd38eb9c1-5b9d-4c83-bda4-a1d5eeeb9ac8';
```

### "Add person to campaign"
```sql
INSERT INTO connection_campaigns (connection_id, campaign_id, message, message_status)
VALUES ('connection-id', 'campaign-id', 'Hello!', 'pending')
ON CONFLICT (connection_id, campaign_id) DO UPDATE
SET message = EXCLUDED.message,
    updated_at = NOW();
```
