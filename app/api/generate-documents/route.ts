import { NextRequest, NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"
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
    evidence_id: z.string().optional().describe("ID of the source evidence if available"),
  })).describe("Work experiences that are relevant to this job"),
  matched_projects: z.array(z.object({
    project_name: z.string(),
    relevance: z.string(),
    evidence_id: z.string().optional(),
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
    const { job_id, selected_evidence_ids } = body

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
    const [profile, allEvidence, jobData] = await Promise.all([
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
═══════════════════════════════════════════════════════════
EVIDENCE [ID: ${e.id}]
═══════════════════════════════════════════════════════════
Type: ${e.source_type}
Title: ${e.source_title}
${e.project_name ? `Project: ${e.project_name}` : ""}
${e.company_name ? `Company: ${e.company_name}` : ""}
${e.role_name ? `Role: ${e.role_name}` : ""}
${e.date_range ? `Period: ${e.date_range}` : ""}
${e.industries?.length ? `Industry: ${e.industries.join(", ")}` : ""}
Confidence: ${e.confidence_level.toUpperCase()}

${e.team_size ? `SCOPE INDICATORS:
  Team Size: ${e.team_size} people
  ${e.budget_scope ? `Budget/Revenue Scope: ${e.budget_scope}` : ""}
  ${e.user_impact_scale ? `User/Customer Impact: ${e.user_impact_scale}` : ""}
` : ""}
${e.what_not_to_overstate ? `⚠️ CONSTRAINT - DO NOT OVERSTATE: ${e.what_not_to_overstate}
` : ""}
${e.responsibilities?.length ? `RESPONSIBILITIES (preserve full scope when writing bullets):
${e.responsibilities.map(r => `  • ${r}`).join("\n")}
` : ""}
${e.tools_used?.length ? `TOOLS & TECHNOLOGIES:
  ${e.tools_used.join(", ")}
` : ""}
${e.outcomes?.length ? `OUTCOMES & ACHIEVEMENTS (use these exact metrics when available):
${e.outcomes.map(o => `  ✓ ${o}`).join("\n")}
` : ""}
${e.approved_achievement_bullets?.length ? `PRE-APPROVED BULLETS (use these verbatim or adapt closely):
${e.approved_achievement_bullets.map(b => `  ★ ${b}`).join("\n")}
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

    // Step 2: Generate resume with bullet-level provenance
    const { object: resumeWithProvenance } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: ResumeWithProvenanceSchema,
      prompt: `Generate resume content with FULL PROVENANCE TRACKING for this job application.

${profileContext}

${evidenceContext}

${jobContext}

MATCHED EVIDENCE:
- Matched Skills: ${evidenceMap.matched_skills.join(", ")}
- Matched Tools: ${evidenceMap.matched_tools.join(", ")}
- Key Gaps to Address: ${evidenceMap.gaps.join(", ")}

${strategyPrompt}

STRICT RULES:
1. For EVERY bullet, you MUST specify which evidence item (by ID) it comes from
2. Use ONLY information from the profile and evidence library - NEVER invent facts
3. Include relevant keywords from the job posting naturally
4. Write strong action verbs to start each bullet
5. Include specific metrics and outcomes ONLY if they exist in the evidence
6. Do NOT include fake percentages, numbers, or achievements
7. Every bullet must be something the candidate could defend in an interview
8. BANNED PHRASES (never use these): ${BANNED_PHRASES.slice(0, 15).join(", ")}
9. Prefer specificity over hype
10. Each bullet should have at least 2 of: action verb, system/artifact, business context, measurable result

DEPTH & SCOPE PRESERVATION:
- If evidence shows team size, include it: "Led team of 5 engineers" not "Led engineering team"
- If evidence shows user/customer scale, include it: "serving 50K users" not "serving users"
- If evidence shows budget/revenue scope, include it: "$2M ARR platform" not "SaaS platform"
- If evidence shows specific tools, name them: "Built with React, Node.js, PostgreSQL" not "Built with modern stack"
- If evidence shows specific outcomes with numbers, use the exact numbers
- If PRE-APPROVED BULLETS exist in evidence, use them verbatim or adapt very closely
- Preserve industry context: "B2B fintech" not just "software company"

ANTI-COMPRESSION RULE:
Do NOT summarize or compress the candidate's scope. If evidence shows they managed a $5M budget, 
led 12 people, shipped 8 products, and impacted 100K users - ALL of that should appear across 
the bullets, not reduced to "managed team and budget."

Generate 5-8 strong achievement bullets with full provenance. More bullets is better if the evidence supports it.`,
    })

    // Step 3: Generate cover letter with paragraph provenance
    const { object: coverLetterWithProvenance } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: CoverLetterWithProvenanceSchema,
      prompt: `Generate a tailored cover letter with PROVENANCE TRACKING for each paragraph.

${profileContext}

EVIDENCE FOR COVER LETTER:
${coverLetterEvidence.map((e: {
  id: string;
  source_title: string;
  source_type: string;
  company_name?: string;
  outcomes?: string[];
}) => `[ID: ${e.id}] ${e.source_type}: ${e.source_title} at ${e.company_name || "N/A"}`).join("\n")}

${jobContext}

MATCHED EVIDENCE:
- Matched Skills: ${evidenceMap.matched_skills.join(", ")}
- Matched Experiences: ${evidenceMap.matched_experiences.map(e => `${e.experience_title} at ${e.company}: ${e.relevance}`).join("; ")}

${strategyPrompt}

STRICT RULES:
1. For EVERY paragraph, list which evidence IDs support the claims
2. Sound like a confident professional, not a bot
3. Be concise - 3-4 paragraphs maximum
4. Reference specific aspects of the role and company
5. Connect your actual experience to their needs
6. NEVER use phrases like "I am excited to apply" or "I would be thrilled"
7. Do not claim experience or skills you don't have
8. Mark claim confidence as "low" if the paragraph stretches evidence

Structure:
- Paragraph 1: Direct opening - who you are and why you're a fit
- Paragraph 2-3: Specific evidence of your relevant experience and impact
- Paragraph 4: Brief closing with next steps`,
    })

    // Build final formatted documents
    const formattedResume = `${profile.full_name || "CANDIDATE NAME"}
${profile.location || "Location"} | ${profile.email || "email@example.com"}

SUMMARY
${resumeWithProvenance.summary}

EXPERIENCE

${resumeWithProvenance.experience_bullets.map(b => 
  `• ${b.bullet_text}`
).join("\n")}

SKILLS
${resumeWithProvenance.skills_section.join(", ")}

EDUCATION
${(profile.education || []).map((edu: { degree: string; school: string; year?: string }) => 
  `${edu.degree} | ${edu.school}${edu.year ? ` | ${edu.year}` : ""}`
).join("\n")}`

    const formattedCoverLetter = coverLetterWithProvenance.paragraphs.map(p => p.paragraph_text).join("\n\n")

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
    const { object: qualityCheck } = await generateObject({
      model: groq("llama-3.1-8b-instant"),
      schema: QualityCheckSchema,
      prompt: `Review this generated resume and cover letter for quality issues.

SOURCE EVIDENCE:
${profileContext}
${evidenceContext}

GENERATED RESUME:
${formattedResume}

GENERATED COVER LETTER:
${formattedCoverLetter}

Check for:
1. Invented claims not supported by the evidence
2. Vague bullets that could apply to anyone
3. AI-sounding filler phrases
4. Repetitive sentence structures
5. Unsupported or exaggerated claims

Be strict - flag anything that seems fabricated or generic.`,
    })

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
        status: "SCORED",
        scored_at: new Date().toISOString(),
        generation_timestamp: new Date().toISOString(),
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
      passed: qualityPassed,
      issues_count: qualityCheck.invented_claims.length + qualityCheck.vague_bullets.length + qualityCheck.ai_filler.length + allBannedPhrases.length,
    })

    return NextResponse.json({
      success: true,
      job_id,
      strategy,
      strategy_reasoning: strategyReasoning,
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
    })
  } catch (error) {
    console.error("Error in generate-documents:", error)
    
    // Check for rate limit errors
    const errorMessage = error instanceof Error ? error.message : "Generation failed"
    const isRateLimit = errorMessage.includes("rate_limit") || errorMessage.includes("Rate limit") || errorMessage.includes("429")
    
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
