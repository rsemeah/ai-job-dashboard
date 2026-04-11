/**
 * POST /api/coach
 *
 * HireWire AI Coach endpoint with:
 * - Plan enforcement (Pro-gated)
 * - Safety checks
 * - Profile/evidence/job tools
 * - Gap clarification mode
 */

import { NextRequest } from "next/server"
import { streamText, tool } from "ai"
import { z } from "zod"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { checkSafety, logSafetyAudit } from "@/lib/safety"
import { CLAUDE_MODELS } from "@/lib/adapters/anthropic"
import { GAP_CLARIFICATION_SYSTEM_PROMPT } from "@/lib/coach-prompts/gap-questions"

export const maxDuration = 60

// ── Approved source_type values (must match DB constraint) ────────────────
const APPROVED_SOURCE_TYPES = [
  "work_experience",
  "project",
  "portfolio_entry",
  "shipped_product",
  "live_site",
  "achievement",
  "certification",
  "publication",
  "education",
  "skill",
  "other",
] as const

// ── System prompt for general coaching ────────────────────────────────────
const COACH_SYSTEM_PROMPT = `You are HireWire Coach, an AI career assistant specializing in job applications.

CORE CAPABILITIES:
1. Answer questions about job searching, resume writing, interview prep
2. Help users understand their strengths and how to present them
3. Provide actionable advice on improving applications
4. Use the available tools to access the user's profile, evidence, and job details

RESPONSE STYLE:
- Be encouraging but honest
- Keep responses focused and actionable
- Use bullet points for lists
- If you don't have enough info, ask clarifying questions

SAFETY RULES:
- Never generate false credentials or fake experience
- Always be honest about limitations
- Encourage authentic self-presentation`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Coach is available for all users - gap clarification is a core workflow feature
    const adminClient = createAdminClient()

    const body = await req.json()
    const { messages, mode, gapContext } = body

    // Safety check on user's latest message
    const lastUserMessage = messages?.filter((m: { role: string }) => m.role === "user").pop()
    if (lastUserMessage?.content) {
      const safetyResult = await checkSafety(lastUserMessage.content)
      if (!safetyResult.safe) {
        await logSafetyAudit({
          userId: user.id,
          input: lastUserMessage.content,
          flagged: true,
          reason: safetyResult.reason || "Content flagged by safety check",
        })
        return new Response(JSON.stringify({ 
          error: "content_flagged",
          user_message: "I can't help with that request. Please rephrase your question."
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }
    }

    // Build system prompt based on mode
    let systemPrompt = COACH_SYSTEM_PROMPT
    if (mode === "gap_clarification" && gapContext) {
      systemPrompt = GAP_CLARIFICATION_SYSTEM_PROMPT.replace("{{GAP_DESCRIPTION}}", gapContext.description || "")
        .replace("{{GAP_SEVERITY}}", gapContext.severity || "")
        .replace("{{JOB_TITLE}}", gapContext.jobTitle || "")
        .replace("{{COMPANY}}", gapContext.company || "")
    }

    // Define tools for the coach
    const coachTools = {
      getProfile: tool({
        description: "Get the user's profile including education history, experience, and skills. IMPORTANT: Always check education before asking about degree requirements - a Master's satisfies Bachelor's requirements.",
        parameters: z.object({}),
        execute: async () => {
          const { data } = await adminClient
            .from("user_profile")
            .select("*")
            .eq("user_id", user.id)
            .single()
          
          if (data) {
            // Parse education JSONB and surface it clearly for the LLM
            const education = data.education as Array<{
              degree?: string
              field?: string
              school?: string
              institution?: string
              graduation_year?: string
            }> | null
            
            // Create a clear education summary the LLM can understand
            const educationSummary = education?.map(e => 
              `${e.degree || "Degree"} in ${e.field || "Unknown Field"} from ${e.school || e.institution || "Unknown School"}${e.graduation_year ? ` (${e.graduation_year})` : ""}`
            ).join("; ") || "No education on file"
            
            return {
              ...data,
              // Explicitly surface education for gap matching
              education_summary: educationSummary,
              has_bachelors: education?.some(e => {
                const d = (e.degree || "").toLowerCase()
                return d.includes("bachelor") || d.includes("bs") || d.includes("ba") || d.includes("b.s") || d.includes("b.a")
              }) || false,
              has_masters: education?.some(e => {
                const d = (e.degree || "").toLowerCase()
                return d.includes("master") || d.includes("ms") || d.includes("ma") || d.includes("mba") || d.includes("m.s") || d.includes("m.a")
              }) || false,
              has_doctorate: education?.some(e => {
                const d = (e.degree || "").toLowerCase()
                return d.includes("phd") || d.includes("doctorate") || d.includes("ph.d")
              }) || false,
            }
          }
          return { message: "No profile found" }
        },
      }),
      
      getEvidence: tool({
        description: "Get the user's evidence library items (work experience, projects, achievements)",
        parameters: z.object({
          type: z.string().optional().describe("Filter by source_type: work_experience, project, certification, etc."),
        }),
        execute: async ({ type }) => {
          let query = adminClient
            .from("evidence_library")
            .select("*")
            .eq("user_id", user.id)
          
          if (type) {
            query = query.eq("source_type", type)
          }
          
          const { data } = await query.limit(20)
          return data || []
        },
      }),
      
      getJobDetails: tool({
        description: "Get details about a specific job the user is applying to",
        parameters: z.object({
          jobId: z.string().describe("The job ID to look up"),
        }),
        execute: async ({ jobId }) => {
          const { data: job } = await adminClient
            .from("jobs")
            .select("*, job_analyses(*)")
            .eq("id", jobId)
            .eq("user_id", user.id)
            .single()
          return job || { message: "Job not found" }
        },
      }),

      saveEvidence: tool({
        description: "Save a new evidence item to the user's library based on the conversation",
        parameters: z.object({
          source_type: z.enum(APPROVED_SOURCE_TYPES).describe("Type of evidence"),
          source_title: z.string().describe("Title or name of the evidence"),
          role_name: z.string().optional().describe("Role/position if applicable"),
          company_name: z.string().optional().describe("Company name if applicable"),
          responsibilities: z.array(z.string()).optional().describe("Key responsibilities"),
          outcomes: z.array(z.string()).optional().describe("Measurable outcomes/achievements"),
          tools_used: z.array(z.string()).optional().describe("Tools, technologies, or skills used"),
          proof_snippet: z.string().optional().describe("Quote or proof from the conversation"),
        }),
        execute: async (evidenceData) => {
          const { data, error } = await adminClient
            .from("evidence_library")
            .insert({
              user_id: user.id,
              ...evidenceData,
            })
            .select()
            .single()
          
          if (error) {
            return { success: false, error: error.message }
          }
          return { success: true, evidence: data }
        },
      }),
    }

    // Stream the response
    console.log("[v0] Coach API streaming with", messages?.length, "messages")
    const result = streamText({
      model: CLAUDE_MODELS.SONNET,
      system: systemPrompt,
      messages,
      tools: coachTools,
      maxSteps: 5,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("[coach] Error:", error)
    return new Response(JSON.stringify({ 
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
