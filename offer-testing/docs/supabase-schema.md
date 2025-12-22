# Supabase Schema Reference

This document describes the database schema for the Offer Testing System.

## Setup

Run `scripts/setup-db.sql` in your Supabase SQL Editor to create all tables, views, and functions.

## Tables

### offers

Stores business offers being tested through outbound outreach.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Offer name |
| slug | TEXT | URL-friendly identifier (unique) |
| description | TEXT | What the offer does |
| offer_type | TEXT | 'product' or 'service' |
| owner | TEXT | 'internal' or client name |
| positioning | JSONB | Positioning canvas data |
| icp | JSONB | Ideal Customer Profile |
| email_templates | JSONB | 3-email sequence |
| linkedin_templates | JSONB | Connection + DM templates |
| status | TEXT | Current status (see below) |
| created_at | TIMESTAMPTZ | When created |
| updated_at | TIMESTAMPTZ | Last updated |

**Status values:**
- `positioning` - Working on positioning canvas
- `researched` - Market research complete
- `icp_defined` - ICP generated
- `copy_ready` - Copy generated
- `campaign_active` - Running outreach
- `paused` - Temporarily stopped
- `completed` - Campaign finished
- `killed` - Abandoned

### companies

Companies discovered for each offer.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| offer_id | UUID | Foreign key to offers |
| name | TEXT | Company name |
| url | TEXT | Website URL |
| domain | TEXT | Domain (extracted from URL) |
| description | TEXT | Company description |
| size | TEXT | Size range ('1-10', '11-50', etc.) |
| size_exact | INTEGER | Exact employee count |
| vertical | TEXT | Industry |
| stage | TEXT | 'startup', 'growth', 'enterprise' |
| location | TEXT | HQ location |
| signals | JSONB | Detected signals |
| fit_score | INTEGER | 1-10 ICP fit score |
| fit_reasoning | TEXT | Why this score |
| source | TEXT | 'parallel', 'exa', etc. |
| source_query | TEXT | Query that found this |
| raw_data | JSONB | Full API response |
| status | TEXT | Current status |
| created_at | TIMESTAMPTZ | When discovered |

**Unique constraint:** `(offer_id, domain)` - No duplicate companies per offer

### contacts

People at companies (prospects).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| company_id | UUID | Foreign key to companies |
| offer_id | UUID | Foreign key to offers |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| full_name | TEXT | Generated: first + last |
| title | TEXT | Job title |
| department | TEXT | Department |
| seniority | TEXT | 'c-level', 'vp', etc. |
| email | TEXT | Email address |
| email_verified | BOOLEAN | Whether verified |
| email_source | TEXT | 'parallel', 'leadmagic' |
| linkedin_url | TEXT | LinkedIn profile URL |
| linkedin_id | TEXT | LinkedIn member ID |
| connection_degree | INTEGER | 1, 2, 3, or NULL |
| already_contacted | BOOLEAN | Have we messaged them |
| last_contacted_at | TIMESTAMPTZ | When last contacted |
| do_not_contact | BOOLEAN | Should we skip them |
| do_not_contact_reason | TEXT | Why skip |
| source | TEXT | Data source |
| raw_data | JSONB | Full API response |
| created_at | TIMESTAMPTZ | When discovered |
| updated_at | TIMESTAMPTZ | Last updated |

**Unique constraint:** `(offer_id, linkedin_url)` - No duplicate contacts per offer

### outreach

Every outreach message (sent or pending).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| contact_id | UUID | Foreign key to contacts |
| offer_id | UUID | Foreign key to offers |
| channel | TEXT | 'linkedin_connect', 'linkedin_dm', etc. |
| sequence_number | INTEGER | 1st, 2nd, 3rd in sequence |
| subject | TEXT | For email/InMail |
| message_sent | TEXT | Actual message content |
| personalization | JSONB | Variables used |
| status | TEXT | Current status (see below) |
| scheduled_at | TIMESTAMPTZ | When scheduled to send |
| sent_at | TIMESTAMPTZ | When actually sent |
| delivered_at | TIMESTAMPTZ | Email delivery time |
| opened_at | TIMESTAMPTZ | When opened |
| clicked_at | TIMESTAMPTZ | When link clicked |
| replied_at | TIMESTAMPTZ | When replied |
| reply_text | TEXT | The reply content |
| reply_sentiment | TEXT | 'positive', 'negative', etc. |
| notes | TEXT | Any notes |
| created_at | TIMESTAMPTZ | When created |
| updated_at | TIMESTAMPTZ | Last updated |

**Status values:**
- `pending` - Ready to send
- `queued` - In send queue
- `rate_limited` - Hit daily limit
- `sent` - Successfully sent
- `delivered` - Email delivered
- `opened` - Email opened
- `clicked` - Link clicked
- `replied` - Got a response
- `meeting` - Meeting booked
- `not_interested` - Declined
- `bounced` - Email bounced
- `failed` - Send failed
- `cancelled` - Cancelled

### linkedin_activity

Tracks all LinkedIn actions for rate limiting.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| account | TEXT | Account name ('mike', 'eugene') |
| action_type | TEXT | 'connection_request', 'message', etc. |
| contact_id | UUID | Optional: which contact |
| outreach_id | UUID | Optional: which outreach |
| created_at | TIMESTAMPTZ | When action was taken |

**Critical for rate limiting!** Query this table to check daily limits.

### campaigns (Optional)

Groups outreach into campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| offer_id | UUID | Foreign key to offers |
| name | TEXT | Campaign name |
| description | TEXT | Description |
| target_count | INTEGER | How many to contact |
| account | TEXT | LinkedIn account |
| status | TEXT | 'draft', 'active', etc. |
| started_at | TIMESTAMPTZ | When started |
| completed_at | TIMESTAMPTZ | When completed |
| created_at | TIMESTAMPTZ | When created |
| updated_at | TIMESTAMPTZ | Last updated |

## Views

### linkedin_daily_counts

Today's LinkedIn activity count per account.

```sql
SELECT account, action_type, count, date
FROM linkedin_daily_counts
WHERE account = 'mike';
```

### contacts_ready_for_outreach

Contacts that haven't been contacted and aren't 1st degree.

```sql
SELECT * FROM contacts_ready_for_outreach
WHERE offer_id = 'your-offer-id';
```

### offer_stats

Summary statistics for each offer.

```sql
SELECT * FROM offer_stats;
```

Returns: offer_id, offer_name, company_count, contact_count, sent_count, reply_count, meeting_count, reply_rate

## Functions

### can_do_linkedin_action(account, action_type)

Check if a LinkedIn action is allowed (under rate limit).

```sql
SELECT can_do_linkedin_action('mike', 'connection_request');
-- Returns: true/false
```

### log_linkedin_activity(account, action_type, contact_id, outreach_id)

Log a LinkedIn action for rate limiting.

```sql
SELECT log_linkedin_activity('mike', 'message', 'contact-uuid', 'outreach-uuid');
-- Returns: activity UUID
```

## Rate Limits

| Action | Daily Limit |
|--------|-------------|
| Connection requests | 20 |
| Messages (DM + InMail) | 40 |
| Profile views | 80 |

Tracked in `linkedin_activity` table, checked via `linkedin_daily_counts` view.

## Entity Relationship Diagram

```
offers
  │
  ├──< companies (offer_id)
  │      │
  │      └──< contacts (company_id)
  │              │
  │              └──< outreach (contact_id)
  │
  ├──< contacts (offer_id)
  │
  ├──< outreach (offer_id)
  │
  └──< campaigns (offer_id)

linkedin_activity
  │
  ├── contacts (contact_id)
  └── outreach (outreach_id)
```

