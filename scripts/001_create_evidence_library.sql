-- Evidence Library table for grounded resume/cover letter generation
-- This stores verified source material that can be referenced during generation

CREATE TABLE IF NOT EXISTS public.evidence_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identification
  source_type TEXT NOT NULL CHECK (source_type IN (
    'work_experience',
    'project', 
    'portfolio_entry',
    'shipped_product',
    'live_site',
    'achievement',
    'certification',
    'publication',
    'open_source'
  )),
  source_title TEXT NOT NULL,
  source_url TEXT,
  
  -- Context
  project_name TEXT,
  role_name TEXT,
  company_name TEXT,
  date_range TEXT,
  
  -- Content
  responsibilities TEXT[],
  tools_used TEXT[],
  industries TEXT[],
  outcomes TEXT[],
  proof_snippet TEXT,
  
  -- Pre-approved content for generation
  approved_keywords TEXT[],
  approved_achievement_bullets TEXT[],
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  priority_rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_evidence_library_source_type ON public.evidence_library(source_type);
CREATE INDEX IF NOT EXISTS idx_evidence_library_active ON public.evidence_library(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_evidence_library_tools ON public.evidence_library USING GIN (tools_used);
CREATE INDEX IF NOT EXISTS idx_evidence_library_industries ON public.evidence_library USING GIN (industries);

-- Update the jobs table to add fields for direct analysis
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS responsibilities TEXT[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qualifications_required TEXT[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qualifications_preferred TEXT[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ats_keywords TEXT[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS generation_quality_score INTEGER;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS generation_quality_issues TEXT[];

-- Job analyses table for detailed analysis results
CREATE TABLE IF NOT EXISTS public.job_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  
  -- Extracted job details
  title TEXT,
  company TEXT,
  location TEXT,
  employment_type TEXT,
  salary_text TEXT,
  description_raw TEXT,
  responsibilities TEXT[],
  qualifications_required TEXT[],
  qualifications_preferred TEXT[],
  keywords TEXT[],
  ats_phrases TEXT[],
  
  -- Match analysis
  matched_evidence_ids UUID[],
  matched_skills TEXT[],
  matched_tools TEXT[],
  matched_industries TEXT[],
  matched_projects TEXT[],
  matched_achievements TEXT[],
  known_gaps TEXT[],
  
  -- Scoring
  ats_match_score INTEGER,
  matched_keywords TEXT[],
  missing_keywords TEXT[],
  
  -- Metadata
  analysis_model TEXT,
  analysis_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_analyses_job_id ON public.job_analyses(job_id);

-- Quality checks table
CREATE TABLE IF NOT EXISTS public.generation_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'cover_letter')),
  
  -- Quality metrics
  invented_claims_found TEXT[],
  vague_bullets_found TEXT[],
  ai_filler_found TEXT[],
  repeated_structures_found TEXT[],
  weak_summaries_found TEXT[],
  generic_buzzwords_found TEXT[],
  unsupported_claims_found TEXT[],
  
  -- Overall assessment
  passed BOOLEAN NOT NULL,
  issues_count INTEGER DEFAULT 0,
  regeneration_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_job_id ON public.generation_quality_checks(job_id);
