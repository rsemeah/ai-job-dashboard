-- Migration: Create waitlist table for landing page signups
-- Captures email addresses from potential users before launch

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can insert (for signup)
CREATE POLICY "waitlist_insert_anon" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Only service role can read/update (for admin/marketing)
CREATE POLICY "waitlist_service_role_all" ON public.waitlist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create index for email lookups and analytics
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON public.waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_source ON public.waitlist(source);

-- Add comment
COMMENT ON TABLE public.waitlist IS 'Captures email signups from landing page before users create accounts';
