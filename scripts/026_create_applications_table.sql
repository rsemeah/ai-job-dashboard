-- Migration: Create applications table (Workflow Spine Stage 11)
-- This table tracks job application submissions separately from job status
-- Enables proper application lifecycle tracking

-- Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted','viewed','in_review','interviewing','offered','rejected','withdrawn')),
  applied_at  timestamptz NOT NULL DEFAULT now(),
  method      text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id  ON public.applications (job_id);

-- Enable Row Level Security
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "applications_select_own" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "applications_insert_own" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "applications_update_own" ON public.applications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "applications_service_role_all" ON public.applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Backfill from jobs already marked applied
INSERT INTO public.applications (job_id, user_id, status, applied_at)
SELECT id, user_id, 'submitted', COALESCE(applied_at, updated_at)
FROM public.jobs
WHERE status = 'applied'
  AND NOT EXISTS (
    SELECT 1 FROM public.applications a WHERE a.job_id = jobs.id
  );

-- Add schema gap columns to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS evidence_map_version text,
  ADD COLUMN IF NOT EXISTS resume_provenance jsonb DEFAULT '[]'::jsonb;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
