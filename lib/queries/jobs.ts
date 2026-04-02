import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Extracted Supabase job queries.
 * Accept client as parameter for testability.
 */

type AnySupabaseClient = SupabaseClient<unknown, string, unknown>

/**
 * Find existing job by URL for a user.
 */
export async function findJobByUrl(
  supabase: AnySupabaseClient,
  userId: string,
  sourceUrl: string
) {
  // jobs table uses job_url not source_url
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("job_url", sourceUrl)
    .eq("user_id", userId)
    .maybeSingle()

  return { data, error }
}

/**
 * Get job by ID with optional related data.
 */
export async function getJobById(
  supabase: AnySupabaseClient,
  jobId: string,
  userId: string,
  options?: { includeAnalysis?: boolean }
) {
  const select = options?.includeAnalysis 
    ? "*, job_analyses(*)" 
    : "*"

  const { data, error } = await supabase
    .from("jobs")
    .select(select)
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle()

  return { data, error }
}

/**
 * Update job status.
 */
export async function updateJobStatus(
  supabase: AnySupabaseClient,
  jobId: string,
  userId: string,
  status: string,
  additionalFields?: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("jobs")
    .update({
      status,
      ...additionalFields,
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .maybeSingle()

  return { data, error }
}

/**
 * Update job generation status.
 * Note: generation_status and generation_error don't exist in the new schema.
 * We use the status column to track generation state.
 */
export async function updateJobGenerationStatus(
  supabase: AnySupabaseClient,
  jobId: string,
  userId: string,
  generationStatus: "idle" | "generating" | "completed" | "failed",
  _error?: string // Unused - kept for API compatibility
) {
  // Map generation status to job status
  const statusMap: Record<string, string> = {
    idle: "analyzed",
    generating: "generating",
    completed: "ready",
    failed: "error",
  }
  
  const { data, error: dbError } = await supabase
    .from("jobs")
    .update({
      status: statusMap[generationStatus] || "error",
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .maybeSingle()

  return { data, error: dbError }
}

/**
 * List jobs for a user with optional filters.
 */
export async function listJobs(
  supabase: AnySupabaseClient,
  userId: string,
  options?: {
    status?: string | string[]
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: "asc" | "desc"
  }
) {
  let query = supabase
    .from("jobs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)

  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in("status", options.status)
    } else {
      query = query.eq("status", options.status)
    }
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, { 
      ascending: options.orderDirection === "asc" 
    })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error, count } = await query

  return { data, error, count }
}
