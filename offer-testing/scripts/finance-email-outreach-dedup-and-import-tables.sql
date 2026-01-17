-- ================================================================
-- Finance Outreach: Dedup + Import Tracking
-- ================================================================
-- Purpose:
-- 1) Prevent duplicate contacts (same email) within an offer
-- 2) Provide import tracking tables so CSV imports are idempotent
--
-- Safe to run multiple times (uses IF NOT EXISTS patterns where possible).
--
-- NOTE:
-- - `contacts` currently has NO unique constraint on email.
-- - This migration adds a UNIQUE *functional* index on (offer_id, lower(email)).
--   That means: within a single offer, you cannot have the same email twice
--   (case-insensitive).
-- ================================================================

-- ------------------------------------------------
-- 1) Dedup: prevent duplicate emails per offer
-- ------------------------------------------------
-- Case-insensitive unique email per offer
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_email_per_offer_ci
ON contacts (offer_id, lower(email))
WHERE email IS NOT NULL AND email <> '';

-- Optional: also prevent duplicate LinkedIn URLs per offer (helps if you do LinkedIn later)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_linkedin_url_per_offer
ON contacts (offer_id, linkedin_url)
WHERE linkedin_url IS NOT NULL AND linkedin_url <> '';

-- ------------------------------------------------
-- 2) Import tracking tables (optional but helpful)
-- ------------------------------------------------
-- Tracks each CSV import attempt/run
CREATE TABLE IF NOT EXISTS lead_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,          -- e.g. "offers/finance/leads/finance_people_....csv"
  source_type TEXT NOT NULL CHECK (source_type IN ('people_csv', 'companies_csv')),
  imported_by TEXT,                   -- optional: your name/email
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_imports_offer_id ON lead_imports(offer_id);

-- Stores normalized rows we attempted to import (for idempotency + audit)
CREATE TABLE IF NOT EXISTS lead_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES lead_imports(id) ON DELETE CASCADE,

  -- Normalized keys for dedupe
  email_normalized TEXT,              -- lower(trim(email))
  domain_normalized TEXT,             -- lower(trim(domain))

  -- What we saw in the CSV (raw row JSON for debugging)
  source_row JSONB NOT NULL,

  -- Results of the import attempt
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'skipped', 'failed')),
  skip_reason TEXT,
  error_message TEXT,

  -- Links to created/updated records (if you want to store them)
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent importing the same email twice in the same import run
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_import_rows_unique_email_per_import
ON lead_import_rows(import_id, email_normalized)
WHERE email_normalized IS NOT NULL AND email_normalized <> '';

-- Prevent importing the same domain twice in the same import run (company-only imports)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_import_rows_unique_domain_per_import
ON lead_import_rows(import_id, domain_normalized)
WHERE domain_normalized IS NOT NULL AND domain_normalized <> '';

