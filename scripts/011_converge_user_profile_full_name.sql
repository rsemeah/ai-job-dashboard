-- =============================================================================
-- 011_converge_user_profile_full_name.sql
-- Ensure user_profile.full_name exists and is backfilled from legacy name.
-- Safe to rerun (idempotent).
-- =============================================================================

DO $$
DECLARE
  has_full_name BOOLEAN;
  has_name BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profile'
      AND column_name = 'full_name'
  ) INTO has_full_name;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profile'
      AND column_name = 'name'
  ) INTO has_name;

  IF NOT has_full_name THEN
    ALTER TABLE public.user_profile ADD COLUMN full_name TEXT;
  END IF;

  IF has_name THEN
    UPDATE public.user_profile
    SET full_name = COALESCE(full_name, name)
    WHERE (full_name IS NULL OR full_name = '')
      AND name IS NOT NULL
      AND name <> '';
  END IF;
END $$;

-- Optional verification query:
-- SELECT COUNT(*) AS null_or_empty_full_name
-- FROM public.user_profile
-- WHERE full_name IS NULL OR full_name = '';
