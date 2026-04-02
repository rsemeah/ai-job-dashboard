-- Backfill script: Create company records for existing jobs and link them
-- This script should be run AFTER add-companies-table.sql
-- It will:
-- 1. Create company records for each unique (user_id, company_name) pair
-- 2. Update jobs to set company_id to the matching company record

-- Step 1: Insert unique companies from existing jobs
-- Uses the normalize_company_name function created in the companies migration
INSERT INTO companies (user_id, name, normalized_name, created_at, updated_at)
SELECT DISTINCT 
  user_id,
  company_name as name,
  normalize_company_name(company_name) as normalized_name,
  NOW() as created_at,
  NOW() as updated_at
FROM jobs
WHERE company_name IS NOT NULL
  AND company_name != ''
  AND user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;

-- Step 2: Update jobs to link to their company records
UPDATE jobs j
SET company_id = c.id
FROM companies c
WHERE j.user_id = c.user_id
  AND normalize_company_name(j.company_name) = c.normalized_name
  AND j.company_id IS NULL
  AND j.company_name IS NOT NULL
  AND j.company_name != '';

-- Step 3: Report results
DO $$
DECLARE
  company_count INTEGER;
  linked_jobs_count INTEGER;
  unlinked_jobs_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO company_count FROM companies;
  SELECT COUNT(*) INTO linked_jobs_count FROM jobs WHERE company_id IS NOT NULL;
  SELECT COUNT(*) INTO unlinked_jobs_count FROM jobs WHERE company_id IS NULL AND company_name IS NOT NULL AND company_name != '';
  
  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  - Total companies: %', company_count;
  RAISE NOTICE '  - Jobs linked to companies: %', linked_jobs_count;
  RAISE NOTICE '  - Jobs still unlinked (should be 0): %', unlinked_jobs_count;
END $$;
