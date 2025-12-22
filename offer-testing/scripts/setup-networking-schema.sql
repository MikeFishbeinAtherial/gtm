-- ================================================================
-- NETWORKING CAMPAIGN SCHEMA
-- ================================================================
-- This is a separate schema for the "Networking" campaign which is
-- different from traditional outbound campaigns. This focuses on
-- reaching out to existing 1st-degree LinkedIn connections.
--
-- Key Differences from Standard Campaigns:
-- - Works with existing connections (not cold outreach)
-- - Tracks conversation history
-- - More focused on relationship management
-- - No need for company/signal discovery

-- ================================================================
-- TABLE: linkedin_connections
-- ================================================================
-- Stores all your 1st-degree LinkedIn connections
--
CREATE TABLE IF NOT EXISTS linkedin_connections (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- LinkedIn Info
    linkedin_id TEXT UNIQUE NOT NULL,  -- LinkedIn's internal ID (urn:li:person:xxx)
    linkedin_url TEXT,  -- Public profile URL
    
    -- Personal Info
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    headline TEXT,  -- Their current title/headline
    
    -- Professional Info
    current_company TEXT,
    current_title TEXT,
    location TEXT,
    industry TEXT,
    
    -- Profile Details
    profile_picture_url TEXT,
    num_connections INTEGER,  -- Their connection count (if available)
    
    -- Connection Info
    connected_at TIMESTAMPTZ,  -- When you connected with them
    connection_message TEXT,  -- The message they sent when connecting (if saved by Unipile)
    
    -- Relationship Status
    last_interaction_at TIMESTAMPTZ,  -- Last time you messaged
    interaction_count INTEGER DEFAULT 0,  -- How many messages you've exchanged
    relationship_strength TEXT CHECK (relationship_strength IN (
        'close',      -- Talk regularly
        'moderate',   -- Occasional contact
        'weak',       -- Haven't talked in a while
        'unknown'     -- New connection or no data
    )),
    
    -- Campaign Status
    contacted_in_campaign BOOLEAN DEFAULT FALSE,
    last_campaign_contact_at TIMESTAMPTZ,
    campaign_response TEXT CHECK (campaign_response IN (
        'positive',   -- Responded positively
        'neutral',    -- Responded but neutral
        'negative',   -- Not interested
        'no_response' -- No reply yet
    )),
    
    -- Categorization
    tags TEXT[],  -- e.g., ['colleague', 'college_friend', 'industry_contact']
    notes TEXT,  -- Your personal notes about them
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    
    -- Skip Logic
    skip_outreach BOOLEAN DEFAULT FALSE,
    skip_reason TEXT,  -- e.g., 'family', 'personal_friend', 'already_working_together'
    
    -- Data Source
    raw_data JSONB,  -- Full response from Unipile
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_linkedin_id ON linkedin_connections(linkedin_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_contacted ON linkedin_connections(contacted_in_campaign);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_priority ON linkedin_connections(priority);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_skip ON linkedin_connections(skip_outreach);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_last_interaction ON linkedin_connections(last_interaction_at DESC);

-- ================================================================
-- TABLE: linkedin_conversations
-- ================================================================
-- Stores conversation threads with your connections
--
CREATE TABLE IF NOT EXISTS linkedin_conversations (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Unipile Info
    unipile_chat_id TEXT UNIQUE NOT NULL,  -- Unipile's chat ID
    
    -- Participants
    connection_id UUID REFERENCES linkedin_connections(id) ON DELETE CASCADE,
    linkedin_id TEXT NOT NULL,  -- LinkedIn ID of the other person
    
    -- Conversation Info
    participant_names TEXT[],  -- All participants (for group chats)
    is_group_chat BOOLEAN DEFAULT FALSE,
    
    -- Status
    unread_count INTEGER DEFAULT 0,
    last_message_preview TEXT,  -- Last message snippet
    last_message_at TIMESTAMPTZ,
    last_message_from TEXT,  -- 'me' or 'them'
    
    -- Data
    raw_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_connection ON linkedin_conversations(connection_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_linkedin_id ON linkedin_conversations(linkedin_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_last_message ON linkedin_conversations(last_message_at DESC);

-- ================================================================
-- TABLE: linkedin_messages
-- ================================================================
-- Individual messages within conversations
--
CREATE TABLE IF NOT EXISTS linkedin_messages (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    conversation_id UUID REFERENCES linkedin_conversations(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES linkedin_connections(id) ON DELETE CASCADE,
    
    -- Unipile Info
    unipile_message_id TEXT UNIQUE NOT NULL,
    
    -- Message Details
    sender_linkedin_id TEXT NOT NULL,
    sender_name TEXT,
    is_from_me BOOLEAN DEFAULT FALSE,
    
    -- Content
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',  -- 'text', 'image', 'file', 'voice'
    
    -- Attachments
    attachments JSONB,  -- Array of attachment objects
    
    -- Status
    read_status BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ NOT NULL,
    
    -- Campaign Tracking (if this was sent as part of the campaign)
    sent_via_campaign BOOLEAN DEFAULT FALSE,
    campaign_batch_id UUID,  -- Link to a batch of messages sent together
    
    -- Data
    raw_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_conversation ON linkedin_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_connection ON linkedin_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_at ON linkedin_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_from_me ON linkedin_messages(is_from_me);

-- ================================================================
-- TABLE: networking_campaign_batches
-- ================================================================
-- Track batches of outreach messages
--
CREATE TABLE IF NOT EXISTS networking_campaign_batches (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Campaign Info
    name TEXT NOT NULL,  -- e.g., "Holiday 2025 Reconnect"
    description TEXT,
    
    -- Message Template
    message_template TEXT NOT NULL,
    personalization_instructions TEXT,  -- How to personalize each message
    
    -- Targeting
    target_filters JSONB,  -- Who to contact
    /*
    {
        "relationship_strength": ["weak", "unknown"],
        "last_interaction_before": "2024-01-01",
        "exclude_tags": ["family", "personal"],
        "min_priority": "medium"
    }
    */
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',        -- Planning
        'ready',        -- Ready to send
        'in_progress',  -- Currently sending
        'completed',    -- All sent
        'paused'        -- Temporarily stopped
    )),
    
    -- Progress
    total_target_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    positive_reply_count INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_networking_batches_status ON networking_campaign_batches(status);

-- ================================================================
-- TABLE: networking_outreach
-- ================================================================
-- Track individual outreach attempts in the networking campaign
--
CREATE TABLE IF NOT EXISTS networking_outreach (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    batch_id UUID REFERENCES networking_campaign_batches(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES linkedin_connections(id) ON DELETE CASCADE,
    message_id UUID REFERENCES linkedin_messages(id) ON DELETE SET NULL,  -- The actual sent message
    
    -- Message
    personalized_message TEXT NOT NULL,
    personalization_notes TEXT,  -- How it was personalized
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Ready to send
        'approved',     -- User approved (if review required)
        'sent',         -- Successfully sent
        'failed',       -- Send failed
        'replied',      -- Got a response
        'skipped'       -- Decided not to send
    )),
    skip_reason TEXT,
    
    -- Response Tracking
    replied_at TIMESTAMPTZ,
    reply_text TEXT,
    reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'neutral', 'negative')),
    
    -- Follow-up
    needs_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    
    -- Timestamps
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_networking_outreach_batch ON networking_outreach(batch_id);
CREATE INDEX IF NOT EXISTS idx_networking_outreach_connection ON networking_outreach(connection_id);
CREATE INDEX IF NOT EXISTS idx_networking_outreach_status ON networking_outreach(status);
CREATE INDEX IF NOT EXISTS idx_networking_outreach_scheduled ON networking_outreach(scheduled_at);

-- ================================================================
-- VIEWS
-- ================================================================

-- View: Connections ready for outreach
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
    END as recency_category
FROM linkedin_connections lc
LEFT JOIN (
    SELECT 
        connection_id,
        MAX(sent_at) as last_message_at,
        COUNT(*) as message_count
    FROM linkedin_messages
    GROUP BY connection_id
) msg_stats ON lc.id = msg_stats.connection_id
WHERE lc.skip_outreach = FALSE
AND lc.contacted_in_campaign = FALSE;

-- View: Campaign batch performance
CREATE OR REPLACE VIEW networking_batch_performance AS
SELECT 
    b.id,
    b.name,
    b.status,
    b.total_target_count,
    b.sent_count,
    b.reply_count,
    b.positive_reply_count,
    CASE 
        WHEN b.sent_count > 0 
        THEN ROUND((b.reply_count::decimal / b.sent_count * 100), 2)
        ELSE 0
    END as reply_rate,
    CASE 
        WHEN b.reply_count > 0 
        THEN ROUND((b.positive_reply_count::decimal / b.reply_count * 100), 2)
        ELSE 0
    END as positive_rate,
    b.created_at,
    b.started_at,
    b.completed_at
FROM networking_campaign_batches b;

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Function: Update connection's last interaction timestamp
CREATE OR REPLACE FUNCTION update_connection_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE linkedin_connections
    SET 
        last_interaction_at = NEW.sent_at,
        interaction_count = interaction_count + 1,
        updated_at = NOW()
    WHERE id = NEW.connection_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update last interaction when message is added
CREATE TRIGGER trigger_update_connection_interaction
AFTER INSERT ON linkedin_messages
FOR EACH ROW
EXECUTE FUNCTION update_connection_last_interaction();

-- Function: Update batch statistics
CREATE OR REPLACE FUNCTION update_batch_stats(batch_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE networking_campaign_batches
    SET 
        sent_count = (
            SELECT COUNT(*) 
            FROM networking_outreach 
            WHERE batch_id = batch_uuid AND status = 'sent'
        ),
        reply_count = (
            SELECT COUNT(*) 
            FROM networking_outreach 
            WHERE batch_id = batch_uuid AND status = 'replied'
        ),
        positive_reply_count = (
            SELECT COUNT(*) 
            FROM networking_outreach 
            WHERE batch_id = batch_uuid 
            AND status = 'replied' 
            AND reply_sentiment = 'positive'
        ),
        updated_at = NOW()
    WHERE id = batch_uuid;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- SAMPLE QUERIES
-- ================================================================

-- Find connections you haven't talked to in over 6 months
/*
SELECT *
FROM networking_contacts_ready
WHERE recency_category IN ('stale', 'very_stale', 'never_messaged')
AND priority != 'low'
ORDER BY last_interaction ASC
LIMIT 50;
*/

-- Get all conversations with replies
/*
SELECT 
    lc.full_name,
    lc.headline,
    no.personalized_message,
    no.reply_text,
    no.replied_at
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
WHERE no.status = 'replied'
ORDER BY no.replied_at DESC;
*/

