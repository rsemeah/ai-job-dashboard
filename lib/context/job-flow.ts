/**
 * JobFlowContext - Execution context for job processing flows.
 * Separates system execution metadata from user input contracts.
 */

export interface JobFlowContext {
  /** Unique correlation ID for tracing this flow across logs/services */
  correlationId: string
  
  /** Base URL for internal API calls (e.g., https://hirewire.app) */
  baseUrl: string
  
  /** User ID owning this flow */
  userId: string
  
  /** Job ID being processed */
  jobId: string
  
  /** Timestamp when flow started */
  startedAt: Date
  
  /** Optional: Request headers for cookie forwarding */
  cookieHeader?: string
}

/**
 * Creates a JobFlowContext from request and input data.
 * Centralizes context creation logic.
 */
export function createJobFlowContext(params: {
  request: { headers: { get(name: string): string | null } }
  userId: string
  jobId: string
}): JobFlowContext {
  const { request, userId, jobId } = params
  
  return {
    correlationId: generateCorrelationId(),
    baseUrl: resolveBaseUrl(request),
    userId,
    jobId,
    startedAt: new Date(),
    cookieHeader: request.headers.get("cookie") || undefined,
  }
}

/**
 * Generates a unique correlation ID for flow tracing.
 * Format: hw-{timestamp}-{random}
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `hw-${timestamp}-${random}`
}

/**
 * Resolves the base URL for internal API calls.
 * Priority: VERCEL_URL > origin header > host header > localhost
 */
function resolveBaseUrl(request: { headers: { get(name: string): string | null } }): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env || {}
  const vercelUrl = env.VERCEL_URL || env.NEXT_PUBLIC_VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`

  const origin = request.headers.get("origin")
  if (origin) return origin

  return `http://${request.headers.get("host") || "localhost:3000"}`
}
