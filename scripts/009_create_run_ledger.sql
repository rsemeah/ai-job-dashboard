-- ============================================================================
-- MIGRATION 009: Create run_ledger table for orchestration step tracking
-- ============================================================================
-- This table is the primary target for lib/logs/runLedger.ts.
-- Without this table, all recordRunStep() calls fall back to processing_events.
-- With this table, each orchestration step is tracked with full structure.
--
-- Run via Supabase SQL Editor or: psql -f scripts/009_create_run_ledger.sql
-- ============================================================================

-- ── TABLE CREATION ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.run_ledger (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID        REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES auth.users(id),
  step_name    TEXT        NOT NULL,
  status       TEXT        NOT NULL
                           CHECK (status IN ('started', 'success', 'error', 'skipped')),
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary_result TEXT,
  error_details  TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.run_ledger IS
  'Tracks each step of the orchestration flow per job. Source of truth for the activity log.';
COMMENT ON COLUMN public.run_ledger.step_name IS
  'e.g. intake, analysis, generate_documents, interview_prep';
COMMENT ON COLUMN public.run_ledger.status IS
  'started | success | error | skipped';

-- ── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_run_ledger_job_id
  ON public.run_ledger(job_id);

CREATE INDEX IF NOT EXISTS idx_run_ledger_user_id
  ON public.run_ledger(user_id);

CREATE INDEX IF NOT EXISTS idx_run_ledger_timestamp
  ON public.run_ledger(timestamp DESC);

-- Composite index for the primary query pattern: user + time descending
CREATE INDEX IF NOT EXISTS idx_run_ledger_user_timestamp
  ON public.run_ledger(user_id, timestamp DESC);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE public.run_ledger ENABLE ROW LEVEL SECURITY;

-- Users can only see their own ledger entries
CREATE POLICY "run_ledger_select_own" ON public.run_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- System/service role inserts via supabase server client (anon key with RLS context)
CREATE POLICY "run_ledger_insert_own" ON public.run_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No update/delete — ledger entries are append-only
-- (If cleanup is needed, use service role directly, not user-facing operations)
