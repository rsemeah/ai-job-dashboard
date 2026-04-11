/**
 * lib/audit.ts
 *
 * Lightweight AuditEngine for HireWire.
 *
 * Records decision points, gate outcomes, and workflow transitions to
 * audit_events table. This is not a general-purpose logger — it logs
 * only the events that matter for trust, debugging, and compliance:
 *
 * - Gate decisions (allowed / blocked)
 * - Workflow transitions (matching complete, generation triggered, applied)
 * - Generation outcomes (success / blocked / failed)
 * - Score persistence
 * - Quality pass / fail
 *
 * Do NOT log: raw document content, PII, full evidence text.
 * Log only: IDs, event types, outcomes, and machine-readable reasons.
 */

import { createClient } from "@/lib/supabase/server"

// ============================================================================
// EVENT TYPES
// ============================================================================

export type AuditEventType =
  // Gate decisions
  | "gate_generation_allowed"
  | "gate_generation_blocked"
  | "gate_interview_prep_allowed"
  | "gate_interview_prep_blocked"
  | "gate_apply_allowed"
  | "gate_apply_blocked"
  | "gate_scoring_allowed"
  | "gate_scoring_blocked"
  // Workflow transitions
  | "matching_draft_saved"
  | "matching_complete"
  | "score_persisted"
  | "generation_triggered"
  | "generation_succeeded"
  | "generation_failed"
  | "quality_passed"
  | "quality_failed"
  | "job_marked_applied"
  | "gap_clarification_saved"
  // Errors and blocks
  | "orchestrator_blocked"
  | "gate_bypassed_retry"

export type AuditOutcome = "allowed" | "blocked" | "success" | "error"

export interface AuditEvent {
  user_id: string
  job_id?: string | null
  event_type: AuditEventType
  outcome: AuditOutcome
  reason?: string | null
  correlation_id?: string | null
  metadata?: Record<string, unknown> | null
}

// ============================================================================
// CORE LOGGER
// ============================================================================

/**
 * Log an audit event to the audit_events table.
 *
 * This is a fire-and-forget operation — errors are swallowed intentionally.
 * Audit logging must NEVER block the main request path.
 *
 * If audit_events table does not yet exist, this will fail silently.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from("audit_events").insert({
      user_id: event.user_id,
      job_id: event.job_id ?? null,
      event_type: event.event_type,
      outcome: event.outcome,
      reason: event.reason ?? null,
      correlation_id: event.correlation_id ?? null,
      metadata: event.metadata ?? null,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Never throw — audit logging is non-blocking
  }
}

// ============================================================================
// CONVENIENCE HELPERS
// ============================================================================

/** Log a gate decision. Use when a semantic gate runs and produces an outcome. */
export async function logGateDecision(
  userId: string,
  jobId: string,
  gateType: "generation" | "interview_prep" | "apply" | "scoring",
  allowed: boolean,
  reason?: string,
  correlationId?: string
): Promise<void> {
  const eventTypeMap: Record<typeof gateType, { allowed: AuditEventType; blocked: AuditEventType }> = {
    generation: {
      allowed: "gate_generation_allowed",
      blocked: "gate_generation_blocked",
    },
    interview_prep: {
      allowed: "gate_interview_prep_allowed",
      blocked: "gate_interview_prep_blocked",
    },
    apply: {
      allowed: "gate_apply_allowed",
      blocked: "gate_apply_blocked",
    },
    scoring: {
      allowed: "gate_scoring_allowed",
      blocked: "gate_scoring_blocked",
    },
  }

  const eventType = allowed
    ? eventTypeMap[gateType].allowed
    : eventTypeMap[gateType].blocked

  await logAuditEvent({
    user_id: userId,
    job_id: jobId,
    event_type: eventType,
    outcome: allowed ? "allowed" : "blocked",
    reason: reason ?? null,
    correlation_id: correlationId ?? null,
  })
}

/** Log a workflow transition (matching complete, score persisted, etc.) */
export async function logWorkflowTransition(
  userId: string,
  jobId: string,
  eventType: AuditEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    job_id: jobId,
    event_type: eventType,
    outcome: "success",
    metadata: metadata ?? null,
  })
}

/** Log generation outcome (success or failure). */
export async function logGenerationOutcome(
  userId: string,
  jobId: string,
  success: boolean,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    job_id: jobId,
    event_type: success ? "generation_succeeded" : "generation_failed",
    outcome: success ? "success" : "error",
    reason: reason ?? null,
    metadata: metadata ?? null,
  })
}

/** Log a gap clarification being saved. */
export async function logGapClarification(
  userId: string,
  jobId: string,
  requirement: string
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    job_id: jobId,
    event_type: "gap_clarification_saved",
    outcome: "success",
    metadata: { requirement },
  })
}
