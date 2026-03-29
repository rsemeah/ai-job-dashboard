-- =============================================================================
-- 010_finalize_rls_convergence.sql
-- HireWire – Final RLS/policy convergence pass
--
-- Run in Supabase SQL Editor.
-- RECOMMENDED: run each SECTION separately and review output before continuing.
-- =============================================================================


-- =============================================================================
-- SECTION 1: PREFLIGHT VERIFICATION  (read-only — run first and review)
-- =============================================================================

-- 1a. All current policies on jobs (expect ONLY jobs_*_own; NO jobs_*_all)
SELECT
  policyname,
  cmd,
  roles,
  qual AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'jobs'
ORDER BY policyname;


-- 1b. Canonical status distribution on jobs
--     Expected: every row in the canonical set, unknown_or_null = 0
SELECT
  CASE
    WHEN status IN (
      'draft','queued','analyzing','analyzed','generating','ready',
      'applied','interviewing','offered','rejected','archived','needs_review','error'
    ) THEN status
    ELSE '** UNKNOWN / NULL **'
  END AS status_bucket,
  COUNT(*) AS cnt
FROM jobs
GROUP BY 1
ORDER BY cnt DESC;


-- 1c. run_ledger existence, policies, and indexes
SELECT to_regclass('public.run_ledger') AS run_ledger_exists;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'run_ledger'
ORDER BY policyname;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'run_ledger'
ORDER BY indexname;


-- 1d. user_profile user_id null drift
SELECT
  COUNT(*)                  AS total_rows,
  COUNT(user_id)            AS rows_with_user_id,
  COUNT(*) - COUNT(user_id) AS null_user_id_count
FROM user_profile;


-- 1e. jobs user_id null drift (informational; NOT patched by this script)
SELECT
  COUNT(*)                  AS total_jobs,
  COUNT(user_id)            AS jobs_with_user_id,
  COUNT(*) - COUNT(user_id) AS null_user_id_count
FROM jobs;


-- 1f. auth.users roster (needed to assess safe backfill below)
SELECT id, email, created_at FROM auth.users ORDER BY created_at;


-- =============================================================================
-- SECTION 2: PATCH A — Tighten jobs RLS to TO authenticated
--
-- Script 007 created jobs_*_own policies without specifying a role,
-- which defaults to PUBLIC.  Tighten to TO authenticated so the anon
-- role is never evaluated against these policies.
--
-- This is a DROP + recreate pattern; safe to rerun (idempotent).
-- =============================================================================

-- 2a. Remove any residual permissive policies from the 004 era (no-ops if already gone)
DROP POLICY IF EXISTS "jobs_select_all" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_all" ON jobs;
DROP POLICY IF EXISTS "jobs_update_all" ON jobs;
DROP POLICY IF EXISTS "jobs_delete_all" ON jobs;
DROP POLICY IF EXISTS "Allow inserts"   ON jobs;

-- 2b. Drop existing _own policies (will be replaced immediately with TO authenticated)
DROP POLICY IF EXISTS "jobs_select_own" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_own" ON jobs;
DROP POLICY IF EXISTS "jobs_update_own" ON jobs;
DROP POLICY IF EXISTS "jobs_delete_own" ON jobs;

-- 2c. Recreate with TO authenticated
CREATE POLICY "jobs_select_own" ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "jobs_insert_own" ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jobs_update_own" ON jobs
  FOR UPDATE
  TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK(auth.uid() = user_id);

CREATE POLICY "jobs_delete_own" ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify immediately
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'jobs'
ORDER BY policyname;
-- Expected 4 rows: jobs_delete_own | jobs_insert_own | jobs_select_own | jobs_update_own
-- roles column must show {authenticated} for all four


-- =============================================================================
-- SECTION 3: PATCH B — user_profile user_id backfill (conditional)
--
-- This block ONLY writes data when:
--   (a) there are rows with NULL user_id  AND
--   (b) exactly one auth user exists (single-tenant, fully deterministic)
--
-- If more than one auth user exists the block raises an exception and does
-- nothing — you must backfill manually and specify which user owns which row.
-- =============================================================================

DO $$
DECLARE
  v_null_count  INT;
  v_user_count  INT;
  v_user_id     UUID;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM user_profile
  WHERE user_id IS NULL;

  IF v_null_count = 0 THEN
    RAISE NOTICE 'SKIP: No NULL user_id rows in user_profile. Nothing to do.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_user_count FROM auth.users;

  IF v_user_count = 1 THEN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    UPDATE user_profile
    SET    user_id = v_user_id
    WHERE  user_id IS NULL;
    RAISE NOTICE 'APPLIED: Backfilled % user_profile row(s) with user_id = %',
                 v_null_count, v_user_id;
  ELSE
    RAISE EXCEPTION
      'MANUAL ACTION REQUIRED: % user_profile row(s) have NULL user_id '
      'but % auth users exist. Cannot safely backfill automatically. '
      'Identify which auth user owns each row and update manually.',
      v_null_count, v_user_count;
  END IF;
END $$;


-- =============================================================================
-- SECTION 4: POST-PATCH VERIFICATION
-- =============================================================================

-- 4a. jobs policies — must show only 4 _own rows, all TO authenticated, NO _all
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'jobs'
ORDER BY policyname;


-- 4b. Canonical status — must show unknown_or_null = 0
SELECT
  CASE
    WHEN status IN (
      'draft','queued','analyzing','analyzed','generating','ready',
      'applied','interviewing','offered','rejected','archived','needs_review','error'
    ) THEN status
    ELSE '** UNKNOWN / NULL **'
  END AS status_bucket,
  COUNT(*) AS cnt
FROM jobs
GROUP BY 1
ORDER BY cnt DESC;


-- 4c. run_ledger — must still exist with 2 policies and 4 indexes
SELECT to_regclass('public.run_ledger') AS run_ledger_exists;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'run_ledger'
ORDER BY policyname;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'run_ledger'
ORDER BY indexname;


-- 4d. user_profile null drift — must show null_user_id_count = 0 after patch
SELECT
  COUNT(*)                  AS total_rows,
  COUNT(user_id)            AS rows_with_user_id,
  COUNT(*) - COUNT(user_id) AS null_user_id_count
FROM user_profile;


-- =============================================================================
-- OPERATOR NOTES
-- =============================================================================
--
-- jobs user_id null drift (NOT patched here — requires human decision):
--   Run: SELECT COUNT(*) FROM jobs WHERE user_id IS NULL;
--   If non-zero, you must identify the correct auth user UUID and run:
--     UPDATE jobs SET user_id = '<your-uuid>' WHERE user_id IS NULL;
--   Jobs with NULL user_id are INVISIBLE to all app users under current RLS.
--
-- CHECK constraint (optional hardening — run only after status counts are clean):
--   ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_canonical;
--   ALTER TABLE jobs ADD CONSTRAINT jobs_status_canonical CHECK (
--     status IN ('draft','queued','analyzing','analyzed','generating','ready',
--                'applied','interviewing','offered','rejected','archived',
--                'needs_review','error')
--   );
