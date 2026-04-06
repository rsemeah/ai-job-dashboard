-- Migration 008: Add education + skill source types, source_resumes table, profile external links
-- Run this in Supabase SQL editor before deploying related code changes.

-- ============================================================================
-- 1. Expand evidence_library source_type constraint
-- ============================================================================
-- Drop the existing CHECK constraint and recreate it with education + skill added.
-- This unblocks resume-to-evidence creation for education and skill sections.

ALTER TABLE public.evidence_library
  DROP CONSTRAINT IF EXISTS evidence_library_source_type_check;

ALTER TABLE public.evidence_library
  ADD CONSTRAINT evidence_library_source_type_check
  CHECK (source_type IN (
    'work_experience',
    'project',
    'portfolio_entry',
    'shipped_product',
    'live_site',
    'achievement',
    'certification',
    'publication',
    'open_source',
    'education',
    'skill'
  ));

-- ============================================================================
-- 2. Create source_resumes table
-- ============================================================================
-- Stores each uploaded resume as a discrete record.
-- Evidence rows reference source_resume_id to track provenance.

CREATE TABLE IF NOT EXISTS public.source_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_text TEXT,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_resumes_user_id ON public.source_resumes(user_id);

ALTER TABLE public.source_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own resumes"
  ON public.source_resumes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. Add source_resume_id to evidence_library for provenance tracking
-- ============================================================================

ALTER TABLE public.evidence_library
  ADD COLUMN IF NOT EXISTS source_resume_id UUID REFERENCES public.source_resumes(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. Add external profile link columns to user_profile
-- ============================================================================
-- linkedin_url already exists (migration 002). Adding github_url and website_url.

ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS website_url TEXT;
