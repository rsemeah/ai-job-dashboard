-- =============================================================================
-- 015_create_companion_conversations.sql
-- HireWire – Create companion_conversations table for the AI coach feature
--
-- WHY THIS EXISTS
-- ───────────────
-- The coach page (app/(dashboard)/coach/page.tsx) reads and writes to
-- companion_conversations, but this table was never created in Supabase.
-- Without it, Pro users get a DB error every time they open the coach.
--
-- SAFE TO RE-RUN: Uses CREATE TABLE IF NOT EXISTS.
-- Run in Supabase SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.companion_conversations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT        NOT NULL,
  context_type  TEXT,       -- e.g. 'job_prep', 'general', 'evidence_building'
  context_id    UUID,       -- optional FK to a jobs row or evidence row
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user conversation history retrieval
CREATE INDEX IF NOT EXISTS idx_companion_conversations_user_id
  ON public.companion_conversations (user_id, created_at DESC);

-- RLS
ALTER TABLE public.companion_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companion_select_own" ON public.companion_conversations;
DROP POLICY IF EXISTS "companion_insert_own" ON public.companion_conversations;
DROP POLICY IF EXISTS "companion_delete_own" ON public.companion_conversations;
DROP POLICY IF EXISTS "companion_service_all" ON public.companion_conversations;

CREATE POLICY "companion_select_own" ON public.companion_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "companion_insert_own" ON public.companion_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "companion_delete_own" ON public.companion_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "companion_service_all" ON public.companion_conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
SELECT COUNT(*) AS companion_conversations_table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'companion_conversations';
