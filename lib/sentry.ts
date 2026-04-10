import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || 
  "https://32a951feedae6de655ed74eca53dd886@o4511198112579584.ingest.us.sentry.io/4511198240440320"

// Initialize Sentry for error monitoring
export function initSentry() {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV,
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      
      // Session replay for debugging (only in production)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Filter out noisy errors
      ignoreErrors: [
        // Browser extensions
        /^chrome-extension:\/\//,
        /^moz-extension:\/\//,
        // Network errors that are expected
        "Failed to fetch",
        "NetworkError",
        "Load failed",
        // User-cancelled requests
        "AbortError",
        // Hydration mismatches (usually benign)
        "Hydration failed",
        "Text content does not match",
      ],
      
      // Don't send PII
      beforeSend(event) {
        // Scrub email addresses
        if (event.user?.email) {
          event.user.email = "[REDACTED]"
        }
        return event
      },
    })
  }
}

// Helper to capture errors with context
export function captureError(
  error: Error | string,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    user?: { id: string; email?: string }
    level?: Sentry.SeverityLevel
  }
) {
  if (!SENTRY_DSN) {
    console.error("[Sentry not configured]", error)
    return
  }

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
    if (context?.user) {
      scope.setUser({ id: context.user.id })
    }
    if (context?.level) {
      scope.setLevel(context.level)
    }

    if (typeof error === "string") {
      Sentry.captureMessage(error, context?.level || "error")
    } else {
      Sentry.captureException(error)
    }
  })
}

// Re-export Sentry for direct access
export { Sentry }
