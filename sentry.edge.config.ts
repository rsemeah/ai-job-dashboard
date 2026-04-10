import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || 
  "https://32a951feedae6de655ed74eca53dd886@o4511198112579584.ingest.us.sentry.io/4511198240440320"

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Enable when DSN is available
  enabled: !!SENTRY_DSN,
})
