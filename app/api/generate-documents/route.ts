import { NextRequest, NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Schema for evidence mapping
const EvidenceMapSchema = z.object({
  matched_skills: z.array(z.string()).describe("Skills from profile that match job requirements"),
  matched_tools: z.array(z.string()).describe("Tools/technologies from profile that match"),
  matched_experiences: z.array(z.object({
    experience_title: z.string(),
    company: z.string(),
    relevance: z.string().describe("How this experience relates to the job"),
    key_achievements: z.array(z.string()),
  })).describe("Work experiences that are relevant to this job"),
  matched_projects: z.array(z.object({
    project_name: z.string(),
    relevance: z.string(),
  })).describe("Projects that demonstrate relevant skills"),
  gaps: z.array(z.string()).describe("Required qualifications the candidate may not have"),
  fit_score: z.number().min(0).max(100).describe("Overall fit score 0-100"),
  fit_rationale: z.string().describe("2-3 sentence explanation of the fit score"),
})

// Schema for quality check
const QualityCheckSchema = z.object({
  invented_claims: z.array(z.string()).describe("Any claims that seem fabricated or not supported by the source material"),
  vague_bullets: z.array(z.string()).describe("Bullet points that are too generic or could apply to anyone"),
  ai_filler: z.array(z.string()).describe("Phrases that sound like typical AI-generated filler"),
  repeated_structures: z.array(z.string()).describe("Repetitive sentence patterns"),
  unsupported_claims: z.array(z.string()).describe("Claims that cannot be verified from the evidence"),
  overall_passed: z.boolean().describe("Whether the document passes quality standards"),
  improvement_suggestions: z.array(z.string()).describe("Specific suggestions to improve weak sections"),
})

async function loadUserProfile(supabase: ReturnType<typeof createAdminClient>) {
  const { data: profile, error } = await supabase
    .from("user_profile")
    .select("*")
    .limit(1)
    .maybeSingle()

  if (error || !profile) {
    return null
  }

  return profile
}

async function loadEvidenceLibrary(supabase: ReturnType<typeof createAdminClient>) {
  const { data: evidence, error } = await supabase
    .from("evidence_library")
    .select("*")
    .eq("is_active", true)
    .order("priority_rank", { ascending: false })

  if (error) {
    return []
  }

  return evidence || []
}

async function loadJobAnalysis(supabase: ReturnType<typeof createAdminClient>, jobId: string) {
  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_analyses (*)
    `)
    .eq("id", jobId)
    .single()

  if (error || !job) {
    return null
  }

  return job
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json(
        { success: false, error: "job_id is required" },
        { status: 400 }
      )
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: "GROQ_API_KEY not configured" },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()

    // Load all required data in parallel
    const [profile, evidence, jobData] = await Promise.all([
      loadUserProfile(supabase),
      loadEvidenceLibrary(supabase),
      loadJobAnalysis(supabase, job_id),
    ])

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found. Please complete your profile first." },
        { status: 400 }
      )
    }

    if (!jobData) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      )
    }

    const jobAnalysis = jobData.job_analyses?.[0]

    // Build the evidence context
    const profileContext = `
CANDIDATE PROFILE:
Name: ${profile.full_name || "Not provided"}
Location: ${profile.location || "Not provided"}
Summary: ${profile.summary || "Not provided"}

Skills: ${(profile.skills || []).join(", ")}

Work Experience:
${(profile.experience || []).map((exp: { title: string; company: string; start_date?: string; end_date?: string; description?: string }) => `
- ${exp.title} at ${exp.company} (${exp.start_date || ""} - ${exp.end_date || "Present"})
  ${exp.description || ""}
`).join("\n")}

Education:
${(profile.education || []).map((edu: { degree: string; school: string; year?: string }) => `
- ${edu.degree} from ${edu.school} ${edu.year ? `(${edu.year})` : ""}
`).join("\n")}
`

    const evidenceContext = evidence.length > 0 ? `
VERIFIED EVIDENCE LIBRARY:
${evidence.map((e: {
  source_title: string;
  source_type: string;
  company_name?: string;
  role_name?: string;
  date_range?: string;
  responsibilities?: string[];
  tools_used?: string[];
  outcomes?: string[];
  approved_achievement_bullets?: string[];
}) => `
[${e.source_type}] ${e.source_title}
${e.company_name ? `Company: ${e.company_name}` : ""}
${e.role_name ? `Role: ${e.role_name}` : ""}
${e.date_range ? `Period: ${e.date_range}` : ""}
${e.responsibilities?.length ? `Responsibilities: ${e.responsibilities.join("; ")}` : ""}
${e.tools_used?.length ? `Tools: ${e.tools_used.join(", ")}` : ""}
${e.outcomes?.length ? `Outcomes: ${e.outcomes.join("; ")}` : ""}
${e.approved_achievement_bullets?.length ? `Approved bullets: ${e.approved_achievement_bullets.join("; ")}` : ""}
`).join("\n---\n")}
` : ""

    const jobContext = `
JOB DETAILS:
Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || "Not specified"}
${jobData.salary_range ? `Salary: ${jobData.salary_range}` : ""}

${jobAnalysis?.responsibilities?.length ? `Key Responsibilities:
${jobAnalysis.responsibilities.map((r: string) => `- ${r}`).join("\n")}` : ""}

${jobAnalysis?.qualifications_required?.length ? `Required Qualifications:
${jobAnalysis.qualifications_required.map((q: string) => `- ${q}`).join("\n")}` : ""}

${jobAnalysis?.qualifications_preferred?.length ? `Preferred Qualifications:
${jobAnalysis.qualifications_preferred.map((q: string) => `- ${q}`).join("\n")}` : ""}

${jobAnalysis?.keywords?.length ? `Important Keywords: ${jobAnalysis.keywords.join(", ")}` : ""}
${jobAnalysis?.ats_phrases?.length ? `ATS Phrases to Include: ${jobAnalysis.ats_phrases.join(", ")}` : ""}
`

    // Step 1: Create evidence map
    const { object: evidenceMap } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: EvidenceMapSchema,
      prompt: `Analyze the match between this candidate and job opportunity.

${profileContext}

${evidenceContext}

${jobContext}

Create an evidence map that:
1. Identifies skills and tools from the profile that match job requirements
2. Selects the most relevant work experiences
3. Notes any gaps in qualifications
4. Provides an honest fit score

Be conservative - only include matches that are clearly supported by the evidence. Do not exaggerate or invent connections.`,
    })

    // Step 2: Generate ATS-optimized resume
    const { text: generatedResume } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Generate an ATS-optimized resume tailored for this specific job.

${profileContext}

${evidenceContext}

${jobContext}

MATCHED EVIDENCE:
- Matched Skills: ${evidenceMap.matched_skills.join(", ")}
- Matched Tools: ${evidenceMap.matched_tools.join(", ")}
- Key Gaps to Address: ${evidenceMap.gaps.join(", ")}

STRICT RULES:
1. Use ONLY information from the profile and evidence library - NEVER invent facts
2. Include relevant keywords from the job posting naturally
3. Use plain text format - no tables, columns, icons, or graphics
4. Write strong action verbs to start each bullet
5. Include specific metrics and outcomes ONLY if they exist in the evidence
6. Do NOT include fake percentages, numbers, or achievements
7. Every bullet must be something the candidate could defend in an interview
8. Avoid vague corporate filler like "drove results" or "spearheaded initiatives"
9. Prefer specificity over hype
10. Keep formatting ATS-friendly: clear section headers, simple bullet points

Format the resume as:
[FULL NAME]
[Contact Info]

PROFESSIONAL SUMMARY
[2-3 sentences tailored to this role]

EXPERIENCE
[Company] | [Title] | [Dates]
• [Achievement bullet]
• [Achievement bullet]

SKILLS
[Comma-separated relevant skills]

EDUCATION
[Degree, School, Year]`,
    })

    // Step 3: Generate tailored cover letter
    const { text: generatedCoverLetter } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Write a tailored cover letter for this specific job application.

${profileContext}

${evidenceContext}

${jobContext}

MATCHED EVIDENCE:
- Matched Skills: ${evidenceMap.matched_skills.join(", ")}
- Matched Experiences: ${evidenceMap.matched_experiences.map(e => `${e.experience_title} at ${e.company}: ${e.relevance}`).join("; ")}

STRICT RULES:
1. Sound like a confident professional, not a bot
2. Be concise - 3-4 paragraphs maximum
3. Reference specific aspects of the role and company
4. Connect your actual experience to their needs
5. NEVER include fake admiration or generic enthusiasm
6. NEVER use phrases like "I am excited to apply" or "I would be thrilled"
7. Avoid cheesy language and corporate buzzwords
8. Do not claim experience or skills you don't have
9. Be direct and specific about what you bring
10. End with a clear, confident closing

Structure:
Paragraph 1: Direct opening - who you are and why you're a fit
Paragraph 2-3: Specific evidence of your relevant experience and impact
Paragraph 4: Brief closing with next steps`,
    })

    // Step 4: Quality check
    const { object: qualityCheck } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: QualityCheckSchema,
      prompt: `Review this generated resume and cover letter for quality issues.

SOURCE EVIDENCE:
${profileContext}
${evidenceContext}

GENERATED RESUME:
${generatedResume}

GENERATED COVER LETTER:
${generatedCoverLetter}

Check for:
1. Invented claims not supported by the evidence
2. Vague bullets that could apply to anyone
3. AI-sounding filler phrases
4. Repetitive sentence structures
5. Unsupported or exaggerated claims

Be strict - flag anything that seems fabricated or generic.`,
    })

    // Update the job with generated materials
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        generated_resume: generatedResume,
        generated_cover_letter: generatedCoverLetter,
        fit: evidenceMap.fit_score >= 70 ? "HIGH" : evidenceMap.fit_score >= 40 ? "MEDIUM" : "LOW",
        score: evidenceMap.fit_score,
        score_reasoning: { rationale: evidenceMap.fit_rationale, gaps: evidenceMap.gaps },
        score_strengths: evidenceMap.matched_skills,
        score_gaps: evidenceMap.gaps,
        status: "SCORED",
        scored_at: new Date().toISOString(),
        generation_timestamp: new Date().toISOString(),
        generation_quality_score: qualityCheck.overall_passed ? 100 : 50,
        generation_quality_issues: [
          ...qualityCheck.invented_claims,
          ...qualityCheck.vague_bullets,
          ...qualityCheck.ai_filler,
        ],
      })
      .eq("id", job_id)

    if (updateError) {
      console.error("Error updating job:", updateError)
    }

    // Update job analysis with matched evidence
    if (jobAnalysis) {
      await supabase
        .from("job_analyses")
        .update({
          matched_skills: evidenceMap.matched_skills,
          matched_tools: evidenceMap.matched_tools,
          matched_projects: evidenceMap.matched_projects.map(p => p.project_name),
          known_gaps: evidenceMap.gaps,
          ats_match_score: evidenceMap.fit_score,
        })
        .eq("id", jobAnalysis.id)
    }

    // Save quality check
    await supabase.from("generation_quality_checks").insert({
      job_id,
      document_type: "resume",
      invented_claims_found: qualityCheck.invented_claims,
      vague_bullets_found: qualityCheck.vague_bullets,
      ai_filler_found: qualityCheck.ai_filler,
      repeated_structures_found: qualityCheck.repeated_structures,
      unsupported_claims_found: qualityCheck.unsupported_claims,
      passed: qualityCheck.overall_passed,
      issues_count: qualityCheck.invented_claims.length + qualityCheck.vague_bullets.length + qualityCheck.ai_filler.length,
    })

    return NextResponse.json({
      success: true,
      job_id,
      evidence_map: {
        fit_score: evidenceMap.fit_score,
        fit_rationale: evidenceMap.fit_rationale,
        matched_skills: evidenceMap.matched_skills,
        matched_tools: evidenceMap.matched_tools,
        matched_experiences: evidenceMap.matched_experiences,
        gaps: evidenceMap.gaps,
      },
      generated_resume: generatedResume,
      generated_cover_letter: generatedCoverLetter,
      quality_check: {
        passed: qualityCheck.overall_passed,
        issues: {
          invented_claims: qualityCheck.invented_claims,
          vague_bullets: qualityCheck.vague_bullets,
          ai_filler: qualityCheck.ai_filler,
        },
        suggestions: qualityCheck.improvement_suggestions,
      },
    })
  } catch (error) {
    console.error("Error in generate-documents:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    )
  }
}
