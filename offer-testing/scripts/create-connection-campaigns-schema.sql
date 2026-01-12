-- ================================================================
-- CONNECTION CAMPAIGNS TABLE
-- ================================================================
-- Tracks which campaigns each connection is in, with campaign-specific
-- messages and status. This replaces the need to query networking_outreach
-- to see which campaigns a person is in.
--
-- Benefits:
-- - Easy to see all campaigns a connection is in
-- - Each campaign has its own message per connection
-- - Scalable - add new campaigns without schema changes
-- ================================================================

CREATE TABLE IF NOT EXISTS connection_campaigns (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    connection_id UUID NOT NULL REFERENCES linkedin_connections(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES networking_campaign_batches(id) ON DELETE CASCADE,
    
    -- Campaign-specific message for this connection
    message TEXT,
    message_status TEXT DEFAULT 'pending' CHECK (message_status IN (
        'pending',      -- Ready to send
        'approved',     -- User approved (if review required)
        'sent',         -- Successfully sent
        'failed',       -- Send failed
        'replied',      -- Got a response
        'skipped'       -- Decided not to send
    )),
    skip_reason TEXT,
    
    -- Campaign-specific timestamps
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    
    -- Response tracking
    reply_text TEXT,
    reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'neutral', 'negative')),
    
    -- Follow-up
    needs_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    
    -- Campaign-specific metadata
    notes TEXT,
    personalization_notes TEXT,  -- How the message was personalized
    
    -- Ensure one record per connection-campaign pair
    UNIQUE(connection_id, campaign_id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_connection_campaigns_connection ON connection_campaigns(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_campaigns_campaign ON connection_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_connection_campaigns_status ON connection_campaigns(message_status);
CREATE INDEX IF NOT EXISTS idx_connection_campaigns_scheduled ON connection_campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- ================================================================
-- MIGRATION: Move data from networking_outreach to connection_campaigns
-- ================================================================
-- This migrates existing campaign data to the new structure
-- Run this AFTER creating the table above

INSERT INTO connection_campaigns (
    connection_id,
    campaign_id,
    message,
    message_status,
    skip_reason,
    scheduled_at,
    sent_at,
    replied_at,
    reply_text,
    reply_sentiment,
    needs_follow_up,
    follow_up_notes,
    personalization_notes,
    created_at,
    updated_at
)
SELECT 
    connection_id,
    batch_id as campaign_id,
    personalized_message as message,
    status as message_status,
    skip_reason,
    scheduled_at,
    sent_at,
    replied_at,
    reply_text,
    reply_sentiment,
    needs_follow_up,
    follow_up_notes,
    personalization_notes,
    created_at,
    updated_at
FROM networking_outreach
ON CONFLICT (connection_id, campaign_id) DO NOTHING;  -- Skip if already exists

-- ================================================================
-- HELPER VIEW: Connections with their campaigns
-- ================================================================
CREATE OR REPLACE VIEW connections_with_campaigns AS
SELECT 
    lc.id as connection_id,
    lc.full_name,
    lc.linkedin_id,
    lc.linkedin_url,
    array_agg(DISTINCT ccb.name) FILTER (WHERE ccb.name IS NOT NULL) as campaign_names,
    array_agg(DISTINCT cc.message_status) FILTER (WHERE cc.message_status IS NOT NULL) as campaign_statuses,
    COUNT(DISTINCT cc.campaign_id) as campaign_count
FROM linkedin_connections lc
LEFT JOIN connection_campaigns cc ON lc.id = cc.connection_id
LEFT JOIN networking_campaign_batches ccb ON cc.campaign_id = ccb.id
GROUP BY lc.id, lc.full_name, lc.linkedin_id, lc.linkedin_url;

-- ================================================================
-- HELPER FUNCTION: Get campaigns for a connection
-- ================================================================
CREATE OR REPLACE FUNCTION get_connection_campaigns(conn_id UUID)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name TEXT,
    message_status TEXT,
    sent_at TIMESTAMPTZ,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.campaign_id,
        ccb.name as campaign_name,
        cc.message_status,
        cc.sent_at,
        cc.message
    FROM connection_campaigns cc
    JOIN networking_campaign_batches ccb ON cc.campaign_id = ccb.id
    WHERE cc.connection_id = conn_id
    ORDER BY cc.created_at DESC;
END;
$$ LANGUAGE plpgsql;
