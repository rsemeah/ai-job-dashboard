import { NextRequest, NextResponse } from "next/server"
import { generateText, generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { runJobFlow } from "@/lib/orchestrator/runJobFlow"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Role families Ro targets - used for categorization
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
  title: z.string().describe("Job title as stated"),
  company: z.string().describe("Company name"),
  location: z.string().nullable().describe("Job location or Remote"),
  employment_type: z.string().nullable().describe("Full-time, Part-time, Contract, etc."),
  salary_text: z.string().nullable().describe("Salary range if mentioned"),
  description_summary: z.string().describe("Brief 2-3 sentence summary of the role"),
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
  
  // Fit signals for Ro specifically
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
    
    // Basic HTML to text conversion - strip tags but keep structure
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000) // Limit content size for LLM

    return text
  } finally {
    clearTimeout(timeoutId)
  }
}

function detectSource(url: string): string {
  const lowercase = url.toLowerCase()
  if (lowercase.includes("greenhouse.io")) return "GREENHOUSE"
  if (lowercase.includes("lever.co")) return "LEVER"
  if (lowercase.includes("linkedin.com")) return "LINKEDIN"
  if (lowercase.includes("indeed.com")) return "INDEED"
  if (lowercase.includes("workday.com")) return "WORKDAY"
  if (lowercase.includes("ashbyhq.com")) return "ASHBY"
  if (lowercase.includes("icims.com")) return "ICIMS"
  if (lowercase.includes("smartrecruiters.com")) return "SMARTRECRUITERS"
  return "OTHER"
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

// Calculate initial fit based on fit signals
function calculateInitialFit(fitSignals: z.infer<typeof JobAnalysisSchema>["fit_signals"]): {
  fit: "HIGH" | "MEDIUM" | "LOW"
  score: number
  reasoning: string[]
} {
  let score = 50 // Start at neutral
  const reasoning: string[] = []

  // Positive signals for Ro
  if (fitSignals.has_ai_focus) {
    score += 15
    reasoning.push("AI/ML product focus aligns well")
  }
  if (fitSignals.has_technical_requirements) {
    score += 10
    reasoning.push("Technical fluency requirement matches")
  }
  if (fitSignals.has_workflow_focus) {
    score += 10
    reasoning.push("Workflow/automation focus is a strength")
  }
  if (fitSignals.has_startup_culture) {
    score += 5
    reasoning.push("Startup culture fits founder-style approach")
  }
  if (fitSignals.product_ownership_level === "high") {
    score += 10
    reasoning.push("High product ownership aligns with experience")
  } else if (fitSignals.product_ownership_level === "medium") {
    score += 5
  }

  // Negative signals
  if (fitSignals.has_pure_engineering) {
    score -= 20
    reasoning.push("Pure engineering role - not ideal fit")
  }
  if (fitSignals.has_people_management) {
    score -= 10
    reasoning.push("People management not a primary strength")
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  const fit = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW"

  return { fit, score, reasoning }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_url } = body

    if (!job_url) {
      return NextResponse.json(
        { success: false, error: "job_url is required" },
        { status: 400 }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(job_url)
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      )
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { success: false, error: "URL must use http or https" },
        { status: 400 }
      )
    }

    // Check for GROQ_API_KEY
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: "GROQ_API_KEY not configured" },
        { status: 500 }
      )
    }

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

    // Check for existing job with this URL
    const { data: existingJob } = await supabase
      .from("jobs")
      .select("*")
      .eq("source_url", job_url)
      .eq("user_id", user.id)
      .maybeSingle()

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

    if (pageContent.length < 100) {
      return NextResponse.json(
        { success: false, error: "Job page content too short - may be blocked or invalid" },
        { status: 400 }
      )
    }

    // Analyze with Groq
    const { object: analysis } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: JobAnalysisSchema,
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

    // Calculate initial fit
    const fitResult = calculateInitialFit(analysis.fit_signals)
    
    // Normalize seniority level
    const normalizedSeniority = normalizeSeniority(analysis.seniority_level)

    // Create job record with new fields
    const { data: job, error: insertError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title: analysis.title,
        company: analysis.company,
        source: source,
        source_url: job_url,
        location: analysis.location,
        employment_type: analysis.employment_type,
        salary_range: analysis.salary_text,
        raw_description: pageContent.slice(0, 10000),
        responsibilities: analysis.responsibilities,
        qualifications_required: analysis.qualifications_required,
        qualifications_preferred: analysis.qualifications_preferred,
        ats_keywords: analysis.keywords,
        keywords_extracted: analysis.keywords,
        // New TruthSerum fields
        role_family: analysis.role_family,
        industry_guess: analysis.industry_guess || "Unknown",
        seniority_level: normalizedSeniority,
        // Initial scoring
        fit: fitResult.fit,
        score: fitResult.score,
        score_strengths: fitResult.reasoning.filter(r => !r.includes("not")),
        score_gaps: fitResult.reasoning.filter(r => r.includes("not")),
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting job:", insertError)
      return NextResponse.json(
        { success: false, error: `Failed to save job: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Create detailed analysis record
    await supabase.from("job_analyses").insert({
      user_id: user.id,
      job_id: job.id,
      title: analysis.title,
      company: analysis.company,
      location: analysis.location,
      employment_type: analysis.employment_type,
      salary_text: analysis.salary_text,
      description_raw: pageContent.slice(0, 10000),
      responsibilities: analysis.responsibilities,
      qualifications_required: analysis.qualifications_required,
      qualifications_preferred: analysis.qualifications_preferred,
      keywords: analysis.keywords,
      ats_phrases: analysis.ats_phrases,
      ats_match_score: fitResult.score,
      analysis_model: "llama-3.3-70b-versatile",
      analysis_version: "2.0-truthserum",
    })

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
      analysis: {
        title: analysis.title,
        company: analysis.company,
        location: analysis.location,
        employment_type: analysis.employment_type,
        salary_text: analysis.salary_text,
        responsibilities: analysis.responsibilities,
        qualifications_required: analysis.qualifications_required,
        qualifications_preferred: analysis.qualifications_preferred,
        keywords: analysis.keywords,
        ats_phrases: analysis.ats_phrases,
        tech_stack: analysis.tech_stack,
        seniority_level: normalizedSeniority,
        role_family: analysis.role_family,
        industry_guess: analysis.industry_guess || "Unknown",
        fit_signals: analysis.fit_signals,
      },
      initial_fit: fitResult,
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
