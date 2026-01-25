# GTM GitHub vs. Proposed Sales Engagement Platform

## Comparison & Recommendations

---

## Executive Summary

Your current GTM GitHub repo is a solid foundation with good bones. The proposed sales-engagement-platform-plan.md adds important features but also introduces complexity you may not need as a single user. Here's what to keep, what to add, and what to skip.

**Bottom Line:** You don't need to rebuild from scratch. Enhance your existing system with:
1. A proper send queue with visibility dashboard
2. Stricter safety controls (the proposed limits are good)
3. A simple visual interface (React component or v0-generated dashboard)

---

## Side-by-Side Comparison

### Database Schema

| Feature | Your Current GTM | Proposed Plan | Recommendation |
|---------|------------------|---------------|----------------|
| **Offers table** | ✅ Has positioning, ICP, templates | Similar, less detailed | **Keep yours** - more complete positioning canvas |
| **Companies table** | ✅ Has signals, fit_score, source | Similar | **Keep yours** - signals JSONB is flexible |
| **Contacts table** | ✅ Has connection_degree, already_contacted | Adds months_in_role, email_verification_source | **Merge** - add the verification tracking |
| **Campaigns table** | ✅ Has steps JSONB | Similar but adds send_window, timezone | **Merge** - add time window fields |
| **Send Queue** | ❌ Missing (uses campaign_contacts) | ✅ Dedicated send_queue table | **Add this** - critical for visibility |
| **Accounts table** | ✅ Has warmup tracking, daily limits | Similar, adds health_score | **Merge** - add health_score calculation |
| **Account Activity** | ✅ Has action logging | Similar | **Keep yours** |
| **Message Events** | ❌ Missing | ✅ Tracks delivered/opened/replied/bounced | **Add this** - need event tracking |
| **Workflows table** | ❌ Missing | ✅ Clay-style workflow definitions | **Consider** - nice to have, not essential |

### Sending Safety

| Feature | Your Current GTM | Proposed Plan | Recommendation |
|---------|------------------|---------------|----------------|
| **LinkedIn connections/day** | 20 (stop at 18) | 20 (warmup from 5) | **Use proposed** - warmup is important |
| **LinkedIn messages/day** | 40 (stop at 38) | 50 (warmup from 10) | **Keep yours** - more conservative |
| **Email/day** | 100 (generic) | 30 per inbox (with warmup) | **Use proposed** - per-inbox limits are critical |
| **Warmup tracking** | ✅ Has warming_week field | ✅ Has warmup_started_at with calculations | **Use proposed** - date-based is more flexible |
| **Random delays** | 2-5 min jitter | 3-15 min jitter | **Use proposed** - wider range looks more human |
| **Send windows** | Business hours 9am-6pm | 9am-5pm + recipient timezone | **Use proposed** - timezone awareness is important |
| **Skip 1st degree** | ✅ Yes | Not explicitly mentioned | **Keep this** - critical safety rule |
| **60-day TAM rule** | ❌ Not implemented | ✅ Emphasized throughout | **Add this** - key insight from research |
| **Health score** | ❌ Missing | ✅ 0-100 with bounce/spam tracking | **Add this** - know when accounts are burning |

### Workflow & Lead Finding

| Feature | Your Current GTM | Proposed Plan | Recommendation |
|---------|------------------|---------------|----------------|
| **Company search** | Parallel, TheirStack, Exa | Exa only | **Keep yours** - more options |
| **Contact search** | Parallel | Exa | **Keep both** |
| **Email enrichment** | Leadmagic | Fullenrich → Leadmagic waterfall | **Use proposed** - waterfall increases hit rate |
| **AI qualification** | ✅ fit_score, fit_reasoning | Similar | **Keep yours** |
| **Clay-style workflows** | ❌ Manual steps via Cursor commands | ✅ Workflow engine with step chaining | **Optional** - nice but complex |

### User Interface

| Feature | Your Current GTM | Proposed Plan | Recommendation |
|---------|------------------|---------------|----------------|
| **Primary interface** | Cursor commands + Supabase dashboard | Mentions dashboard but no specifics | **Need to add** - see below |
| **Queue visibility** | ❌ Must query Supabase | Mentioned but not detailed | **Critical gap** - need visual queue |
| **Campaign status** | Via Supabase or scripts | Via dashboard | **Need to add** |
| **Account health** | ❌ No visibility | Daily health report | **Add this** |

### Execution Model

| Feature | Your Current GTM | Proposed Plan | Recommendation |
|---------|------------------|---------------|----------------|
| **Hosting** | Railway (auto-deploy on push) | Not specified | **Keep Railway** - working well |
| **Cron scheduling** | Railway cron every 5 min → checks Supabase | Scheduler every 1 min | **Keep 5 min** - less aggressive, safer |
| **Campaign trigger** | `railway run node scripts/campaign-worker.js` | Not specified | **Keep this** - manual control is good |
| **Manual review** | ✅ Human-in-loop via Cursor | Not emphasized | **Keep this** - important safety net |
| **State management** | Supabase is source of truth | Same | ✅ Correct approach |

### Your Current Railway Architecture (Confirmed)

```
LOCAL (Cursor)                       RAILWAY                         SUPABASE
┌─────────────────┐                 ┌─────────────────┐             ┌─────────────────┐
│                 │   git push      │                 │             │                 │
│ Create offers   │ ───────────────►│ Auto-deploy     │             │ Source of truth │
│ Create campaigns│                 │                 │             │                 │
│ Generate leads  │                 │ Cron (5 min):   │◄───────────►│ - campaigns     │
│                 │                 │ campaign-worker │             │ - contacts      │
│ /new-offer      │                 │                 │             │ - messages      │
│ /offer-campaign │                 │ Manual trigger: │             │ - accounts      │
│ /offer-launch   │                 │ railway run ... │             │ - activity      │
│                 │                 │                 │             │                 │
└─────────────────┘                 └────────┬────────┘             └─────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │    UNIPILE      │
                                    │                 │
                                    │ Send emails     │
                                    │ Send LinkedIn   │
                                    │ Webhooks back   │
                                    └─────────────────┘
```

**This is a good architecture.** The 5-minute cron interval is actually safer than 1-minute because:
- Less aggressive on rate limits
- Natural batching of messages
- Easier to pause/debug if issues arise

---

## Database Design: Associations & Scalability

Your current schema is decent but has some issues for scale. Here's a comprehensive review:

### Current Entity Relationships (Your GTM)

```
┌─────────────┐
│   OFFERS    │
│             │
│ id          │◄─────────────────────────────────────────────────┐
│ name        │                                                   │
│ positioning │                                                   │
│ icp         │                                                   │
└──────┬──────┘                                                   │
       │                                                          │
       │ 1:many                                                   │
       ▼                                                          │
┌─────────────┐         ┌─────────────┐         ┌─────────────┐  │
│  COMPANIES  │         │   CONTACTS  │         │  CAMPAIGNS  │  │
│             │         │             │         │             │  │
│ id          │◄────────│ company_id  │         │ id          │◄─┘
│ offer_id    │─────────│ offer_id    │─────────│ offer_id    │
│ domain      │  1:many │ email       │         │ name        │
│ signals     │         │ linkedin    │         │ steps       │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │                       │                       │
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                               │ many:many
                               ▼
                    ┌─────────────────────┐
                    │  CAMPAIGN_CONTACTS  │
                    │                     │
                    │ campaign_id         │
                    │ contact_id          │
                    │ status              │
                    │ current_step        │
                    └──────────┬──────────┘
                               │
                               │ 1:many
                               ▼
                    ┌─────────────────────┐
                    │      MESSAGES       │
                    │                     │
                    │ campaign_contact_id │
                    │ account_id          │
                    │ content             │
                    │ status              │
                    └─────────────────────┘
```

### Problems with Current Design

| Issue | Why It's a Problem | Solution |
|-------|-------------------|----------|
| **No global outreach tracking** | Can contact same person from multiple offers within 60 days | Add `outreach_history` table + `global_last_contacted_at` on contacts |
| **No dedicated send queue** | Can't see what's scheduled, hard to pause/cancel | Add `send_queue` table |
| **No message events** | Can't track bounces, opens, replies separately | Add `message_events` table |
| **No cross-offer deduplication** | Same person in Offer A and Offer B could both get emails | Check by email/LinkedIn before queueing |
| **No 60-day rule enforcement** | Nothing prevents over-contacting | Add `eligible_for_outreach` computed column + pre-queue check |

**Key Insight:** The associations (offer_id on contacts/companies) are FINE. The problem is lack of **global tracking by email/LinkedIn** across all those associations.

### Recommended Entity Relationships (Improved)

**Keep all existing associations, ADD global outreach tracking:**

```
┌─────────────┐
│   OFFERS    │
│             │
│ id          │◄─────────────────────────────────────────────────┐
│ name        │                                                   │
│ positioning │                                                   │
└──────┬──────┘                                                   │
       │                                                          │
       │ 1:many (KEEP THIS)                                       │
       ▼                                                          │
┌─────────────┐         ┌─────────────┐         ┌─────────────┐  │
│  COMPANIES  │         │   CONTACTS  │         │  CAMPAIGNS  │  │
│             │         │             │         │             │  │
│ id          │◄────────│ company_id  │         │ id          │◄─┘
│ offer_id    │ (KEEP)  │ offer_id    │ (KEEP)  │ offer_id    │
│ domain      │─────────│ email       │─────────│ name        │
│ signals     │  1:many │ linkedin_url│         │ steps       │
│             │         │             │         │             │
│             │         │ NEW COLUMNS:│         │             │
│             │         │ global_last_│         │             │
│             │         │ contacted_at│         │             │
│             │         │ global_count│         │             │
│             │         │ eligible_for│         │             │
│             │         │ _outreach   │         │             │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                               │ many:many
                               ▼
                    ┌─────────────────────┐
                    │  CAMPAIGN_CONTACTS  │
                    │                     │
                    │ campaign_id         │
                    │ contact_id          │
                    │ status              │
                    └──────────┬──────────┘
                               │
                               │ 1:many
                               ▼
┌─────────────────────┐     ┌─────────────────────┐
│     SEND_QUEUE      │     │  OUTREACH_HISTORY   │  ◄── NEW TABLE
│     (NEW TABLE)     │     │    (NEW TABLE)      │
│                     │     │                     │
│ id                  │     │ contact_email       │  ◄── Track by EMAIL
│ campaign_id         │     │ contact_linkedin_url│  ◄── Track by LINKEDIN
│ contact_id          │     │ contact_id          │
│ account_id          │     │ campaign_id         │
│ scheduled_for       │     │ offer_id            │
│ status              │     │ sent_at             │
│ message_content     │     │ channel             │
└─────────────────────┘     │ status              │
           │                └─────────────────────┘
           │                         │
           │ belongs_to              │ Triggers update to
           ▼                         ▼ contacts.global_*
┌─────────────────────┐     ┌─────────────────────┐
│      ACCOUNTS       │     │      CONTACTS       │
│                     │     │   (all instances    │
│ id                  │     │    with same email) │
│ type (email/li)     │     │                     │
│ health_score        │     │ global_last_        │
│ daily_limits        │     │ contacted_at ───────│── Updated across ALL
│ warmup_status       │     │ global_contact_count│   contact rows with
└─────────────────────┘     │ eligible_for_       │   same email/linkedin
                            │ outreach            │
                            └─────────────────────┘
```

**How the 60-day rule works with this model:**

1. Jane Smith is in Offer A (contact row 1) and Offer B (contact row 2)
2. You email jane@acme.com from Campaign in Offer A
3. `outreach_history` logs: email=jane@acme.com, offer_id=A, sent_at=now
4. Trigger fires, updates ALL contacts where email=jane@acme.com:
   - Contact row 1: `global_last_contacted_at = now`, `eligible_for_outreach = false`
   - Contact row 2: `global_last_contacted_at = now`, `eligible_for_outreach = false`
5. Now if you try to add Jane to a campaign in Offer B, the system sees `eligible_for_outreach = false` and blocks it

### Key Changes for Scalability

The goal is NOT to remove associations, but to **add global outreach tracking** so you don't over-contact anyone regardless of which offer/campaign they're in.

#### 1. **Keep Companies Linked to Offers, Add Global Deduplication**

```sql
-- KEEP: Companies can belong to multiple offers (that's fine!)
-- ADD: Global deduplication by domain to prevent duplicates

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Keep offer association (a company can be in multiple offers)
    offer_id UUID REFERENCES offers(id),
    
    -- Company identity
    domain TEXT NOT NULL,  -- Used for deduplication
    name TEXT NOT NULL,
    
    -- All your existing fields...
    size TEXT,
    industry TEXT,
    signals JSONB,
    fit_score INTEGER,
    source_tool TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique per offer+domain (same company can appear in multiple offers)
    UNIQUE(offer_id, domain)
);

-- Index for finding all instances of a company across offers
CREATE INDEX idx_companies_domain ON companies(domain);
```

**Why this works:** 
- Same company can be in Offer A and Offer B (different rows, same domain)
- You can query all companies with same domain to see cross-offer history
- Existing relationships stay intact

#### 2. **Keep Contacts Linked to Offers, Add Global Outreach Tracking**

This is the key change. Contacts keep their offer_id, but we add columns to track **all outreach across all offers/campaigns**:

```sql
-- KEEP: Contacts belong to offers (that's fine!)
-- ADD: Global outreach tracking columns

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS 
    -- Global outreach tracking (across ALL offers/campaigns)
    global_last_contacted_at TIMESTAMPTZ,      -- Last time we contacted this person (any offer)
    global_contact_count INTEGER DEFAULT 0,     -- Total times contacted (any offer)
    global_last_reply_at TIMESTAMPTZ,          -- Last time they replied (any offer)
    global_status TEXT DEFAULT 'available',     -- 'available', 'cooling_off', 'do_not_contact', 'replied'
    
    -- Computed: Can we contact them now? (60-day rule)
    eligible_for_outreach BOOLEAN GENERATED ALWAYS AS (
        global_status != 'do_not_contact' 
        AND (global_last_contacted_at IS NULL 
             OR global_last_contacted_at < NOW() - INTERVAL '60 days')
    ) STORED;

-- The key insight: same email = same person, regardless of offer
-- Create index on email to quickly find all instances of a person
CREATE INDEX idx_contacts_email_global ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_linkedin_global ON contacts(linkedin_url) WHERE linkedin_url IS NOT NULL;
```

**Why this works:**
- Jane Smith at Acme Corp can be in Offer A, Offer B, and Offer C (different contact rows)
- But if we email jane@acme.com from Offer A, we update `global_last_contacted_at` on ALL rows with that email
- The 60-day rule is enforced globally, not per-offer

#### 3. **Outreach History Table (NEW - Track Every Touch)**

Instead of just tracking "last contacted", keep a full history:

```sql
CREATE TABLE outreach_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who we contacted (by email/linkedin, not contact_id, for global tracking)
    contact_email TEXT,                         -- The email we sent to
    contact_linkedin_url TEXT,                  -- Or LinkedIn URL
    
    -- Which contact/campaign/offer this was from
    contact_id UUID REFERENCES contacts(id),
    campaign_id UUID REFERENCES campaigns(id),
    offer_id UUID REFERENCES offers(id),
    account_id UUID REFERENCES accounts(id),
    
    -- What we sent
    channel TEXT NOT NULL,                      -- 'email', 'linkedin_connection', 'linkedin_dm'
    message_subject TEXT,
    message_body TEXT,
    
    -- When
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Outcome
    status TEXT DEFAULT 'sent',                 -- 'sent', 'delivered', 'bounced', 'replied'
    replied_at TIMESTAMPTZ,
    reply_sentiment TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical indexes for the 60-day rule check
CREATE INDEX idx_outreach_history_email ON outreach_history(contact_email, sent_at DESC);
CREATE INDEX idx_outreach_history_linkedin ON outreach_history(contact_linkedin_url, sent_at DESC);
CREATE INDEX idx_outreach_history_contact ON outreach_history(contact_id, sent_at DESC);
```

**Why this is powerful:**
- Query: "When was the last time we contacted jane@acme.com?" → instant answer
- Query: "Show me all outreach to anyone at acme.com domain" → easy
- Query: "Who have we contacted more than once in 60 days?" → audit/fix mistakes

#### 4. **Function to Update Global Tracking**

When you send a message, update all contact records with that email:

```sql
CREATE OR REPLACE FUNCTION update_global_outreach_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- When a message is sent, update ALL contacts with this email
    IF NEW.status = 'sent' AND NEW.contact_email IS NOT NULL THEN
        UPDATE contacts
        SET 
            global_last_contacted_at = NEW.sent_at,
            global_contact_count = global_contact_count + 1,
            global_status = CASE 
                WHEN global_status = 'do_not_contact' THEN 'do_not_contact'
                ELSE 'cooling_off'
            END
        WHERE email = NEW.contact_email;
    END IF;
    
    -- Same for LinkedIn
    IF NEW.status = 'sent' AND NEW.contact_linkedin_url IS NOT NULL THEN
        UPDATE contacts
        SET 
            global_last_contacted_at = NEW.sent_at,
            global_contact_count = global_contact_count + 1,
            global_status = CASE 
                WHEN global_status = 'do_not_contact' THEN 'do_not_contact'
                ELSE 'cooling_off'
            END
        WHERE linkedin_url = NEW.contact_linkedin_url;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_global_outreach
AFTER INSERT OR UPDATE ON outreach_history
FOR EACH ROW
EXECUTE FUNCTION update_global_outreach_tracking();
```

#### 5. **View: Contacts Ready for Outreach (Respects 60-Day Rule)**

```sql
CREATE VIEW contacts_ready_for_outreach AS
SELECT 
    c.*,
    co.name as company_name,
    co.domain as company_domain,
    co.fit_score,
    o.name as offer_name,
    
    -- Days since last contact (across all offers)
    EXTRACT(DAY FROM NOW() - c.global_last_contacted_at) as days_since_contact,
    
    -- How many times have we contacted them total?
    c.global_contact_count,
    
    -- Last outreach details
    (
        SELECT json_build_object(
            'sent_at', oh.sent_at,
            'channel', oh.channel,
            'offer', o2.name,
            'campaign', camp.name
        )
        FROM outreach_history oh
        LEFT JOIN offers o2 ON oh.offer_id = o2.id
        LEFT JOIN campaigns camp ON oh.campaign_id = camp.id
        WHERE oh.contact_email = c.email
        ORDER BY oh.sent_at DESC
        LIMIT 1
    ) as last_outreach
    
FROM contacts c
JOIN companies co ON c.company_id = co.id
JOIN offers o ON c.offer_id = o.id
WHERE c.eligible_for_outreach = TRUE
  AND c.email IS NOT NULL
  AND c.email_verified = TRUE
  AND c.do_not_contact = FALSE
ORDER BY co.fit_score DESC;
```

#### 6. **Safety Check Before Queuing**

Before adding anyone to the send queue, check if they're eligible:

```sql
-- Function to check if we can contact someone
CREATE OR REPLACE FUNCTION can_contact_person(
    p_email TEXT,
    p_linkedin_url TEXT DEFAULT NULL
) RETURNS TABLE (
    can_contact BOOLEAN,
    reason TEXT,
    last_contacted_at TIMESTAMPTZ,
    days_since_contact INTEGER,
    total_contacts INTEGER
) AS $$
DECLARE
    v_last_contact TIMESTAMPTZ;
    v_days INTEGER;
    v_count INTEGER;
BEGIN
    -- Check by email first
    IF p_email IS NOT NULL THEN
        SELECT 
            MAX(sent_at),
            COUNT(*)
        INTO v_last_contact, v_count
        FROM outreach_history
        WHERE contact_email = p_email;
    -- Fall back to LinkedIn
    ELSIF p_linkedin_url IS NOT NULL THEN
        SELECT 
            MAX(sent_at),
            COUNT(*)
        INTO v_last_contact, v_count
        FROM outreach_history
        WHERE contact_linkedin_url = p_linkedin_url;
    END IF;
    
    v_days := EXTRACT(DAY FROM NOW() - v_last_contact);
    
    -- Return result
    IF v_last_contact IS NULL THEN
        RETURN QUERY SELECT TRUE, 'Never contacted', NULL::TIMESTAMPTZ, NULL::INTEGER, 0;
    ELSIF v_days >= 60 THEN
        RETURN QUERY SELECT TRUE, 'Last contact was ' || v_days || ' days ago', v_last_contact, v_days, v_count;
    ELSE
        RETURN QUERY SELECT FALSE, 'Contacted ' || v_days || ' days ago (need to wait ' || (60 - v_days) || ' more days)', v_last_contact, v_days, v_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM can_contact_person('jane@acme.com');
-- Returns: can_contact=false, reason="Contacted 23 days ago (need to wait 37 more days)", etc.
```

#### 3. **Dedicated Send Queue Table**

```sql
CREATE TABLE send_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    campaign_contact_id UUID REFERENCES campaign_contacts(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    account_id UUID REFERENCES accounts(id),  -- Assigned by scheduler
    
    -- Message content
    channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin_connection', 'linkedin_dm')),
    subject TEXT,
    body TEXT NOT NULL,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',     -- Waiting to send
        'scheduled',   -- Assigned to account, waiting for time
        'processing',  -- Currently being sent
        'sent',        -- Successfully sent
        'delivered',   -- Confirmed delivered (email)
        'failed',      -- Send failed
        'bounced',     -- Email bounced
        'cancelled',   -- Manually cancelled
        'skipped'      -- Skipped (e.g., contact replied elsewhere)
    )),
    
    -- Retry tracking
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    
    -- External tracking
    external_message_id TEXT,  -- ID from Unipile
    sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduler performance
CREATE INDEX idx_send_queue_pending ON send_queue(scheduled_for, priority) 
    WHERE status = 'pending';
CREATE INDEX idx_send_queue_account ON send_queue(account_id, status);
CREATE INDEX idx_send_queue_contact ON send_queue(contact_id);
CREATE INDEX idx_send_queue_campaign ON send_queue(campaign_id);
```

#### 4. **Message Events Table**

```sql
CREATE TABLE message_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    send_queue_id UUID NOT NULL REFERENCES send_queue(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    account_id UUID REFERENCES accounts(id),
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'queued',      -- Added to queue
        'scheduled',   -- Assigned to account
        'sent',        -- Send attempted
        'delivered',   -- Confirmed delivered
        'opened',      -- Email opened (if tracking)
        'clicked',     -- Link clicked (if tracking)
        'replied',     -- Got a reply
        'bounced',     -- Email bounced
        'spam',        -- Marked as spam
        'unsubscribed',-- Opted out
        'failed'       -- Send failed
    )),
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    
    -- Reply analysis
    reply_text TEXT,
    reply_sentiment TEXT CHECK (reply_sentiment IN (
        'positive', 'negative', 'neutral', 'question', 'out_of_office'
    )),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_message_events_contact ON message_events(contact_id, created_at);
CREATE INDEX idx_message_events_campaign ON message_events(campaign_id, event_type);
CREATE INDEX idx_message_events_type ON message_events(event_type, created_at);
```

### Views for Easy Querying

```sql
-- View: Leads ready for review (Clay-style)
CREATE VIEW leads_for_review AS
SELECT 
    c.id as contact_id,
    c.first_name,
    c.last_name,
    c.email,
    c.email_verified,
    c.linkedin_url,
    c.title,
    c.connection_degree,
    c.eligible_for_outreach,
    
    co.id as company_id,
    co.name as company_name,
    co.domain,
    co.size,
    co.industry,
    co.signals,
    co.fit_score,
    co.priority,
    co.source_tool,
    
    cc.id as campaign_contact_id,
    cc.status as campaign_status,
    cc.current_step,
    
    camp.id as campaign_id,
    camp.name as campaign_name,
    
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
LEFT JOIN send_queue sq ON sq.contact_id = c.id AND sq.status = 'pending'
LEFT JOIN accounts a ON sq.account_id = a.id
ORDER BY co.fit_score DESC, sq.scheduled_for ASC;

-- View: Today's send schedule
CREATE VIEW todays_schedule AS
SELECT 
    sq.*,
    c.first_name || ' ' || c.last_name as contact_name,
    c.email,
    co.name as company_name,
    a.name as account_name,
    a.health_score,
    camp.name as campaign_name
FROM send_queue sq
JOIN contacts c ON sq.contact_id = c.id
JOIN companies co ON c.company_id = co.id
JOIN accounts a ON sq.account_id = a.id
JOIN campaigns camp ON sq.campaign_id = camp.id
WHERE sq.scheduled_for::date = CURRENT_DATE
AND sq.status IN ('pending', 'scheduled')
ORDER BY sq.scheduled_for ASC;

-- View: Account capacity
CREATE VIEW account_capacity AS
SELECT 
    a.id,
    a.name,
    a.type,
    a.health_score,
    a.status,
    a.daily_limit_emails,
    a.daily_limit_connections,
    a.daily_limit_messages,
    a.today_emails,
    a.today_connections,
    a.today_messages,
    a.daily_limit_emails - a.today_emails as emails_remaining,
    a.daily_limit_connections - a.today_connections as connections_remaining,
    a.daily_limit_messages - a.today_messages as messages_remaining,
    CASE 
        WHEN a.status != 'active' THEN FALSE
        WHEN a.health_score < 30 THEN FALSE
        WHEN a.type = 'email' AND a.today_emails >= a.daily_limit_emails THEN FALSE
        WHEN a.type = 'linkedin' AND a.today_connections >= a.daily_limit_connections THEN FALSE
        ELSE TRUE
    END as can_send_now
FROM accounts a;
```

### Scaling Considerations

| Concern | Solution |
|---------|----------|
| **Millions of contacts** | Indexes on email, linkedin_url, company_id. Partition by created_at if needed. |
| **High query volume** | Use the views above. Add read replicas if needed. |
| **Send queue growth** | Archive sent messages after 90 days to `send_queue_archive` table. |
| **Event log growth** | Partition message_events by month. Archive old events. |
| **Concurrent schedulers** | Use `SELECT FOR UPDATE SKIP LOCKED` in scheduler to prevent double-sends. |

### Migration Path

To add global outreach tracking to your existing schema (keeping all current associations):

```sql
-- Step 1: Add global tracking columns to contacts
ALTER TABLE contacts 
    ADD COLUMN IF NOT EXISTS global_last_contacted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS global_contact_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS global_last_reply_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS global_status TEXT DEFAULT 'available';

-- Step 2: Add computed column for 60-day eligibility
-- Note: If your Postgres version doesn't support generated columns, use a view instead
ALTER TABLE contacts 
    ADD COLUMN IF NOT EXISTS eligible_for_outreach BOOLEAN 
    GENERATED ALWAYS AS (
        global_status != 'do_not_contact' 
        AND (global_last_contacted_at IS NULL 
             OR global_last_contacted_at < NOW() - INTERVAL '60 days')
    ) STORED;

-- Step 3: Create indexes for cross-offer lookups by email/linkedin
CREATE INDEX IF NOT EXISTS idx_contacts_email_global ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_linkedin_global ON contacts(linkedin_url) WHERE linkedin_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_eligible ON contacts(eligible_for_outreach) WHERE eligible_for_outreach = TRUE;

-- Step 4: Create outreach_history table
CREATE TABLE IF NOT EXISTS outreach_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Track by email/linkedin (for global 60-day rule)
    contact_email TEXT,
    contact_linkedin_url TEXT,
    
    -- Also link to specific records for detailed history
    contact_id UUID REFERENCES contacts(id),
    campaign_id UUID REFERENCES campaigns(id),
    offer_id UUID REFERENCES offers(id),
    account_id UUID REFERENCES accounts(id),
    
    -- What was sent
    channel TEXT NOT NULL,
    message_subject TEXT,
    message_body TEXT,
    
    -- When and outcome
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'sent',
    replied_at TIMESTAMPTZ,
    reply_sentiment TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Indexes for fast 60-day lookups
CREATE INDEX idx_outreach_history_email ON outreach_history(contact_email, sent_at DESC);
CREATE INDEX idx_outreach_history_linkedin ON outreach_history(contact_linkedin_url, sent_at DESC);
CREATE INDEX idx_outreach_history_contact ON outreach_history(contact_id);

-- Step 6: Create send_queue table
CREATE TABLE IF NOT EXISTS send_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    account_id UUID REFERENCES accounts(id),
    
    channel TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    
    scheduled_for TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',
    
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    external_message_id TEXT,
    sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_send_queue_pending ON send_queue(scheduled_for, priority) WHERE status = 'pending';
CREATE INDEX idx_send_queue_account ON send_queue(account_id, status);

-- Step 7: Create the trigger to update global tracking
CREATE OR REPLACE FUNCTION update_global_outreach_tracking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sent' THEN
        -- Update all contacts with this email
        IF NEW.contact_email IS NOT NULL THEN
            UPDATE contacts
            SET 
                global_last_contacted_at = NEW.sent_at,
                global_contact_count = global_contact_count + 1,
                global_status = CASE 
                    WHEN global_status = 'do_not_contact' THEN 'do_not_contact'
                    ELSE 'cooling_off'
                END
            WHERE email = NEW.contact_email;
        END IF;
        
        -- Update all contacts with this LinkedIn
        IF NEW.contact_linkedin_url IS NOT NULL THEN
            UPDATE contacts
            SET 
                global_last_contacted_at = NEW.sent_at,
                global_contact_count = global_contact_count + 1,
                global_status = CASE 
                    WHEN global_status = 'do_not_contact' THEN 'do_not_contact'
                    ELSE 'cooling_off'
                END
            WHERE linkedin_url = NEW.contact_linkedin_url
            AND (email IS NULL OR email != NEW.contact_email); -- Don't double-update
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_global_outreach
AFTER INSERT OR UPDATE ON outreach_history
FOR EACH ROW
EXECUTE FUNCTION update_global_outreach_tracking();

-- Step 8: Add health tracking to accounts
ALTER TABLE accounts 
    ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS spam_rate DECIMAL(5,4) DEFAULT 0;

-- Step 9: Create the views for easy querying
CREATE OR REPLACE VIEW contacts_ready_for_outreach AS
SELECT 
    c.*,
    co.name as company_name,
    co.domain as company_domain,
    co.fit_score,
    o.name as offer_name,
    EXTRACT(DAY FROM NOW() - c.global_last_contacted_at)::INTEGER as days_since_contact
FROM contacts c
JOIN companies co ON c.company_id = co.id
JOIN offers o ON c.offer_id = o.id
WHERE c.eligible_for_outreach = TRUE
  AND c.email IS NOT NULL
  AND COALESCE(c.email_verified, FALSE) = TRUE
  AND COALESCE(c.do_not_contact, FALSE) = FALSE
ORDER BY co.fit_score DESC;

CREATE OR REPLACE VIEW todays_schedule AS
SELECT 
    sq.*,
    c.first_name || ' ' || c.last_name as contact_name,
    c.email,
    co.name as company_name,
    a.name as account_name,
    a.health_score,
    camp.name as campaign_name
FROM send_queue sq
JOIN contacts c ON sq.contact_id = c.id
JOIN companies co ON c.company_id = co.id
LEFT JOIN accounts a ON sq.account_id = a.id
JOIN campaigns camp ON sq.campaign_id = camp.id
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
```

### Backfill Existing Outreach Data

If you have existing outreach records, backfill the `global_last_contacted_at`:

```sql
-- Backfill from existing messages/outreach tables
-- Adjust table/column names to match your actual schema

UPDATE contacts c
SET 
    global_last_contacted_at = (
        SELECT MAX(sent_at)
        FROM messages m
        JOIN campaign_contacts cc ON m.campaign_contact_id = cc.id
        WHERE cc.contact_id = c.id
        AND m.status = 'sent'
    ),
    global_contact_count = (
        SELECT COUNT(*)
        FROM messages m
        JOIN campaign_contacts cc ON m.campaign_contact_id = cc.id
        WHERE cc.contact_id = c.id
        AND m.status = 'sent'
    )
WHERE EXISTS (
    SELECT 1 FROM messages m
    JOIN campaign_contacts cc ON m.campaign_contact_id = cc.id
    WHERE cc.contact_id = c.id
    AND m.status = 'sent'
);
```

---

### 1. **Dedicated Send Queue Table with Visibility**

Your current system uses `campaign_contacts` with status fields, but you need a dedicated queue for:
- Seeing exactly what's scheduled and when
- Pausing/canceling individual messages
- Load balancing across accounts
- Retry logic for failures

**Add this table:**
```sql
CREATE TABLE send_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    contact_id UUID REFERENCES contacts(id),
    account_id UUID REFERENCES accounts(id),
    
    -- What to send
    channel TEXT NOT NULL, -- 'email', 'linkedin_connection', 'linkedin_dm'
    subject TEXT,
    body TEXT,
    
    -- When to send
    scheduled_for TIMESTAMPTZ NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
    
    -- Tracking
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    external_message_id TEXT, -- From Unipile
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for the scheduler to find pending messages
CREATE INDEX idx_send_queue_pending ON send_queue(scheduled_for) 
    WHERE status = 'pending';
```

### 2. **Account Health Scoring**

You track daily limits but not long-term health. Add:

```sql
-- Add to accounts table
ALTER TABLE accounts ADD COLUMN health_score INTEGER DEFAULT 100;
ALTER TABLE accounts ADD COLUMN bounce_rate DECIMAL(5,4) DEFAULT 0;
ALTER TABLE accounts ADD COLUMN spam_rate DECIMAL(5,4) DEFAULT 0;
ALTER TABLE accounts ADD COLUMN reply_rate DECIMAL(5,4) DEFAULT 0;

-- Function to calculate health
CREATE OR REPLACE FUNCTION calculate_account_health(account_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 100;
    b_rate DECIMAL;
    s_rate DECIMAL;
BEGIN
    -- Get rates from last 30 days
    SELECT 
        COUNT(*) FILTER (WHERE status = 'bounced')::DECIMAL / NULLIF(COUNT(*), 0),
        COUNT(*) FILTER (WHERE status = 'spam')::DECIMAL / NULLIF(COUNT(*), 0)
    INTO b_rate, s_rate
    FROM send_queue
    WHERE account_id = account_uuid
    AND sent_at > NOW() - INTERVAL '30 days';
    
    -- Deduct for bounces
    IF b_rate > 0.05 THEN score := score - 50;
    ELSIF b_rate > 0.02 THEN score := score - 20;
    END IF;
    
    -- Deduct for spam
    IF s_rate > 0.005 THEN score := 0; -- Burned
    ELSIF s_rate > 0.001 THEN score := score - 30;
    END IF;
    
    RETURN GREATEST(score, 0);
END;
$$ LANGUAGE plpgsql;
```

### 3. **Message Events Table**

Track what happens after sending:

```sql
CREATE TABLE message_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    send_queue_id UUID REFERENCES send_queue(id),
    event_type TEXT NOT NULL, -- 'sent', 'delivered', 'bounced', 'replied', 'spam'
    event_data JSONB DEFAULT '{}',
    reply_text TEXT,
    reply_sentiment TEXT, -- 'positive', 'negative', 'neutral', 'ooo'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_events_queue ON message_events(send_queue_id);
```

### 4. **Per-Inbox Email Limits (Not Just Global)**

Your current system has a generic `daily_limit_emails = 100`. Change to per-provider:

```sql
-- Add to accounts table or create a limits config
ALTER TABLE accounts ADD COLUMN provider TEXT; -- 'gmail', 'outlook'
ALTER TABLE accounts ADD COLUMN warmup_started_at TIMESTAMPTZ;

-- Limits should be calculated based on provider + warmup age
-- See the getCurrentLimit() function in the proposed plan
```

### 5. **60-Day Contact Rule**

This is the key insight you're missing. Add tracking:

```sql
-- Add to contacts table
ALTER TABLE contacts ADD COLUMN last_outreach_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN outreach_count INTEGER DEFAULT 0;

-- Add a view or filter to exclude recently contacted
CREATE VIEW contacts_eligible AS
SELECT * FROM contacts
WHERE last_outreach_at IS NULL 
   OR last_outreach_at < NOW() - INTERVAL '60 days';
```

---

## What's Missing From Your Current GTM (Nice to Have)

### 1. **Waterfall Email Enrichment**

Your current approach uses Leadmagic only. The proposed waterfall (Fullenrich → Leadmagic) improves hit rate:

```javascript
async function enrichEmail(contact) {
    // Try Fullenrich first
    let email = await fullenrich.find(contact.linkedin_url);
    let source = 'fullenrich';
    
    // Fall back to Leadmagic
    if (!email) {
        email = await leadmagic.find(contact);
        source = 'leadmagic';
    }
    
    if (email) {
        await supabase.from('contacts').update({
            email,
            email_verified: true,
            email_verification_source: source
        }).eq('id', contact.id);
    }
    
    return email;
}
```

### 2. **Odd/Even/Burner Account Rotation**

The proposed plan mentions this but doesn't implement it. For your 3-5 email accounts:

```
Week 1-2: Use accounts 1, 2 (Odd set)
Week 3-4: Use accounts 3, 4 (Even set)  
Always: Keep account 5 warming as Burner backup
```

Track this with a simple field:
```sql
ALTER TABLE accounts ADD COLUMN rotation_set TEXT; -- 'odd', 'even', 'burner'
```

### 3. **Recipient Timezone Detection**

The proposed plan mentions sending in recipient timezone. You can infer this from:
- Company headquarters location (you already track this)
- Contact's LinkedIn location

---

## What to Skip From Proposed Plan

### 1. **Full Workflow Engine**

The proposed plan includes a complex workflow executor with step chaining. For a single user:
- **Skip the engine** - your Cursor commands already work well
- **Keep using** `/new-offer`, `/find-companies`, `/find-contacts` commands
- If you want automation, just chain these in a script

### 2. **Multi-Tenant Architecture**

The proposed schema is designed for multiple users/clients. You don't need:
- User authentication/authorization
- Organization/tenant separation
- Complex permission systems

### 3. **Complex AI Personalization**

The proposed plan has elaborate AI personalization with Perplexity research. Start simpler:
- Use your existing copy templates
- Add `{{first_name}}`, `{{company}}` variables
- Only add AI personalization if reply rates need improvement

---

## Visual Dashboard Recommendation

You mentioned wanting more visibility on scheduled messages AND a Clay-style interface to review leads. Here's what to build:

### The Problem: No Visual Way to Review Leads

Currently, to see your leads you have to:
1. Open Supabase dashboard
2. Navigate to table editor
3. Click through multiple tables
4. Manually join data in your head

You need a **Clay-style leads table** that shows everything in one view with:
- Custom columns (all your Supabase fields)
- Priority scores
- Scheduled send times
- Company signals
- Contact status
- Ability to filter, sort, approve/reject

---

## Clay-Style Leads Interface Design

### Main Leads View

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  LEADS REVIEW                                                           [Filter ▼] [Columns ▼] [Export] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Campaign: [All Campaigns ▼]    Status: [Ready to Send ▼]    Source: [All ▼]    Priority: [All ▼]        │
├────┬───────────────┬─────────────────┬────────────┬──────────┬──────────┬────────────┬──────────┬───────┤
│ ☑  │ Contact       │ Company         │ Title      │ Source   │ Priority │ Signals    │ Scheduled│ Status│
├────┼───────────────┼─────────────────┼────────────┼──────────┼──────────┼────────────┼──────────┼───────┤
│ ☑  │ Jane Smith    │ Acme Corp       │ VP Marketing│ Parallel │ 🔴 92    │ Hiring 3   │ Today    │ Ready │
│    │ jane@acme.com │ 150 emp • SaaS  │            │          │          │ SDRs       │ 9:15am   │       │
├────┼───────────────┼─────────────────┼────────────┼──────────┼──────────┼────────────┼──────────┼───────┤
│ ☑  │ Bob Johnson   │ TechStart Inc   │ Head Growth│ TheirStk │ 🟠 78    │ Series B,  │ Today    │ Ready │
│    │ bob@techstart │ 85 emp • B2B    │            │          │          │ Using Gong │ 9:32am   │       │
├────┼───────────────┼─────────────────┼────────────┼──────────┼──────────┼────────────┼──────────┼───────┤
│ ☐  │ Alice Chen    │ DataFlow        │ CMO        │ Exa      │ 🟡 65    │ New CEO    │ Today    │ Review│
│    │ alice@dataflow│ 200 emp • Data  │            │          │          │            │ 10:05am  │       │
├────┼───────────────┼─────────────────┼────────────┼──────────┼──────────┼────────────┼──────────┼───────┤
│ ☐  │ Mike Davis    │ CloudCo         │ VP Sales   │ Parallel │ 🟢 45    │ None       │ Tomorrow │ Skip? │
│    │ (no email)    │ 50 emp • Cloud  │            │          │          │            │ Pending  │       │
├────┴───────────────┴─────────────────┴────────────┴──────────┴──────────┴────────────┴──────────┴───────┤
│                                                                                                         │
│ Selected: 2 of 156    [✓ Approve Selected] [✗ Skip Selected] [📝 Edit] [🔄 Re-enrich] [🗑️ Remove]        │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detail Slide-Out Panel (When You Click a Lead)

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEAD DETAILS                                              [✕ Close]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CONTACT                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 👤 Jane Smith                                                   ││
│  │    VP of Marketing                                              ││
│  │    📧 jane@acme.com (verified via Fullenrich)                   ││
│  │    🔗 linkedin.com/in/janesmith                                 ││
│  │    📍 San Francisco, CA                                         ││
│  │    ⏱️ 3 months in role (NEW!)                                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  COMPANY                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 🏢 Acme Corp                    acme.com                        ││
│  │    150 employees • SaaS • Series B                              ││
│  │    San Francisco, CA                                            ││
│  │                                                                 ││
│  │ SIGNALS:                                                        ││
│  │ • 🟢 Hiring: 3 SDRs, 2 AEs (TheirStack, 5 days ago)            ││
│  │ • 🟢 Tech: Using Salesforce, HubSpot, Gong                      ││
│  │ • 🟡 Growth: +15% headcount YoY                                 ││
│  │                                                                 ││
│  │ FIT SCORE: 92/100                                               ││
│  │ Reasoning: "Strong fit - actively building sales team,          ││
│  │ using modern sales stack, decision maker identified"            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  OUTREACH STATUS                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Campaign: Q1 AI Outreach                                        ││
│  │ Channel: Email                                                  ││
│  │ Scheduled: Today 9:15am EST                                     ││
│  │ Account: mike@domain1.com                                       ││
│  │ Status: Ready to send                                           ││
│  │                                                                 ││
│  │ Last contacted: Never                                           ││
│  │ Connection degree: 2nd (via Sarah Johnson)                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  MESSAGE PREVIEW                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Subject: hiring signal                                          ││
│  │                                                                 ││
│  │ jane,                                                           ││
│  │                                                                 ││
│  │ how are you ramping your new SDRs right now?                    ││
│  │                                                                 ││
│  │ most sales leaders tell us new hires take 6+ months to hit      ││
│  │ quota because they practice on live prospects.                  ││
│  │                                                                 ││
│  │ gong found their SDRs ramped 40% faster using AI roleplay.      ││
│  │                                                                 ││
│  │ i put together a list of the top 10 objections your SDRs will   ││
│  │ hear selling to [industry] - with responses that work.          ││
│  │                                                                 ││
│  │ want it? just reply and i'll send it over.                      ││
│  │                                                                 ││
│  │ mike                                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  [✏️ Edit Message] [⏸️ Pause] [✓ Approve] [✗ Skip] [🗑️ Remove]       │
│                                                                     │
│  ACTIVITY LOG                                                       │
│  • Jan 15 9:00am - Added to campaign from Parallel search          │
│  • Jan 15 9:01am - Email enriched via Fullenrich                   │
│  • Jan 15 9:02am - AI scored: 92/100                               │
│  • Jan 15 9:03am - Scheduled for 9:15am                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Account Health Dashboard (Separate Tab)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  ACCOUNT HEALTH                                                      [Refresh] [Export] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  EMAIL ACCOUNTS                                                                         │
│  ┌─────────────────┬────────┬───────────┬───────────┬──────────┬────────┬─────────────┐ │
│  │ Account         │ Health │ Today     │ Bounce %  │ Reply %  │ Warmup │ Status      │ │
│  ├─────────────────┼────────┼───────────┼───────────┼──────────┼────────┼─────────────┤ │
│  │ mike@domain1.com│ 95 🟢  │ 18/30     │ 0.5%      │ 3.2%     │ Done   │ Active      │ │
│  │ sales@domain2   │ 72 🟡  │ 25/30     │ 2.1%      │ 1.8%     │ Done   │ ⚠️ Watch    │ │
│  │ hello@domain3   │ 45 🔴  │ 0/30      │ 5.2%      │ 0.8%     │ Done   │ ❌ Paused   │ │
│  │ outreach@domain4│ 100 🟢 │ 8/15      │ 0%        │ -        │ Wk 2   │ Warming     │ │
│  │ new@domain5     │ 100 🟢 │ 3/5       │ 0%        │ -        │ Wk 1   │ Warming     │ │
│  └─────────────────┴────────┴───────────┴───────────┴──────────┴────────┴─────────────┘ │
│                                                                                         │
│  LINKEDIN ACCOUNTS                                                                      │
│  ┌─────────────────┬────────┬───────────┬───────────────┬───────────┬─────────────────┐ │
│  │ Account         │ Health │ Conn Req  │ Messages      │ Accept %  │ Status          │ │
│  ├─────────────────┼────────┼───────────┼───────────────┼───────────┼─────────────────┤ │
│  │ Mike LinkedIn   │ 88 🟢  │ 15/20     │ 28/40         │ 45%       │ Active          │ │
│  │ Eugene LinkedIn │ 92 🟢  │ 12/20     │ 18/40         │ 52%       │ Active          │ │
│  └─────────────────┴────────┴───────────┴───────────────┴───────────┴─────────────────┘ │
│                                                                                         │
│  DAILY CAPACITY REMAINING                                                               │
│  Email: 47 of 110 remaining (43%)  ████████░░░░░░░░░░░                                  │
│  LinkedIn Connections: 13 of 40 remaining (33%)  ██████░░░░░░░░░░░░░                    │
│  LinkedIn Messages: 34 of 80 remaining (43%)  ████████░░░░░░░░░░░                       │
│                                                                                         │
│  SEND QUEUE PREVIEW (Next 2 hours)                                                      │
│  ┌────────┬─────────────────┬─────────────────┬──────────┬─────────────────────────────┐ │
│  │ Time   │ Contact         │ Company         │ Channel  │ Account                     │ │
│  ├────────┼─────────────────┼─────────────────┼──────────┼─────────────────────────────┤ │
│  │ 9:15am │ Jane Smith      │ Acme Corp       │ Email    │ mike@domain1.com            │ │
│  │ 9:22am │ Bob Johnson     │ TechStart       │ Email    │ sales@domain2.com           │ │
│  │ 9:38am │ Sarah Lee       │ InnovateCo      │ LI Conn  │ Mike LinkedIn               │ │
│  │ 9:45am │ Tom Brown       │ DataFlow        │ Email    │ mike@domain1.com            │ │
│  │ 10:01am│ Alice Chen      │ CloudCo         │ LI Conn  │ Eugene LinkedIn             │ │
│  │ ...    │ +18 more in next 2 hours                                                   │ │
│  └────────┴─────────────────┴─────────────────┴──────────┴─────────────────────────────┘ │
│                                                                                         │
│  [⏸️ Pause All Sending] [▶️ Resume] [📊 View Full Analytics]                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Custom Columns You Can Show

Based on your Supabase schema, here are all the columns available for your Clay-style view:

### Contact Columns
| Column | Source Table | Description |
|--------|--------------|-------------|
| `first_name`, `last_name`, `full_name` | contacts | Name |
| `email` | contacts | Email address |
| `email_verified` | contacts | Whether email is verified |
| `email_verification_source` | contacts | Fullenrich/Leadmagic/etc |
| `linkedin_url` | contacts | LinkedIn profile |
| `title` | contacts | Job title |
| `title_normalized` | contacts | Standardized title (vp_sales, etc) |
| `seniority` | contacts | C-Suite/VP/Director/Manager/IC |
| `department` | contacts | Sales/Marketing/Engineering/etc |
| `connection_degree` | contacts | 1st/2nd/3rd degree |
| `months_in_role` | contacts | How long in current role |
| `is_new_in_role` | contacts | True if < 3 months |
| `status` | contacts | new/contacted/replied/meeting/etc |
| `last_contacted_at` | contacts | When we last reached out |

### Company Columns
| Column | Source Table | Description |
|--------|--------------|-------------|
| `name` | companies | Company name |
| `domain` | companies | Website domain |
| `size` | companies | 1-10, 11-50, 51-200, etc |
| `size_exact` | companies | Exact employee count |
| `vertical` | companies | Industry vertical |
| `industry` | companies | Broader industry |
| `headquarters_city/state/country` | companies | Location |
| `signals` | companies | JSONB with hiring, tech stack, funding |
| `fit_score` | companies | 1-100 AI score |
| `fit_reasoning` | companies | Why this score |
| `priority` | companies | high/medium/low |
| `source_tool` | companies | parallel/theirstack/exa/manual |
| `source_query` | companies | The search that found them |

### Outreach Columns
| Column | Source Table | Description |
|--------|--------------|-------------|
| `campaign_name` | campaigns | Which campaign |
| `channel` | campaign_contacts | email/linkedin_connect/linkedin_dm |
| `status` | campaign_contacts | queued/in_progress/sent/replied |
| `current_step` | campaign_contacts | Which step in sequence |
| `scheduled_for` | send_queue | When it will send |
| `account_name` | accounts | Which account sends it |
| `priority` | send_queue | Send priority (1-10) |

### Computed/Derived Columns
| Column | How to Calculate | Description |
|--------|------------------|-------------|
| `days_until_send` | `scheduled_for - NOW()` | Days until scheduled |
| `days_since_contact` | `NOW() - last_contacted_at` | Days since last outreach |
| `eligible_for_outreach` | `last_contacted_at IS NULL OR > 60 days` | 60-day rule |
| `signal_summary` | Extract from signals JSONB | "Hiring 3 SDRs, Series B" |
| `tech_stack` | Extract from signals JSONB | "Salesforce, HubSpot, Gong" |

---

## Recommended Implementation Order

### Week 1: Safety & Visibility Foundation
1. Add `send_queue` table
2. Add `message_events` table  
3. Add health score fields to accounts
4. Add `last_outreach_at` to contacts (60-day rule)
5. Create a simple dashboard component

### Week 2: Scheduler Enhancement
1. Implement per-inbox warmup limits
2. Add recipient timezone support
3. Implement random delays (3-15 min)
4. Add the health score calculation

### Week 3: Enrichment & Polish
1. Add email waterfall (Fullenrich → Leadmagic)
2. Implement account rotation (odd/even/burner)
3. Add Cursor commands for queue visibility
4. Test everything end-to-end

---

## Safety Checklist (Non-Negotiable)

Before going live, verify these are working:

### Email Safety
- [ ] Per-inbox daily limits enforced (not just global)
- [ ] Warmup progression working (5 → 10 → 20 → 30 over weeks)
- [ ] Random delays between sends (3-15 min)
- [ ] Send window enforced (9am-5pm recipient time)
- [ ] Weekend skip working
- [ ] Bounce rate tracking and alerts
- [ ] 60-day contact rule enforced

### LinkedIn Safety  
- [ ] Connection request limit: 20/day max (stop at 18)
- [ ] Message limit: 40/day max (stop at 38)
- [ ] Skip 1st degree connections
- [ ] Random delays (5-30 min for LinkedIn)
- [ ] Business hours only
- [ ] Never message same person twice without reply

### Monitoring
- [ ] Health score visible per account
- [ ] Alert when health drops below 50
- [ ] Daily summary of sends/bounces/replies
- [ ] Can pause all sending instantly

---

## Summary: Your Action Items

### Must Do (Critical for Safety)
1. ✅ Add `send_queue` table for visibility
2. ✅ Add `message_events` for tracking
3. ✅ Implement per-inbox limits with warmup
4. ✅ Add health scoring
5. ✅ Enforce 60-day contact rule
6. ✅ Build a simple dashboard for queue visibility

### Should Do (Improves Results)
1. 📊 Add email waterfall enrichment
2. 📊 Implement account rotation
3. 📊 Add recipient timezone support
4. 📊 Create Cursor commands for queue management

### Skip (Unnecessary Complexity)
1. ❌ Full workflow engine
2. ❌ Multi-tenant architecture
3. ❌ Complex AI personalization (start simple)
4. ❌ Elaborate step chaining

---

## Implementation Options for Visual Interface

You mentioned you're fine using Cursor/Claude Code as the interface, but want better visibility. Here are your options:

### Option 1: Next.js Dashboard (Your Existing Setup)

You already have a Next.js app structure in your GTM repo. Add pages for:

```
src/app/
├── page.tsx              # Dashboard home
├── leads/
│   └── page.tsx          # Clay-style leads table
├── queue/
│   └── page.tsx          # Send queue visibility
├── accounts/
│   └── page.tsx          # Account health
└── campaigns/
    └── [id]/page.tsx     # Campaign detail
```

**Pros:** 
- Uses your existing setup
- Full control over UI
- Can deploy to Railway alongside your worker

**Cons:**
- Need to build the UI yourself
- More code to maintain

### Option 2: v0-Generated Dashboard

Use v0.dev to generate the React components, then integrate:

```
Prompt for v0:
"Create a Clay-style leads management dashboard with:
- A filterable, sortable data table showing contacts with columns for name, 
  email, company, title, priority score (1-100 with color coding), signals, 
  scheduled send time, and status
- Click to expand showing full contact/company details and message preview
- Bulk actions: approve, skip, edit, remove
- Filter dropdowns for campaign, status, source, priority range
- Uses Tailwind CSS and shadcn/ui components
- Fetches data from a /api/leads endpoint"
```

**Pros:**
- Fast to generate
- Modern UI out of the box
- Can iterate with prompts

**Cons:**
- May need tweaking for your exact data model
- Generated code can be messy

### Option 3: Claude Agent SDK + Chat Interface

Build a chat interface that lets you query and control the system:

```
You: "Show me today's queue"
Claude: [queries Supabase, formats as table]

You: "Pause the AI Outreach campaign"
Claude: [updates campaign status in Supabase]

You: "Skip the next 3 emails to Acme Corp"
Claude: [updates send_queue status to 'skipped']

You: "Show me all leads with priority > 80 that haven't been contacted"
Claude: [runs query, shows formatted results]
```

**Implementation:**

```typescript
// tools/supabase-tools.ts
const tools = [
  {
    name: "query_leads",
    description: "Query leads from the database with filters",
    parameters: {
      campaign: { type: "string", optional: true },
      min_priority: { type: "number", optional: true },
      status: { type: "string", optional: true },
      limit: { type: "number", default: 20 }
    },
    execute: async (params) => {
      const { data } = await supabase
        .from('leads_for_review')
        .select('*')
        .gte('fit_score', params.min_priority || 0)
        .limit(params.limit);
      return data;
    }
  },
  {
    name: "get_queue",
    description: "Get scheduled messages for a time period",
    parameters: {
      period: { type: "string", enum: ["today", "tomorrow", "this_week"] }
    },
    execute: async (params) => {
      // Query send_queue based on period
    }
  },
  {
    name: "pause_campaign",
    description: "Pause a campaign by name",
    parameters: {
      campaign_name: { type: "string", required: true }
    },
    execute: async (params) => {
      await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('name', params.campaign_name);
      return { success: true };
    }
  },
  {
    name: "skip_messages",
    description: "Skip scheduled messages matching criteria",
    parameters: {
      contact_ids: { type: "array", optional: true },
      company_name: { type: "string", optional: true },
      count: { type: "number", optional: true }
    },
    execute: async (params) => {
      // Update send_queue status to 'skipped'
    }
  }
];
```

**Pros:**
- Natural language interface
- Can do complex queries without building UI
- Feels like Cursor but for your data

**Cons:**
- No visual overview at a glance
- Need to ask for information rather than see it

### Option 4: Hybrid (Recommended)

**Best of both worlds:**

1. **Simple visual dashboard** for at-a-glance status:
   - Account health bars
   - Today's queue count
   - Recent activity feed
   - Campaign stats

2. **Claude chat interface** for complex queries and actions:
   - "Show me all uncontacted leads at companies hiring SDRs"
   - "What's the reply rate for the AI Outreach campaign?"
   - "Pause all LinkedIn activity for the next 2 hours"

3. **Cursor commands** for workflow execution:
   - `/new-offer` - Create new offer
   - `/find-companies` - Run lead generation
   - `/review-leads` - Open leads in dashboard

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR LAPTOP                              │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   CURSOR    │    │  DASHBOARD  │    │ CHAT (AI)   │         │
│  │             │    │  (Next.js)  │    │             │         │
│  │ /new-offer  │    │             │    │ "show queue"│         │
│  │ /find-leads │    │ [Visual]    │    │ "pause X"   │         │
│  │ /review     │    │ [Tables]    │    │ "skip next" │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    SUPABASE     │
                    │                 │
                    │ - leads         │
                    │ - send_queue    │
                    │ - accounts      │
                    │ - campaigns     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    RAILWAY      │
                    │                 │
                    │ Cron (5 min):   │
                    │ - Check queue   │
                    │ - Send messages │
                    │ - Update status │
                    └─────────────────┘
```

---

## Dashboard Implementation Prompts

Use these prompts with v0 or Claude to generate your dashboard components:

### Prompt 1: Clay-Style Leads Table

```
Create a React component for a Clay-style leads management interface.

DATA MODEL:
The component fetches from a Supabase view called "leads_for_review" with fields:
- contact_id, first_name, last_name, email, email_verified, linkedin_url, title, connection_degree
- company_id, company_name, domain, size, industry, signals (JSONB), fit_score (1-100), priority, source_tool
- campaign_id, campaign_name, campaign_status
- queue_id, scheduled_for, queue_status, channel
- sending_account, account_health

REQUIREMENTS:

1. MAIN TABLE:
- Columns: Checkbox, Contact (name + email), Company (name + size), Title, Source, Priority (color-coded 1-100), Signals, Scheduled, Status
- Priority colors: Red (80+), Orange (60-79), Yellow (40-59), Green (0-39)
- Sortable by any column, filterable, paginated (20/page)
- Row click opens detail panel

2. SIGNAL DISPLAY:
Parse signals JSONB like {"hiring": {"sales_reps": 5}, "tech_stack": ["salesforce"], "funding": {"stage": "series_b"}}
Display as chips: "Hiring 5 Sales" "Series B" "Uses Salesforce"

3. DETAIL SLIDE-OUT:
Shows full contact info, company info, message preview, activity log, action buttons

4. BULK ACTIONS: Select multiple, bulk approve/skip/remove

5. FILTERS: Campaign, Status, Source, Priority range, Search

Use Tailwind CSS and shadcn/ui components.
```

### Prompt 2: Account Health Dashboard

```
Create a React component for monitoring sending account health.

DATA: Fetches from "account_capacity" view with id, name, type, health_score, status, daily limits, today counts, remaining capacity, can_send_now.

SHOW:
1. Account cards with health score (colored), usage progress bars, status badges
2. Total capacity summary with progress bars
3. Next 10 scheduled messages table
4. Pause All button, alerts for low health accounts

Use Tailwind CSS and shadcn/ui.
```

### Prompt 3: Send Queue Timeline

```
Create a React component showing scheduled messages as a timeline.

SHOW:
1. Vertical timeline grouped by hour (9am, 10am, etc.)
2. Each message: time, contact, company, channel icon, account
3. Today/Tomorrow/This Week tabs
4. Statistics bar at top
5. Skip/Reschedule actions on each item

Color by channel: blue=email, green=linkedin connection, purple=linkedin DM
Use Tailwind CSS.
```

---

## What to Build First

### Week 1: Foundation
1. ✅ Add `send_queue` table to Supabase
2. ✅ Add `message_events` table
3. ✅ Create views (`leads_for_review`, `todays_schedule`, `account_capacity`)
4. ✅ Update campaign-worker.js to use send_queue

### Week 2: Basic Visibility  
1. 📊 Build Account Health dashboard
2. 📊 Build Queue Timeline
3. 📊 Add to Next.js app

### Week 3: Clay-Style Leads
1. 📋 Build leads table
2. 📋 Add detail slide-out
3. 📋 Add bulk actions

### Week 4: Polish
1. ✨ Add chat interface (optional)
2. ✨ Add Cursor commands for quick access
3. ✨ Test end-to-end

---

This gives you the visibility you need without rebuilding your entire system. Start with the database changes, then add UI incrementally.