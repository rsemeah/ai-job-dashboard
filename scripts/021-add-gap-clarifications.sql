-- Add gap_clarifications column to jobs table for storing job-specific context
-- This stores answers to gap clarification questions that should NOT go into the global profile
-- but ARE needed for generation of this specific job's materials

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gap_clarifications JSONB DEFAULT '[]'::jsonb;

-- Add gaps_addressed column to track which gaps have been clarified
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gaps_addressed TEXT[] DEFAULT '{}';

-- Add index for querying jobs with unaddressed gaps
CREATE INDEX IF NOT EXISTS idx_jobs_gaps_addressed ON jobs USING GIN (gaps_addressed);

COMMENT ON COLUMN jobs.gap_clarifications IS 'Array of {gap_id, question, answer, addressed_at, routing} objects storing job-specific clarifications';
COMMENT ON COLUMN jobs.gaps_addressed IS 'Array of gap IDs that have been addressed through clarification';
