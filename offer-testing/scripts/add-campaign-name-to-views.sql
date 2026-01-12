-- ================================================================
-- ADD CAMPAIGN NAME TO VIEWS
-- ================================================================
-- Adds campaign name columns to networking_contacts_ready and
-- creates a view for networking_outreach that includes campaign name
-- ================================================================

-- ================================================================
-- VIEW: networking_outreach_with_campaign
-- ================================================================
-- Enhanced view of networking_outreach that includes campaign name
-- This makes it easy to query messages by campaign name

CREATE OR REPLACE VIEW networking_outreach_with_campaign AS
SELECT 
    no.*,
    ncb.name as campaign_name,
    ncb.slug as campaign_slug,
    ncb.status as campaign_status,
    ncb.description as campaign_description
FROM networking_outreach no
LEFT JOIN networking_campaign_batches ncb ON no.batch_id = ncb.id;

-- Index hint: The underlying table already has indexes on batch_id
-- This view will use those indexes automatically

-- ================================================================
-- UPDATE: networking_contacts_ready
-- ================================================================
-- Add campaign information for connections that are in campaigns
-- This shows which campaigns each connection is part of

CREATE OR REPLACE VIEW networking_contacts_ready AS
SELECT 
    lc.*,
    COALESCE(msg_stats.last_message_at, lc.connected_at) as last_interaction,
    COALESCE(msg_stats.message_count, 0) as total_messages,
    CASE 
        WHEN msg_stats.last_message_at IS NULL THEN 'never_messaged'
        WHEN msg_stats.last_message_at < NOW() - INTERVAL '1 year' THEN 'very_stale'
        WHEN msg_stats.last_message_at < NOW() - INTERVAL '6 months' THEN 'stale'
        WHEN msg_stats.last_message_at < NOW() - INTERVAL '3 months' THEN 'moderate'
        ELSE 'recent'
    END as recency_category,
    -- Add campaign information
    campaign_info.campaign_names,
    campaign_info.campaign_ids,
    campaign_info.active_campaigns_count
FROM linkedin_connections lc
LEFT JOIN (
    SELECT 
        connection_id,
        MAX(sent_at) as last_message_at,
        COUNT(*) as message_count
    FROM linkedin_messages
    GROUP BY connection_id
) msg_stats ON lc.id = msg_stats.connection_id
LEFT JOIN (
    -- Get campaign info for each connection
    SELECT 
        no.connection_id,
        ARRAY_AGG(DISTINCT ncb.name ORDER BY ncb.name) as campaign_names,
        ARRAY_AGG(DISTINCT ncb.id::text ORDER BY ncb.id::text) as campaign_ids,
        COUNT(DISTINCT ncb.id) as active_campaigns_count
    FROM networking_outreach no
    JOIN networking_campaign_batches ncb ON no.batch_id = ncb.id
    WHERE no.status IN ('pending', 'sent', 'replied')
    GROUP BY no.connection_id
) campaign_info ON lc.id = campaign_info.connection_id
WHERE lc.skip_outreach = FALSE
AND lc.contacted_in_campaign = FALSE;

-- ================================================================
-- USAGE EXAMPLES
-- ================================================================

-- Query networking_outreach with campaign name:
-- SELECT 
--   campaign_name,
--   lc.first_name,
--   lc.last_name,
--   no.status,
--   no.scheduled_at
-- FROM networking_outreach_with_campaign no
-- JOIN linkedin_connections lc ON no.connection_id = lc.id
-- WHERE campaign_name = 'Atherial AI Roleplay Training - 2025 Q1'
-- ORDER BY no.scheduled_at;

-- Query connections by campaign:
-- SELECT 
--   first_name,
--   last_name,
--   campaign_names,
--   active_campaigns_count
-- FROM networking_contacts_ready
-- WHERE 'Atherial AI Roleplay Training - 2025 Q1' = ANY(campaign_names);
