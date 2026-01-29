-- ================================================================
-- MIGRATION: Add Campaign Metadata Fields
-- ================================================================
-- Adds campaign_slug and account_ids fields to campaigns table
-- to support structured campaign naming and multi-account tracking
--
-- Date: January 29, 2026
-- ================================================================

-- Add campaign_slug column (unique identifier for structured naming)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS campaign_slug TEXT UNIQUE;

-- Add account_ids JSONB column (stores array of account IDs and names)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS account_ids JSONB;

-- Create index on campaign_slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(campaign_slug);

-- Add comment explaining the fields
COMMENT ON COLUMN campaigns.campaign_slug IS 'Structured slug format: {type}-{offer}-{channel}-{signal}-{icp}-{account}. Example: cold-roleplay-linkedin-hiring-pmre-mike';
COMMENT ON COLUMN campaigns.account_ids IS 'Array of account objects: [{"id": "...", "name": "...", "type": "email|linkedin"}, ...]. Stores all accounts used for this campaign.';

-- Update target_criteria to include signal and icp_target documentation
-- (No schema change needed, just documenting the JSONB structure)
COMMENT ON COLUMN campaigns.target_criteria IS 'JSONB object containing targeting criteria. Should include: signal (primary signal), icp_target (ICP segment), and other filters.';
