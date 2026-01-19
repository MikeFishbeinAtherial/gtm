-- Create a view that makes querying company signals easier
-- Run this in Supabase SQL Editor

CREATE OR REPLACE VIEW company_signals_view AS
SELECT 
  c.id,
  c.name,
  c.domain,
  c.vertical,
  c.source_tool,
  c.fit_score,
  c.fit_reasoning,
  
  -- Parallel FindAll signals (extracted from JSONB)
  (c.source_raw->'parallel_findall'->'output'->>'currently_hiring')::boolean as is_hiring,
  (c.source_raw->'parallel_findall'->'output'->>'currently_hiring_technical')::boolean as is_hiring_technical,
  (c.source_raw->'parallel_findall'->'output'->>'deal_sourcing_hiring')::boolean as is_hiring_deal_sourcing,
  (c.source_raw->'parallel_findall'->'output'->>'ai_data_leadership')::boolean as has_ai_leadership,
  (c.source_raw->'parallel_findall'->'output'->>'technical_leadership')::boolean as has_technical_leadership,
  (c.source_raw->'parallel_findall'->'output'->>'small_to_mid_size')::boolean as is_small_mid_size,
  (c.source_raw->'parallel_findall'->'output'->>'mid_market_size')::boolean as is_mid_market_size,
  (c.source_raw->'parallel_findall'->'output'->>'east_coast_location')::boolean as is_east_coast,
  (c.source_raw->'parallel_findall'->'output'->>'us_location')::boolean as is_us_location,
  (c.source_raw->'parallel_findall'->>'match_status') as parallel_match_status,
  (c.source_raw->'parallel_findall'->'basis') as parallel_basis,
  
  -- Sumble signals
  (c.source_raw->>'matching_job_post_count')::integer as sumble_job_post_count,
  (c.source_raw->>'matching_people_count')::integer as sumble_people_count,
  (c.source_raw->>'matching_team_count')::integer as sumble_team_count,
  
  -- Company classification signals
  (c.signals->>'finance_fit')::boolean as finance_fit,
  (c.signals->>'company_type') as company_type,
  (c.signals->>'company_type_confidence') as company_type_confidence,
  (c.signals->'parallel'->>'signal_type') as signal_type, -- 'maturity' or 'pain'
  
  -- Contact info
  (SELECT COUNT(*) FROM contacts WHERE contacts.company_id = c.id) as contact_count,
  (SELECT COUNT(*) FROM contacts WHERE contacts.company_id = c.id AND contacts.email IS NOT NULL) as contacts_with_email,
  
  -- Campaign info
  c.status,
  c.created_at,
  c.updated_at
  
FROM companies c
WHERE c.offer_id = (SELECT id FROM offers WHERE slug = 'finance');

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_companies_fit_score ON companies(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_companies_vertical ON companies(vertical);
CREATE INDEX IF NOT EXISTS idx_companies_source_tool ON companies(source_tool);

-- Example queries using the view:

-- 1. Companies currently hiring
-- SELECT name, domain, fit_score, fit_reasoning
-- FROM company_signals_view
-- WHERE is_hiring = true OR is_hiring_technical = true OR is_hiring_deal_sourcing = true
-- ORDER BY fit_score DESC;

-- 2. Companies with AI leadership
-- SELECT name, domain, fit_score, fit_reasoning
-- FROM company_signals_view
-- WHERE has_ai_leadership = true
-- ORDER BY fit_score DESC;

-- 3. Top companies by fit score
-- SELECT name, domain, fit_score, fit_reasoning, is_hiring, has_ai_leadership
-- FROM company_signals_view
-- WHERE fit_score >= 6
-- ORDER BY fit_score DESC
-- LIMIT 20;

-- 4. Companies with specific signals (for email copy customization)
-- SELECT name, domain, fit_score,
--   CASE 
--     WHEN is_hiring_deal_sourcing THEN 'Hiring deal sourcing - pain signal'
--     WHEN is_hiring_technical THEN 'Hiring technical roles - maturity signal'
--     WHEN has_ai_leadership THEN 'Has AI leadership - maturity signal'
--     ELSE 'General fit'
--   END as outreach_angle
-- FROM company_signals_view
-- WHERE fit_score >= 5
-- ORDER BY fit_score DESC;
