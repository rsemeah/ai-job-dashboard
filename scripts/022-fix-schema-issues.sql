-- ============================================================================
-- HIREWIRE SCHEMA REMEDIATION - Fix all critical issues
-- ============================================================================

-- PHASE 1: Fix user_profile unique constraint (required for upsert to work)
-- ============================================================================

-- Add UNIQUE constraint to user_profile.user_id
ALTER TABLE user_profile ADD CONSTRAINT user_profile_user_id_unique UNIQUE (user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);


-- PHASE 2: Fix Foreign Keys pointing to deprecated tables
-- ============================================================================

-- Fix generated_documents FK (jobs_deprecated -> jobs)
ALTER TABLE generated_documents DROP CONSTRAINT IF EXISTS generated_documents_job_id_fkey;
DELETE FROM generated_documents WHERE job_id NOT IN (SELECT id FROM jobs);
ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Fix generation_quality_checks FK
ALTER TABLE generation_quality_checks DROP CONSTRAINT IF EXISTS generation_quality_checks_job_id_fkey;
DELETE FROM generation_quality_checks WHERE job_id NOT IN (SELECT id FROM jobs);
ALTER TABLE generation_quality_checks ADD CONSTRAINT generation_quality_checks_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Fix interview_bank FK
ALTER TABLE interview_bank DROP CONSTRAINT IF EXISTS interview_bank_source_job_id_fkey;
DELETE FROM interview_bank WHERE source_job_id IS NOT NULL AND source_job_id NOT IN (SELECT id FROM jobs);
ALTER TABLE interview_bank ADD CONSTRAINT interview_bank_source_job_id_fkey 
  FOREIGN KEY (source_job_id) REFERENCES jobs(id) ON DELETE SET NULL;

-- Fix interview_prep FK
ALTER TABLE interview_prep DROP CONSTRAINT IF EXISTS interview_prep_job_id_fkey;
DELETE FROM interview_prep WHERE job_id NOT IN (SELECT id FROM jobs);
ALTER TABLE interview_prep ADD CONSTRAINT interview_prep_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Fix processing_events FK
ALTER TABLE processing_events DROP CONSTRAINT IF EXISTS processing_events_job_id_fkey;
DELETE FROM processing_events WHERE job_id IS NOT NULL AND job_id NOT IN (SELECT id FROM jobs);
ALTER TABLE processing_events ADD CONSTRAINT processing_events_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;


-- PHASE 3: Drop unused companion/ritual tables (reference profiles_deprecated)
-- ============================================================================

DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS companion_messages CASCADE;
DROP TABLE IF EXISTS companion_conversations CASCADE;
DROP TABLE IF EXISTS profile_insights CASCADE;
DROP TABLE IF EXISTS ritual_completions CASCADE;
DROP TABLE IF EXISTS silent_engine_logs CASCADE;


-- PHASE 4: Add missing updated_at column to jobs
-- ============================================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to auto-update timestamp
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_updated_at_trigger ON jobs;
CREATE TRIGGER jobs_updated_at_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();


-- Verification
SELECT 'Schema remediation complete' as status;
