-- Migration 017: profile_links table
-- Provides durable storage for multiple external links per user
-- Replaces the limited user_profile.links jsonb field

-- Create the profile_links table
CREATE TABLE IF NOT EXISTS public.profile_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_type     text NOT NULL CHECK (link_type IN ('linkedin', 'github', 'portfolio', 'website', 'other')),
  url           text NOT NULL,
  label         text,
  is_primary    boolean NOT NULL DEFAULT false,
  source        text DEFAULT 'user_input',
  parse_status  text DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsed', 'failed', 'skipped')),
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profile_links_user_id ON public.profile_links (user_id);
CREATE INDEX IF NOT EXISTS idx_profile_links_type ON public.profile_links (user_id, link_type);

-- Enable Row Level Security
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

-- Users can only access their own links
DROP POLICY IF EXISTS "Users manage own links" ON public.profile_links;
CREATE POLICY "Users manage own links" ON public.profile_links
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_profile_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_links_updated_at ON public.profile_links;
CREATE TRIGGER profile_links_updated_at
  BEFORE UPDATE ON public.profile_links
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_links_updated_at();

-- Ensure only one primary link per type per user
CREATE OR REPLACE FUNCTION ensure_single_primary_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.profile_links
    SET is_primary = false
    WHERE user_id = NEW.user_id 
      AND link_type = NEW.link_type 
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary_link_trigger ON public.profile_links;
CREATE TRIGGER ensure_single_primary_link_trigger
  BEFORE INSERT OR UPDATE ON public.profile_links
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_link();
