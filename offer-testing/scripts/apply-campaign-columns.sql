-- Add structured campaign tracking columns (if missing)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS account_ids JSONB,
  ADD COLUMN IF NOT EXISTS target_criteria JSONB;

-- Optional: enforce cold/networking + channel already exist in table
-- campaign_type + channel should already exist per setup-db.sql
