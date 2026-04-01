import { NextRequest, NextResponse } from "next/server"
import { generateText, generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { groq, isGroqConfigured, MODELS } from "@/lib/adapters/groq"
import type { 
  InterviewPrep,
  InterviewSnapshot,
  BestAngle,
  TellMeAboutYourself,
  WhyThisRole,
  BehavioralStory,
  LikelyQuestions,
  ResumeDefenseItem,
  GapHandlingItem,
  CompanyAlignment,
  QuestionsToAsk,
  ObjectionHandlingItem,
  QuickSheet,
} from "@/lib/interview-prep-types"

// ============================================================================
// ZOD SCHEMAS FOR STRUCTURED GENERATION
// ============================================================================

const InterviewSnapshotSchema = z.object({
  why_role_fits: z.string().describe("2-3 sentence summary of why this role fits the candidate"),
  top_credibility_reasons: z.array(z.string()).max(5).describe("Top 3-5 reasons the candidate is credible for this role"),
  top_risks: z.array(z.string()).max(4).describe("Top 2-4 risks or weak spots to be aware of"),
  lead_story: z.string().describe("The single best story to lead with in interviews"),
})

const BestAngleSchema = z.object({
  angles: z.array(z.object({
    what_you_did: z.string().describe("What the candidate actually did"),
    why_it_matters: z.string().describe("Why this matters for this specific job"),
    proof: z.string().describe("What evidence supports this"),
    requirement_mapped: z.string().describe("Which job requirement this maps to"),
    concise_way_to_say_it: z.string().describe("A single sentence way to say this in an interview"),
    evidence_id: z.string().optional().describe("ID of the source evidence"),
  })).min(5).max(8).describe("Top 5-8 experiences or achievements to talk about"),
})

const TellMeAboutYourselfSchema = z.object({
  short_version: z.string().describe("30-second version, 2-3 sentences"),
  medium_version: z.string().describe("60-second version, 4-5 sentences"),
  long_version: z.string().describe("90-second version, 6-8 sentences"),
  evidence_ids: z.array(z.string()).describe("Evidence IDs used in these answers"),
})

const WhyThisRoleSchema = z.object({
  answer: z.string().describe("The complete answer to 'Why this role?'"),
  what_you_have_done_tie_in: z.string().describe("How past work connects to this role"),
  what_company_needs_tie_in: z.string().describe("How you address what the company needs"),
  evidence_ids: z.array(z.string()).describe("Evidence IDs supporting this answer"),
})

const BehavioralStoriesSchema = z.object({
  stories: z.array(z.object({
    situation: z.string().describe("The situation or context"),
    task: z.string().describe("The task or challenge faced"),
    action: z.string().describe("The specific actions taken"),
    result: z.string().describe("The outcome with metrics if available"),
    themes: z.array(z.string()).describe("Interview themes this covers: leadership, conflict, failure, innovation, teamwork, etc."),
    evidence_id: z.string().optional().describe("Source evidence ID"),
    short_version: z.string().describe("30-second version for quick telling"),
    full_version: z.string().describe("Full 2-minute version with details"),
  })).min(6).max(10).describe("6-10 behavioral stories using real evidence"),
})

const InterviewQuestionSchema = z.object({
  question: z.string(),
  why_asking: z.string().describe("Why the interviewer is asking this"),
  best_evidence: z.string().describe("Best evidence to use in the answer"),
  answer_outline: z.string().describe("Outline of how to answer based on real experience"),
  red_flags: z.array(z.string()).describe("What NOT to say"),
  confidence: z.enum(["high", "medium", "low"]).describe("How confident we are in the answer quality"),
})

const LikelyQuestionsSchema = z.object({
  recruiter: z.array(InterviewQuestionSchema).max(5),
  hiring_manager: z.array(InterviewQuestionSchema).max(6),
  panel: z.array(InterviewQuestionSchema).max(5),
  technical: z.array(InterviewQuestionSchema).max(5),
  executive: z.array(InterviewQuestionSchema).max(4),
})

const ResumeDefenseSchema = z.object({
  items: z.array(z.object({
    claim: z.string().describe("The resume claim being defended"),
    meaning: z.string().describe("What this claim actually means"),
    evidence_support: z.string().describe("The evidence supporting it"),
    how_to_explain: z.string().describe("How to explain if pressed"),
    what_not_to_overstate: z.string().optional().describe("What to avoid claiming"),
  })).describe("Defense notes for major resume claims"),
})

const GapHandlingSchema = z.object({
  gaps: z.array(z.object({
    gap: z.string().describe("The gap or missing qualification"),
    honest_framing: z.string().describe("How to frame this honestly"),
    redirect_to: z.string().describe("Adjacent experience to redirect to"),
    what_to_say: z.string().describe("Recommended response"),
    what_not_to_say: z.string().describe("What to avoid saying"),
  })).describe("How to handle identified gaps"),
})

const CompanyAlignmentSchema = z.object({
  what_they_care_about: z.array(z.string()).describe("What the company seems to care most about"),
  recurring_themes: z.array(z.string()).describe("Themes that keep appearing in the job"),
  language_to_mirror: z.array(z.string()).describe("Language and terms to use naturally"),
  achievements_to_emphasize: z.array(z.string()).describe("Which of your achievements to emphasize"),
})

const QuestionsToAskSchema = z.object({
  role: z.array(z.string()).max(3).describe("Questions about the role itself"),
  team: z.array(z.string()).max(2).describe("Questions about the team"),
  success_metrics: z.array(z.string()).max(2).describe("Questions about success metrics"),
  cross_functional: z.array(z.string()).max(2).describe("Questions about cross-team work"),
  process: z.array(z.string()).max(2).describe("Questions about process and tools"),
  growth: z.array(z.string()).max(2).describe("Questions about growth and learning"),
})

const ObjectionHandlingSchema = z.object({
  objections: z.array(z.object({
    objection: z.string().describe("The likely objection or concern"),
    why_they_think_that: z.string().describe("Why they might have this concern"),
    best_response: z.string().describe("The best honest response"),
    neutralizing_evidence: z.array(z.string()).describe("Evidence that helps neutralize this concern"),
  })).describe("How to handle likely objections"),
})

const QuickSheetSchema = z.object({
  top_5_talking_points: z.array(z.string()).max(5).describe("5 key points to hit in the interview"),
  top_3_stories: z.array(z.string()).max(3).describe("3 stories to definitely tell"),
  top_risks: z.array(z.string()).max(3).describe("Top risks to be aware of"),
  top_questions_to_ask: z.array(z.string()).max(3).describe("Best questions to ask"),
  thirty_second_close: z.string().describe("A 30-second close statement"),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadJobWithAnalysis(supabase: Awaited<ReturnType<typeof createClient>>, jobId: string, userId: string) {
  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_analyses (*)
    `)
    .eq("id", jobId)
    .eq("user_id", userId)
    .single()

  if (error || !job) return null
  return job
}

async function loadUserProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !profile) return null
  return profile
}

async function loadEvidenceLibrary(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: evidence, error } = await supabase
    .from("evidence_library")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority_rank", { ascending: false })

  if (error) return []
  return evidence || []
}

async function loadExistingInterviewPrep(supabase: Awaited<ReturnType<typeof createClient>>, jobId: string, userId: string) {
  const { data, error } = await supabase
    .from("interview_prep")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return null
  return data
}

function buildContextPrompt(profile: Record<string, unknown>, evidence: Record<string, unknown>[], job: Record<string, unknown>, jobAnalysis?: Record<string, unknown>) {
  const profileContext = `
CANDIDATE PROFILE:
Name: ${profile.full_name || "Candidate"}
Summary: ${profile.summary || "Not provided"}
Skills: ${((profile.skills as string[]) || []).join(", ")}

Work Experience:
${((profile.experience as Array<Record<string, unknown>>) || []).map((exp) => `
- ${exp.title} at ${exp.company} (${exp.start_date || ""} - ${exp.end_date || "Present"})
  ${exp.description || ""}
`).join("\n")}
`

  const evidenceContext = `
VERIFIED EVIDENCE LIBRARY (use ONLY this for claims):
${evidence.map((e) => `
[ID: ${e.id}] ${e.source_type}: ${e.source_title}
Company: ${e.company_name || "N/A"}
Role: ${e.role_name || "N/A"}
Period: ${e.date_range || "N/A"}
Confidence: ${(e.confidence_level as string)?.toUpperCase() || "MEDIUM"}
${(e.what_not_to_overstate as string) ? `⚠️ DO NOT OVERSTATE: ${e.what_not_to_overstate}` : ""}
Responsibilities: ${((e.responsibilities as string[]) || []).join("; ")}
Tools: ${((e.tools_used as string[]) || []).join(", ")}
Outcomes: ${((e.outcomes as string[]) || []).join("; ")}
Approved Bullets: ${((e.approved_achievement_bullets as string[]) || []).join("; ")}
`).join("\n---\n")}
`

  const jobContext = `
TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || "Not specified"}
${job.salary_range ? `Salary: ${job.salary_range}` : ""}

${jobAnalysis?.responsibilities ? `Key Responsibilities:
${((jobAnalysis.responsibilities as string[]) || []).map((r: string) => `- ${r}`).join("\n")}` : ""}

${jobAnalysis?.qualifications_required ? `Required Qualifications:
${((jobAnalysis.qualifications_required as string[]) || []).map((q: string) => `- ${q}`).join("\n")}` : ""}

${jobAnalysis?.qualifications_preferred ? `Preferred Qualifications:
${((jobAnalysis.qualifications_preferred as string[]) || []).map((q: string) => `- ${q}`).join("\n")}` : ""}

${jobAnalysis?.keywords ? `Keywords: ${((jobAnalysis.keywords as string[]) || []).join(", ")}` : ""}

CANDIDATE FIT DATA:
Score: ${job.score || "Not scored"}/100
Fit Level: ${job.fit || "Unknown"}
Strengths: ${((job.score_strengths as string[]) || []).join(", ") || "None identified"}
Gaps: ${((job.score_gaps as string[]) || []).join(", ") || "None identified"}
`

  return { profileContext, evidenceContext, jobContext }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { job_id, regenerate_section } = body

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

    // Load all required data
    const [profile, evidence, job, existingPrep] = await Promise.all([
      loadUserProfile(supabase, user.id),
      loadEvidenceLibrary(supabase, user.id),
      loadJobWithAnalysis(supabase, job_id, user.id),
      loadExistingInterviewPrep(supabase, job_id, user.id),
    ])

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 400 }
      )
    }

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      )
    }

    const jobAnalysis = job.job_analyses?.[0]
    const { profileContext, evidenceContext, jobContext } = buildContextPrompt(profile, evidence, job, jobAnalysis)
    
    const basePrompt = `
${profileContext}

${evidenceContext}

${jobContext}

TRUTH RULES:
- Do NOT invent achievements or metrics
- Do NOT inflate scope or impact
- If evidence is weak, acknowledge it
- Every claim must trace back to evidence
- If you cannot find evidence for something, say so
`

    // Generate all sections (or just the requested section for regeneration)
    const generateSection = async <T>(
      schema: z.ZodType<T>,
      sectionPrompt: string,
      sectionName: string
    ): Promise<T> => {
      const { object } = await generateObject({
        model: groq(MODELS.VERSATILE),
        schema,
        prompt: `${basePrompt}\n\n${sectionPrompt}`,
      })
      return object as T
    }

    // If regenerating a specific section, only regenerate that one
    if (regenerate_section && existingPrep) {
      // Handle section-specific regeneration (future enhancement)
      // For now, regenerate everything
    }

    // Generate all sections
    const [
      snapshot,
      anglesResult,
      tellMeResult,
      whyRoleResult,
      storiesResult,
      questionsResult,
      defenseResult,
      gapsResult,
      alignmentResult,
      questionsToAskResult,
      objectionsResult,
      quickSheetResult,
    ] = await Promise.all([
      generateSection(InterviewSnapshotSchema, `
Generate an interview snapshot for this candidate and job. Focus on:
1. Why this role is a good fit based on evidence
2. The candidate's top credibility reasons (what makes them believable)
3. Top risks or gaps they should be aware of
4. The single best story to lead with
`, "interview_snapshot"),

      generateSection(BestAngleSchema, `
Generate the 5-8 best angles for this candidate to discuss in interviews.
For each angle:
- What they actually did (from evidence)
- Why it matters for THIS specific job
- What proof supports it
- Which job requirement it maps to
- A concise way to say it in 1 sentence
Include evidence IDs where available.
`, "best_angles"),

      generateSection(TellMeAboutYourselfSchema, `
Generate three versions of "Tell me about yourself" for this candidate:
1. Short (30 seconds, 2-3 sentences)
2. Medium (60 seconds, 4-5 sentences)
3. Long (90 seconds, 6-8 sentences)

Rules:
- Sound natural and confident, not robotic
- Tailor to THIS role
- Base on actual work done
- No cheesy filler or invented passion
`, "tell_me_about_yourself"),

      generateSection(WhyThisRoleSchema, `
Generate an answer to "Why this role?" that:
1. Ties back to what the candidate has actually done
2. Ties to what the company needs based on the job posting
3. Avoids cheesy filler ("I'm passionate about...")
4. Sounds authentic and specific
`, "why_this_role"),

      generateSection(BehavioralStoriesSchema, `
Generate 6-10 behavioral stories using STAR format based on real evidence.
For each story:
- Situation: The context
- Task: The challenge faced
- Action: Specific actions taken (use "I" not "we" unless collaborative)
- Result: Outcome with metrics if available
- Themes: Which interview themes it covers (leadership, conflict, failure, innovation, teamwork, communication, etc.)
- Short version for quick telling (30 seconds)
- Full version with details (2 minutes)

CRITICAL: Only use information from the evidence. Do not invent stories.
`, "behavioral_stories"),

      generateSection(LikelyQuestionsSchema, `
Generate likely interview questions for each interview type:
- Recruiter screen (5 questions): Focus on background, fit, logistics
- Hiring manager (6 questions): Focus on role-specific skills and experience
- Panel (5 questions): Focus on cross-functional and collaboration
- Technical (5 questions): Focus on domain depth and problem-solving
- Executive (4 questions): Focus on vision, strategy, and culture fit

For each question include:
- Why they're asking (what they want to learn)
- Best evidence to use in the answer
- Answer outline based on real experience
- Red flags to avoid
- Confidence level (high/medium/low based on evidence strength)
`, "likely_questions"),

      generateSection(ResumeDefenseSchema, `
For each major claim in the candidate's profile and evidence, create a defense note:
- What the claim means
- What evidence supports it
- How to explain it if pressed
- What NOT to overstate

Focus on the claims that are most likely to be questioned.
`, "resume_defense"),

      generateSection(GapHandlingSchema, `
Identify the biggest gaps for this role based on the job requirements vs candidate evidence.
For each gap:
- The gap or missing qualification
- Honest framing (don't hide it, own it)
- Adjacent experience to redirect to
- What to say if asked directly
- What NOT to say
`, "gap_handling"),

      generateSection(CompanyAlignmentSchema, `
Based on the job posting, identify:
1. What the company seems to care about most (values, priorities)
2. Recurring themes in the job description
3. Language and terms the candidate should mirror naturally
4. Which of the candidate's achievements should be emphasized most
`, "company_alignment"),

      generateSection(QuestionsToAskSchema, `
Generate 8-12 smart questions the candidate can ask the interviewer.
Group by:
- Role (about the job itself)
- Team (about team structure and dynamics)
- Success metrics (how success is measured)
- Cross-functional (how the role works with other teams)
- Process (tools, methodologies, ways of working)
- Growth (learning, development, career path)

Rules:
- Sound sharp and informed, not generic
- Reflect product and business awareness
- Don't ask things easily found on the website
`, "questions_to_ask"),

      generateSection(ObjectionHandlingSchema, `
Generate likely objections or concerns an interviewer may have about this candidate.
For each objection:
- What the objection is
- Why they might think that (root cause)
- Best honest response
- Evidence that helps neutralize the concern

Focus on the gaps and risks identified earlier.
`, "objection_handling"),

      generateSection(QuickSheetSchema, `
Create a compact interview cheat sheet for day-of use:
- Top 5 talking points (key messages to get across)
- Top 3 stories to definitely tell
- Top risks to be mindful of
- Top 3 questions to ask them
- A 30-second close statement

This should fit on one page and be scannable in under 1 minute.
`, "quick_sheet"),
    ])

    // Build the full interview prep object
    const interviewPrep: Partial<InterviewPrep> = {
      job_id,
      generation_model: "llama-3.3-70b-versatile",
      generation_version: "1.0",
      fit_level: job.fit || "UNKNOWN",
      strategy: job.resume_strategy || "unknown",
      evidence_coverage_percent: Math.round(((job.score || 50) / 100) * 100),
      
      interview_snapshot: snapshot as InterviewSnapshot,
      best_angles: (anglesResult.angles as BestAngle[]).map((a, i) => ({ ...a, id: `angle-${i}` })),
      tell_me_about_yourself: tellMeResult as TellMeAboutYourself,
      why_this_role: whyRoleResult as WhyThisRole,
      behavioral_stories: (storiesResult.stories as BehavioralStory[]).map((s, i) => ({ ...s, id: `story-${i}` })),
      likely_questions: questionsResult as LikelyQuestions,
      resume_defense: (defenseResult.items as ResumeDefenseItem[]).map((d, i) => ({ ...d, id: `defense-${i}` })),
      gap_handling: (gapsResult.gaps as GapHandlingItem[]).map((g, i) => ({ ...g, id: `gap-${i}` })),
      company_alignment: alignmentResult as CompanyAlignment,
      questions_to_ask: questionsToAskResult as QuestionsToAsk,
      objection_handling: (objectionsResult.objections as ObjectionHandlingItem[]).map((o, i) => ({ ...o, id: `objection-${i}` })),
      quick_sheet: quickSheetResult as QuickSheet,
    }

    // Upsert to database
    if (existingPrep) {
      await supabase
        .from("interview_prep")
        .update({
          ...interviewPrep,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPrep.id)
        .eq("user_id", user.id)
    } else {
      await supabase
        .from("interview_prep")
        .insert({
          user_id: user.id,
          ...interviewPrep,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
    }

    // Fetch the saved record
    const { data: savedPrep } = await supabase
      .from("interview_prep")
      .select("*")
      .eq("job_id", job_id)
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      success: true,
      interview_prep: savedPrep,
      generation_time_ms: Date.now() - startTime,
    })

  } catch (error) {
    console.error("[v0] Interview prep generation error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate interview prep",
        generation_time_ms: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
