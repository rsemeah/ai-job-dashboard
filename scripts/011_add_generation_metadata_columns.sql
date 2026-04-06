-- Add missing generation metadata columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS scored_at timestamptz,
ADD COLUMN IF NOT EXISTS generation_timestamp timestamptz,
ADD COLUMN IF NOT EXISTS generation_quality_score integer,
ADD COLUMN IF NOT EXISTS generation_quality_issues text[];
