"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Job, JobStatus } from "@/lib/types"

export type JobsResult =
  | { success: true; data: Job[] }
  | { success: false; error: string }

export type CreateJobResult =
  | {
      success: true
      job: Job
      duplicate: boolean
      partialParse: boolean
      message?: string
    }
  | { success: false; error: string }

const SOURCE_HINTS = {
  GREENHOUSE: "GREENHOUSE",
  LEVER: "LEVER",
  LINKEDIN: "LINKEDIN",
} as const

function getSourceHint(url: string): (typeof SOURCE_HINTS)[keyof typeof SOURCE_HINTS] | null {
  const lowercase = url.toLowerCase()
  if (lowercase.includes("greenhouse.io")) return SOURCE_HINTS.GREENHOUSE
  if (lowercase.includes("lever.co")) return SOURCE_HINTS.LEVER
  if (lowercase.includes("linkedin.com")) return SOURCE_HINTS.LINKEDIN
  return null
}

function parseWebhookResponse(payload: unknown): {
  duplicate: boolean
  partialParse: boolean
  jobId: string | null
  message?: string
} {
  if (!payload || typeof payload !== "object") {
    return { duplicate: false, partialParse: false, jobId: null }
  }

  const parsed = payload as Record<string, unknown>

  const duplicate =
    Boolean(parsed.duplicate) ||
    Boolean(parsed.is_duplicate) ||
    parsed.status === "duplicate"

  const partialParse =
    Boolean(parsed.partial_parse) ||
    Boolean(parsed.partialParse) ||
    parsed.parse_status === "partial"

  const jobId =
    (parsed.job_id as string | undefined) ??
    (parsed.jobId as string | undefined) ??
    (parsed.id as string | undefined) ??
    null

  const message = typeof parsed.message === "string" ? parsed.message : undefined

  return { duplicate, partialParse, jobId, message }
}

async function findJobFromIngestion(jobId: string | null, sourceUrl: string): Promise<Job | null> {
  const supabase = createAdminClient()

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (jobId) {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle()
      if (data) return data as Job
    }

    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("source_url", sourceUrl)
      .order("created_at", { ascending: false })
      .limit(1)

    if (data?.[0]) return data[0] as Job

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return null
}

export async function createJobFromUrl(url: string): Promise<CreateJobResult> {
  try {
    const normalizedUrl = url.trim()

    if (!normalizedUrl) {
      return { success: false, error: "Please provide a job URL." }
    }

    try {
      new URL(normalizedUrl)
    } catch {
      return { success: false, error: "Please provide a valid URL." }
    }

    const sourceHint = getSourceHint(normalizedUrl)
    if (!sourceHint) {
      return {
        success: false,
        error: "Only Greenhouse, Lever, and LinkedIn URLs are supported right now.",
      }
    }

    const webhookUrl = process.env.N8N_JOB_INTAKE_WEBHOOK_URL
    if (!webhookUrl) {
      return {
        success: false,
        error: "Job intake webhook is not configured. Set N8N_JOB_INTAKE_WEBHOOK_URL.",
      }
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (process.env.N8N_JOB_INTAKE_WEBHOOK_TOKEN) {
      headers["x-webhook-token"] = process.env.N8N_JOB_INTAKE_WEBHOOK_TOKEN
    }

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: normalizedUrl,
        source_hint: sourceHint,
      }),
      cache: "no-store",
    })

    if (!webhookRes.ok) {
      return {
        success: false,
        error: "We could not submit this URL to the ingestion workflow. Please try again.",
      }
    }

    let webhookPayload: unknown = null
    try {
      webhookPayload = await webhookRes.json()
    } catch {
      webhookPayload = null
    }

    const { duplicate, partialParse, jobId, message } = parseWebhookResponse(webhookPayload)
    const job = await findJobFromIngestion(jobId, normalizedUrl)

    if (!job) {
      return {
        success: false,
        error:
          "Job submission was accepted, but the job record is not available yet. Refresh Jobs in a moment.",
      }
    }

    revalidatePath("/")
    revalidatePath("/jobs")
    revalidatePath(`/jobs/${job.id}`)
    revalidatePath("/ready-queue")
    revalidatePath("/logs")

    return {
      success: true,
      job,
      duplicate,
      partialParse,
      message,
    }
  } catch (err) {
    console.error("Error creating job from URL:", err)
    return { success: false, error: "Failed to submit job URL" }
  }
}

export async function getJobs(): Promise<JobsResult> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("score", { ascending: false, nullsFirst: false })

    if (error) {
      console.error("Error fetching jobs:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error("Connection error:", err)
    return { success: false, error: "Unable to connect to database" }
  }
}

export async function getJobById(id: string): Promise<Job | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single()

  if (error) {
    return null
  }

  return data
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("jobs").update({ status }).eq("id", id)

  if (error) {
    console.error("Error updating job status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/jobs")
  revalidatePath(`/jobs/${id}`)
  revalidatePath("/")

  return { success: true }
}

export type StatsResult = {
  success: boolean
  error?: string
  total: number
  byStatus: Record<string, number>
  byFit: Record<string, number>
  bySource: Record<string, number>
  lastJobCreated?: string | null
  hasWorkflowOutputs: boolean
}

export async function getJobStats(): Promise<StatsResult> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("jobs")
      .select("status, fit, source, score, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching job stats:", error)
      return {
        success: false,
        error: error.message,
        total: 0,
        byStatus: {},
        byFit: {},
        bySource: {},
        hasWorkflowOutputs: false,
      }
    }

    const jobs = data || []

    const byStatus = jobs.reduce((acc, job) => {
      const currentStatus = job.status || "NEW"
      acc[currentStatus] = (acc[currentStatus] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byFit = jobs.reduce((acc, job) => {
      const currentFit = job.fit || "UNSCORED"
      acc[currentFit] = (acc[currentFit] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySource = jobs.reduce((acc, job) => {
      const currentSource = job.source || "UNKNOWN"
      acc[currentSource] = (acc[currentSource] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const hasWorkflowOutputs = jobs.some((job) => job.score !== null)

    return {
      success: true,
      total: jobs.length,
      byStatus,
      byFit,
      bySource,
      lastJobCreated: jobs[0]?.created_at || null,
      hasWorkflowOutputs,
    }
  } catch (err) {
    console.error("Connection error:", err)
    return {
      success: false,
      error: "Unable to connect to database",
      total: 0,
      byStatus: {},
      byFit: {},
      bySource: {},
      hasWorkflowOutputs: false,
    }
  }
}
