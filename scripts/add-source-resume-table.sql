-- Add source_resumes table to store user's uploaded/source resumes
-- This is the user's "master" resume that gets tailored for each job application

CREATE TABLE IF NOT EXISTS source_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File storage
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt'
  file_url TEXT, -- Vercel Blob URL (for downloading original)
  file_pathname TEXT, -- Blob pathname for private storage
  file_size INTEGER,
  
  -- Parsed content
  parsed_text TEXT, -- Full extracted text from the resume
  parsed_data JSONB, -- Structured data extracted by AI
  -- parsed_data structure:
  -- {
  --   "contact": { "name", "email", "phone", "location", "linkedin", "website" },
  --   "summary": "...",
  --   "experience": [{ "title", "company", "start_date", "end_date", "description", "bullets": [] }],
  --   "education": [{ "degree", "school", "year", "gpa", "honors" }],
  --   "skills": { "technical": [], "soft": [], "tools": [], "languages": [] },
  --   "certifications": [{ "name", "issuer", "date" }],
  --   "projects": [{ "name", "description", "tech_stack": [], "url" }]
  -- }
  
  -- Processing status
  parse_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  parse_error TEXT,
  parsed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  is_primary BOOLEAN DEFAULT false, -- User's main/active resume
  label TEXT, -- User-defined label (e.g., "Technical Resume", "PM Resume")
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_source_resumes_user_id ON source_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_source_resumes_is_primary ON source_resumes(user_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE source_resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "source_resumes_select_own" ON source_resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "source_resumes_insert_own" ON source_resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "source_resumes_update_own" ON source_resumes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "source_resumes_delete_own" ON source_resumes
  FOR DELETE USING (auth.uid() = user_id);

-- Add column to user_profile to link primary source resume
ALTER TABLE user_profile 
ADD COLUMN IF NOT EXISTS source_resume_id UUID REFERENCES source_resumes(id) ON DELETE SET NULL;
