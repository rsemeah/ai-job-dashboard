-- Create companies table for company-centric organization
-- Each user has their own set of company records

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Company identification
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL, -- lowercase, trimmed, for matching
  
  -- Optional metadata
  website TEXT,
  industry TEXT,
  size TEXT, -- e.g., "1-50", "51-200", "201-500", etc.
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique company per user (normalized name)
  UNIQUE(user_id, normalized_name)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_normalized_name ON companies(normalized_name);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY companies_select_own ON companies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY companies_insert_own ON companies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY companies_update_own ON companies
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY companies_delete_own ON companies
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add company_id foreign key to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Create index on jobs.company_id
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);

-- Function to normalize company names for matching
CREATE OR REPLACE FUNCTION normalize_company_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Lowercase, trim whitespace, remove common suffixes
  RETURN LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(name, '\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?)$', '', 'i'),
          '\s+', ' ', 'g'  -- Normalize multiple spaces
        ),
        '^\s+|\s+$', '', 'g'  -- Trim
      ),
      '[,\.\-]+$', '', 'g'  -- Remove trailing punctuation
    )
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();
