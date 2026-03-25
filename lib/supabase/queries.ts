/**
 * Supabase query helpers
 * All JSONB fields are safely parsed before returning typed objects.
 * Service-role operations belong in API routes, not here — this file
 * uses the anon key and is safe for client components.
 */
import { createClient } from "@supabase/supabase-js"
import type {
  Job,
  GeneratedDocument,
  Application,
  WorkflowLog,
  BaseResume,
  ReadyQueueItem,
  PipelineSummaryRow,
  JobFilters,
  LogFilters,
  ManualJobInput,
} from "@/lib/types"
import { parseJsonArray, parseKeywords } from "@/lib/utils"

// ── Client ────────────────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const supabase = createClient(url, key)

// ── Row parsers ───────────────────────────────────────────────────────────────

function parseJobRow(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    source: row.source as Job["source"],
    source_url: (row.source_url as string) ?? null,
    source_job_id: (row.source_job_id as string) ?? null,
    raw_description: row.raw_description as string,
    location: (row.location as string) ?? null,
    salary_range: (row.salary_range as string) ?? null,
    is_remote: row.is_remote as boolean,
    status: row.status as Job["status"],
    fit: row.fit as Job["fit"],
    score: (row.score as number) ?? null,
    score_reasoning: parseJsonArray(row.score_reasoning),
    score_strengths: parseJsonArray(row.score_strengths),
    score_gaps: parseJsonArray(row.score_gaps),
    keywords_extracted: parseKeywords(row.keywords_extracted),
    dedup_hash: (row.dedup_hash as string) ?? "",
    posted_at: (row.posted_at as string) ?? null,
    scored_at: (row.scored_at as string) ?? null,
    applied_at: (row.applied_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function fetchJobs(filters?: JobFilters): Promise<Job[]> {
  let q = supabase.from("jobs").select("*")
  if (filters?.status?.length) q = q.in("status", filters.status)
  if (filters?.fit?.length) q = q.in("fit", filters.fit)
  if (filters?.source?.length) q = q.in("source", filters.source)
  if (filters?.is_remote !== undefined) q = q.eq("is_remote", filters.is_remote)
  if (filters?.search) {
    q = q.or(
      `title.ilike.%${filters.search}%,company.ilike.%${filters.search}%`,
    )
  }
  const { data, error } = await q.order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => parseJobRow(r as Record<string, unknown>))
}

export async function fetchJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return parseJobRow(data as Record<string, unknown>)
}

export async function updateJobStatus(
  id: string,
  status: Job["status"],
): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function bulkUpdateJobStatus(
  ids: string[],
  status: Job["status"],
): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
  if (error) throw error
}

export async function insertManualJob(input: ManualJobInput): Promise<Job> {
  // SHA-256 of (title + company + source_url) for deduplication
  const raw = `${input.title.toLowerCase()}-${input.company.toLowerCase()}-${input.source_url.toLowerCase()}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw))
  const dedup_hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32)

  const { data: row, error } = await supabase
    .from("jobs")
    .insert({
      title: input.title.trim(),
      company: input.company.trim(),
      source: "MANUAL",
      source_url: input.source_url.trim() || null,
      source_job_id: null,
      raw_description: input.raw_description.trim(),
      location: input.location.trim() || null,
      salary_range: input.salary_range.trim() || null,
      is_remote: input.is_remote,
      status: "submitted",
      fit: null,
      score: null,
      dedup_hash,
    })
    .select()
    .single()

  if (error) throw error
  return parseJobRow(row as Record<string, unknown>)
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function fetchDocumentsForJob(
  jobId: string,
): Promise<GeneratedDocument[]> {
  const { data, error } = await supabase
    .from("generated_documents")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as GeneratedDocument[]
}

export async function fetchAllDocuments(): Promise<GeneratedDocument[]> {
  const { data, error } = await supabase
    .from("generated_documents")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as GeneratedDocument[]
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function fetchApplicationForJob(
  jobId: string,
): Promise<Application | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .single()
  if (error) return null
  return data as Application
}

export async function fetchAllApplications(): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("submitted_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Application[]
}

export async function markJobApplied(
  jobId: string,
  opts?: { portalUrl?: string; confirmationCode?: string },
): Promise<void> {
  const now = new Date().toISOString()
  const { error: appErr } = await supabase.from("applications").upsert(
    {
      job_id: jobId,
      submitted_at: now,
      submission_method: "MANUAL",
      portal_url: opts?.portalUrl ?? null,
      confirmation_code: opts?.confirmationCode ?? null,
    },
    { onConflict: "job_id" },
  )
  if (appErr) throw appErr
  await updateJobStatus(jobId, "applied")
}

// ── Workflow logs ─────────────────────────────────────────────────────────────

export async function fetchLogs(filters?: LogFilters): Promise<WorkflowLog[]> {
  let q = supabase.from("workflow_logs").select("*")
  if (filters?.workflow_name?.length) {
    q = q.in("workflow_name", filters.workflow_name)
  }
  if (filters?.status?.length) q = q.in("status", filters.status)
  if (filters?.job_id) q = q.eq("job_id", filters.job_id)
  if (filters?.errors_only) q = q.eq("status", "ERROR")
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as WorkflowLog[]
}

// ── Views ─────────────────────────────────────────────────────────────────────

export async function fetchReadyQueue(): Promise<ReadyQueueItem[]> {
  const { data, error } = await supabase
    .from("v_ready_queue")
    .select("*")
    .order("score", { ascending: false })
  if (error) throw error
  return (data ?? []) as ReadyQueueItem[]
}

export async function fetchPipelineSummary(): Promise<PipelineSummaryRow[]> {
  const { data, error } = await supabase
    .from("v_pipeline_summary")
    .select("*")
  if (error) throw error
  return (data ?? []) as PipelineSummaryRow[]
}

// ── Base resume ───────────────────────────────────────────────────────────────

export async function fetchActiveResume(): Promise<BaseResume | null> {
  const { data, error } = await supabase
    .from("base_resume")
    .select("*")
    .eq("is_active", true)
    .single()
  if (error) return null
  return data as BaseResume
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export async function countAppliedToday(): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "applied")
    .gte("applied_at", startOfDay.toISOString())
  if (error) return 0
  return count ?? 0
}
