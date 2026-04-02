-- Add soft delete support for jobs table
-- This allows jobs to be "deleted" without actually removing them

-- Add deleted_at column for soft delete
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering of non-deleted jobs
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs (deleted_at) WHERE deleted_at IS NULL;

-- Create a view for active (non-deleted) jobs for convenience
CREATE OR REPLACE VIEW active_jobs AS
SELECT * FROM jobs WHERE deleted_at IS NULL;

-- Update RLS policies to exclude deleted jobs from normal queries
-- This ensures deleted jobs don't appear in regular queries

-- Drop and recreate the select policy to filter out deleted jobs
DROP POLICY IF EXISTS jobs_select_own ON jobs;
CREATE POLICY jobs_select_own ON jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: The application layer will filter deleted_at IS NULL
-- We keep RLS simple and handle soft delete in queries
