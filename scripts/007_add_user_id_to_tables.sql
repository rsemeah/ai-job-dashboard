-- Add user_id column to core tables for user isolation
-- This enables proper multi-tenant data separation

-- ============================================================================
-- STEP 1: Add user_id columns
-- ============================================================================

-- Jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Evidence library
ALTER TABLE evidence_library ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Job analyses
ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- User profile (rename to be per-user)
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Interview prep
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Interview bank
ALTER TABLE interview_bank ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Generated documents (legacy/optional)
ALTER TABLE IF EXISTS generated_documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Generation quality checks (legacy/optional)
ALTER TABLE IF EXISTS generation_quality_checks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Processing events
ALTER TABLE processing_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Profile snapshots (legacy/optional)
ALTER TABLE IF EXISTS profile_snapshots ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Resumes (legacy/optional)
ALTER TABLE IF EXISTS resumes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_library_user_id ON evidence_library(user_id);
CREATE INDEX IF NOT EXISTS idx_job_analyses_user_id ON job_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_user_id ON interview_prep(user_id);

-- ============================================================================
-- STEP 3: Enable RLS on tables that need it
-- ============================================================================

ALTER TABLE evidence_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS generation_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resumes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Drop old permissive policies on jobs
-- ============================================================================

DROP POLICY IF EXISTS "jobs_select_all" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_all" ON jobs;
DROP POLICY IF EXISTS "jobs_update_all" ON jobs;
DROP POLICY IF EXISTS "jobs_delete_all" ON jobs;

-- ============================================================================
-- STEP 5: Create user-scoped RLS policies
-- ============================================================================

-- Jobs policies
CREATE POLICY "jobs_select_own" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "jobs_insert_own" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jobs_update_own" ON jobs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jobs_delete_own" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Evidence library policies
CREATE POLICY "evidence_select_own" ON evidence_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "evidence_insert_own" ON evidence_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "evidence_update_own" ON evidence_library
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "evidence_delete_own" ON evidence_library
  FOR DELETE USING (auth.uid() = user_id);

-- Job analyses policies
CREATE POLICY "analyses_select_own" ON job_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "analyses_insert_own" ON job_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analyses_update_own" ON job_analyses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analyses_delete_own" ON job_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- User profile policies
CREATE POLICY "user_profile_select_own" ON user_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profile_insert_own" ON user_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profile_update_own" ON user_profile
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profile_delete_own" ON user_profile
  FOR DELETE USING (auth.uid() = user_id);

-- Interview prep policies
CREATE POLICY "interview_prep_select_own" ON interview_prep
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "interview_prep_insert_own" ON interview_prep
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interview_prep_update_own" ON interview_prep
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interview_prep_delete_own" ON interview_prep
  FOR DELETE USING (auth.uid() = user_id);

-- Interview bank policies
CREATE POLICY "interview_bank_select_own" ON interview_bank
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "interview_bank_insert_own" ON interview_bank
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interview_bank_update_own" ON interview_bank
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interview_bank_delete_own" ON interview_bank
  FOR DELETE USING (auth.uid() = user_id);

-- Generated documents policies (legacy/optional)
DO $$
BEGIN
  IF to_regclass('public.generated_documents') IS NOT NULL THEN
    CREATE POLICY "documents_select_own" ON generated_documents
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "documents_insert_own" ON generated_documents
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "documents_update_own" ON generated_documents
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "documents_delete_own" ON generated_documents
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Generation quality checks policies (legacy/optional)
DO $$
BEGIN
  IF to_regclass('public.generation_quality_checks') IS NOT NULL THEN
    CREATE POLICY "quality_checks_select_own" ON generation_quality_checks
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "quality_checks_insert_own" ON generation_quality_checks
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Processing events policies
CREATE POLICY "events_select_own" ON processing_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "events_insert_own" ON processing_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Profile snapshots policies (legacy/optional)
DO $$
BEGIN
  IF to_regclass('public.profile_snapshots') IS NOT NULL THEN
    CREATE POLICY "snapshots_select_own" ON profile_snapshots
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "snapshots_insert_own" ON profile_snapshots
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Resumes policies (legacy/optional)
DO $$
BEGIN
  IF to_regclass('public.resumes') IS NOT NULL THEN
    CREATE POLICY "resumes_select_own" ON resumes
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "resumes_insert_own" ON resumes
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "resumes_update_own" ON resumes
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "resumes_delete_own" ON resumes
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
