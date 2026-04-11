/**
 * Analytics module - re-exports PostHog tracking functions
 * 
 * This provides a convenient alias for the funnel event tracking functions
 * defined in the posthog-provider component.
 */

import { trackEvent } from "@/components/posthog-provider"

// Named exports for the specific funnel events used in dashboard-content.tsx
export const trackJobAdded = trackEvent.jobAdded
export const trackJobAnalyzed = trackEvent.jobAnalyzed

// Re-export all events for convenience
export { trackEvent }
 * lib/analytics.ts
 *
 * Client-side PostHog event helpers for the 6 Workflow Spine funnel events.
 * Import these in client components after a successful API response.
 *
 * Usage:
 *   import { trackJobAdded } from "@/lib/analytics"
 *   trackJobAdded({ job_id: "...", source: "paste" })
 */

import posthog from "posthog-js"

// ── Funnel events ──────────────────────────────────────────────────────────────

/** Stage 1: User adds a new job to their pipeline */
export function trackJobAdded(props: { job_id: string; source?: "paste" | "url" | "manual" }) {
  posthog.capture("job_added", props)
}

/** Stage 2: Job description successfully analyzed (qualifications extracted) */
export function trackJobAnalyzed(props: { job_id: string; role_family?: string | null }) {
  posthog.capture("job_analyzed", props)
}

/** Stage 3: User completes evidence matching for a job */
export function trackEvidenceMatchCompleted(props: {
  job_id: string
  evidence_count: number
  selected_count: number
}) {
  posthog.capture("evidence_match_completed", props)
}

/** Stage 4: Resume + cover letter successfully generated */
export function trackDocumentsGenerated(props: {
  job_id: string
  strategy?: string
  overall_score?: number
}) {
  posthog.capture("documents_generated", props)
}

/** Stage 5: Quality review passed (Red Team approved) */
export function trackQualityPassed(props: { job_id: string }) {
  posthog.capture("quality_passed", props)
}

/** Stage 6: User marks job as applied */
export function trackApplied(props: { job_id: string }) {
  posthog.capture("applied", props)
}

// ── Identity ───────────────────────────────────────────────────────────────────

/** Call once after sign-in to associate events with a user */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits)
}

/** Call on sign-out */
export function resetAnalyticsUser() {
  posthog.reset()
}
