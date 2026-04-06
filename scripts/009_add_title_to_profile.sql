-- Migration 009: Add title column to user_profile
-- The original migration 002 declared title TEXT NOT NULL but the live DB
-- does not have this column. Adding it as nullable for compatibility.
-- Code that supplies title will persist it; code that omits it will not error.

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS title TEXT;
