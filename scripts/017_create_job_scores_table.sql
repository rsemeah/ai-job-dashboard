-- Create job_scores table for normalized scoring data
-- This table stores the detailed scoring breakdown for each job

CREATE TABLE IF NOT EXISTS public.job_scores (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  overall_score integer NOT NULL,
  skills_match numeric(5,2) NOT NULL,
  experience_relevance numeric(5,2) NOT NULL,
  evidence_quality numeric(5,2) NOT NULL,
  ats_keywords numeric(5,2) NOT NULL,
  scoring_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.job_scores IS 'Normalized scoring data with detailed breakdown for each job';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_job_scores_job_id ON public.job_scores (job_id);

-- Enable RLS
ALTER TABLE public.job_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only access scores for their own jobs
CREATE POLICY "job_scores_select_own" ON public.job_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_scores.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "job_scores_insert_own" ON public.job_scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_scores.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "job_scores_update_own" ON public.job_scores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_scores.job_id
      AND jobs.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_scores.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "job_scores_delete_own" ON public.job_scores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_scores.job_id
      AND jobs.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_job_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_scores_updated_at
  BEFORE UPDATE ON public.job_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_job_scores_updated_at();</content>
<parameter name="filePath">/Users/rorysemeah/Desktop/HireWireInGroup/scripts/017_create_job_scores_table.sql