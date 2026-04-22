-- Add experience_level and enabled_collection_books to user_profile
-- experience_level: 'beginner' | 'intermediate' | 'advanced'
-- enabled_collection_books: array of active collection book slugs chosen at onboarding

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS enabled_collection_books text[] DEFAULT ARRAY['professional', 'projects', 'skills']::text[];
