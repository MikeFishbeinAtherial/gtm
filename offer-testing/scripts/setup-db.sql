-- ============================================
-- OFFER TESTING SYSTEM - DATABASE SCHEMA
-- ============================================
-- Project: gtm
-- Supabase URL: https://xtqadzxdakdxuzwqoihs.supabase.co
-- 
-- This schema has already been applied to Supabase.
-- Run migrations via: supabase db push
-- ============================================

-- OFFERS: Products/services we're testing
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    
    -- Classification
    type TEXT NOT NULL CHECK (type IN ('product', 'service')),
    ownership TEXT NOT NULL CHECK (ownership IN ('internal', 'client')),
    client_name TEXT,
    
    -- Description
    description TEXT NOT NULL,
    problem_solved TEXT,
    value_proposition TEXT,
    price_range TEXT,
    
    -- Generated content (stored as JSON)
    icp JSONB,
    email_templates JSONB,
    linkedin_templates JSONB,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'ready', 'active', 'paused', 'completed', 'killed'
    )),
    
    -- Aggregate stats (denormalized for dashboard)
    total_companies INTEGER DEFAULT 0,
    total_contacts INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_meetings INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_type ON offers(type);
CREATE INDEX idx_offers_slug ON offers(slug);

-- ============================================
-- COMPANIES: Discovered for each offer
-- ============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT NOT NULL,
    domain TEXT,
    url TEXT,
    description TEXT,
    
    -- Size
    size TEXT CHECK (size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
    size_exact INTEGER,
    vertical TEXT,
    industry TEXT,
    
    -- Location
    headquarters_city TEXT,
    headquarters_state TEXT,
    headquarters_country TEXT,
    
    -- Signals (JSON for flexibility)
    signals JSONB DEFAULT '{}',
    
    -- Scoring
    fit_score INTEGER CHECK (fit_score >= 1 AND fit_score <= 10),
    fit_reasoning TEXT,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    
    -- Source tracking
    source_tool TEXT NOT NULL,  -- 'parallel', 'exa', 'theirstack', 'manual'
    source_query TEXT,
    source_raw JSONB,
    
    -- Status
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new', 'qualified', 'disqualified', 'contacted', 'responded', 'meeting', 'converted', 'rejected'
    )),
    disqualification_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(offer_id, domain)
);

CREATE INDEX idx_companies_offer ON companies(offer_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_source ON companies(source_tool);
CREATE INDEX idx_companies_fit_score ON companies(fit_score DESC);

-- ============================================
-- CONTACTS: People at companies
-- ============================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    -- Name
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    
    -- Role
    title TEXT,
    title_normalized TEXT,
    department TEXT,
    seniority TEXT CHECK (seniority IN ('c_level', 'vp', 'director', 'manager', 'individual')),
    
    -- Contact info
    email TEXT,
    email_status TEXT CHECK (email_status IN ('unknown', 'valid', 'invalid', 'risky')),
    phone TEXT,
    
    -- LinkedIn
    linkedin_url TEXT,
    linkedin_id TEXT,
    connection_degree INTEGER CHECK (connection_degree IN (1, 2, 3)),
    
    -- Previous contact tracking
    already_contacted BOOLEAN DEFAULT FALSE,
    last_contacted_at TIMESTAMPTZ,
    contact_count INTEGER DEFAULT 0,
    
    -- Scoring
    buyer_fit_score INTEGER CHECK (buyer_fit_score >= 1 AND buyer_fit_score <= 10),
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    
    -- Source
    source_tool TEXT NOT NULL,
    source_raw JSONB,
    
    -- Status
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new', 'enriched', 'ready', 'skip', 'queued', 'contacted', 'replied', 'meeting', 'converted', 'unsubscribed', 'bounced'
    )),
    skip_reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_offer ON contacts(offer_id);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_linkedin ON contacts(linkedin_url) WHERE linkedin_url IS NOT NULL;

-- ============================================
-- ACCOUNTS: LinkedIn and email accounts for sending
-- ============================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    
    type TEXT NOT NULL CHECK (type IN ('linkedin', 'email')),
    owner TEXT NOT NULL,
    
    email_address TEXT,
    linkedin_url TEXT,
    
    -- Unipile integration
    unipile_account_id TEXT,
    provider TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'warming', 'paused', 'limited', 'disconnected', 'banned'
    )),
    
    -- Limits (LinkedIn safety!)
    daily_limit_connections INTEGER DEFAULT 20,
    daily_limit_messages INTEGER DEFAULT 40,
    daily_limit_emails INTEGER DEFAULT 100,
    hourly_limit INTEGER DEFAULT 10,
    
    -- Warming period
    warming_week INTEGER DEFAULT 0,
    warming_started_at TIMESTAMPTZ,
    
    -- Today's usage (reset daily)
    today_connections INTEGER DEFAULT 0,
    today_messages INTEGER DEFAULT 0,
    today_emails INTEGER DEFAULT 0,
    today_last_action_at TIMESTAMPTZ,
    
    -- Lifetime stats
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    
    -- Health metrics
    bounce_rate DECIMAL(5,2),
    reply_rate DECIMAL(5,2),
    last_health_check TIMESTAMPTZ,
    
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_owner ON accounts(owner);
CREATE INDEX idx_accounts_status ON accounts(status);

-- ============================================
-- CAMPAIGNS: Outreach campaigns
-- ============================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    -- Channel
    channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'multi')),
    campaign_type TEXT DEFAULT 'cold_outreach' CHECK (campaign_type IN ('networking', 'cold_outreach')),
    account_id UUID REFERENCES accounts(id),
    
    -- Configuration
    target_criteria JSONB,
    sequence_config JSONB,
    scheduling_config JSONB DEFAULT '{
        "daily_limit": 40,
        "min_interval_minutes": 5,
        "max_interval_minutes": 10,
        "business_hours_start": 8,
        "business_hours_end": 19,
        "send_days": [0,1,2,3,4,5,6]
    }'::jsonb,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'ready', 'active', 'paused', 'completed', 'cancelled'
    )),
    
    -- Schedule
    send_window_start TIME DEFAULT '09:00',
    send_window_end TIME DEFAULT '17:00',
    send_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],  -- 1=Mon, 7=Sun
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Progress
    total_contacts INTEGER DEFAULT 0,
    contacts_sent INTEGER DEFAULT 0,
    contacts_remaining INTEGER DEFAULT 0,
    
    -- Performance
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_replied INTEGER DEFAULT 0,
    total_positive_replies INTEGER DEFAULT 0,
    total_meetings INTEGER DEFAULT 0,
    
    -- Rates
    open_rate DECIMAL(5,2),
    reply_rate DECIMAL(5,2),
    positive_reply_rate DECIMAL(5,2),
    meeting_rate DECIMAL(5,2),
    
    first_send_at TIMESTAMPTZ,
    last_send_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_offer ON campaigns(offer_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_account ON campaigns(account_id);

-- ============================================
-- CAMPAIGN_CONTACTS: Junction table
-- ============================================
CREATE TABLE campaign_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Sequence tracking
    current_step INTEGER DEFAULT 0,
    max_step INTEGER,
    
    -- Status
    status TEXT DEFAULT 'queued' CHECK (status IN (
        'queued', 'in_progress', 'waiting', 'paused', 'completed', 'replied', 'meeting', 'bounced', 'unsubscribed', 'failed'
    )),
    
    -- Engagement
    opened BOOLEAN DEFAULT FALSE,
    clicked BOOLEAN DEFAULT FALSE,
    replied BOOLEAN DEFAULT FALSE,
    reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'negative', 'neutral', 'question', 'ooo')),
    meeting_booked BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    added_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    next_step_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    UNIQUE(campaign_id, contact_id)
);

CREATE INDEX idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_contact ON campaign_contacts(contact_id);
CREATE INDEX idx_campaign_contacts_status ON campaign_contacts(status);
CREATE INDEX idx_campaign_contacts_next_step ON campaign_contacts(next_step_at) WHERE status IN ('queued', 'in_progress', 'waiting');

-- ============================================
-- MESSAGES: Individual messages sent
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_contact_id UUID NOT NULL REFERENCES campaign_contacts(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    
    -- Message details
    channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin_connect', 'linkedin_dm', 'linkedin_inmail')),
    sequence_step INTEGER NOT NULL,
    
    -- Content
    subject TEXT,
    body TEXT NOT NULL,
    personalization_used JSONB,
    
    -- External tracking
    external_id TEXT,  -- From Unipile
    thread_id TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'
    )),
    error_message TEXT,
    
    -- Engagement timestamps
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    
    -- Reply tracking
    reply_text TEXT,
    reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'negative', 'neutral', 'question', 'ooo')),
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_campaign_contact ON messages(campaign_contact_id);
CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_account ON messages(account_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_scheduled ON messages(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_channel
  ON messages(channel, scheduled_at)
  WHERE status = 'pending';

-- ============================================
-- ACCOUNT_ACTIVITY: Rate limiting log
-- ============================================
CREATE TABLE account_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id),
    contact_id UUID REFERENCES contacts(id),
    
    action_type TEXT NOT NULL CHECK (action_type IN (
        'connection_request', 'message', 'email', 'inmail', 'profile_view'
    )),
    
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited')),
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_account_date ON account_activity(account_id, created_at);
CREATE INDEX idx_activity_action ON account_activity(account_id, action_type);

-- ============================================
-- TOOLS: External APIs we use
-- ============================================
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    
    type TEXT NOT NULL CHECK (type IN (
        'company_search', 'people_search', 'enrichment', 'email_finding', 'email_verification', 'sending', 'inbox'
    )),
    
    api_base_url TEXT,
    api_docs_url TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_error TEXT,
    last_success_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,
    credits_remaining INTEGER,
    credits_reset_at TIMESTAMPTZ,
    
    -- Rate limits
    rate_limit_per_minute INTEGER,
    rate_limit_per_day INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populated tools
INSERT INTO tools (name, type, api_docs_url) VALUES
    ('parallel_companies', 'company_search', 'https://docs.parallel.ai/'),
    ('parallel_people', 'people_search', 'https://docs.parallel.ai/'),
    ('theirstack', 'company_search', 'https://theirstack.com/docs'),
    ('exa', 'company_search', 'https://docs.exa.ai/'),
    ('sumble', 'enrichment', 'https://docs.sumble.com/'),
    ('leadmagic', 'email_finding', 'https://docs.leadmagic.io/'),
    ('unipile_sending', 'sending', 'https://docs.unipile.com/'),
    ('unipile_inbox', 'inbox', 'https://docs.unipile.com/');

-- ============================================
-- TOOL_USAGE: API call log
-- ============================================
CREATE TABLE tool_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id),
    offer_id UUID REFERENCES offers(id),
    company_id UUID REFERENCES companies(id),
    contact_id UUID REFERENCES contacts(id),
    
    action TEXT NOT NULL,
    request_params JSONB,
    
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited')),
    response_summary JSONB,
    results_count INTEGER,
    error_message TEXT,
    
    credits_used INTEGER DEFAULT 0,
    duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_usage_tool ON tool_usage(tool_id);
CREATE INDEX idx_tool_usage_date ON tool_usage(created_at);
CREATE INDEX idx_tool_usage_offer ON tool_usage(offer_id);

-- ============================================
-- VIEWS
-- ============================================

-- Offer Dashboard
CREATE VIEW offer_dashboard AS
SELECT 
    o.*,
    COUNT(DISTINCT c.id) as company_count,
    COUNT(DISTINCT co.id) as contact_count,
    COUNT(DISTINCT ca.id) as campaign_count,
    COALESCE(SUM(ca.total_sent), 0) as campaign_total_sent,
    COALESCE(SUM(ca.total_replied), 0) as campaign_total_replies,
    COALESCE(SUM(ca.total_meetings), 0) as campaign_total_meetings
FROM offers o
LEFT JOIN companies c ON c.offer_id = o.id
LEFT JOIN contacts co ON co.offer_id = o.id
LEFT JOIN campaigns ca ON ca.offer_id = o.id
GROUP BY o.id;

-- Contacts Ready for Outreach
CREATE VIEW contacts_ready AS
SELECT 
    co.*,
    c.name as company_name,
    c.domain as company_domain,
    c.fit_score as company_fit_score,
    o.name as offer_name
FROM contacts co
JOIN companies c ON co.company_id = c.id
JOIN offers o ON co.offer_id = o.id
WHERE co.status IN ('ready', 'enriched')
AND co.skip_reason IS NULL
AND (co.connection_degree IS NULL OR co.connection_degree > 1)
AND co.already_contacted = FALSE;

-- Account Health
CREATE VIEW account_health AS
SELECT 
    a.*,
    a.daily_limit_connections - a.today_connections as connections_remaining,
    a.daily_limit_messages - a.today_messages as messages_remaining,
    a.daily_limit_emails - a.today_emails as emails_remaining,
    CASE 
        WHEN a.status = 'active' 
            AND a.today_connections < a.daily_limit_connections 
            AND a.today_messages < a.daily_limit_messages 
        THEN TRUE 
        ELSE FALSE 
    END as can_send
FROM accounts a;

-- Campaign Performance
CREATE VIEW campaign_performance AS
SELECT 
    c.*,
    o.name as offer_name,
    ROUND(c.total_replied::decimal / NULLIF(c.total_sent, 0) * 100, 2) as calculated_reply_rate,
    ROUND(c.total_positive_replies::decimal / NULLIF(c.total_replied, 0) * 100, 2) as calculated_positive_rate,
    ROUND(c.total_meetings::decimal / NULLIF(c.total_sent, 0) * 100, 2) as calculated_meeting_rate
FROM campaigns c
JOIN offers o ON c.offer_id = o.id;

-- Today's Send Queue
CREATE VIEW todays_queue AS
SELECT 
    m.*,
    co.full_name as contact_name,
    co.email as contact_email,
    co.linkedin_url as contact_linkedin,
    c.name as company_name,
    a.name as account_name,
    a.status as account_status
FROM messages m
JOIN campaign_contacts cc ON m.campaign_contact_id = cc.id
JOIN contacts co ON m.contact_id = co.id
JOIN companies c ON co.company_id = c.id
JOIN accounts a ON m.account_id = a.id
WHERE m.status = 'pending'
AND (m.scheduled_at IS NULL OR m.scheduled_at <= NOW())
ORDER BY m.scheduled_at ASC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Trigger function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_updated_at_offers
    BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_companies
    BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_contacts
    BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_accounts
    BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_campaigns
    BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_tools
    BEFORE UPDATE ON tools FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Reset daily limits (call via cron)
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS void AS $$
BEGIN
    UPDATE accounts
    SET 
        today_connections = 0,
        today_messages = 0,
        today_emails = 0,
        today_last_action_at = NULL
    WHERE today_last_action_at::date < CURRENT_DATE
    OR today_last_action_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Check if account can send
CREATE OR REPLACE FUNCTION can_account_send(
    p_account_id UUID,
    p_action_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_account accounts%ROWTYPE;
BEGIN
    SELECT * INTO v_account FROM accounts WHERE id = p_account_id;
    
    IF v_account.status != 'active' THEN
        RETURN FALSE;
    END IF;
    
    CASE p_action_type
        WHEN 'connection_request' THEN
            RETURN v_account.today_connections < v_account.daily_limit_connections;
        WHEN 'message' THEN
            RETURN v_account.today_messages < v_account.daily_limit_messages;
        WHEN 'email' THEN
            RETURN v_account.today_emails < v_account.daily_limit_emails;
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Increment account activity counter
CREATE OR REPLACE FUNCTION increment_account_counter(
    p_account_id UUID,
    p_action_type TEXT
) RETURNS void AS $$
BEGIN
    UPDATE accounts
    SET 
        today_last_action_at = NOW(),
        total_sent = total_sent + 1,
        today_connections = CASE 
            WHEN p_action_type = 'connection_request' THEN today_connections + 1 
            ELSE today_connections 
        END,
        today_messages = CASE 
            WHEN p_action_type = 'message' THEN today_messages + 1 
            ELSE today_messages 
        END,
        today_emails = CASE 
            WHEN p_action_type = 'email' THEN today_emails + 1 
            ELSE today_emails 
        END
    WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MONITORING VIEWS
-- ============================================

-- Recent activity view
CREATE OR REPLACE VIEW message_activity_recent AS
SELECT
  m.id,
  m.contact_id,
  m.campaign_id,
  m.channel,
  m.subject,
  m.body,
  m.scheduled_at,
  m.sent_at,
  m.status,
  c.first_name || ' ' || c.last_name as contact_name,
  c.company_name,
  camp.name as campaign_name,
  a.name as account_name
FROM messages m
LEFT JOIN contacts c ON m.contact_id = c.id
LEFT JOIN campaigns camp ON m.campaign_id = camp.id
LEFT JOIN accounts a ON m.account_id = a.id
ORDER BY m.sent_at DESC
LIMIT 100;

-- Today's sending progress
CREATE OR REPLACE VIEW today_sending_progress AS
SELECT
  channel,
  status,
  count(*) as message_count,
  min(sent_at) as first_sent,
  max(sent_at) as last_sent
FROM messages
WHERE sent_at::date = CURRENT_DATE
GROUP BY channel, status
ORDER BY channel, status;

-- Campaign progress view
CREATE OR REPLACE VIEW campaign_progress AS
SELECT
  c.id,
  c.name,
  c.status,
  c.total_contacts,
  c.contacts_sent,
  c.contacts_remaining,
  m.sent_today,
  m.last_sent_at,
  c.created_at,
  c.first_send_at,
  c.last_send_at
FROM campaigns c
LEFT JOIN (
  SELECT
    campaign_id,
    count(*) as sent_today,
    max(sent_at) as last_sent_at
  FROM messages
  WHERE sent_at::date = CURRENT_DATE
  GROUP BY campaign_id
) m ON c.id = m.campaign_id
ORDER BY c.created_at DESC;
