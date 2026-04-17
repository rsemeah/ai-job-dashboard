"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import type { Job, JobStatus } from "@/lib/types"
import { normalizeJobStatus } from "@/lib/job-lifecycle"
import { analyzeJobCore } from "@/lib/analyze/analyze-job-core"

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
 * Analyzes a job URL directly in the current server context.
 * Does NOT call /api/analyze via fetch — executes the core logic inline.
 * user_id is derived from supabase.auth.getUser() only, never from input.
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

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    // Build a RequestLike from next/headers so runJobFlow can forward cookies
    // and resolve the base URL without a real NextRequest object.
    const requestHeaders = await headers()
    const requestLike = {
      headers: {
        get: (name: string) => requestHeaders.get(name),
      },
    }

    const result = await analyzeJobCore(normalizedUrl, supabase, user, requestLike)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath("/")
    revalidatePath("/jobs")
    revalidatePath(`/jobs/${result.job_id}`)

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
 * 
 * NOTE: The /api/analyze endpoint now handles generation internally,
 * so this function just needs to call analyze and return the results.
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
  try {
    const normalizedUrl = url.trim()

    if (!normalizedUrl) {
      return { success: false, error: "Please provide a job URL." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    const requestHeaders = await headers()
    const requestLike = {
      headers: {
        get: (name: string) => requestHeaders.get(name),
      },
    }

    const result = await analyzeJobCore(normalizedUrl, supabase, user, requestLike)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    revalidatePath("/")
    revalidatePath("/jobs")
    revalidatePath("/ready-queue")
    revalidatePath(`/jobs/${result.job_id}`)

    if (result.duplicate) {
      return {
        success: true,
        job: result.job,
        analysis: result.analysis,
        generation: null,
        duplicate: true,
      }
    }

    const generation = result.generation?.success && result.job?.generated_resume
      ? {
          job_id: result.job_id,
          evidence_map: {
            fit_score: (result.job as Record<string, unknown>)?.score as number || 0,
            matched_skills: [],
            matched_tools: result.analysis?.tech_stack || [],
            gaps: [],
          },
          generated_resume: result.job.generated_resume as string,
          generated_cover_letter: (result.job.generated_cover_letter as string) || "",
          quality_check: {
            passed: (result.job as Record<string, unknown>)?.quality_passed as boolean || false,
            issues: { invented_claims: [], vague_bullets: [], ai_filler: [] },
            suggestions: [],
          },
        }
      : null

    return {
      success: true,
      job: result.job,
      analysis: result.analysis,
      generation,
      duplicate: false,
    }
  } catch (err) {
    console.error("Error in analyzeAndGenerateForJob:", err)
    return { success: false, error: "Failed to analyze and generate" }
  }
}

// Legacy function - now calls the direct flow
export async function createJobFromUrl(url: string): Promise<CreateJobResult> {
  return analyzeJobFromUrl(url)
}

/**
 * Transform normalized job data to the UI-expected format.
 * Maps: role_title -> title, company_name -> company, job_scores -> score/fit
 */
function transformJobForUI(job: Record<string, unknown>): Record<string, unknown> {
  const scores = (job.job_scores as Array<{ overall_score?: number; confidence_score?: number }>) || []
  const score = scores[0]?.overall_score ?? null
  
  // Derive fit from score
  let fit: string | null = null
  if (score !== null) {
    if (score >= 75) fit = "HIGH"
    else if (score >= 50) fit = "MEDIUM"
    else fit = "LOW"
  }
  
  return {
    ...job,
    // Map normalized columns to legacy names for UI compatibility
    title: job.role_title || job.title,
    company: job.company_name || job.company,
    score,
    fit,
    // Keep original columns too for components that use them
    role_title: job.role_title,
    company_name: job.company_name,
  }
}

export async function getJobs(): Promise<JobsResult> {
  try {
    // Use authenticated client - RLS will filter by user_id
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: "Not authenticated" }
    }

    // Fetch jobs with their scores from job_scores table
    // Filter out soft-deleted jobs (deleted_at IS NULL)
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        job_scores (
          overall_score,
          confidence_score
        )
      `)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching jobs:", error)
      return { success: false, error: error.message }
    }

    // Transform data for UI compatibility
    const transformedData = (data || []).map(transformJobForUI)
    return { success: true, data: transformedData }
  } catch (err) {
    console.error("Connection error:", err)
    return { success: false, error: "Unable to connect to database" }
  }
}

export async function getJobById(id: string): Promise<Job | null> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return null
  }

  // Fetch job with all related data for UI compatibility
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_scores (
        overall_score,
        confidence_score,
        skills_match,
        experience_relevance,
        evidence_quality,
        seniority_alignment,
        ats_keywords
      ),
      job_analyses (
        title,
        company,
        location,
        salary_text,
        employment_type,
        responsibilities,
        qualifications_required,
        qualifications_preferred,
        keywords,
        ats_phrases,
        matched_skills,
        matched_tools,
        matched_industries,
        matched_projects,
        matched_achievements,
        known_gaps,
        matched_keywords,
        missing_keywords,
        ats_match_score
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single()

  if (error) {
    return null
  }

  // Transform to UI-expected format
  const scores = (data.job_scores as Array<Record<string, unknown>>) || []
  const analyses = (data.job_analyses as Array<Record<string, unknown>>) || []
  const score = scores[0]?.overall_score as number | null ?? null
  const analysis = analyses[0] || {}

  // Derive fit from score
  let fit: string | null = null
  if (score !== null) {
    if (score >= 75) fit = "HIGH"
    else if (score >= 50) fit = "MEDIUM"
    else fit = "LOW"
  }

  return {
    ...data,
    // Map normalized columns to legacy names for UI compatibility
    title: data.role_title || analysis.title || data.title,
    company: data.company_name || analysis.company || data.company,
    score,
    fit,
    // Score details
    score_strengths: [],
    score_gaps: analysis.known_gaps || [],
    // Canonical document content — jobs columns are the source of truth
    generated_resume: (data.generated_resume as string | null) || null,
    generated_cover_letter: (data.generated_cover_letter as string | null) || null,
    // Analysis data (flatten for backwards compatibility)
    location: analysis.location || data.location,
    salary_range: analysis.salary_text || data.salary_range,
    employment_type: analysis.employment_type || data.employment_type,
    responsibilities: analysis.responsibilities || [],
    qualifications_required: analysis.qualifications_required || [],
    qualifications_preferred: analysis.qualifications_preferred || [],
    ats_keywords: analysis.ats_phrases || analysis.keywords || [],
    // Keep original for components that use them
    role_title: data.role_title,
    company_name: data.company_name,
    job_scores: scores,
    job_analyses: analyses,
  } as Job
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  const canonicalStatus = normalizeJobStatus(status)

  const { error } = await supabase
    .from("jobs")
    .update({ status: canonicalStatus })
    .eq("id", id)
    .eq("user_id", user.id) // Ensure user can only update their own jobs

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
  // Pipeline stats
  total_jobs: number
  analyzed_jobs: number
  jobs_with_materials: number
  quality_passed_count: number
  applied_count: number
  avg_score: number | null
}

export async function getJobStats(): Promise<StatsResult> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
    return {
      success: false,
      error: "Not authenticated",
      total: 0,
      byStatus: {},
      byFit: {},
      bySource: {},
      hasWorkflowOutputs: false,
      total_jobs: 0,
      analyzed_jobs: 0,
      jobs_with_materials: 0,
      quality_passed_count: 0,
      applied_count: 0,
      avg_score: null,
    }
    }

    // Query jobs with their scores from job_scores table
    // Filter out soft-deleted jobs
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        status,
        source,
        created_at,
        generated_resume,
        quality_passed,
        job_scores (
          overall_score,
          confidence_score
        ),
        job_analyses (
          id
        )
      `)
      .eq("user_id", user.id)
      .is("deleted_at", null)
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
        total_jobs: 0,
        analyzed_jobs: 0,
        jobs_with_materials: 0,
        quality_passed_count: 0,
        applied_count: 0,
        avg_score: null,
      }
    }

    const jobs = data || []

    const byStatus = jobs.reduce((acc, job) => {
      const currentStatus = normalizeJobStatus(job.status)
      acc[currentStatus] = (acc[currentStatus] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Derive fit from job_scores
    const byFit = jobs.reduce((acc, job) => {
      const scores = job.job_scores?.[0]
      const score = scores?.overall_score
      let fit = "UNSCORED"
      if (score !== null && score !== undefined) {
        if (score >= 75) fit = "HIGH"
        else if (score >= 50) fit = "MEDIUM"
        else fit = "LOW"
      }
      acc[fit] = (acc[fit] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySource = jobs.reduce((acc, job) => {
      const currentSource = job.source || "UNKNOWN"
      acc[currentSource] = (acc[currentSource] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const hasWorkflowOutputs = jobs.some((job) => {
      const scores = job.job_scores as Array<{ overall_score?: number }> | undefined
      return scores?.[0]?.overall_score !== null && scores?.[0]?.overall_score !== undefined
    })

    // Calculate pipeline stats
    const total_jobs = jobs.length
    const analyzed_jobs = jobs.filter(j => {
      const analyses = j.job_analyses as Array<{ id: string }> | null
      return Array.isArray(analyses) && analyses.length > 0
    }).length
    const jobs_with_materials = jobs.filter(j => j.generated_resume != null).length
    const quality_passed_count = jobs.filter(j => j.quality_passed === true).length
    const applied_count = jobs.filter(j => {
      const status = normalizeJobStatus(j.status)
      return ["applied", "interviewing", "offered"].includes(status)
    }).length
    
    // Calculate average score
    const scoredJobs = jobs.filter(j => {
      const scores = j.job_scores as Array<{ overall_score?: number }> | null
      return scores?.[0]?.overall_score != null
    })
    const avg_score = scoredJobs.length > 0
      ? Math.round(scoredJobs.reduce((sum, j) => {
          const scores = j.job_scores as Array<{ overall_score?: number }>
          return sum + (scores[0]?.overall_score || 0)
        }, 0) / scoredJobs.length)
      : null

    return {
      success: true,
      total: jobs.length,
      byStatus,
      byFit,
      bySource,
      lastJobCreated: jobs[0]?.created_at || null,
      hasWorkflowOutputs,
      // Pipeline stats
      total_jobs,
      analyzed_jobs,
      jobs_with_materials,
      quality_passed_count,
      applied_count,
      avg_score,
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
      total_jobs: 0,
      analyzed_jobs: 0,
      jobs_with_materials: 0,
      quality_passed_count: 0,
      applied_count: 0,
      avg_score: null,
    }
  }
}

/**
 * Soft delete a job by setting deleted_at timestamp.
 * This preserves the job data but removes it from normal views.
 */
export async function deleteJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from("jobs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id) // Ensure user can only delete their own jobs

  if (error) {
    console.error("Error deleting job:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/jobs")
  revalidatePath(`/jobs/${id}`)
  revalidatePath("/")
  revalidatePath("/companies")
  revalidatePath("/applications")

  return { success: true }
}

/**
 * Restore a soft-deleted job by clearing deleted_at.
 */
export async function restoreJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  // Clear deleted_at to restore
  const { error } = await supabase
    .from("jobs")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error restoring job:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/jobs")
  revalidatePath(`/jobs/${id}`)
  revalidatePath("/")
  revalidatePath("/companies")

  return { success: true }
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
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: "Not authenticated" }
    }
    
    // Get current job data - ensure user owns the job
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
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
