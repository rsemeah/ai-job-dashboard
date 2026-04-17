-- Delete all jobs except PwC Tech - Gen AI Tech Lead (Manager)
-- Dependent tables are deleted first to respect FK constraints.
-- If FKs cascade, these are no-ops — safe either way.

DO $$
DECLARE
  keep_job_id uuid;
BEGIN
  -- Identify the job to keep
  SELECT id INTO keep_job_id
  FROM jobs
  WHERE role_title ILIKE '%PwC Tech%Gen AI Tech Lead%'
    AND company_name ILIKE '%PwC%'
  LIMIT 1;

  RAISE NOTICE 'Keeping job_id: %', keep_job_id;

  -- Delete dependent rows for all OTHER jobs
  DELETE FROM job_analyses
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM job_scores
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM generated_documents
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM generation_quality_checks
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM interview_prep
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM run_ledger
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM audit_events
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM processing_events
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM applications
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  DELETE FROM resumes
  WHERE job_id IN (SELECT id FROM jobs WHERE id IS DISTINCT FROM keep_job_id);

  -- Finally delete the jobs themselves
  DELETE FROM jobs
  WHERE id IS DISTINCT FROM keep_job_id;

  RAISE NOTICE 'Done. Only job % remains.', keep_job_id;
END $$;
