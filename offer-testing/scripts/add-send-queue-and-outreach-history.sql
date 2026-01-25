-- ============================================
-- Add Send Queue + Global Outreach Tracking
-- ============================================
-- Safe to run multiple times (uses IF NOT EXISTS where possible)

-- --------------------------------------------
-- CONTACTS: add verification + global fields
-- --------------------------------------------
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS email_verification_source TEXT;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN
  GENERATED ALWAYS AS (email_status = 'valid') STORED;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS global_last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS global_contact_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS global_last_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS global_status TEXT DEFAULT 'available' CHECK (global_status IN (
    'available', 'cooling_off', 'do_not_contact', 'replied'
  )),
  ADD COLUMN IF NOT EXISTS eligible_for_outreach BOOLEAN DEFAULT TRUE;

-- Expand email_status to include 'failed'
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_email_status_check;
ALTER TABLE contacts
  ADD CONSTRAINT contacts_email_status_check
  CHECK (email_status IN ('unknown', 'valid', 'invalid', 'risky', 'failed'));

CREATE INDEX IF NOT EXISTS idx_contacts_global_status ON contacts(global_status);
CREATE INDEX IF NOT EXISTS idx_contacts_global_last_contacted ON contacts(global_last_contacted_at);
CREATE INDEX IF NOT EXISTS idx_contacts_eligible ON contacts(eligible_for_outreach)
  WHERE eligible_for_outreach = TRUE;

-- --------------------------------------------
-- ACCOUNTS: health + rotation set
-- --------------------------------------------
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS rotation_set TEXT CHECK (rotation_set IN ('odd', 'even', 'burner'));

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS spam_rate DECIMAL(5,2);

-- --------------------------------------------
-- MESSAGE_TEMPLATES: structured copy blocks
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin_connect', 'linkedin_dm', 'linkedin_inmail')),
  sequence_step INTEGER,
  template_key TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_offer ON message_templates(offer_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_campaign ON message_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_message_templates_status ON message_templates(status);

-- --------------------------------------------
-- SEND_QUEUE: scheduled outbound messages
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_contact_id UUID REFERENCES campaign_contacts(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  account_id UUID REFERENCES accounts(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin_connect', 'linkedin_dm', 'linkedin_inmail')),
  sequence_step INTEGER,
  subject TEXT,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'processing', 'sent', 'delivered',
    'failed', 'bounced', 'cancelled', 'skipped'
  )),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  external_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_send_queue_campaign ON send_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_send_queue_contact ON send_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_send_queue_account ON send_queue(account_id);
CREATE INDEX IF NOT EXISTS idx_send_queue_status ON send_queue(status);
CREATE INDEX IF NOT EXISTS idx_send_queue_pending ON send_queue(scheduled_for, priority)
  WHERE status = 'pending';

-- --------------------------------------------
-- MESSAGE_EVENTS: send status timeline
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_queue_id UUID NOT NULL REFERENCES send_queue(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  account_id UUID REFERENCES accounts(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'queued', 'scheduled', 'sent', 'delivered', 'opened', 'clicked',
    'replied', 'bounced', 'spam', 'unsubscribed', 'failed', 'skipped'
  )),
  event_data JSONB DEFAULT '{}',
  reply_text TEXT,
  reply_sentiment TEXT CHECK (reply_sentiment IN (
    'positive', 'negative', 'neutral', 'question', 'ooo'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_events_send_queue ON message_events(send_queue_id);
CREATE INDEX IF NOT EXISTS idx_message_events_contact ON message_events(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_events_campaign ON message_events(campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_message_events_type ON message_events(event_type, created_at);

-- --------------------------------------------
-- OUTREACH_HISTORY: global 60-day rule
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT,
  contact_linkedin_url TEXT,
  contact_id UUID REFERENCES contacts(id),
  campaign_id UUID REFERENCES campaigns(id),
  offer_id UUID REFERENCES offers(id),
  account_id UUID REFERENCES accounts(id),
  send_queue_id UUID REFERENCES send_queue(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin_connect', 'linkedin_dm', 'linkedin_inmail')),
  message_subject TEXT,
  message_body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'replied', 'spam', 'failed')),
  replied_at TIMESTAMPTZ,
  reply_sentiment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_history_email ON outreach_history(contact_email, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_history_linkedin ON outreach_history(contact_linkedin_url, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_history_contact ON outreach_history(contact_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_history_campaign ON outreach_history(campaign_id, sent_at DESC);

-- --------------------------------------------
-- MESSAGES: add queue references + action type
-- --------------------------------------------
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS send_queue_id UUID REFERENCES send_queue(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_type TEXT CHECK (action_type IN (
    'connection_request', 'message', 'email', 'inmail'
  ));

CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_send_queue ON messages(send_queue_id);

-- --------------------------------------------
-- PIPELINE RUNS: multi-step orchestration
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id),
  campaign_id UUID REFERENCES campaigns(id),
  steps JSONB NOT NULL,
  input_params JSONB DEFAULT '{}',
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  output_summary JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pipeline_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  step_output JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_offer ON pipeline_runs(offer_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_campaign ON pipeline_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_run ON pipeline_steps(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_status ON pipeline_steps(status);

-- --------------------------------------------
-- FUNCTIONS + TRIGGERS
-- --------------------------------------------
CREATE OR REPLACE FUNCTION update_global_outreach_tracking()
RETURNS TRIGGER AS $$
DECLARE
  next_status TEXT;
BEGIN
  IF NEW.status IN ('sent', 'delivered', 'bounced', 'replied', 'spam', 'failed') THEN
    next_status := CASE
      WHEN NEW.status = 'spam' THEN 'do_not_contact'
      WHEN NEW.status = 'replied' THEN 'replied'
      ELSE 'cooling_off'
    END;

    UPDATE contacts
    SET 
      global_last_contacted_at = NEW.sent_at,
      global_contact_count = global_contact_count + 1,
      global_last_reply_at = CASE 
        WHEN NEW.status = 'replied' THEN NEW.replied_at 
        ELSE global_last_reply_at 
      END,
      global_status = CASE
        WHEN global_status = 'do_not_contact' THEN 'do_not_contact'
        ELSE next_status
      END,
      eligible_for_outreach = FALSE
    WHERE (
      NEW.contact_email IS NOT NULL AND email = NEW.contact_email
    ) OR (
      NEW.contact_linkedin_url IS NOT NULL AND linkedin_url = NEW.contact_linkedin_url
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_outreach ON outreach_history;
CREATE TRIGGER trigger_update_global_outreach
AFTER INSERT OR UPDATE ON outreach_history
FOR EACH ROW
EXECUTE FUNCTION update_global_outreach_tracking();

CREATE OR REPLACE FUNCTION refresh_outreach_eligibility()
RETURNS void AS $$
BEGIN
  UPDATE contacts
  SET eligible_for_outreach = CASE
    WHEN global_status = 'do_not_contact' THEN FALSE
    WHEN global_last_contacted_at IS NULL THEN TRUE
    WHEN global_last_contacted_at < NOW() - INTERVAL '60 days' THEN TRUE
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION claim_send_queue_item()
RETURNS SETOF send_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE send_queue
  SET 
    status = 'processing',
    last_attempt_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = (
    SELECT id
    FROM send_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
    ORDER BY scheduled_for ASC, priority DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------
-- VIEWS
-- --------------------------------------------
CREATE OR REPLACE VIEW leads_for_review AS
SELECT 
  c.id as contact_id,
  c.first_name,
  c.last_name,
  c.full_name,
  c.email,
  c.email_status,
  c.email_verified,
  c.email_verification_source,
  c.linkedin_url,
  c.title,
  c.connection_degree,
  c.global_status,
  c.global_last_contacted_at,
  c.global_contact_count,
  c.eligible_for_outreach,
  co.id as company_id,
  co.name as company_name,
  co.domain,
  co.size,
  co.industry,
  co.signals,
  co.fit_score,
  co.priority as company_priority,
  co.source_tool,
  cc.id as campaign_contact_id,
  cc.status as campaign_status,
  cc.current_step,
  camp.id as campaign_id,
  camp.name as campaign_name,
  camp.campaign_type,
  sq.id as queue_id,
  sq.scheduled_for,
  sq.status as queue_status,
  sq.channel,
  a.name as sending_account,
  a.health_score as account_health
FROM contacts c
JOIN companies co ON c.company_id = co.id
LEFT JOIN campaign_contacts cc ON cc.contact_id = c.id
LEFT JOIN campaigns camp ON cc.campaign_id = camp.id
LEFT JOIN send_queue sq ON sq.contact_id = c.id AND sq.status IN ('pending', 'scheduled')
LEFT JOIN accounts a ON sq.account_id = a.id;

CREATE OR REPLACE VIEW todays_schedule AS
SELECT 
  sq.*,
  c.full_name as contact_name,
  c.email as contact_email,
  co.name as company_name,
  camp.name as campaign_name,
  a.name as account_name,
  a.health_score
FROM send_queue sq
JOIN contacts c ON sq.contact_id = c.id
JOIN companies co ON c.company_id = co.id
JOIN campaigns camp ON sq.campaign_id = camp.id
LEFT JOIN accounts a ON sq.account_id = a.id
WHERE sq.scheduled_for::date = CURRENT_DATE
AND sq.status IN ('pending', 'scheduled')
ORDER BY sq.scheduled_for ASC;

CREATE OR REPLACE VIEW account_capacity AS
SELECT 
  a.id,
  a.name,
  a.type,
  a.health_score,
  a.status,
  a.daily_limit_emails,
  a.daily_limit_connections,
  a.daily_limit_messages,
  COALESCE(a.today_emails, 0) as today_emails,
  COALESCE(a.today_connections, 0) as today_connections,
  COALESCE(a.today_messages, 0) as today_messages,
  a.daily_limit_emails - COALESCE(a.today_emails, 0) as emails_remaining,
  a.daily_limit_connections - COALESCE(a.today_connections, 0) as connections_remaining,
  a.daily_limit_messages - COALESCE(a.today_messages, 0) as messages_remaining,
  CASE 
    WHEN a.status != 'active' THEN FALSE
    WHEN COALESCE(a.health_score, 100) < 30 THEN FALSE
    WHEN a.type = 'email' AND COALESCE(a.today_emails, 0) >= a.daily_limit_emails THEN FALSE
    WHEN a.type = 'linkedin' AND COALESCE(a.today_connections, 0) >= a.daily_limit_connections THEN FALSE
    ELSE TRUE
  END as can_send_now
FROM accounts a;

CREATE OR REPLACE VIEW activity_feed AS
SELECT
  'scheduled' as activity_type,
  sq.id as item_id,
  sq.scheduled_for as occurred_at,
  sq.status,
  sq.channel,
  c.full_name as contact_name,
  c.email as contact_email,
  c.linkedin_url as contact_linkedin_url,
  co.name as company_name,
  camp.name as campaign_name,
  a.name as account_name
FROM send_queue sq
LEFT JOIN contacts c ON sq.contact_id = c.id
LEFT JOIN companies co ON c.company_id = co.id
LEFT JOIN campaigns camp ON sq.campaign_id = camp.id
LEFT JOIN accounts a ON sq.account_id = a.id

UNION ALL

SELECT
  'sent' as activity_type,
  oh.id as item_id,
  oh.sent_at as occurred_at,
  oh.status,
  oh.channel,
  c.full_name as contact_name,
  COALESCE(oh.contact_email, c.email) as contact_email,
  COALESCE(oh.contact_linkedin_url, c.linkedin_url) as contact_linkedin_url,
  co.name as company_name,
  camp.name as campaign_name,
  a.name as account_name
FROM outreach_history oh
LEFT JOIN contacts c ON oh.contact_id = c.id
LEFT JOIN companies co ON c.company_id = co.id
LEFT JOIN campaigns camp ON oh.campaign_id = camp.id
LEFT JOIN accounts a ON oh.account_id = a.id;
