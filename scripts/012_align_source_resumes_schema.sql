-- Migration 012: Align source_resumes to canonical schema
--
-- Root cause: The original table (add-source-resume-table.sql) used
--   file_name TEXT NOT NULL, file_type TEXT NOT NULL, parsed_text TEXT
-- Migration 008 used CREATE TABLE IF NOT EXISTS, so the old table was
-- never altered. The canonical upload route sends {filename, content_text}
-- which caused:
--   - PGRST204 "content_text column not found"
--   - 23502  "null value in file_type violates not-null constraint"
--
-- This migration adds the canonical columns and relaxes the legacy
-- NOT NULL constraint so the upload route works without touching
-- existing rows.

-- 1. Add canonical columns (idempotent)
ALTER TABLE public.source_resumes
  ADD COLUMN IF NOT EXISTS filename    TEXT,
  ADD COLUMN IF NOT EXISTS content_text TEXT;

-- 2. Relax legacy NOT NULL so inserts that omit file_type succeed
ALTER TABLE public.source_resumes
  ALTER COLUMN file_type DROP NOT NULL;

-- 3. Backfill canonical columns from legacy columns on existing rows
UPDATE public.source_resumes
  SET filename = file_name
  WHERE filename IS NULL AND file_name IS NOT NULL;

UPDATE public.source_resumes
  SET content_text = parsed_text
  WHERE content_text IS NULL AND parsed_text IS NOT NULL;

-- 4. Reload PostgREST schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
