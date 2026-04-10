import { createClient } from "@/lib/supabase/server"

/**
 * Readiness Engine - Single source of truth for job workflow state
 * 
 * This module provides the canonical gates and workflow stage derivation.
 * No page, component, or action may compute readiness locally.
 * All readiness flows from evaluateJobReadiness() for per-job views
 * or getReadyJobIds() for list views.
 */

export type WorkflowStage =
  | "draft"              // Job added, no analysis
  | "job_parsed"         // job_analyses row exists
  | "evidence_mapped"    // evidence_map.matching_complete = true
  | "fit_scored"         // job_scores row exists
  | "materials_generated" // generated_resume and generated_cover_letter exist
  | "quality_passed"     // quality_passed = true (red team approved)
  | "applied"            // applied_at set, applications row exists
  | "archived"           // status = archived

export interface ReadinessResult {
  job_id: string
  stage: WorkflowStage
  stage_index: number
  
  // Artifact presence flags
  has_job_analysis: boolean
  has_evidence_mapping: boolean
  matching_complete: boolean
  has_score: boolean
  has_resume: boolean
  has_cover_letter: boolean
  quality_passed: boolean
  is_applied: boolean
  
  // Derived counts
  evidence_count: number
  requirement_count: number
  gap_count: number
  
  // Gate results - what actions are allowed
  can_match_evidence: boolean
  can_score: boolean
  can_generate: boolean
  can_interview_prep: boolean
  can_apply: boolean
  is_ready: boolean
  
  // Blockers - why gates are false
  reasons_not_ready: string[]
  
  // Next action hint
  next_action: {
    label: string
    href: string
    description: string
  } | null
}

// Workflow stages in order
const STAGES: WorkflowStage[] = [
  "draft",
  "job_parsed",
  "evidence_mapped",
  "fit_scored",
  "materials_generated",
  "quality_passed",
  "applied",
  "archived",
]

const STAGE_LABELS: Record<WorkflowStage, string> = {
  draft: "Draft",
  job_parsed: "Analyzed",
  evidence_mapped: "Evidence Mapped",
  fit_scored: "Scored",
  materials_generated: "Materials Ready",
  quality_passed: "Quality Verified",
  applied: "Applied",
  archived: "Archived",
}

/**
 * Evaluate job readiness from persisted artifacts
 * This is the single source of truth for workflow state
 */
export async function evaluateJobReadiness(
  jobId: string,
  userId: string
): Promise<ReadinessResult | null> {
  const supabase = await createClient()
  
  // Fetch job with all related data
  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_analyses (id, qualifications_required, qualifications_preferred),
      job_scores (id, overall_score)
    `)
    .eq("id", jobId)
    .eq("user_id", userId)
    .single()
  
  if (error || !job) {
    return null
  }
  
  // Fetch evidence count
  const { count: evidenceCount } = await supabase
    .from("evidence_library")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true)
  
  // Extract artifact states
  const analyses = (job.job_analyses as Array<{ id: string; qualifications_required?: string[]; qualifications_preferred?: string[] }>) || []
  const scores = (job.job_scores as Array<{ id: string; overall_score?: number }>) || []
  const evidenceMap = job.evidence_map as Record<string, unknown> | null
  
  const has_job_analysis = analyses.length > 0
  const has_evidence_mapping = evidenceMap !== null && Object.keys(evidenceMap).length > 0
  const matching_complete = has_evidence_mapping && evidenceMap?.matching_complete === true
  const has_score = scores.length > 0 || job.score !== null
  const has_resume = !!job.generated_resume
  const has_cover_letter = !!job.generated_cover_letter
  const quality_passed = job.quality_passed === true
  const is_applied = job.applied_at !== null || job.status === "applied"
  const is_archived = job.status === "archived"
  
  // Derive requirement count from analysis
  const requirementCount = analyses[0]?.qualifications_required?.length || 0
  
  // Calculate gap count (requirements without mapped evidence)
  let gapCount = 0
  if (has_evidence_mapping && evidenceMap) {
    const mappedRequirements = Object.keys(evidenceMap).filter(
      k => !["matching_complete", "completed_at", "bullet_provenance", "paragraph_provenance", "selected_evidence_ids", "blocked_evidence"].includes(k)
    )
    gapCount = Math.max(0, requirementCount - mappedRequirements.length)
  } else {
    gapCount = requirementCount
  }
  
  // Derive workflow stage from artifacts
  let stage: WorkflowStage = "draft"
  if (is_archived) {
    stage = "archived"
  } else if (is_applied) {
    stage = "applied"
  } else if (quality_passed) {
    stage = "quality_passed"
  } else if (has_resume && has_cover_letter) {
    stage = "materials_generated"
  } else if (has_score) {
    stage = "fit_scored"
  } else if (matching_complete) {
    stage = "evidence_mapped"
  } else if (has_job_analysis) {
    stage = "job_parsed"
  }
  
  const stage_index = STAGES.indexOf(stage)
  
  // Calculate gates
  const can_match_evidence = has_job_analysis
  const can_score = has_job_analysis && (evidenceCount || 0) > 0
  const can_generate = (matching_complete || requirementCount === 0) && (evidenceCount || 0) > 0 && has_job_analysis
  const can_interview_prep = has_resume && has_cover_letter
  const can_apply = has_resume && has_cover_letter && quality_passed && !is_applied && !is_archived
  const is_ready = can_apply
  
  // Build reasons list
  const reasons_not_ready: string[] = []
  
  if (!has_job_analysis) {
    reasons_not_ready.push("Job needs to be analyzed first")
  }
  if (!matching_complete && requirementCount > 0) {
    reasons_not_ready.push("Evidence matching not complete")
  }
  if ((evidenceCount || 0) === 0) {
    reasons_not_ready.push("No evidence in your library")
  }
  if (!has_resume) {
    reasons_not_ready.push("Resume not generated")
  }
  if (!has_cover_letter) {
    reasons_not_ready.push("Cover letter not generated")
  }
  if (!quality_passed && has_resume && has_cover_letter) {
    reasons_not_ready.push("Quality review not passed (Red Team)")
  }
  
  // Determine next action
  let next_action: ReadinessResult["next_action"] = null
  
  if (!has_job_analysis) {
    next_action = {
      label: "Analyze Job",
      href: `/jobs/${jobId}`,
      description: "Extract requirements from job posting",
    }
  } else if (!matching_complete && requirementCount > 0) {
    next_action = {
      label: "Match Evidence",
      href: `/jobs/${jobId}/evidence-match`,
      description: "Map your experience to job requirements",
    }
  } else if (!has_score) {
    next_action = {
      label: "Score Fit",
      href: `/jobs/${jobId}/scoring`,
      description: "Calculate your fit score",
    }
  } else if (!has_resume || !has_cover_letter) {
    next_action = {
      label: "Generate Materials",
      href: `/jobs/${jobId}`,
      description: "Create tailored resume and cover letter",
    }
  } else if (!quality_passed) {
    next_action = {
      label: "Red Team Review",
      href: `/jobs/${jobId}/red-team`,
      description: "Review and approve materials",
    }
  } else if (!is_applied) {
    next_action = {
      label: "Apply Now",
      href: `/jobs/${jobId}`,
      description: "Submit your application",
    }
  }
  
  return {
    job_id: jobId,
    stage,
    stage_index,
    has_job_analysis,
    has_evidence_mapping,
    matching_complete,
    has_score,
    has_resume,
    has_cover_letter,
    quality_passed,
    is_applied,
    evidence_count: evidenceCount || 0,
    requirement_count: requirementCount,
    gap_count: gapCount,
    can_match_evidence,
    can_score,
    can_generate,
    can_interview_prep,
    can_apply,
    is_ready,
    reasons_not_ready,
    next_action,
  }
}

/**
 * Get IDs of jobs that are truly ready to apply
 * Used by Ready Queue to avoid showing jobs that aren't actually ready
 */
export async function getReadyJobIds(userId: string): Promise<{
  ready: string[]
  pending_quality: string[]
}> {
  const supabase = await createClient()
  
  // Ready: has materials AND quality_passed = true AND not applied/archived
  const { data: readyJobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("quality_passed", true)
    .not("generated_resume", "is", null)
    .not("generated_cover_letter", "is", null)
    .not("status", "in", "(applied,archived)")
  
  // Pending quality: has materials BUT quality_passed = false
  const { data: pendingJobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", userId)
    .or("quality_passed.is.null,quality_passed.eq.false")
    .not("generated_resume", "is", null)
    .not("generated_cover_letter", "is", null)
    .not("status", "in", "(applied,archived)")
  
  return {
    ready: (readyJobs || []).map(j => j.id),
    pending_quality: (pendingJobs || []).map(j => j.id),
  }
}

/**
 * Export stage labels for UI
 */
export { STAGES as WORKFLOW_STAGES, STAGE_LABELS }
