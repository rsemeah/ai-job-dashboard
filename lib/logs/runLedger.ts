import type { createClient } from "@/lib/supabase/server"

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export type RunLedgerStepStatus = "started" | "success" | "error" | "skipped"

export interface RunLedgerEntry {
  jobId: string
  userId?: string
  step: string
  status: RunLedgerStepStatus
  summary?: string
  errorDetails?: string
  metadata?: Record<string, unknown>
  timestamp?: string
}

export async function recordRunStep(
  supabase: ServerSupabase,
  entry: RunLedgerEntry
): Promise<void> {
  const timestamp = entry.timestamp || new Date().toISOString()

  try {
    const { error } = await supabase.from("run_ledger").insert({
      job_id: entry.jobId,
      user_id: entry.userId || null,
      step_name: entry.step,
      status: entry.status,
      timestamp,
      summary_result: entry.summary || null,
      error_details: entry.errorDetails || null,
      metadata: entry.metadata || null,
      created_at: timestamp,
    })

    if (!error) return
  } catch {
    // Fall through to processing_events fallback.
  }

  try {
    await supabase.from("processing_events").insert({
      job_id: entry.jobId,
      user_id: entry.userId || null,
      event_type: `${entry.step}_${entry.status}`,
      message: entry.summary || entry.errorDetails || null,
      metadata: {
        status: entry.status,
        ...entry.metadata,
      },
      created_at: timestamp,
    })
  } catch {
    // Best-effort logging only.
  }
}

export async function listRunLedger(
  supabase: ServerSupabase,
  userId: string,
  limit = 100
): Promise<Array<Record<string, unknown>>> {
  try {
    const { data, error } = await supabase
      .from("run_ledger")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(limit)

    if (!error && data) {
      // Normalise: ensure every row exposes event_type for the logs page
      return data.map((row: Record<string, unknown>) => ({
        ...row,
        event_type: row.event_type ?? `${row.step_name ?? "step"}_${row.status ?? "success"}`,
      }))
    }
  } catch {
    // Fall back to processing events below.
  }

  const { data: fallback } = await supabase
    .from("processing_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  return fallback || []
}
