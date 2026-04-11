import { NextRequest, NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { runJobFlow } from "@/lib/orchestrator/runJobFlow"
import { inferRoleFromJobTitle, getWeightsForRole, calculateWeightedScore, type ScoringWeights } from "@/lib/scoring-weights"
import { 
  normalizeEvidenceRecord, 
  normalizeProfileExperience,
  calculateExplainableFit,
  type CanonicalEvidence,
  type ExplainableFitScore,
  type FitBand,
} from "@/lib/canonical-evidence"
import { CLAUDE_MODELS } from "@/lib/adapters/anthropic"
import { AnalyzeJobInputSchema } from "@/lib/schemas/job-intake"
import { parseJobPage, detectSource } from "@/lib/parsers"
import { findJobByUrl } from "@/lib/queries/jobs"
import type { Job } from "@/lib/types"
import { linkJobToCompany } from "@/lib/company-utils"
import { checkForDuplicate, getDuplicateResponse } from "@/lib/duplicate-detection"

// Role families for categorization - PM-focused but extensible
const ROLE_FAMILIES = [
  "AI Technical Product Manager",
  "Technical Product Manager",
  "AI Product Manager",
  "Product Manager",
  "Senior Product Manager",
  "Systems Product Manager",
  "Workflow Product Manager",
  "Analytics Product Manager",
  "Product Owner",
  "Program Manager",
  "Other",
] as const

// Schema for job analysis extraction - made flexible to handle LLM variations
const JobAnalysisSchema = z.object({
  title: z.string().nullable().describe("Job title as stated, or null if not found"),
  company: z.string().nullable().describe("Company name, or null if not found"),
  location: z.string().nullable().describe("Job location or Remote"),
  employment_type: z.string().nullable().describe("Full-time, Part-time, Contract, etc."),
  salary_text: z.string().nullable().describe("Salary range if mentioned"),
  description_summary: z.string().nullable().describe("Brief 2-3 sentence summary of the role, or null if content not available"),
  responsibilities: z.array(z.string()).describe("List of key responsibilities"),
  qualifications_required: z.array(z.string()).describe("Required qualifications"),
  qualifications_preferred: z.array(z.string()).describe("Preferred/nice-to-have qualifications"),
  keywords: z.array(z.string()).describe("Important keywords for ATS matching"),
  ats_phrases: z.array(z.string()).describe("Exact phrases to include in resume for ATS"),
  tech_stack: z.array(z.string()).describe("Technologies, tools, and frameworks mentioned"),
  
  // New fields for TruthSerum - made nullable/flexible to handle edge cases
  role_family: z.enum(ROLE_FAMILIES).describe("Best matching role family for categorization"),
  industry_guess: z.string().nullable().describe("Primary industry (AI, SaaS, FinTech, EdTech, etc.) or null if unknown"),
  seniority_level: z.string().nullable().describe("Seniority level: Entry, Mid, Senior, Lead, Principal, Director, VP, or C-Level"),
  
  // Fit signals for candidate matching
  fit_signals: z.object({
    has_ai_focus: z.boolean().describe("Does the role involve AI/ML products?"),
    has_technical_requirements: z.boolean().describe("Does it require technical fluency?"),
    has_workflow_focus: z.boolean().describe("Does it involve workflow/automation?"),
    has_startup_culture: z.boolean().describe("Is this a startup or agile environment?"),
    has_pure_engineering: z.boolean().describe("Is this primarily an engineering role?"),
    has_people_management: z.boolean().describe("Does it require managing people?"),
    product_ownership_level: z.enum(["low", "medium", "high"]).describe("How much product ownership?"),
  }).describe("Fit signals for role matching"),
})

async function fetchJobPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch job page: ${response.status}`)
    }

    const html = await response.text()
    
    // Use parser registry for source-specific parsing
    const parsed = parseJobPage(html, url)
    return parsed.text
  } finally {
    clearTimeout(timeoutId)
  }
}

// Normalize seniority level to standard values
function normalizeSeniority(level: string | null): string {
  if (!level) return "Mid"
  const lower = level.toLowerCase()
  if (lower.includes("entry") || lower.includes("junior") || lower.includes("associate")) return "Entry"
  if (lower.includes("senior") || lower.includes("sr.") || lower.includes("sr ")) return "Senior"
  if (lower.includes("lead") || lower.includes("principal") || lower.includes("staff")) return "Lead"
  if (lower.includes("director")) return "Director"
  if (lower.includes("vp") || lower.includes("vice president")) return "VP"
  if (lower.includes("c-level") || lower.includes("chief") || lower.includes("cto") || lower.includes("cpo")) return "C-Level"
  if (lower.includes("mid") || lower.includes("intermediate")) return "Mid"
  return "Mid" // Default to Mid if unclear
}

// Calculate initial fit based on fit signals (user-agnostic baseline scoring)
// This provides a generic signal-based score before evidence matching refines it
function calculateInitialFitFromSignals(fitSignals: z.infer<typeof JobAnalysisSchema>["fit_signals"]): {
  fit: "HIGH" | "MEDIUM" | "LOW"
  score: number
  reasoning: string[]
} {
  // Start at neutral - signals move score up or down
  let score = 50
  const reasoning: string[] = []

  // Role attribute signals (user-agnostic - just describing the role)
  if (fitSignals.has_ai_focus) {
    reasoning.push("Role involves AI/ML products")
  }
  if (fitSignals.has_technical_requirements) {
    reasoning.push("Role requires technical fluency")
  }
  if (fitSignals.has_workflow_focus) {
    reasoning.push("Role focuses on workflow/automation")
  }
  if (fitSignals.has_startup_culture) {
    reasoning.push("Startup/agile environment")
  }
  if (fitSignals.product_ownership_level === "high") {
    reasoning.push("High product ownership expected")
  }
  if (fitSignals.has_pure_engineering) {
    reasoning.push("Primarily an engineering role")
  }
  if (fitSignals.has_people_management) {
    reasoning.push("People management required")
  }

  // Score starts neutral - actual fit is determined by evidence matching
  // The signals above just describe the role for evidence matching
  // Evidence matching will compare these against user's actual experience
  
  // Basic score adjustments based on common role patterns
  // (These are just baseline indicators, not persona-specific)
  const positiveSignals = [
    fitSignals.has_ai_focus,
    fitSignals.has_technical_requirements,
    fitSignals.has_workflow_focus,
    fitSignals.product_ownership_level === "high",
  ].filter(Boolean).length
  
  score += positiveSignals * 5 // Small baseline boost for each positive signal

  // Clamp score
  score = Math.max(30, Math.min(70, score)) // Keep in middle range - evidence matching determines final

  const fit = score >= 60 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW"

  return { fit, score, reasoning }
}

// Calculate role-aware fit score using weighted dimensions
function calculateRoleAwareFit(
  jobTitle: string,
  dimensionScores: {
    experience: number
    evidence: number
    skills: number
    seniority: number
    ats: number
  }
): {
  fit: "HIGH" | "MEDIUM" | "LOW"
  score: number
  weights: ScoringWeights
  inferredRole: string
  reasoning: string[]
} {
  // Infer role category from job title
  const inferredRole = inferRoleFromJobTitle(jobTitle)
  const weights = getWeightsForRole(inferredRole)
  
  // Map short keys to full keys expected by calculateWeightedScore
  const mappedScores = {
    experience_relevance: dimensionScores.experience,
    evidence_quality: dimensionScores.evidence,
    skills_match: dimensionScores.skills,
    seniority_alignment: dimensionScores.seniority,
    ats_keywords: dimensionScores.ats,
  }
  
  // Calculate weighted score
  const score = calculateWeightedScore(mappedScores, weights)
  
  // Generate reasoning based on which dimensions contributed most
  const reasoning: string[] = []
  const sortedDimensions = Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3) // Top 3 weighted dimensions
  
  for (const [dimension, weight] of sortedDimensions) {
    if (weight >= 20) {
      const dimScore = dimensionScores[dimension as keyof typeof dimensionScores]
      if (dimScore >= 70) {
        reasoning.push(`Strong ${dimension} alignment (${weight}% weight, ${dimScore} score)`)
      } else if (dimScore >= 40) {
        reasoning.push(`Moderate ${dimension} fit (${weight}% weight, ${dimScore} score)`)
      } else {
        reasoning.push(`${dimension} gap identified (${weight}% weight, ${dimScore} score)`)
      }
    }
  }
  
  const fit = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW"
  
  return { fit, score, weights, inferredRole, reasoning }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input using schema
    const parseResult = AnalyzeJobInputSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }
    
    const { job_url } = parseResult.data

    // AI service available via AI Gateway

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
    const source = detectSource(job_url)

    // Check for existing job with this URL (using extracted query)
    const { data: existingJob } = await findJobByUrl(supabase, user.id, job_url) as { data: Job | null; error: unknown }

    if (existingJob) {
      // Return full analysis data for duplicates so UI can render properly
      return NextResponse.json({
        success: true,
        job_id: existingJob.id,
        duplicate: true,
        message: `This job is already in your pipeline: ${existingJob.title} at ${existingJob.company}`,
        job: existingJob,
        analysis: {
          title: existingJob.title || "Unknown Title",
          company: existingJob.company || "Unknown Company",
          location: existingJob.location,
          employment_type: existingJob.employment_type,
          salary_text: existingJob.salary_range,
          responsibilities: existingJob.responsibilities || [],
          qualifications_required: existingJob.qualifications_required || [],
          qualifications_preferred: existingJob.qualifications_preferred || [],
          keywords: existingJob.ats_keywords || existingJob.keywords_extracted || [],
          ats_phrases: [],
          tech_stack: [],
          seniority_level: existingJob.seniority_level || "Unknown",
          role_family: existingJob.role_family || "Product Manager",
          industry_guess: existingJob.industry_guess || "Unknown",
        },
      })
    }

    // Fetch the job page
    let pageContent: string
    try {
      pageContent = await fetchJobPage(job_url)
    } catch (fetchError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch job page: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}` },
        { status: 400 }
      )
    }

    // Handle limited content gracefully - allow analysis to proceed with warning
    const isLimitedContent = pageContent.length < 100
    if (isLimitedContent) {
      // For JS-heavy sites (Workday, etc.), add context for the LLM
      pageContent = `[LIMITED CONTENT WARNING]
This job page returned minimal content, likely due to JavaScript rendering requirements.
URL: ${job_url}
Source: ${source}

Available content:
${pageContent}

Instructions: Extract whatever information is available. For any fields that cannot be determined from this limited content, use null or empty arrays as appropriate. The user will be prompted to add missing details manually.`
    }

    // Analyze with Claude
    const analysisResult = await generateText({
      model: CLAUDE_MODELS.SONNET,
      output: Output.object({ schema: JobAnalysisSchema }),
      prompt: `Analyze this job posting and extract structured information.

Be precise and extract only what is explicitly stated. Do not invent or assume information.

Role family options for categorization:
- AI Technical Product Manager (AI products + technical depth)
- Technical Product Manager (technical products, systems, APIs)
- AI Product Manager (AI products, less technical)
- Product Manager (general product roles)
- Senior Product Manager (senior IC roles)
- Systems Product Manager (infrastructure, platform)
- Workflow Product Manager (automation, process)
- Analytics Product Manager (data, analytics products)
- Product Owner (scrum-focused)
- Program Manager (coordination, delivery)
- Other (doesn't fit above)

Job posting content:
${pageContent}

Extract the job details following the schema. Be accurate with the role_family categorization based on the actual role requirements.`,
    })
    const analysis = analysisResult.object!

    // Validate required fields - provide fallbacks if LLM returned nulls
    const validatedAnalysis = {
      ...analysis,
      title: analysis.title || "Unknown Position",
      company: analysis.company || "Unknown Company",
      description_summary: analysis.description_summary || "No description available",
    }

    // Normalize seniority level
    const normalizedSeniority = normalizeSeniority(validatedAnalysis.seniority_level)
    
    // Check for duplicate based on company + role (more thorough than URL-only check)
    const duplicateCheck = await checkForDuplicate(
      supabase,
      user.id,
      validatedAnalysis.company,
      validatedAnalysis.title,
      job_url
    )
    
    if (duplicateCheck.isDuplicate && duplicateCheck.existingJob) {
      const response = getDuplicateResponse(duplicateCheck)
      
      // For exact URL or exact match duplicates, return the existing job
      if (response.shouldBlock || duplicateCheck.duplicateType === "exact_match") {
        return NextResponse.json({
          success: true,
          job_id: duplicateCheck.existingJobId,
          duplicate: true,
          duplicate_type: duplicateCheck.duplicateType,
          message: response.message,
          job: {
            id: duplicateCheck.existingJob.id,
            title: duplicateCheck.existingJob.title,
            company: duplicateCheck.existingJob.company,
            created_at: duplicateCheck.existingJob.created_at,
            status: duplicateCheck.existingJob.status,
            source_url: duplicateCheck.existingJob.source_url,
          },
          analysis: {
            title: validatedAnalysis.title,
            company: validatedAnalysis.company,
            location: validatedAnalysis.location,
            employment_type: validatedAnalysis.employment_type,
            salary_text: validatedAnalysis.salary_text,
            responsibilities: validatedAnalysis.responsibilities,
            qualifications_required: validatedAnalysis.qualifications_required,
            qualifications_preferred: validatedAnalysis.qualifications_preferred,
            keywords: validatedAnalysis.keywords,
            ats_phrases: validatedAnalysis.ats_phrases,
            tech_stack: validatedAnalysis.tech_stack,
            seniority_level: normalizedSeniority,
            role_family: validatedAnalysis.role_family,
            industry_guess: validatedAnalysis.industry_guess,
          },
        })
      }
    }
    
    // Fetch user's evidence library and profile for evidence-based matching
    const [evidenceResult, profileResult] = await Promise.all([
      supabase
        .from("evidence_library")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ])
    
    // Normalize evidence into canonical format
    const canonicalEvidence: CanonicalEvidence[] = []
    
    // Add evidence library items
    if (evidenceResult.data) {
      for (const record of evidenceResult.data) {
        canonicalEvidence.push(normalizeEvidenceRecord(record))
      }
    }
    
    // Add profile experience items
    if (profileResult.data?.experience) {
      const experiences = Array.isArray(profileResult.data.experience) 
        ? profileResult.data.experience 
        : []
      for (const exp of experiences) {
        canonicalEvidence.push(...normalizeProfileExperience(exp, user.id))
      }
    }
    
    // Calculate dimension scores based on actual evidence
    const techStackMatch = validatedAnalysis.tech_stack.filter(tech => 
      canonicalEvidence.some(e => 
        e.skills.some(s => s.toLowerCase().includes(tech.toLowerCase())) ||
        e.text.toLowerCase().includes(tech.toLowerCase())
      )
    )
    
    const keywordMatches = validatedAnalysis.keywords.filter(kw =>
      canonicalEvidence.some(e => e.text.toLowerCase().includes(kw.toLowerCase()))
    )
    
    const dimensionScores = {
      experience: canonicalEvidence.filter(e => e.evidence_type === "work_experience").length > 0 ? 70 : 40,
      evidence: Math.min(100, (canonicalEvidence.filter(e => e.confidence === "high").length / Math.max(canonicalEvidence.length, 1)) * 100),
      skills: techStackMatch.length > 0 ? Math.min(100, (techStackMatch.length / Math.max(validatedAnalysis.tech_stack.length, 1)) * 100) : 40,
      seniority: normalizedSeniority === "Senior" || normalizedSeniority === "Lead" ? 70 : 50,
      ats: keywordMatches.length > 0 ? Math.min(100, (keywordMatches.length / Math.max(validatedAnalysis.keywords.length, 1)) * 100) : 40,
    }
    
    // Get role-aware weights
    const inferredRole = inferRoleFromJobTitle(validatedAnalysis.title)
    const weights = getWeightsForRole(inferredRole)
    
    // Map short keys to full keys expected by calculateWeightedScore
    const mappedDimensionScores = {
      experience_relevance: dimensionScores.experience,
      evidence_quality: dimensionScores.evidence,
      skills_match: dimensionScores.skills,
      seniority_alignment: dimensionScores.seniority,
      ats_keywords: dimensionScores.ats,
    }
    const roleAwareScore = calculateWeightedScore(mappedDimensionScores, weights)
    
    // Calculate explainable fit using canonical evidence
    const explainableFit: ExplainableFitScore = calculateExplainableFit(
      canonicalEvidence,
      validatedAnalysis.qualifications_required,
      validatedAnalysis.qualifications_preferred,
      dimensionScores
    )
    
    // Convert fit band to legacy fit format for backwards compatibility
    const fitBandToLegacy: Record<FitBand, "HIGH" | "MEDIUM" | "LOW"> = {
      "strong_match": "HIGH",
      "moderate_match": "MEDIUM",
      "stretch_but_viable": "MEDIUM",
      "low_match": "LOW",
    }
    
    // Use the explainable score but keep legacy format for compatibility
    const fitResult = {
      fit: fitBandToLegacy[explainableFit.band],
      score: explainableFit.score,
      reasoning: [
        ...explainableFit.strengths.slice(0, 3).map(s => `Strong: ${s.requirement.slice(0, 50)}`),
        ...explainableFit.gaps.filter(g => g.severity === "critical").slice(0, 2).map(g => `Gap: ${g.requirement.slice(0, 50)}`),
      ],
    }
    
    // Store the full explainable fit for the UI
    const roleAwareFit = {
      inferredRole,
      weights,
      fit: fitResult.fit,
      score: fitResult.score,
      reasoning: fitResult.reasoning,
    }

    // Create job record using the CORRECT schema columns
    // jobs table only has: id, user_id, status, role_title, company_name, job_url, job_description, source, created_at
    const { data: job, error: insertError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        role_title: validatedAnalysis.title,
        company_name: validatedAnalysis.company,
        source: source,
        job_url: job_url,
        job_description: pageContent.slice(0, 10000),
        status: "analyzed",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Job insert error:", insertError)
      return NextResponse.json({ success: false, error: "Failed to save job" }, { status: 500 })
    }

    // Link job to company (creates company if needed)
    const companyResult = await linkJobToCompany(
      supabase,
      user.id,
      job.id,
      validatedAnalysis.company,
      { industry: validatedAnalysis.industry_guess || undefined }
    )
    if ("error" in companyResult) {
      console.error("Company link error:", companyResult.error)
      // Non-fatal - continue without company link
    }

    // Insert job analysis data into job_analyses table
    const { error: analysisError } = await supabase
      .from("job_analyses")
      .insert({
        user_id: user.id,
        job_id: job.id,
        title: validatedAnalysis.title,
        company: validatedAnalysis.company,
        location: validatedAnalysis.location,
        employment_type: validatedAnalysis.employment_type,
        salary_text: validatedAnalysis.salary_text,
        description_raw: pageContent.slice(0, 10000),
        responsibilities: validatedAnalysis.responsibilities,
        qualifications_required: validatedAnalysis.qualifications_required,
        qualifications_preferred: validatedAnalysis.qualifications_preferred,
        keywords: validatedAnalysis.keywords,
        ats_phrases: validatedAnalysis.keywords,
        matched_skills: fitResult.reasoning.filter((r: string) => !r.includes("gap")),
        known_gaps: fitResult.reasoning.filter((r: string) => r.includes("gap")),
        analysis_version: "3.0-explainable",
        analysis_model: "llama-3.3-70b-versatile",
      })

    if (analysisError) {
      console.error("Analysis insert error:", analysisError)
    }

    // Insert job scores into job_scores table
    // Convert confidence string to numeric value
    const confidenceMap: Record<string, number> = { "HIGH": 0.9, "MEDIUM": 0.7, "LOW": 0.5 }
    const confidenceScore = confidenceMap[explainableFit.confidence] || 0.7
    
    const { error: scoresError } = await supabase
      .from("job_scores")
      .insert({
        job_id: job.id,
        overall_score: fitResult.score,
        confidence_score: confidenceScore,
        skills_match: dimensionScores.skills,
        experience_relevance: dimensionScores.experience,
        evidence_quality: dimensionScores.evidence,
        seniority_alignment: dimensionScores.seniority,
        ats_keywords: dimensionScores.ats || 0,
        scoring_version: "3.0-explainable",
      })

    if (scoresError) {
      console.error("Scores insert error:", scoresError)
    }

    // Orchestrate the async flow through a single execution path.
    const orchestration = await runJobFlow({
      supabase,
      request,
      userId: user.id,
      jobId: job.id,
      triggerInterviewPrep: false,
    })

    // Fetch the updated job with generated materials
    const { data: updatedJob } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job.id)
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      success: true,
      job_id: job.id,
      duplicate: false,
      limited_content: isLimitedContent,
      limited_content_message: isLimitedContent 
        ? "This job page returned limited content. Some details may need to be added manually." 
        : null,
      analysis: {
        title: validatedAnalysis.title,
        company: validatedAnalysis.company,
        location: validatedAnalysis.location,
        employment_type: validatedAnalysis.employment_type,
        salary_text: validatedAnalysis.salary_text,
        responsibilities: validatedAnalysis.responsibilities,
        qualifications_required: validatedAnalysis.qualifications_required,
        qualifications_preferred: validatedAnalysis.qualifications_preferred,
        keywords: validatedAnalysis.keywords,
        ats_phrases: validatedAnalysis.ats_phrases,
        tech_stack: validatedAnalysis.tech_stack,
        seniority_level: normalizedSeniority,
        role_family: validatedAnalysis.role_family,
        industry_guess: validatedAnalysis.industry_guess || "Unknown",
        fit_signals: validatedAnalysis.fit_signals,
      },
    initial_fit: fitResult,
    // Explainable fit with full transparency
    explainable_fit: {
      band: explainableFit.band,
      score: explainableFit.score,
      confidence: explainableFit.confidence,
      matched_requirements: explainableFit.matched_requirements_count,
      partial_matches: explainableFit.partial_matches_count,
      missing_requirements: explainableFit.missing_requirements_count,
      total_requirements: explainableFit.total_requirements_count,
      score_explanation: explainableFit.score_explanation,
      strengths: explainableFit.strengths,
      gaps: explainableFit.gaps,
      warnings: explainableFit.warnings,
    },
    role_aware_scoring: {
      inferred_role: roleAwareFit.inferredRole,
      weights: roleAwareFit.weights,
      dimension_scores: dimensionScores,
    },
    evidence_summary: {
      total_evidence_items: canonicalEvidence.length,
      high_confidence_items: canonicalEvidence.filter(e => e.confidence === "high").length,
      approved_for_resume: canonicalEvidence.filter(e => e.approved_for_resume).length,
    },
    job: updatedJob || job,
      // Include generation status so UI knows what happened
      generation: {
        attempted: orchestration.generation?.attempted || false,
        success: orchestration.generation?.success || false,
        error: orchestration.generation?.error || null,
        strategy: orchestration.generation?.strategy,
        quality_passed: orchestration.generation?.quality_passed,
      },
      flow: {
        success: orchestration.success,
        steps: orchestration.steps,
      },
    })
  } catch (error) {
    console.error("Error in analyze-job:", error)
    
    // Check for rate limit errors
    const errorMessage = error instanceof Error ? error.message : "Analysis failed"
    const isRateLimit = errorMessage.includes("rate_limit") || errorMessage.includes("Rate limit")
    
    if (isRateLimit) {
      return NextResponse.json(
        { 
          success: false, 
          error: "AI service is temporarily busy. Please wait 30 seconds and try again.",
          retryAfter: 30
        },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
