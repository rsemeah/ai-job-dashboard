-- Interview Prep table for storing generated interview preparation content
-- This ties back to jobs and uses evidence-based generation

CREATE TABLE IF NOT EXISTS interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Generation metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_model TEXT,
  generation_version TEXT DEFAULT '1.0',
  fit_level TEXT, -- HIGH, MEDIUM, LOW
  strategy TEXT, -- direct_match, adjacent_transition, stretch_honest
  evidence_coverage_percent INTEGER,
  
  -- Interview Snapshot
  interview_snapshot JSONB DEFAULT '{}',
  -- Structure: { why_role_fits, top_credibility_reasons[], top_risks[], lead_story }
  
  -- Best Angles (5-8 experiences)
  best_angles JSONB DEFAULT '[]',
  -- Structure: [{ what_you_did, why_it_matters, proof, requirement_mapped, concise_way_to_say_it, evidence_id }]
  
  -- Tell Me About Yourself
  tell_me_about_yourself JSONB DEFAULT '{}',
  -- Structure: { short_version, medium_version, long_version, evidence_ids[] }
  
  -- Why This Role
  why_this_role JSONB DEFAULT '{}',
  -- Structure: { answer, what_you_have_done_tie_in, what_company_needs_tie_in, evidence_ids[] }
  
  -- Behavioral Stories (6-10)
  behavioral_stories JSONB DEFAULT '[]',
  -- Structure: [{ situation, task, action, result, themes[], evidence_id, short_version, full_version, strength_rating }]
  
  -- Likely Questions by interview type
  likely_questions JSONB DEFAULT '{}',
  -- Structure: { recruiter[], hiring_manager[], panel[], technical[], executive[] }
  -- Each: { question, why_asking, best_evidence, answer_outline, red_flags[], confidence }
  
  -- Resume Defense
  resume_defense JSONB DEFAULT '[]',
  -- Structure: [{ claim, meaning, evidence_support, how_to_explain, what_not_to_overstate }]
  
  -- Gap Handling
  gap_handling JSONB DEFAULT '[]',
  -- Structure: [{ gap, honest_framing, redirect_to, what_to_say, what_not_to_say }]
  
  -- Company Alignment
  company_alignment JSONB DEFAULT '{}',
  -- Structure: { what_they_care_about[], recurring_themes[], language_to_mirror[], achievements_to_emphasize[] }
  
  -- Questions to Ask Them
  questions_to_ask JSONB DEFAULT '{}',
  -- Structure: { role[], team[], success_metrics[], cross_functional[], process[], growth[] }
  
  -- Objection Handling
  objection_handling JSONB DEFAULT '[]',
  -- Structure: [{ objection, why_they_think_that, best_response, neutralizing_evidence[] }]
  
  -- Quick Interview Sheet (day-of summary)
  quick_sheet JSONB DEFAULT '{}',
  -- Structure: { top_5_talking_points[], top_3_stories[], top_risks[], top_questions_to_ask[], thirty_second_close }
  
  -- User feedback
  user_marked_stories JSONB DEFAULT '{}',
  -- Structure: { strong_ids[], weak_ids[], needs_proof_ids[] }
  
  saved_to_bank_ids TEXT[] DEFAULT '{}'
);

-- Index for fast job lookup
CREATE INDEX IF NOT EXISTS idx_interview_prep_job_id ON interview_prep(job_id);

-- Interview bank for saving favorite answers across jobs
CREATE TABLE IF NOT EXISTS interview_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  item_type TEXT NOT NULL, -- story, answer, question, angle
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  source_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  source_evidence_id UUID REFERENCES evidence_library(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0
);

-- Index for searching bank
CREATE INDEX IF NOT EXISTS idx_interview_bank_type ON interview_bank(item_type);
CREATE INDEX IF NOT EXISTS idx_interview_bank_tags ON interview_bank USING GIN(tags);
