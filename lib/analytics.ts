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
