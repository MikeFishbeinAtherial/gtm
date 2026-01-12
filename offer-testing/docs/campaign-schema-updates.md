# Campaign Schema Updates - Summary

## Migrations Applied ✅

### 1. Sumble Insights Columns
**Migration:** `add_sumble_insights_columns`

**Added to `linkedin_connections`:**
- `sumble_insights` (JSONB) - Full Sumble API response with hiring data
- `is_hiring_sales` (BOOLEAN) - Quick flag for filtering
- `sumble_checked_at` (TIMESTAMPTZ) - Last check timestamp

### 2. Campaign Slug & Email Template
**Migration:** `add_campaign_slug_and_email_template`

**Added to `networking_campaign_batches`:**
- `slug` (TEXT, UNIQUE) - Unique campaign identifier
- `email_template` (TEXT) - Email template with custom variables
- `email_template_variables` (JSONB) - Available template variables

### 3. Company Domain
**Migration:** `add_company_domain_to_connections`

**Added to `linkedin_connections`:**
- `company_domain` (TEXT) - Extracted company domain for API lookups

---

## Campaign Details

### Campaign Name
**Atherial AI Roleplay Training - 2025 Q1**

### Campaign Slug
**`atherial-ai-roleplay-2025-q1`**

This unique identifier will be used to:
- Track which campaign messages belong to
- Prevent duplicate messaging across campaigns
- Query campaign-specific metrics

### Offer
**Atherial** - Custom AI agents and internal development for GTM teams

### Use Case
**AI Roleplay Training** - "Get new hires quota-ready in weeks. Sellers practice pitch AI prospects trained to act exactly like your real prospects, and get tailored training."

---

## Email Template Variables

When creating your email template, you can use these variables:

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{firstname}}` | First name | "Mike" |
| `{{company}}` | Current company name | "Atherial" |
| `{{role}}` | Current job title | "VP Sales" |
| `{{hiring_signal}}` | Sales role they're hiring for | "SDR" or "Account Executive" |
| `{{location}}` | Location | "San Francisco, CA" |
| `{{industry}}` | Industry | "SaaS" |

### Example Email Template

```
Hey {{firstname}}!

I noticed {{company}} is hiring for {{hiring_signal}} - exciting growth! 

I wanted to share something that could help: We help sales teams get new hires quota-ready in weeks with AI roleplay training. Sellers practice pitching AI prospects trained to act exactly like your real prospects.

Would love to show you how it works if you're interested.

Best,
Mike
```

### Template Variables JSONB Structure

When creating the campaign, store available variables like this:

```json
{
  "firstname": "First name of the connection",
  "company": "Current company name",
  "role": "Current job title/role",
  "hiring_signal": "Sales role they're hiring for (if applicable)",
  "location": "Location",
  "industry": "Industry"
}
```

---

## Unipile Data We Capture

From Unipile's `/users/relations` endpoint, we capture:

### Already Stored in `linkedin_connections`:
- ✅ `linkedin_id` - LinkedIn internal ID
- ✅ `linkedin_url` - Public profile URL
- ✅ `first_name`, `last_name`, `full_name` - Name fields
- ✅ `headline` - Current title/headline
- ✅ `current_company` - Company name
- ✅ `current_title` - Job title
- ✅ `location` - Location
- ✅ `industry` - Industry
- ✅ `profile_picture_url` - Profile picture
- ✅ `num_connections` - Their connection count
- ✅ `connected_at` - When you connected
- ✅ `connection_message` - Message they sent when connecting
- ✅ `raw_data` (JSONB) - **Full Unipile response** (contains everything)

### New Column Added:
- ✅ `company_domain` - Extracted domain for API lookups

### What's in `raw_data`:
The `raw_data` JSONB column stores the complete Unipile response, so if there's any additional data you need later, it's all there. Common additional fields might include:
- Email addresses (if available)
- Phone numbers (if available)
- Additional profile fields
- Any other metadata Unipile provides

---

## Creating the Campaign Batch

Run this SQL to create your campaign:

```sql
INSERT INTO networking_campaign_batches (
  name,
  slug,
  description,
  message_template,
  email_template,
  email_template_variables,
  personalization_instructions,
  target_filters,
  status
) VALUES (
  'Atherial AI Roleplay Training - 2025 Q1',
  'atherial-ai-roleplay-2025-q1',
  'Reconnecting with 2025 connections to offer AI roleplay training for sales teams',
  'Hey {{firstname}}! I noticed {{company}} is hiring for {{hiring_signal}} - exciting growth! Would love to share how we help sales teams get new hires quota-ready in weeks with AI roleplay training.',
  'Hey {{firstname}}!

I noticed {{company}} is hiring for {{hiring_signal}} - exciting growth! 

I wanted to share something that could help: We help sales teams get new hires quota-ready in weeks with AI roleplay training. Sellers practice pitching AI prospects trained to act exactly like your real prospects.

Would love to show you how it works if you''re interested.

Best,
Mike',
  '{
    "firstname": "First name of the connection",
    "company": "Current company name",
    "role": "Current job title/role",
    "hiring_signal": "Sales role they are hiring for (if applicable)",
    "location": "Location",
    "industry": "Industry"
  }'::jsonb,
  'Personalize based on: 1) Their current role, 2) If company is hiring sales (mention specific role from Sumble), 3) Last message context if available',
  '{
    "connected_in_2025": true,
    "exclude_messaged_last_7_days": true,
    "prefer_hiring_sales": true
  }'::jsonb,
  'draft'
)
RETURNING *;
```

---

## Querying Campaign Data

### Find connections for this campaign:

```sql
SELECT 
  lc.full_name,
  lc.current_company,
  lc.current_title,
  lc.is_hiring_sales,
  lc.sumble_insights->>'sales_job_titles' as hiring_roles,
  lc.sumble_insights->>'sales_jobs_count' as job_count
FROM linkedin_connections lc
WHERE lc.connected_at >= '2025-01-01'
  AND lc.connected_at < '2026-01-01'
  AND lc.skip_outreach = FALSE
  AND lc.is_hiring_sales = TRUE  -- Prioritize companies hiring sales
ORDER BY (lc.sumble_insights->>'sales_jobs_count')::int DESC;
```

### Check who's already been messaged in this campaign:

```sql
SELECT 
  lc.full_name,
  no.personalized_message,
  no.sent_at,
  no.status
FROM networking_outreach no
JOIN linkedin_connections lc ON no.connection_id = lc.id
JOIN networking_campaign_batches ncb ON no.batch_id = ncb.id
WHERE ncb.slug = 'atherial-ai-roleplay-2025-q1'
ORDER BY no.sent_at DESC;
```

---

## Next Steps

1. ✅ **Migrations applied** - All database columns added
2. ⏳ **Sync LinkedIn data** - Run `npx ts-node --esm scripts/sync-linkedin.ts` to get your connections
3. ⏳ **Create campaign batch** - Use the SQL above
4. ⏳ **Run filter script** - `node scripts/filter-2025-connections.js` (after syncing)
5. ⏳ **Generate messages** - Use `generate-networking-messages.js` with the campaign slug
6. ⏳ **Review & send** - Approve messages before sending

---

## Files Updated

- ✅ `scripts/add-sumble-insights-columns.sql` - Migration file
- ✅ `scripts/filter-2025-connections.js` - Updated with campaign details
- ✅ Database migrations applied via Supabase MCP
