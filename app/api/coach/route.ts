import { NextRequest } from "next/server"
import { streamText, tool } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { checkSafety, logSafetyAudit } from "@/lib/safety"

export const maxDuration = 60

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Enhanced System prompt with safety boundaries
const COACH_SYSTEM_PROMPT = `You are HireWire Coach, a strategic career advisor embedded in the HireWire job application platform.

## Your Capabilities
1. **Career Coaching**: Provide strategic job search advice, interview preparation tips, and career planning guidance
2. **Onboarding Help**: Guide new users through building their evidence library via conversational Q&A
3. **Action Suggestions**: Proactively suggest next steps based on the user's pipeline state
4. **Document Editing**: Help improve resumes and cover letters when asked

## Communication Style
- Be concise but warm and encouraging
- Always ground advice in the user's actual experience and evidence when available
- When suggesting improvements, be specific and actionable
- When helping build evidence, ask follow-up questions to extract STAR details (Situation, Task, Action, Result)
- Format responses with markdown for readability

## Safety Boundaries - STRICTLY FOLLOW

### Professional Scope Limits
- **I am NOT a lawyer, recruiter, or HR authority.** For employment law questions, advise users to consult a qualified professional.
- Do NOT provide specific legal advice about discrimination, wrongful termination, or employment contracts.

### Content I Will NOT Help With
- **Credential fabrication**: I will not help fake degrees, certifications, employment history, or references
- **Resume misrepresentation**: I will not help lie about or significantly exaggerate qualifications
- **Discrimination**: I will not help with discriminatory hiring practices or illegal interview questions
- **Fraud**: I will not help circumvent background checks, drug tests, or screening processes

### Accuracy & Honesty Policy
- If I don't know something, I will admit it rather than speculate
- I will not fabricate achievements, metrics, or company details

You are speaking directly to the job seeker. Help them succeed - ethically and professionally.`

// Create tools with userId bound
function createCoachTools(userId: string) {
  return {
    getUserProfile: tool({
      description: "Get the current user's profile including name, headline, summary, skills, experience, and education",
      parameters: z.object({}),
      execute: async () => {
        const supabase = await createClient()
        const { data } = await supabase
          .from("user_profile")
          .select("*")
          .eq("user_id", userId)
          .single()
        
        if (!data) return { error: "No profile found. User should complete their profile first." }
        return data
      },
    }),

    getEvidenceLibrary: tool({
      description: "Get all evidence records from the user's evidence library - their achievements, projects, and metrics",
      parameters: z.object({
        category: z.string().optional().describe("Filter by category: achievement, project, metric, skill, certification"),
      }),
      execute: async ({ category }) => {
        const supabase = await createClient()
        let query = supabase
          .from("evidence_library")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("priority_rank", { ascending: true })
        
        if (category) {
          query = query.eq("category", category)
        }
        
        const { data } = await query
        return data || []
      },
    }),

    getJobPipeline: tool({
      description: "Get the user's job pipeline - all jobs they're tracking with status and fit scores",
      parameters: z.object({
        status: z.string().optional().describe("Filter by status: ANALYZING, REVIEWING, READY, APPLIED, INTERVIEWING, OFFER, REJECTED, WITHDRAWN"),
      }),
      execute: async ({ status }) => {
        const supabase = await createClient()
        let query = supabase
          .from("jobs")
          .select("id, company_name, job_title, status, fit_score, created_at, applied_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
        
        if (status) {
          query = query.eq("status", status)
        }
        
        const { data } = await query.limit(20)
        return data || []
      },
    }),

    getJobDetails: tool({
      description: "Get detailed information about a specific job including analysis, generated documents, and evidence map",
      parameters: z.object({
        jobId: z.string().describe("The job ID to fetch details for"),
      }),
      execute: async ({ jobId }) => {
        const supabase = await createClient()
        const { data } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .eq("user_id", userId)
          .single()
        
        if (!data) return { error: "Job not found or access denied" }
        return data
      },
    }),

    suggestNextAction: tool({
      description: "Analyze the user's pipeline state and suggest the most impactful next action they should take",
      parameters: z.object({}),
      execute: async () => {
        const supabase = await createClient()
        
        // Get pipeline summary
        const { data: jobs } = await supabase
          .from("jobs")
          .select("status, fit_score")
          .eq("user_id", userId)
        
        const { data: evidence } = await supabase
          .from("evidence_library")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
        
        const { data: profile } = await supabase
          .from("user_profile")
          .select("headline, summary")
          .eq("user_id", userId)
          .single()
        
        const jobsByStatus: Record<string, number> = {}
        jobs?.forEach(j => {
          jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1
        })
        
        const evidenceCount = evidence?.length || 0
        const hasProfile = !!(profile?.headline && profile?.summary)
        
        // Determine priority action
        if (!hasProfile) {
          return {
            action: "complete_profile",
            message: "Complete your profile first - add a headline and summary to help tailor your applications.",
            priority: "high"
          }
        }
        
        if (evidenceCount < 5) {
          return {
            action: "build_evidence",
            message: `You have ${evidenceCount} evidence items. Add more achievements and projects to strengthen your applications.`,
            priority: "high"
          }
        }
        
        if (jobsByStatus["READY"] && jobsByStatus["READY"] > 0) {
          return {
            action: "apply",
            message: `You have ${jobsByStatus["READY"]} jobs ready to apply. Don't let them sit too long!`,
            priority: "medium"
          }
        }
        
        if (jobsByStatus["REVIEWING"] && jobsByStatus["REVIEWING"] > 0) {
          return {
            action: "review",
            message: `You have ${jobsByStatus["REVIEWING"]} jobs awaiting your review. Check the generated materials.`,
            priority: "medium"
          }
        }
        
        return {
          action: "add_jobs",
          message: "Your pipeline is looking good! Add more jobs to analyze by pasting a job posting URL.",
          priority: "low"
        }
      },
    }),

    saveEvidence: tool({
      description: "Save a new evidence record to the user's evidence library. Use this when helping users document their achievements.",
      parameters: z.object({
        title: z.string().describe("Brief title for the evidence"),
        description: z.string().describe("Full description of the achievement, project, or skill"),
        category: z.enum(["achievement", "project", "metric", "skill", "certification"]),
        tags: z.array(z.string()).describe("Relevant tags/keywords"),
        metrics: z.string().optional().describe("Quantifiable results if applicable"),
      }),
      execute: async ({ title, description, category, tags, metrics }) => {
        const supabase = await createClient()
        
        const { data, error } = await supabase
          .from("evidence_library")
          .insert({
            user_id: userId,
            title,
            description,
            category,
            tags,
            metrics,
            is_active: true,
            priority_rank: 0,
          })
          .select()
          .single()
        
        if (error) return { error: "Failed to save evidence" }
        return { success: true, evidence: data }
      },
    }),
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json()

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    // === SAFETY CHECK ===
    const safetyResult = checkSafety(messages, {
      userId: user.id,
      sessionId: conversationId,
      strictMode: false,
    })
    
    // Log safety audit asynchronously
    logSafetyAudit(safetyResult.auditRecord, { supabase }).catch(() => {})
    
    // If blocked, return safe refusal response
    if (!safetyResult.allowed) {
      const refusalResponse = safetyResult.blockedResponse || 
        "I'm here to help with your career journey! Let's focus on job searching, resume writing, interview prep, or career advice."
      
      return new Response(JSON.stringify({ 
        role: "assistant",
        content: refusalResponse 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Create tools with userId bound
    const tools = createCoachTools(user.id)

    // Stream response using Groq
    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: COACH_SYSTEM_PROMPT,
      messages,
      tools,
      maxSteps: 10,
    })

    // Return streaming response
    return result.toDataStreamResponse()
  } catch (error) {
    console.error("[Coach API Error]", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
