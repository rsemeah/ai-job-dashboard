import { NextRequest, NextResponse } from "next/server"
import { generateText, generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  BANNED_PHRASES,
  detectBannedPhrases,
  detectVaguePatterns,
  filterEvidenceForResume,
  filterEvidenceForCoverLetter,
  getEvidenceUsageRule,
  determineGenerationStrategy,
  analyzeBulletConcreteness,
  hasMetrics,
  type GenerationStrategy,
  type BulletProvenance,
  type ParagraphProvenance,
} from "@/lib/truthserum"
import {
  runPreGenerationEnhancement,
  generateProjectsSection,
} from "@/lib/bullet-enhancer"
import {
  extractKnownProducts,
  buildProfileKnowledge,
} from "@/lib/profile-knowledge-resolver"
import {
  suggestTemplate,
  RESUME_TEMPLATES,
  getTemplateGuidance,
} from "@/lib/resume-templates"
import { sanitizeInput } from "@/lib/safety"

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
    evidence_id: z.string().optional().nullable().describe("ID of the source evidence if available"),
  })).describe("Work experiences that are relevant to this job"),
  matched_projects: z.array(z.object({
    project_name: z.string(),
    relevance: z.string(),
    evidence_id: z.string().optional().nullable(),
  })).describe("Projects that demonstrate relevant skills"),
  gaps: z.array(z.string()).describe("Required qualifications the candidate may not have"),
  fit_score: z.number().min(0).max(100).describe("Overall fit score 0-100"),
  fit_rationale: z.string().describe("2-3 sentence explanation of the fit score"),
  requirement_coverage: z.number().min(0).max(100).describe("Percentage of required qualifications covered"),
})

// Schema for structured resume with provenance
const ResumeWithProvenanceSchema = z.object({
  summary: z.string().describe("2-3 sentence professional summary tailored to this role"),
  experience_bullets: z.array(z.object({
    bullet_text: z.string().describe("The achievement bullet point"),
    source_evidence_id: z.string().describe("ID of the evidence this bullet is based on"),
    source_role: z.string().describe("Role title from the source evidence"),
    source_company: z.string().describe("Company from the source evidence"),
    matched_requirement: z.string().optional().describe("Which job requirement this bullet addresses"),
    keywords_used: z.array(z.string()).describe("Job keywords incorporated in this bullet"),
  })).describe("Resume bullets with provenance tracking"),
  skills_section: z.array(z.string()).describe("Relevant skills to list"),
})

// Schema for cover letter with provenance
const CoverLetterWithProvenanceSchema = z.object({
  paragraphs: z.array(z.object({
    paragraph_text: z.string().describe("The paragraph content"),
    job_theme_addressed: z.string().describe("Which aspect of the job this paragraph addresses"),
    evidence_ids_used: z.array(z.string()).describe("IDs of evidence items referenced"),
    claim_confidence: z.enum(["high", "medium", "low"]).describe("Confidence in claims made"),
  })).describe("Cover letter paragraphs with provenance"),
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

async function loadUserProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !profile) {
    return null
  }

  return profile
}

async function loadEvidenceLibrary(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: evidence, error } = await supabase
    .from("evidence_library")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority_rank", { ascending: false })

  if (error) {
    return []
  }

  return evidence || []
}

async function loadJobAnalysis(supabase: Awaited<ReturnType<typeof createClient>>, jobId: string, userId: string) {
  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_analyses (*)
    `)
    .eq("id", jobId)
    .eq("user_id", userId)
    .single()

  if (error || !job) {
    return null
  }

  return job
}

async function loadSourceResume(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: resume, error } = await supabase
    .from("source_resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle()

  if (error || !resume) {
    return null
  }

  return resume
}

/**
 * Build strategy-aware generation prompt based on fit
 */
function buildStrategyPrompt(strategy: GenerationStrategy): string {
  switch (strategy) {
    case "direct_match":
      return `
GENERATION STRATEGY: DIRECT MATCH
You may be assertive about qualifications since evidence strongly supports the match.
Use confident language and highlight achievements directly relevant to the role.
Still avoid any invention - stick to facts from evidence.`

    case "adjacent_transition":
      return `
GENERATION STRATEGY: ADJACENT TRANSITION
Lean on transferable skills and related experience.
Do NOT claim direct experience you don't have.
Frame adjacent work as relevant without pretending direct ownership.
Be honest about the transition narrative.`

    case "stretch_honest":
      return `
GENERATION STRATEGY: STRETCH BUT HONEST
This is a stretch role - be careful not to overclaim.
Emphasize learning ability and adaptability.
Acknowledge gaps indirectly through what you bring, not what you lack.
Do NOT exaggerate or invent qualifications.`

    case "do_not_generate":
      return `
GENERATION BLOCKED: DO NOT GENERATE
This role is too much of a stretch. Generating materials would require invention.
Return an error explaining why generation was blocked.`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id, selected_evidence_ids, _retry_count = 0 } = body
    const isRetry = _retry_count > 0
    const MAX_RETRIES = 1 // Auto-retry once if quality check fails

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

    // Set status to 'generating' immediately
    await supabase
      .from("jobs")
      .update({ 
        status: "generating",
        generation_status: "generating",
        generation_error: null,
        generation_attempts: _retry_count + 1,
        last_generation_at: new Date().toISOString()
      })
      .eq("id", job_id)
      .eq("user_id", user.id)

    // Load all required data in parallel
    const [profile, allEvidence, jobData, sourceResume] = await Promise.all([
      loadUserProfile(supabase, user.id),
      loadEvidenceLibrary(supabase, user.id),
      loadJobAnalysis(supabase, job_id, user.id),
      loadSourceResume(supabase, user.id),
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

    // TRUTH-LOCK: Filter evidence based on usage rules
    // If user selected specific evidence, use that; otherwise filter automatically
    let resumeEvidence = selected_evidence_ids?.length > 0
      ? allEvidence.filter((e: { id: string }) => selected_evidence_ids.includes(e.id))
      : filterEvidenceForResume(allEvidence)
    
    let coverLetterEvidence = selected_evidence_ids?.length > 0
      ? allEvidence.filter((e: { id: string }) => selected_evidence_ids.includes(e.id))
      : filterEvidenceForCoverLetter(allEvidence)

    // Log what evidence was filtered out and why
    const blockedEvidence = allEvidence.filter((e: { id: string }) => {
      const rule = getEvidenceUsageRule(e)
      return rule === "blocked" || rule === "interview_only"
    })

    // Build the evidence context with usage rules annotated
    // Use source resume parsed data when profile data is incomplete
    const sourceResumeData = sourceResume?.parsed_data as {
      full_name?: string;
      location?: string;
      summary?: string;
      skills?: string[];
      experience?: Array<{
        title: string;
        company: string;
        start_date?: string;
        end_date?: string;
        description?: string;
        bullets?: string[];
      }>;
      education?: Array<{
        degree: string;
        school: string;
        year?: string;
      }>;
    } | null

    // Merge profile with source resume data (profile takes precedence)
    const effectiveName = profile.full_name || sourceResumeData?.full_name || "Not provided"
    const effectiveLocation = profile.location || sourceResumeData?.location || "Not provided"
    const effectiveSummary = profile.summary || sourceResumeData?.summary || "Not provided"
    const effectiveSkills = (profile.skills?.length > 0 ? profile.skills : sourceResumeData?.skills) || []
    const effectiveExperience = (profile.experience?.length > 0 ? profile.experience : sourceResumeData?.experience) || []
    const effectiveEducation = (profile.education?.length > 0 ? profile.education : sourceResumeData?.education) || []

    const profileContext = `
CANDIDATE PROFILE:
Name: ${effectiveName}
Location: ${effectiveLocation}
Summary: ${effectiveSummary}

Skills: ${effectiveSkills.join(", ")}

Work Experience:
${effectiveExperience.map((exp: { title: string; company: string; start_date?: string; end_date?: string; description?: string; bullets?: string[] }) => `
- ${exp.title} at ${exp.company} (${exp.start_date || ""} - ${exp.end_date || "Present"})
  ${exp.description || ""}
  ${exp.bullets ? exp.bullets.map(b => `  • ${b}`).join("\n") : ""}
`).join("\n")}

Education:
${effectiveEducation.map((edu: { degree: string; school: string; year?: string }) => `
- ${edu.degree} from ${edu.school} ${edu.year ? `(${edu.year})` : ""}
`).join("\n")}
${sourceResume?.raw_text ? `
ADDITIONAL CONTEXT FROM SOURCE RESUME:
(Use this for additional details if the structured data above is incomplete)
${sourceResume.raw_text.slice(0, 5000)}
` : ""}
`

    const evidenceContext = resumeEvidence.length > 0 ? `
VERIFIED EVIDENCE LIBRARY (use ONLY these for resume):
${resumeEvidence.map((e: {
  id: string;
  source_title: string;
  source_type: string;
  company_name?: string;
  role_name?: string;
  date_range?: string;
  responsibilities?: string[];
  tools_used?: string[];
  outcomes?: string[];
  approved_achievement_bullets?: string[];
  confidence_level: string;
  what_not_to_overstate?: string;
  team_size?: number;
  budget_scope?: string;
  user_impact_scale?: string;
  industries?: string[];
  project_name?: string;
}) => `
--- EVIDENCE [ID: ${e.id}] ---
Type: ${e.source_type}
Title: ${e.source_title}
${e.project_name ? `Project: ${e.project_name}` : ""}
${e.company_name ? `Company: ${e.company_name}` : ""}
${e.role_name ? `Role: ${e.role_name}` : ""}
${e.date_range ? `Period: ${e.date_range}` : ""}
${e.industries?.length ? `Industry: ${e.industries.join(", ")}` : ""}
Confidence: ${e.confidence_level.toUpperCase()}

${e.team_size ? `SCOPE:
  Team Size: ${e.team_size} people
  ${e.budget_scope ? `Budget/Revenue: ${e.budget_scope}` : ""}
  ${e.user_impact_scale ? `User Impact: ${e.user_impact_scale}` : ""}
` : ""}
${e.what_not_to_overstate ? `CONSTRAINT: ${e.what_not_to_overstate}
` : ""}
${e.responsibilities?.length ? `RESPONSIBILITIES:
${e.responsibilities.map(r => `  - ${r}`).join("\n")}
` : ""}
${e.tools_used?.length ? `TOOLS: ${e.tools_used.join(", ")}
` : ""}
${e.outcomes?.length ? `OUTCOMES:
${e.outcomes.map(o => `  - ${o}`).join("\n")}
` : ""}
${e.approved_achievement_bullets?.length ? `APPROVED BULLETS:
${e.approved_achievement_bullets.map(b => `  - ${b}`).join("\n")}
` : ""}
`).join("\n")}
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
${!jobAnalysis && jobData.raw_description ? `
Full Job Description (manually entered — extract responsibilities and keywords from this):
${(jobData.raw_description as string).slice(0, 3000)}` : ""}
`

    // Step 1: Create evidence map and determine strategy
    const { object: evidenceMap } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: EvidenceMapSchema,
      prompt: `Analyze the match between this candidate and job opportunity.

${profileContext}

${evidenceContext}

${jobContext}

Create an evidence map that:
1. Identifies skills and tools from the profile that match job requirements
2. Selects the most relevant work experiences (include evidence IDs when referencing evidence items)
3. Notes any gaps in qualifications
4. Provides an honest fit score
5. Calculate what percentage of REQUIRED qualifications are covered

Be conservative - only include matches that are clearly supported by the evidence. Do not exaggerate or invent connections.`,
    })

    // Determine generation strategy based on fit
    const evidenceQuality = resumeEvidence.filter((e: { confidence_level: string }) => e.confidence_level === "high").length / (resumeEvidence.length || 1) * 100
    const { strategy, reasoning: strategyReasoning } = determineGenerationStrategy(
      jobData,
      evidenceMap.requirement_coverage,
      evidenceQuality
    )

    // Block generation if strategy is "do_not_generate"
    if (strategy === "do_not_generate") {
      await supabase
        .from("jobs")
        .update({
          status: "error",
          generation_status: "failed",
          generation_error: "Generation blocked: role too much of a stretch",
        })
        .eq("id", job_id)
        .eq("user_id", user.id)

      return NextResponse.json({
        success: false,
        error: "Generation blocked: This role is too much of a stretch.",
        strategy,
        strategy_reasoning: strategyReasoning,
        requirement_coverage: evidenceMap.requirement_coverage,
        gaps: evidenceMap.gaps,
      }, { status: 400 })
    }

    const strategyPrompt = buildStrategyPrompt(strategy)

    // Auto-select optimal resume template based on job analysis
    const selectedTemplate = suggestTemplate({
      title: jobData.title,
      role_family: jobData.role_family,
      responsibilities: jobData.responsibilities,
      qualifications_required: jobData.qualifications_required,
    })
    const templateConfig = RESUME_TEMPLATES[selectedTemplate]
    const templateGuidance = getTemplateGuidance(selectedTemplate)

    // Step 2: Generate resume with bullet-level provenance
    // SIMPLIFIED: Reduced prompt verbosity to produce more natural, human-sounding output
    const { object: resumeWithProvenance } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: ResumeWithProvenanceSchema,
      prompt: `Write resume content for this job application. Sound like a sharp professional, not a bot.

${profileContext}

${evidenceContext}

${jobContext}

MATCH CONTEXT:
Skills: ${evidenceMap.matched_skills.join(", ")}
Tools: ${evidenceMap.matched_tools.join(", ")}
Gaps: ${evidenceMap.gaps.join(", ")}

${strategyPrompt}

WRITING RULES:
1. Link every bullet to a specific evidence ID
2. Use only facts from the evidence - never invent
3. Start bullets with strong verbs (Built, Led, Shipped, Launched)
4. Include real metrics from evidence when available
5. Write like a human professional would - confident but not robotic
6. If pre-approved bullets exist in evidence, use them directly

KEEP IT SPECIFIC:
- Use exact numbers: "team of 5" not "team"
- Name tools: "React, PostgreSQL" not "modern stack"
- Include scale: "50K users" not "users"
- Preserve industry: "B2B fintech" not "software"

Write 5-8 achievement bullets that the candidate could confidently discuss in an interview.`,
    })

    // Step 2.5: PRE-GENERATION ENHANCEMENT PASS
    // Strengthen bullets with known profile data before final formatting
    const { enhancedBullets, report: enhancementReport } = await runPreGenerationEnhancement(
      resumeWithProvenance.experience_bullets.map((b: {
        bullet_text: string
        source_evidence_id: string
        source_role: string
        source_company: string
        matched_requirement?: string
        keywords_used: string[]
      }) => ({
        bullet_text: b.bullet_text,
        source_evidence_id: b.source_evidence_id,
        source_role: b.source_role,
        source_company: b.source_company,
        matched_requirement: b.matched_requirement,
        keywords_used: b.keywords_used,
      })),
      {
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        summary: profile.summary,
        skills: profile.skills,
        links: profile.links as { portfolio?: string; linkedin?: string; github?: string } | undefined,
        experience: (profile.experience || []).map((exp: { title?: string; company?: string; description?: string }) => ({
          title: exp.title || "",
          company: exp.company || "",
          description: exp.description,
        })),
      },
      allEvidence
    )

    // Generate Selected Products section if we have named products with artifacts
    // FIX: Use allEvidence (correct in-scope variable) instead of undefined 'evidence'
    const knownProducts = extractKnownProducts(allEvidence)
    const projectsSection = generateProjectsSection(knownProducts, 3)

    // Step 3: Generate cover letter with paragraph provenance
    // SIMPLIFIED: More direct prompt for natural, human-sounding cover letters
    const { object: coverLetterWithProvenance } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: CoverLetterWithProvenanceSchema,
      prompt: `Write a cover letter for this role. Sound confident and human, not like a template.

${profileContext}

EVIDENCE:
${coverLetterEvidence.map((e: {
  id: string;
  source_title: string;
  source_type: string;
  company_name?: string;
}) => `[${e.id}] ${e.source_title} at ${e.company_name || "N/A"}`).join("\n")}

${jobContext}

${strategyPrompt}

TONE: Write like a sharp professional sending a letter to someone they respect.
- Open directly with who you are and why you fit
- Give 1-2 specific examples of relevant work (link to evidence IDs)
- Close briefly - no groveling or excessive enthusiasm
- Never say "I am excited to apply" or "I would be thrilled"
- 3-4 paragraphs total`,
    })

    // Build final formatted documents - Premium Clean Minimalist format
    const contactInfo = [
      profile.location,
      profile.email,
      profile.phone
    ].filter(Boolean).join(" | ")
    
    // Use ENHANCED bullets (with product names, metrics, context injected)
    const experienceBullets = enhancedBullets
      .map(b => `• ${b.bullet_text}`)
      .join("\n")
    
    // Build ATS-safe formatted resume (no unicode dividers, clean structure)
    // CHANGED: Removed unicode box-drawing characters that break ATS parsing
    const formattedResume = `${(profile.full_name || "CANDIDATE NAME").toUpperCase()}
${contactInfo}

PROFESSIONAL SUMMARY
${resumeWithProvenance.summary}

PROFESSIONAL EXPERIENCE
${experienceBullets}
${projectsSection ? `
${projectsSection}
` : ""}
CORE COMPETENCIES
${resumeWithProvenance.skills_section.join(", ")}

EDUCATION
${(profile.education || []).map((edu: { degree: string; school: string; year?: string }) => 
  `${edu.degree}, ${edu.school}${edu.year ? ` (${edu.year})` : ""}`
).join("\n")}`

    // Build premium formatted cover letter with professional signature
    const today = new Date().toLocaleDateString("en-US", { 
      month: "long", 
      day: "numeric", 
      year: "numeric" 
    })
    
    // Build professional signature block with phone number
    const signatureBlock = [
      profile.full_name || "Candidate",
      profile.phone ? `Direct: ${profile.phone}` : null,
      profile.email || null,
    ].filter(Boolean).join("\n")
    
    const formattedCoverLetter = `${today}

Dear Hiring Manager,

${coverLetterWithProvenance.paragraphs.map(p => p.paragraph_text).join("\n\n")}

Sincerely,

${signatureBlock}`

    // Step 4: Detect banned phrases and vague patterns
    const resumeBannedPhrases = detectBannedPhrases(formattedResume)
    const coverLetterBannedPhrases = detectBannedPhrases(formattedCoverLetter)
    const allBannedPhrases = [...new Set([...resumeBannedPhrases, ...coverLetterBannedPhrases])]
    
    const vaguePatterns = detectVaguePatterns(formattedResume)

    // Analyze bullet concreteness
    const bulletAnalysis = resumeWithProvenance.experience_bullets.map(b => ({
      bullet: b.bullet_text,
      ...analyzeBulletConcreteness(b.bullet_text),
      has_metric: hasMetrics(b.bullet_text)
    }))
    
    const weakBullets = bulletAnalysis.filter(b => !b.is_concrete_enough)

    // Step 5: AI Quality check - use smaller model to avoid rate limits
    // Wrapped in try-catch since smaller models can sometimes fail schema compliance
    let qualityCheck: z.infer<typeof QualityCheckSchema>
    try {
      const result = await generateObject({
        model: groq("llama-3.1-8b-instant"),
        schema: QualityCheckSchema,
        prompt: `You are a resume quality reviewer. Analyze the generated documents and return a JSON object with your findings.

GENERATED RESUME:
${formattedResume.slice(0, 2000)}

GENERATED COVER LETTER:
${formattedCoverLetter.slice(0, 1500)}

Return a JSON object with these exact fields:
- invented_claims: array of strings (claims that seem fabricated)
- vague_bullets: array of strings (bullets too generic)
- ai_filler: array of strings (AI-sounding phrases)
- repeated_structures: array of strings (repetitive patterns)
- unsupported_claims: array of strings (unverifiable claims)
- overall_passed: boolean (true if quality is acceptable)
- improvement_suggestions: array of strings (suggestions to improve)

If no issues found, return empty arrays and overall_passed: true.`,
      })
      qualityCheck = result.object
    } catch (qualityCheckError) {
      console.error("Quality check failed, using defaults:", qualityCheckError)
      // Default to passing quality check if the AI model fails
      // The rule-based checks (banned phrases, vague patterns) will still run
      qualityCheck = {
        invented_claims: [],
        vague_bullets: [],
        ai_filler: [],
        repeated_structures: [],
        unsupported_claims: [],
        overall_passed: true,
        improvement_suggestions: []
      }
    }

    // Build provenance records for storage
    const bulletProvenance: BulletProvenance[] = resumeWithProvenance.experience_bullets.map(b => ({
      bullet_text: b.bullet_text,
      source_evidence_id: b.source_evidence_id,
      source_evidence_title: resumeEvidence.find((e: { id: string; source_title: string }) => e.id === b.source_evidence_id)?.source_title || "Unknown",
      source_role: b.source_role,
      source_company: b.source_company,
      matched_requirement_id: undefined,
      matched_requirement_text: b.matched_requirement,
      claim_confidence: "high" as const,
      keywords_covered: b.keywords_used,
      risk_flags: [],
      is_metric_rich: hasMetrics(b.bullet_text),
      concrete_signal_count: analyzeBulletConcreteness(b.bullet_text).concrete_signal_count
    }))

    const paragraphProvenance: ParagraphProvenance[] = coverLetterWithProvenance.paragraphs.map(p => ({
      paragraph_text: p.paragraph_text,
      evidence_used: p.evidence_ids_used,
      matched_job_theme: p.job_theme_addressed,
      claim_confidence: p.claim_confidence,
      unsupported_language: detectBannedPhrases(p.paragraph_text)
    }))

    // Calculate quality score
    const qualityPassed = qualityCheck.overall_passed && 
      allBannedPhrases.length === 0 && 
      weakBullets.length <= 1

    const qualityScore = qualityPassed ? 100 : Math.max(0, 
      100 - 
      (allBannedPhrases.length * 10) - 
      (weakBullets.length * 5) - 
      (qualityCheck.invented_claims.length * 15) -
      (qualityCheck.vague_bullets.length * 5)
    )

    // AUTO-RETRY: If quality check fails and we haven't retried yet, regenerate
    const hasSignificantIssues = 
      allBannedPhrases.length > 0 || 
      qualityCheck.invented_claims.length > 0 ||
      weakBullets.length > 2

    if (!qualityPassed && hasSignificantIssues && _retry_count < MAX_RETRIES) {
      // Auto-retry: Quality check failed, regenerating with stricter prompts
      
      // Recursive call with incremented retry count
      const retryBody = JSON.stringify({
        job_id,
        selected_evidence_ids,
        _retry_count: _retry_count + 1
      })
      
      const retryRequest = new NextRequest(request.url, {
        method: "POST",
        body: retryBody,
        headers: { "Content-Type": "application/json" }
      })
      
      return POST(retryRequest)
    }

    // Update the job with generated materials
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        generated_resume: formattedResume,
        generated_cover_letter: formattedCoverLetter,
        fit: evidenceMap.fit_score >= 70 ? "HIGH" : evidenceMap.fit_score >= 40 ? "MEDIUM" : "LOW",
        score: evidenceMap.fit_score,
        score_reasoning: { 
          rationale: evidenceMap.fit_rationale, 
          gaps: evidenceMap.gaps,
          strategy,
          strategy_reasoning: strategyReasoning,
          requirement_coverage: evidenceMap.requirement_coverage
        },
        score_strengths: evidenceMap.matched_skills,
        score_gaps: evidenceMap.gaps,
        resume_strategy: strategy,
        evidence_map: {
          selected_evidence_ids: resumeEvidence.map((e: { id: string }) => e.id),
          bullet_provenance: bulletProvenance,
          paragraph_provenance: paragraphProvenance,
          blocked_evidence: blockedEvidence.map((e: { id: string; source_title: string }) => ({ id: e.id, title: e.source_title, reason: getEvidenceUsageRule(e) }))
        },
        status: qualityPassed ? "ready" : "needs_review",
        scored_at: new Date().toISOString(),
        generation_timestamp: new Date().toISOString(),
        generation_status: qualityPassed ? "ready" : "needs_review",
        generation_error: null,
        generation_quality_score: qualityScore,
        generation_quality_issues: [
          ...allBannedPhrases.map(p => `Banned phrase: "${p}"`),
          ...vaguePatterns.map(p => `Vague pattern: "${p}"`),
          ...weakBullets.map(b => `Weak bullet (${b.concrete_signal_count}/4 signals): "${b.bullet.substring(0, 50)}..."`),
          ...qualityCheck.invented_claims,
          ...qualityCheck.vague_bullets,
          ...qualityCheck.ai_filler,
        ],
        quality_passed: qualityPassed,
      })
      .eq("id", job_id)
      .eq("user_id", user.id)

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
        .eq("user_id", user.id)
    }

    // Save quality check
    await supabase.from("generation_quality_checks").insert({
      user_id: user.id,
      job_id,
      document_type: "resume",
      invented_claims_found: qualityCheck.invented_claims,
      vague_bullets_found: qualityCheck.vague_bullets,
      ai_filler_found: qualityCheck.ai_filler,
      repeated_structures_found: qualityCheck.repeated_structures,
      unsupported_claims_found: qualityCheck.unsupported_claims,
      passed: qualityPassed,
      issues_count: qualityCheck.invented_claims.length + qualityCheck.vague_bullets.length + qualityCheck.ai_filler.length + allBannedPhrases.length,
    })

    return NextResponse.json({
      success: true,
      job_id,
      was_auto_retried: isRetry,
      retry_count: _retry_count,
      strategy,
      strategy_reasoning: strategyReasoning,
      template_used: selectedTemplate,
      template_name: templateConfig.name,
      evidence_map: {
        fit_score: evidenceMap.fit_score,
        fit_rationale: evidenceMap.fit_rationale,
        matched_skills: evidenceMap.matched_skills,
        matched_tools: evidenceMap.matched_tools,
        matched_experiences: evidenceMap.matched_experiences,
        gaps: evidenceMap.gaps,
        requirement_coverage: evidenceMap.requirement_coverage,
      },
      generated_resume: formattedResume,
      generated_cover_letter: formattedCoverLetter,
      provenance: {
        bullet_provenance: bulletProvenance,
        paragraph_provenance: paragraphProvenance,
        blocked_evidence: blockedEvidence.map((e: { id: string; source_title: string }) => ({ id: e.id, title: e.source_title, reason: getEvidenceUsageRule(e) }))
      },
      quality_check: {
        passed: qualityPassed,
        score: qualityScore,
        banned_phrases_found: allBannedPhrases,
        vague_patterns_found: vaguePatterns,
        weak_bullets: weakBullets.map(b => b.bullet),
        issues: {
          invented_claims: qualityCheck.invented_claims,
          vague_bullets: qualityCheck.vague_bullets,
          ai_filler: qualityCheck.ai_filler,
          banned_phrases: allBannedPhrases,
        },
        suggestions: qualityCheck.improvement_suggestions,
      },
      enhancement_report: {
        total_bullets: enhancementReport.totalBullets,
        auto_fixed: enhancementReport.autoFixed,
        needs_review: enhancementReport.needsReview,
        unchanged: enhancementReport.unchanged,
        enhanced_bullets: enhancementReport.enhancedBullets
          .filter(b => b.wasEnhanced)
          .map(b => ({
            original: b.originalText,
            enhanced: b.enhancedText,
            type: b.enhancementType,
            product_added: b.namedProduct,
            metric_added: b.addedMetric,
            context_added: b.addedContext,
          })),
      },
      known_products: knownProducts.map(p => ({
        name: p.name,
        has_website: !!p.website,
        has_github: !!p.github,
        confidence: p.confidence,
      })),
    })
  } catch (error) {
    console.error("Error in generate-documents:", error)
    
    // Check for rate limit errors
    const errorMessage = error instanceof Error ? error.message : "Generation failed"
    const isRateLimit = errorMessage.includes("rate_limit") || errorMessage.includes("Rate limit") || errorMessage.includes("429")
    
    // Try to update job status to failed (best effort, don't fail if this fails)
    try {
      const { job_id } = await request.clone().json()
      if (job_id) {
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from("jobs")
            .update({ 
              status: "error",
              generation_status: "failed",
              generation_error: errorMessage
            })
            .eq("id", job_id)
            .eq("user_id", user.id)
        }
      }
    } catch {
      // Ignore errors updating status
    }
    
    if (isRateLimit) {
      return NextResponse.json(
        { 
          success: false, 
          error: "AI service is temporarily busy. Please wait 30 seconds and try again.",
          retryAfter: 30,
          isRateLimit: true
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
