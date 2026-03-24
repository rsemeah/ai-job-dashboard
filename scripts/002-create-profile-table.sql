-- Create user profile table for HireWire
-- This stores the canonical "truth" profile for resume generation

CREATE TABLE IF NOT EXISTS user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  summary TEXT,
  
  -- Structured arrays stored as JSONB
  experience JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "role": "...", "company": "...", "start_date": "...", "end_date": "...", "bullets": ["..."] }]
  
  education JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "degree": "...", "school": "...", "year": "..." }]
  
  skills TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  domains TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to jobs table for structured extraction and matching
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS extracted_data JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_data JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generated_resume TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generated_cover_letter TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score);
