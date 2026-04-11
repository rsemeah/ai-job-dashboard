-- =============================================================================
-- Migration 016: V1 Semantic Layer
-- HireWire Controlled Salvage Rebuild
-- Run date: 2026-04-10
-- =============================================================================
--
-- What this migration adds:
--
-- 1. jobs.gap_clarifications (text[])
--    Written by the coach when user provides context for a detected gap.
--    Format: "[requirement]: clarification text"
--    The coach route's saveGapClarification tool writes to this column.
--
-- 2. jobs.quality_passed (boolean, default false)
--    Set to true by the red-team review route when materials pass.
--    Required for the apply gate to allow marking a job as applied.
--
-- 3. jobs.applied_at (timestamptz)
--    Set by markJobApplied() action. Explicit timestamp for when user applied.
--
-- 4. audit_events table
--    Lightweight accountability layer for gate decisions and workflow transitions.
--    Records: gate outcomes, generation events, apply transitions, clarification saves.
--    Does NOT store document content, PII, or evidence text.
--
-- =============================================================================

-- ── jobs.gap_clarifications ────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS gap_clarifications text[] DEFAULT '{}';

COMMENT ON COLUMN public.jobs.gap_clarifications IS
  'Coach-persisted gap clarifications. Each entry: "[requirement]: user clarification". Written by saveGapClarification tool.';

-- ── jobs.quality_passed ────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS quality_passed boolean DEFAULT false;

COMMENT ON COLUMN public.jobs.quality_passed IS
  'True when red-team review passes. Required before job can be marked as applied.';

-- ── jobs.applied_at ────────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;

COMMENT ON COLUMN public.jobs.applied_at IS
  'Timestamp when user explicitly marked job as applied via markJobApplied() action.';

-- ── generated_documents.user_id ────────────────────────────────────────────
-- Ensure user_id exists on generated_documents for RLS and apply gate checks.

ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from jobs table for existing rows
UPDATE public.generated_documents gd
SET user_id = j.user_id
FROM public.jobs j
WHERE gd.job_id = j.id
  AND gd.user_id IS NULL;

-- ── audit_events table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id      uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  outcome     text NOT NULL CHECK (outcome IN ('allowed', 'blocked', 'success', 'error')),
  reason      text,
  correlation_id text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_events IS
  'Lightweight audit log for HireWire gate decisions and workflow transitions. Does not store document content.';

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id     ON public.audit_events (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_job_id      ON public.audit_events (job_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type  ON public.audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at  ON public.audit_events (created_at DESC);

-- RLS: users can only see their own audit events
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own audit events"
  ON public.audit_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can insert audit events"
  ON public.audit_events
  FOR INSERT
  WITH CHECK (true); -- Enforced at application layer by createClient scope

-- =============================================================================
-- Verification queries (run these manually to confirm migration applied)
-- =============================================================================
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'jobs'
--   AND column_name IN ('gap_clarifications', 'quality_passed', 'applied_at');
--
-- SELECT COUNT(*) FROM public.audit_events;
--
-- SELECT tablename, policyname FROM pg_policies WHERE tablename = 'audit_events';
-- =============================================================================
