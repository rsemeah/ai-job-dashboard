-- TruthSerum Evidence Library Schema Update
-- Adds role_family_tags, user approval workflow, confidence levels, and visibility

-- Add missing columns to evidence_library if they don't exist
ALTER TABLE evidence_library 
ADD COLUMN IF NOT EXISTS role_family_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_problem TEXT,
ADD COLUMN IF NOT EXISTS business_goal TEXT,
ADD COLUMN IF NOT EXISTS systems_used TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS what_shipped TEXT,
ADD COLUMN IF NOT EXISTS what_visible TEXT,
ADD COLUMN IF NOT EXISTS what_not_to_overstate TEXT,
ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'high',
ADD COLUMN IF NOT EXISTS is_user_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visibility_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS workflows_created TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS evidence_weight TEXT DEFAULT 'high';

-- Add role_family column to jobs for better categorization
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS role_family TEXT,
ADD COLUMN IF NOT EXISTS industry_guess TEXT,
ADD COLUMN IF NOT EXISTS seniority_level TEXT,
ADD COLUMN IF NOT EXISTS evidence_map JSONB,
ADD COLUMN IF NOT EXISTS quality_issues TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quality_passed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS resume_strategy TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_strategy TEXT;

-- Create index for role family filtering
CREATE INDEX IF NOT EXISTS idx_evidence_library_role_families ON evidence_library USING GIN(role_family_tags);
CREATE INDEX IF NOT EXISTS idx_jobs_role_family ON jobs(role_family);
CREATE INDEX IF NOT EXISTS idx_jobs_industry ON jobs(industry_guess);
