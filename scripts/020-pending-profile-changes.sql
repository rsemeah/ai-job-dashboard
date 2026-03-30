-- Migration: Pending Profile Changes
-- Purpose: Foundation for approval-gated profile mutations
-- This table stores proposed changes that must be approved before applying

CREATE TABLE IF NOT EXISTS pending_profile_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Proposed changes as JSONB: { field: { old: value, new: value } }
  proposed_changes JSONB NOT NULL,
  
  -- Human-readable summary of what's changing
  summary TEXT NOT NULL,
  
  -- Source of the proposed change (e.g., 'coach_chat', 'ai_suggestion', 'manual')
  source TEXT NOT NULL DEFAULT 'coach_chat',
  
  -- Status workflow: pending -> approved/rejected -> applied
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  
  -- Audit: who/what approved (for future admin flows)
  reviewed_by TEXT
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pending_changes_user_status 
  ON pending_profile_changes(user_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_changes_created 
  ON pending_profile_changes(created_at DESC);

-- RLS Policies
ALTER TABLE pending_profile_changes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own pending changes
CREATE POLICY pending_changes_select_own ON pending_profile_changes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own pending changes
CREATE POLICY pending_changes_insert_own ON pending_profile_changes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending changes (approve/reject)
CREATE POLICY pending_changes_update_own ON pending_profile_changes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own pending changes
CREATE POLICY pending_changes_delete_own ON pending_profile_changes
  FOR DELETE USING (auth.uid() = user_id);

-- Create audit log table for applied changes
CREATE TABLE IF NOT EXISTS profile_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_id UUID NOT NULL REFERENCES pending_profile_changes(id) ON DELETE CASCADE,
  
  -- Snapshot of what was changed
  changes_applied JSONB NOT NULL,
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for audit table
ALTER TABLE profile_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_select_own ON profile_change_audit
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY audit_insert_own ON profile_change_audit
  FOR INSERT WITH CHECK (auth.uid() = user_id);
