-- Migration 021: Tighten audit_events INSERT RLS policy
-- ============================================================
-- Previously: WITH CHECK (true) — no enforcement at the policy level,
--             relied entirely on application layer to pass correct user_id.
-- Now: WITH CHECK (auth.uid() = user_id) — RLS enforces that the inserting
--      user can only write rows with their own user_id.
--
-- Safe to apply: lib/audit.ts logAuditEvent() always sets user_id from the
-- authenticated user context, so this policy change breaks nothing in practice
-- while providing a formal guarantee at the database layer.
-- ============================================================

DROP POLICY IF EXISTS "Service role can insert audit events" ON public.audit_events;

CREATE POLICY "Users can insert own audit events"
  ON public.audit_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verification queries (run after applying):
-- SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--  WHERE tablename = 'audit_events';
