-- Add generation status tracking to jobs table
-- This allows us to track: pending, generating, ready, failed, needs_review

-- Add generation_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'generation_status'
  ) THEN
    ALTER TABLE jobs ADD COLUMN generation_status text DEFAULT 'pending';
  END IF;
END $$;

-- Add generation_error column to store error messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'generation_error'
  ) THEN
    ALTER TABLE jobs ADD COLUMN generation_error text;
  END IF;
END $$;

-- Add generation_attempts column to track retry count
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'generation_attempts'
  ) THEN
    ALTER TABLE jobs ADD COLUMN generation_attempts integer DEFAULT 0;
  END IF;
END $$;

-- Add last_generation_at timestamp
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'last_generation_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN last_generation_at timestamptz;
  END IF;
END $$;

-- Update existing jobs with generated materials to have 'ready' status
UPDATE jobs 
SET generation_status = 'ready' 
WHERE generated_resume IS NOT NULL 
  AND (generation_status IS NULL OR generation_status = 'pending');

-- Update jobs without materials to have 'pending' status
UPDATE jobs 
SET generation_status = 'pending' 
WHERE generated_resume IS NULL 
  AND (generation_status IS NULL);

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_jobs_generation_status ON jobs(generation_status);

-- Add comment explaining valid statuses
COMMENT ON COLUMN jobs.generation_status IS 'Valid values: pending (ready to generate), generating (in progress), ready (materials available), failed (error occurred), needs_review (quality issues)';
