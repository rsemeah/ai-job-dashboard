-- Migration: Add missing columns to user_profile_links
-- The profile-links server action inserts label and parse_status
-- but the table was created without them. This aligns the schema
-- with the code in lib/actions/profile-links.ts.

ALTER TABLE public.user_profile_links
  ADD COLUMN IF NOT EXISTS label         text,
  ADD COLUMN IF NOT EXISTS parse_status  text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS metadata      jsonb;

-- Confirm
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'user_profile_links'
ORDER BY ordinal_position;
