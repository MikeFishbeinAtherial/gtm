-- ================================================================
-- UNIPILE RELATIONS CACHE TABLE
-- ================================================================
-- Stores Unipile relations locally to avoid hitting API repeatedly
-- This cache should be refreshed periodically (daily/weekly)
-- ================================================================

CREATE TABLE IF NOT EXISTS unipile_relations_cache (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Unipile Account
    unipile_account_id TEXT NOT NULL,
    
    -- LinkedIn Member Info
    member_id TEXT NOT NULL,  -- LinkedIn member ID (ACoAAA...)
    public_profile_url TEXT,
    public_identifier TEXT,  -- Username from URL
    
    -- Personal Info
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    headline TEXT,
    
    -- Professional Info
    company TEXT,
    title TEXT,
    location TEXT,
    
    -- Profile
    profile_picture_url TEXT,
    
    -- Raw Data
    raw_data JSONB,  -- Full Unipile response
    
    -- Cache Metadata
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique member_id per account
    UNIQUE(member_id, unipile_account_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_unipile_cache_member_id ON unipile_relations_cache(member_id);
CREATE INDEX IF NOT EXISTS idx_unipile_cache_account ON unipile_relations_cache(unipile_account_id);
CREATE INDEX IF NOT EXISTS idx_unipile_cache_url ON unipile_relations_cache(public_profile_url);
CREATE INDEX IF NOT EXISTS idx_unipile_cache_identifier ON unipile_relations_cache(public_identifier);
CREATE INDEX IF NOT EXISTS idx_unipile_cache_cached_at ON unipile_relations_cache(cached_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_unipile_cache_raw_data ON unipile_relations_cache USING GIN(raw_data);

-- ================================================================
-- HELPER FUNCTION: Get member ID from cache
-- ================================================================

CREATE OR REPLACE FUNCTION get_member_id_from_cache(
    p_url TEXT,
    p_account_id TEXT DEFAULT NULL
)
RETURNS TABLE(
    member_id TEXT,
    first_name TEXT,
    last_name TEXT,
    cached_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        urc.member_id,
        urc.first_name,
        urc.last_name,
        urc.cached_at
    FROM unipile_relations_cache urc
    WHERE (
        urc.public_profile_url = p_url
        OR urc.public_profile_url = LOWER(TRIM(TRAILING '/' FROM p_url))
        OR urc.public_identifier = SUBSTRING(p_url FROM 'linkedin\.com/in/([^/?]+)')
    )
    AND (p_account_id IS NULL OR urc.unipile_account_id = p_account_id)
    ORDER BY urc.cached_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- SAMPLE QUERIES
-- ================================================================

/*
-- Check cache freshness
SELECT 
    COUNT(*) as total_cached,
    MIN(cached_at) as oldest_cache,
    MAX(cached_at) as newest_cache,
    MAX(cached_at) < NOW() - INTERVAL '7 days' as needs_refresh
FROM unipile_relations_cache;

-- Find member ID by URL
SELECT * FROM get_member_id_from_cache('https://linkedin.com/in/john-doe');

-- Search by username
SELECT member_id, full_name, public_profile_url
FROM unipile_relations_cache
WHERE public_identifier = 'john-doe'
ORDER BY cached_at DESC
LIMIT 1;
*/
