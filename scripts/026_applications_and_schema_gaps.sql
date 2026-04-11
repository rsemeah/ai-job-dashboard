-- =============================================================================
-- 026_applications_and_schema_gaps.sql
-- HireWire — Phase 1 Foundation: applications table + schema gap columns
--
-- WHY THIS EXISTS
-- ───────────────
-- Workflow Spine Stage 11 requires a dedicated applications record when a user
-- marks a job as applied. Previously markJobApplied() only updated jobs.status.
-- This migration creates the applications table, backfills existing applied jobs,
-- and adds two schema gap columns called out in the Architecture page:
--   • jobs.evidence_map_version — version-stamps the evidence map to detect stale maps
--   • jobs.resume_provenance    — traces which evidence produced which resume bullets
--
-- SAFE TO RE-RUN: all steps use IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- =============================================================================


-- ── applications table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.applications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid        NOT NULL REFERENCES public.jobs(id)    ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'submitted'
                CHECK (status IN (
                  'submitted','viewed','in_review','interviewing',
                  'offered','rejected','withdrawn'
                )),
  applied_at  timestamptz NOT NULL DEFAULT now(),
  method      text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- One application record per job per user
  CONSTRAINT applications_job_user_unique UNIQUE (job_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id   ON public.applications (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id    ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status    ON public.applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications (applied_at DESC);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_select_own" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "applications_insert_own" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_update_own" ON public.applications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- No delete policy: applications are immutable records. Use status = 'withdrawn'.

CREATE POLICY "applications_service_role_all" ON public.applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── Backfill: create application records for jobs already marked applied ──────

INSERT INTO public.applications (job_id, user_id, status, applied_at)
SELECT
  j.id,
  j.user_id,
  'submitted',
  COALESCE(j.applied_at, j.updated_at, j.created_at)
FROM public.jobs j
WHERE j.status = 'applied'
  AND NOT EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.job_id = j.id AND a.user_id = j.user_id
  );


-- ── Schema gap columns on jobs ────────────────────────────────────────────────

-- Version-stamps the evidence_map so stale maps from a prior matching session
-- can be detected before scoring or generation proceeds.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS evidence_map_version text;

-- Stores per-bullet provenance: [{bullet_text, source_evidence_id, evidence_title}]
-- Written by generate-documents after building the resume. Used by export routes
-- and the "trace this claim" debug view to link resume bullets to evidence.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS resume_provenance jsonb DEFAULT '[]'::jsonb;


-- ── Reload PostgREST schema cache ─────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';


-- ── Verification ──────────────────────────────────────────────────────────────

SELECT COUNT(*) AS applications_backfilled FROM public.applications;

SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'jobs'
    AND column_name  IN ('evidence_map_version', 'resume_provenance')
  ORDER BY column_name;

SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE tablename = 'applications'
  ORDER BY cmd;
