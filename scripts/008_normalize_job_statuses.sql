-- ============================================================================
-- MIGRATION 008: Normalize all job statuses to canonical lowercase values
-- ============================================================================
-- This backfill eliminates all legacy uppercase and n8n-era status strings.
-- The app layer already normalizes at read boundaries via normalizeJobStatus().
-- This migration makes storage the source of truth.
--
-- CANONICAL STATUS SET:
--   draft | queued | analyzing | analyzed | generating | ready
--   applied | interviewing | offered | rejected | archived
--   needs_review | error
--
-- Run via Supabase SQL Editor or: psql -f scripts/008_normalize_job_statuses.sql
-- Safe to run multiple times (idempotent UPDATE WHERE).
-- ============================================================================

DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  RAISE NOTICE 'Starting job status normalization backfill...';

  -- ── INTAKE / ANALYSIS CLUSTER ──────────────────────────────────────────────
  UPDATE jobs SET status = 'queued'
  WHERE status IN ('NEW', 'new', 'submitted', 'fetching', 'parsing');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  queued: % rows updated', rows_updated;

  UPDATE jobs SET status = 'analyzing'
  WHERE status IN ('ANALYZING', 'scoring');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  analyzing: % rows updated', rows_updated;

  UPDATE jobs SET status = 'analyzed'
  WHERE status IN ('REVIEWING', 'SCORED', 'parsed', 'scored', 'duplicate');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  analyzed: % rows updated', rows_updated;

  -- ── GENERATION CLUSTER ────────────────────────────────────────────────────
  UPDATE jobs SET status = 'generating'
  WHERE status IN ('GENERATING', 'generating_documents');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  generating: % rows updated', rows_updated;

  -- ── READY-TO-APPLY ────────────────────────────────────────────────────────
  UPDATE jobs SET status = 'ready'
  WHERE status IN ('READY', 'READY_TO_APPLY', 'ready_to_apply');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  ready: % rows updated', rows_updated;

  -- ── APPLIED CLUSTER ───────────────────────────────────────────────────────
  UPDATE jobs SET status = 'applied'
  WHERE status = 'APPLIED';
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  applied: % rows updated', rows_updated;

  UPDATE jobs SET status = 'interviewing'
  WHERE status IN ('INTERVIEWING', 'INTERVIEW', 'interview');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  interviewing: % rows updated', rows_updated;

  UPDATE jobs SET status = 'offered'
  WHERE status = 'OFFERED';
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  offered: % rows updated', rows_updated;

  -- ── TERMINAL CLUSTER ──────────────────────────────────────────────────────
  UPDATE jobs SET status = 'rejected'
  WHERE status = 'REJECTED';
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  rejected: % rows updated', rows_updated;

  UPDATE jobs SET status = 'archived'
  WHERE status IN ('ARCHIVED', 'DECLINED', 'declined');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  archived: % rows updated', rows_updated;

  -- ── ATTENTION CLUSTER ─────────────────────────────────────────────────────
  UPDATE jobs SET status = 'needs_review'
  WHERE status IN ('NEEDS_REVIEW', 'parsed_partial', 'below_threshold', 'manual_review_required');
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  needs_review: % rows updated', rows_updated;

  UPDATE jobs SET status = 'error'
  WHERE status = 'ERROR';
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '  error: % rows updated', rows_updated;

  -- ── VERIFY NO UNKNOWN STATUSES REMAIN ─────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE 'Post-migration status distribution:';
END $$;

-- Show final distribution for verification
SELECT
  status,
  COUNT(*) AS count,
  CASE
    WHEN status IN ('draft','queued','analyzing','analyzed','generating','ready',
                    'applied','interviewing','offered','rejected','archived',
                    'needs_review','error')
    THEN '✓ canonical'
    ELSE '✗ UNKNOWN - needs manual review'
  END AS validity
FROM jobs
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- OPTIONAL: Add a CHECK constraint once you're confident the backfill is clean.
-- Uncomment and run this AFTER verifying the SELECT above shows all canonical.
-- ============================================================================
--
-- ALTER TABLE jobs
--   DROP CONSTRAINT IF EXISTS jobs_status_canonical,
--   ADD CONSTRAINT jobs_status_canonical
--     CHECK (status IN (
--       'draft','queued','analyzing','analyzed','generating','ready',
--       'applied','interviewing','offered','rejected','archived',
--       'needs_review','error'
--     ));
--
-- COMMENT ON CONSTRAINT jobs_status_canonical ON jobs IS
--   'Enforces canonical lifecycle status values. See lib/job-lifecycle.ts for the source of truth.';
