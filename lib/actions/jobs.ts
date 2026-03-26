"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Job, JobStatus } from "@/lib/types"

export type JobsResult =
  | { success: true; data: Job[] }
  | { success: false; error: string }

export type AnalyzeJobResult =
  | {
      success: true
      job: Job
      analysis: {
        title: string
        company: string
        location: string | null
        employment_type: string | null
        salary_text: string | null
        responsibilities: string[]
        qualifications_required: string[]
        qualifications_preferred: string[]
        keywords: string[]
        ats_phrases: string[]
        tech_stack: string[]
        seniority_level: string
      }
      duplicate: boolean
      message?: string
    }
  | { success: false; error: string }

export type GenerateDocumentsResult =
  | {
      success: true
      job_id: string
      evidence_map: {
        fit_score: number
        fit_rationale: string
        matched_skills: string[]
        matched_tools: string[]
        matched_experiences: Array<{
          experience_title: string
          company: string
          relevance: string
          key_achievements: string[]
        }>
        gaps: string[]
      }
      generated_resume: string
      generated_cover_letter: string
      quality_check: {
        passed: boolean
        issues: {
          invented_claims: string[]
          vague_bullets: string[]
          ai_filler: string[]
        }
        suggestions: string[]
      }
    }
  | { success: false; error: string }

// Legacy type for backwards compatibility
export type CreateJobResult = AnalyzeJobResult

/**
 * Analyzes a job URL directly using Groq AI.
 * No n8n dependency - all processing happens in-app.
 */
export async function analyzeJobFromUrl(url: string): Promise<AnalyzeJobResult> {
  try {
    const normalizedUrl = url.trim()

    if (!normalizedUrl) {
      return { success: false, error: "Please provide a job URL." }
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(normalizedUrl)
    } catch {
      return { success: false, error: "Please provide a valid URL." }
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { success: false, error: "URL must use http or https protocol." }
    }

    // Call the direct analyze-job API route
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"

    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_url: normalizedUrl }),
    })

    const result = await response.json()

    if (!result.success) {
      return { success: false, error: result.error || "Analysis failed" }
    }

    revalidatePath("/")
    revalidatePath("/jobs")
    if (result.job_id) {
      revalidatePath(`/jobs/${result.job_id}`)
    }

    return {
      success: true,
      job: result.job,
      analysis: result.analysis,
      duplicate: result.duplicate || false,
      message: result.message,
    }
  } catch (err) {
    console.error("Error analyzing job from URL:", err)
    return { success: false, error: "Failed to analyze job URL" }
  }
}

/**
 * Generates tailored resume and cover letter for a job.
 * Uses grounded evidence from profile and evidence library.
 */
export async function generateDocumentsForJob(jobId: string): Promise<GenerateDocumentsResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"

    const response = await fetch(`${baseUrl}/api/generate-documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: jobId }),
    })

    const result = await response.json()

    if (!result.success) {
      return { success: false, error: result.error || "Generation failed" }
    }

    revalidatePath("/")
    revalidatePath("/jobs")
    revalidatePath(`/jobs/${jobId}`)
    revalidatePath("/ready-queue")

    return {
      success: true,
      job_id: result.job_id,
      evidence_map: result.evidence_map,
      generated_resume: result.generated_resume,
      generated_cover_letter: result.generated_cover_letter,
      quality_check: result.quality_check,
    }
  } catch (err) {
    console.error("Error generating documents:", err)
    return { success: false, error: "Failed to generate documents" }
  }
}

/**
 * Analyzes job and immediately generates documents.
 * Combined flow for single-click operation.
 */
export async function analyzeAndGenerateForJob(url: string): Promise<
  | {
      success: true
      job: Job
      analysis: AnalyzeJobResult["success"] extends true ? AnalyzeJobResult["analysis"] : never
      generation: GenerateDocumentsResult["success"] extends true ? Omit<GenerateDocumentsResult, "success"> : null
      duplicate: boolean
    }
  | { success: false; error: string }
> {
  // Step 1: Analyze the job
  const analyzeResult = await analyzeJobFromUrl(url)
  
  if (!analyzeResult.success) {
    return { success: false, error: analyzeResult.error }
  }

  // If duplicate, return early
  if (analyzeResult.duplicate) {
    return {
      success: true,
      job: analyzeResult.job,
      analysis: analyzeResult.analysis,
      generation: null,
      duplicate: true,
    }
  }

  // Step 2: Generate documents
  const generateResult = await generateDocumentsForJob(analyzeResult.job.id)

  if (!generateResult.success) {
    // Still return success since job was analyzed, but note generation failed
    return {
      success: true,
      job: analyzeResult.job,
      analysis: analyzeResult.analysis,
      generation: null,
      duplicate: false,
    }
  }

  // Fetch updated job with generated materials
  const supabase = createAdminClient()
  const { data: updatedJob } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", analyzeResult.job.id)
    .single()

  return {
    success: true,
    job: updatedJob || analyzeResult.job,
    analysis: analyzeResult.analysis,
    generation: {
      job_id: generateResult.job_id,
      evidence_map: generateResult.evidence_map,
      generated_resume: generateResult.generated_resume,
      generated_cover_letter: generateResult.generated_cover_letter,
      quality_check: generateResult.quality_check,
    },
    duplicate: false,
  }
}

// Legacy function - now calls the direct flow
export async function createJobFromUrl(url: string): Promise<CreateJobResult> {
  return analyzeJobFromUrl(url)
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
      const currentStatus = job.status || "submitted"
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

/**
 * Regenerate a specific section of generated content
 */
export async function regenerateSection(
  jobId: string, 
  section: "resume" | "cover_letter",
  feedback: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // Get current job data
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    if (error || !job) {
      return { success: false, error: "Job not found" }
    }

    // Re-generate the full documents but note the feedback
    const result = await generateDocumentsForJob(jobId)
    
    if (!result.success) {
      return { success: false, error: result.error }
    }

    const content = section === "resume" 
      ? result.generated_resume 
      : result.generated_cover_letter

    return { success: true, content }
  } catch (err) {
    console.error("Error regenerating section:", err)
    return { success: false, error: "Failed to regenerate" }
  }
}
