-- ================================================================
-- ADD SUMBLE INSIGHTS COLUMNS TO linkedin_connections
-- ================================================================
-- This migration adds columns to store Sumble hiring signal data
-- so we can see which companies are hiring salespeople without
-- re-checking Sumble API every time.
--
-- Run this with:
--   psql $DATABASE_URL -f scripts/add-sumble-insights-columns.sql
--   OR via Supabase SQL editor

-- Add Sumble insights JSONB column (stores full Sumble API response)
ALTER TABLE linkedin_connections
ADD COLUMN IF NOT EXISTS sumble_insights JSONB;

-- Add boolean flag for quick filtering (is company hiring sales?)
ALTER TABLE linkedin_connections
ADD COLUMN IF NOT EXISTS is_hiring_sales BOOLEAN DEFAULT FALSE;

-- Add timestamp for when we last checked Sumble
ALTER TABLE linkedin_connections
ADD COLUMN IF NOT EXISTS sumble_checked_at TIMESTAMPTZ;

-- Add index for quick filtering by hiring status
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_hiring_sales 
ON linkedin_connections(is_hiring_sales) 
WHERE is_hiring_sales = TRUE;

-- Add index for Sumble insights JSONB queries (GIN index for fast JSON queries)
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_sumble_insights 
ON linkedin_connections USING GIN (sumble_insights);

-- Add comment explaining the structure
COMMENT ON COLUMN linkedin_connections.sumble_insights IS 
'JSONB object containing Sumble API response data. Structure:
{
  "is_hiring_sales": boolean,
  "total_jobs": number,
  "sales_jobs_count": number,
  "sales_job_titles": string[],
  "sales_jobs_categorized": [
    {
      "title": string,
      "category": "entry" | "accountExecutive" | "management" | "specialized" | "revops",
      "posted_date": ISO date string,
      "url": string,
      "location": string
    }
  ],
  "latest_sales_job_date": ISO date string | null,
  "checked_at": ISO date string
}';

COMMENT ON COLUMN linkedin_connections.is_hiring_sales IS 
'Quick boolean flag indicating if company is hiring sales roles. 
Updated when sumble_insights is populated.';

COMMENT ON COLUMN linkedin_connections.sumble_checked_at IS 
'Timestamp of when we last checked Sumble for this connection. 
Use this to determine if data is stale and needs refresh.';

-- ================================================================
-- EXAMPLE QUERIES
-- ================================================================

-- Find all connections whose companies are hiring sales
-- SELECT * FROM linkedin_connections WHERE is_hiring_sales = TRUE;

-- Find connections with specific sales job titles
-- SELECT 
--   full_name,
--   current_company,
--   sumble_insights->>'sales_job_titles' as job_titles
-- FROM linkedin_connections
-- WHERE is_hiring_sales = TRUE
-- AND sumble_insights->'sales_job_titles' IS NOT NULL;

-- Find connections that need Sumble refresh (checked > 30 days ago or never checked)
-- SELECT * FROM linkedin_connections
-- WHERE current_company IS NOT NULL
-- AND (sumble_checked_at IS NULL OR sumble_checked_at < NOW() - INTERVAL '30 days');
