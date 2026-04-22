-- Migration: add linkedin_raw_text to user_profile
-- Safe: uses IF NOT EXISTS — no existing data or columns affected.

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS linkedin_raw_text text;
