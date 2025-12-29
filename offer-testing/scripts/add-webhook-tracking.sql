-- ================================================================
-- WEBHOOK TRACKING FOR UNIPILE MESSAGES
-- ================================================================
-- Adds webhook tracking to the networking_outreach table
-- and creates a replies table for incoming messages
-- ================================================================

-- Add webhook tracking columns to networking_outreach table
ALTER TABLE networking_outreach
ADD COLUMN IF NOT EXISTS unipile_message_id TEXT,
ADD COLUMN IF NOT EXISTS unipile_chat_id TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reply_content TEXT,
ADD COLUMN IF NOT EXISTS has_reaction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_reaction TEXT,
ADD COLUMN IF NOT EXISTS last_reaction_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- Add indexes for webhook tracking
CREATE INDEX IF NOT EXISTS idx_networking_outreach_unipile_message_id ON networking_outreach(unipile_message_id);
CREATE INDEX IF NOT EXISTS idx_networking_outreach_unipile_chat_id ON networking_outreach(unipile_chat_id);
CREATE INDEX IF NOT EXISTS idx_networking_outreach_has_reply ON networking_outreach(has_reply);

-- ================================================================
-- TABLE: networking_replies (Optional - for detailed reply tracking)
-- ================================================================
-- Stores detailed information about incoming replies and reactions
--

CREATE TABLE IF NOT EXISTS networking_replies (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    outreach_id UUID REFERENCES networking_outreach(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES linkedin_connections(id) ON DELETE CASCADE,

    -- Unipile Info
    unipile_message_id TEXT NOT NULL,
    unipile_chat_id TEXT,

    -- Sender Info
    sender_name TEXT,
    sender_profile_url TEXT,
    sender_provider_id TEXT,

    -- Content
    message_content TEXT,
    message_type TEXT DEFAULT 'text',  -- 'text', 'image', 'file', etc.

    -- Attachments
    attachments JSONB,

    -- Reaction (if this is a reaction event)
    reaction TEXT,
    reaction_sender_name TEXT,

    -- Timing
    received_at TIMESTAMPTZ NOT NULL,

    -- Data
    raw_webhook_payload JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for networking_replies
CREATE INDEX IF NOT EXISTS idx_networking_replies_outreach ON networking_replies(outreach_id);
CREATE INDEX IF NOT EXISTS idx_networking_replies_connection ON networking_replies(connection_id);
CREATE INDEX IF NOT EXISTS idx_networking_replies_unipile_message_id ON networking_replies(unipile_message_id);
CREATE INDEX IF NOT EXISTS idx_networking_replies_received_at ON networking_replies(received_at DESC);

-- ================================================================
-- UPDATE EXISTING STATUS CHECK CONSTRAINT
-- ================================================================
-- Update the status constraint to include new webhook statuses

ALTER TABLE networking_outreach
DROP CONSTRAINT IF EXISTS networking_outreach_status_check;

ALTER TABLE networking_outreach
ADD CONSTRAINT networking_outreach_status_check
CHECK (status IN (
    'pending',      -- Ready to send
    'approved',     -- User approved (if review required)
    'sent',         -- Successfully sent (by our script)
    'delivered',    -- Confirmed delivered (via webhook)
    'read',         -- Message was read (via webhook)
    'replied',      -- Got a response (via webhook)
    'failed',       -- Send failed (via webhook or API error)
    'skipped'       -- Decided not to send
));

-- ================================================================
-- SAMPLE QUERIES FOR WEBHOOK TRACKING
-- ================================================================

/*
-- Get delivery status for all sent messages
SELECT
    lc.first_name,
    lc.last_name,
    no.status,
    no.sent_at,
    no.delivered_at,
    no.read_at,
    no.has_reply,
    no.last_reply_at
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.status IN ('sent', 'delivered', 'read', 'replied')
ORDER BY no.sent_at DESC;

-- Get recent replies
SELECT
    lc.first_name,
    lc.last_name,
    no.last_reply_content,
    no.last_reply_at
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.has_reply = TRUE
ORDER BY no.last_reply_at DESC;

-- Webhook success rate
SELECT
    COUNT(*) as total_sent,
    COUNT(delivered_at) as delivered,
    COUNT(read_at) as read,
    COUNT(CASE WHEN has_reply THEN 1 END) as replied,
    ROUND(
        COUNT(delivered_at)::decimal / COUNT(*)::decimal * 100, 2
    ) as delivery_rate_percent,
    ROUND(
        COUNT(CASE WHEN has_reply THEN 1 END)::decimal / COUNT(delivered_at)::decimal * 100, 2
    ) as reply_rate_percent
FROM networking_outreach
WHERE status IN ('sent', 'delivered', 'read', 'replied');
*/
