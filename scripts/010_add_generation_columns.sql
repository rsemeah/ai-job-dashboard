-- Add missing generation columns to jobs table
-- These are needed by the generate-documents API route

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generation_status TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generation_error TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_generation_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generated_resume TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generated_cover_letter TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fit TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_reasoning JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_strengths TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_gaps TEXT[];
