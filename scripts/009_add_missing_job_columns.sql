-- Add missing columns to jobs table that were expected but not migrated
-- These columns are needed for the evidence matching and document generation features

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS role_family TEXT,
ADD COLUMN IF NOT EXISTS industry_guess TEXT,
ADD COLUMN IF NOT EXISTS seniority_level TEXT,
ADD COLUMN IF NOT EXISTS evidence_map JSONB,
ADD COLUMN IF NOT EXISTS quality_issues TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quality_passed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS resume_strategy TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_strategy TEXT;

-- Add comment explaining these columns
COMMENT ON COLUMN jobs.evidence_map IS 'JSONB storing selected evidence IDs and bullet/paragraph provenance from document generation';
COMMENT ON COLUMN jobs.quality_passed IS 'Whether the generated documents passed quality checks';
COMMENT ON COLUMN jobs.quality_issues IS 'Array of quality issues found during generation';
