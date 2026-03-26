import { NextRequest, NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateObject } from "ai"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Schema for job analysis extraction
const JobAnalysisSchema = z.object({
  title: z.string().describe("Job title"),
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
  industries: z.array(z.string()).describe("Industries or domains relevant to this role"),
  seniority_level: z.string().describe("Entry, Mid, Senior, Lead, Principal, etc."),
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

    const supabase = createAdminClient()
    const source = detectSource(job_url)

    // Check for existing job with this URL
    const { data: existingJob } = await supabase
      .from("jobs")
      .select("id, title, company, status")
      .eq("source_url", job_url)
      .maybeSingle()

    if (existingJob) {
      return NextResponse.json({
        success: true,
        job_id: existingJob.id,
        duplicate: true,
        message: `This job is already in your pipeline: ${existingJob.title} at ${existingJob.company}`,
        job: existingJob,
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

Job posting content:
${pageContent}

Extract the job details following the schema. For arrays, include all relevant items found. For nullable fields, return null if not mentioned.`,
    })

    // Create job record
    const { data: job, error: insertError } = await supabase
      .from("jobs")
      .insert({
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
        status: "NEW",
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
      analysis_model: "llama-3.3-70b-versatile",
      analysis_version: "1.0",
    })

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
        seniority_level: analysis.seniority_level,
      },
      job,
    })
  } catch (error) {
    console.error("Error in analyze-job:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    )
  }
}
