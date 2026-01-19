-- Example SQL queries for querying company signals
-- Use these after creating the company_signals_view

-- ============================================
-- 1. COMPANIES CURRENTLY HIRING
-- ============================================
-- Use this to find companies actively hiring (good for "we see you're hiring" angle)

SELECT 
  name,
  domain,
  fit_score,
  fit_reasoning,
  CASE 
    WHEN is_hiring_deal_sourcing THEN 'Hiring deal sourcing roles - pain signal'
    WHEN is_hiring_technical THEN 'Hiring technical roles - maturity signal'
    WHEN is_hiring THEN 'Currently hiring - general signal'
    ELSE 'Other hiring signal'
  END as hiring_type,
  contact_count,
  contacts_with_email
FROM company_signals_view
WHERE (is_hiring = true OR is_hiring_technical = true OR is_hiring_deal_sourcing = true)
  AND fit_score >= 5
ORDER BY fit_score DESC;

-- ============================================
-- 2. COMPANIES WITH AI LEADERSHIP
-- ============================================
-- Use this for "maturity" angle - they're ready for AI solutions

SELECT 
  name,
  domain,
  fit_score,
  fit_reasoning,
  has_ai_leadership,
  has_technical_leadership,
  contact_count,
  contacts_with_email
FROM company_signals_view
WHERE has_ai_leadership = true
  AND fit_score >= 5
ORDER BY fit_score DESC;

-- ============================================
-- 3. TOP COMPANIES BY FIT SCORE
-- ============================================
-- Best overall fits - prioritize these

SELECT 
  name,
  domain,
  fit_score,
  fit_reasoning,
  is_hiring,
  has_ai_leadership,
  contact_count,
  contacts_with_email
FROM company_signals_view
WHERE fit_score >= 6
ORDER BY fit_score DESC
LIMIT 50;

-- ============================================
-- 4. COMPANIES BY SIGNAL TYPE (FOR EMAIL COPY)
-- ============================================
-- Use this to customize email copy based on signals

SELECT 
  name,
  domain,
  fit_score,
  CASE 
    WHEN is_hiring_deal_sourcing THEN 'pain_deal_sourcing'
    WHEN is_hiring_technical THEN 'maturity_technical_hiring'
    WHEN has_ai_leadership THEN 'maturity_ai_leadership'
    WHEN is_hiring THEN 'pain_general_hiring'
    ELSE 'general_fit'
  END as outreach_angle,
  fit_reasoning,
  contact_count,
  contacts_with_email
FROM company_signals_view
WHERE fit_score >= 5
ORDER BY fit_score DESC;

-- ============================================
-- 5. COMPANIES WITH JOB POSTINGS (FROM SUMBLE)
-- ============================================
-- Companies with active job postings (from Sumble data)

SELECT 
  name,
  domain,
  fit_score,
  sumble_job_post_count,
  fit_reasoning,
  contact_count,
  contacts_with_email
FROM company_signals_view
WHERE sumble_job_post_count > 0
  AND fit_score >= 5
ORDER BY sumble_job_post_count DESC, fit_score DESC;

-- ============================================
-- 6. COMPANIES READY FOR OUTREACH
-- ============================================
-- Companies with contacts and emails ready to send

SELECT 
  name,
  domain,
  fit_score,
  contact_count,
  contacts_with_email,
  fit_reasoning,
  is_hiring,
  has_ai_leadership
FROM company_signals_view
WHERE contacts_with_email > 0
  AND fit_score >= 5
ORDER BY fit_score DESC, contacts_with_email DESC;

-- ============================================
-- 7. COMPANIES BY VERTICAL WITH SIGNALS
-- ============================================
-- Group by company type to see patterns

SELECT 
  vertical,
  COUNT(*) as total,
  AVG(fit_score) as avg_fit_score,
  COUNT(*) FILTER (WHERE is_hiring = true) as hiring_count,
  COUNT(*) FILTER (WHERE has_ai_leadership = true) as ai_leadership_count,
  COUNT(*) FILTER (WHERE contact_count > 0) as with_contacts
FROM company_signals_view
GROUP BY vertical
ORDER BY avg_fit_score DESC;

-- ============================================
-- 8. DETAILED SIGNAL BREAKDOWN FOR ONE COMPANY
-- ============================================
-- Replace 'company-name.com' with actual domain

SELECT 
  name,
  domain,
  fit_score,
  fit_reasoning,
  is_hiring,
  is_hiring_technical,
  is_hiring_deal_sourcing,
  has_ai_leadership,
  has_technical_leadership,
  is_small_mid_size,
  is_east_coast,
  sumble_job_post_count,
  parallel_match_status,
  contact_count,
  contacts_with_email
FROM company_signals_view
WHERE domain = 'company-name.com';

-- ============================================
-- 9. COMPANIES NEEDING ATTENTION (LOW FIT SCORE)
-- ============================================
-- Companies that might need more enrichment or review

SELECT 
  name,
  domain,
  fit_score,
  fit_reasoning,
  source_tool,
  contact_count
FROM company_signals_view
WHERE fit_score < 3
  AND contact_count = 0
ORDER BY fit_score ASC
LIMIT 50;

-- ============================================
-- 10. EMAIL COPY SEGMENTATION QUERY
-- ============================================
-- Use this to segment companies for different email angles

SELECT 
  name,
  domain,
  fit_score,
  fit_reasoning,
  CASE 
    WHEN is_hiring_deal_sourcing AND fit_score >= 6 THEN 'high_priority_pain'
    WHEN is_hiring_technical AND has_ai_leadership AND fit_score >= 6 THEN 'high_priority_maturity'
    WHEN is_hiring AND fit_score >= 5 THEN 'medium_priority_hiring'
    WHEN has_ai_leadership AND fit_score >= 5 THEN 'medium_priority_maturity'
    WHEN fit_score >= 5 THEN 'general_fit'
    ELSE 'low_priority'
  END as priority_segment,
  contact_count,
  contacts_with_email
FROM company_signals_view
WHERE fit_score >= 4
ORDER BY 
  CASE priority_segment
    WHEN 'high_priority_pain' THEN 1
    WHEN 'high_priority_maturity' THEN 2
    WHEN 'medium_priority_hiring' THEN 3
    WHEN 'medium_priority_maturity' THEN 4
    WHEN 'general_fit' THEN 5
    ELSE 6
  END,
  fit_score DESC;
