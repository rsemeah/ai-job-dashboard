"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { useEffect } from "react"
import { useUser } from "./user-provider"

// Initialize PostHog only on client side
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // We handle this manually for better control
    capture_pageleave: true,
    autocapture: {
      dom_event_allowlist: ["click", "submit"],
      element_allowlist: ["button", "a", "form"],
    },
  })
}

// User identification component
function PostHogUserIdentify() {
  const { user, profile } = useUser()
  const posthogClient = usePostHog()

  useEffect(() => {
    if (user && posthogClient) {
      posthogClient.identify(user.id, {
        email: user.email,
        name: profile?.full_name,
        is_premium: profile?.is_premium,
        created_at: user.created_at,
      })
    } else if (!user && posthogClient) {
      posthogClient.reset()
    }
  }, [user, profile, posthogClient])

  return null
}

// Page view tracker component
function PostHogPageView() {
  const posthogClient = usePostHog()

  useEffect(() => {
    if (posthogClient) {
      posthogClient.capture("$pageview")
    }
  }, [posthogClient])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Don't render provider if no key configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogUserIdentify />
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}

// Export typed event tracking functions for the 6 funnel events
export const trackEvent = {
  jobAdded: (props: { job_id: string; company?: string; role?: string }) => {
    posthog.capture("job_added", props)
  },
  jobAnalyzed: (props: { job_id: string; fit_score?: number; gap_count?: number }) => {
    posthog.capture("job_analyzed", props)
  },
  evidenceMatchCompleted: (props: { job_id: string; requirements_matched: number; total_requirements: number }) => {
    posthog.capture("evidence_match_completed", props)
  },
  documentsGenerated: (props: { job_id: string; resume_generated: boolean; cover_letter_generated: boolean }) => {
    posthog.capture("documents_generated", props)
  },
  qualityPassed: (props: { job_id: string; issues_acknowledged: number }) => {
    posthog.capture("quality_passed", props)
  },
  applied: (props: { job_id: string; method?: string }) => {
    posthog.capture("applied", props)
  },
  // Additional operational events
  error: (props: { error_type: string; message: string; context?: Record<string, unknown> }) => {
    posthog.capture("error_occurred", props)
  },
  upgradeViewed: (props?: { source?: string }) => {
    posthog.capture("upgrade_viewed", props)
  },
  upgradeStarted: (props?: { plan?: string }) => {
    posthog.capture("upgrade_started", props)
  },
  // Generic custom event for one-off tracking
  custom: (eventName: string, props?: Record<string, unknown>) => {
    posthog.capture(eventName, props)
  },
}
