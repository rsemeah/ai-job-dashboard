-- Migration: Enable RLS on companies table
-- SECURITY FIX: companies table had RLS disabled, allowing any user to read/write any company
-- This migration enables RLS and creates appropriate policies
-- NOTE: This script is idempotent - safe to run multiple times

-- Enable RLS on companies table (idempotent)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "companies_select_authenticated" ON companies;
DROP POLICY IF EXISTS "companies_insert_authenticated" ON companies;
DROP POLICY IF EXISTS "companies_update_own_jobs" ON companies;
DROP POLICY IF EXISTS "companies_no_delete" ON companies;
DROP POLICY IF EXISTS "companies_service_role_all" ON companies;

-- Policy: Users can read companies (public read for company info display)
-- Companies are shared resources - users need to see company names/info for their jobs
CREATE POLICY "companies_select_authenticated"
ON companies
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can insert new companies
-- When a user adds a job, they may need to create a new company entry
CREATE POLICY "companies_insert_authenticated"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can update companies they reference
-- Allow updates to company info (e.g., adding logo, updating details)
-- Restrict to prevent malicious updates - only allow if user has a job referencing this company
CREATE POLICY "companies_update_own_jobs"
ON companies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.company_id = companies.id 
    AND jobs.user_id = auth.uid()
  )
);

-- Policy: No delete - companies should persist for historical reference
-- If needed, use soft delete pattern instead
CREATE POLICY "companies_no_delete"
ON companies
FOR DELETE
TO authenticated
USING (false);

-- Service role bypass for admin operations
CREATE POLICY "companies_service_role_all"
ON companies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
