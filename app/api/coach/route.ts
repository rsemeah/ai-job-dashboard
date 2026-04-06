/**
 * POST /api/coach
 *
 * Minimal HireWire AI Coach endpoint — Phase 1 plumbing.
 *
 * Scope for this pass:
 *   - Groq streaming confirmed working
 *   - Read evidence and profile for context
 *   - saveEvidence maps through an approved source_type enum before any DB write
 *   - No advanced memory system
 *   - No gaps workflow (deferred)
 *
 * saveEvidence mapping rule:
 *   The AI returns a human-readable category label.
 *   An internal mapping layer converts it to an approved source_type before insert.
 *   Free-text category values never reach the database directly.
 */

import { NextRequest } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { streamText, tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

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
  "open_source",
  "education",
  "skill",
] as const

type ApprovedSourceType = (typeof APPROVED_SOURCE_TYPES)[number]

// Maps AI-friendly category labels → approved source_type values.
// The AI uses these labels in its tool call; the mapping layer normalizes before insert.
const CATEGORY_TO_SOURCE_TYPE: Record<string, ApprovedSourceType> = {
  // Work / experience variants
  "work experience": "work_experience",
  "work_experience": "work_experience",
  "job": "work_experience",
  "employment": "work_experience",
  "role": "work_experience",
  "position": "work_experience",
  // Project variants
  "project": "project",
  "side project": "project",
  "personal project": "project",
  // Product variants
  "portfolio": "portfolio_entry",
  "portfolio entry": "portfolio_entry",
  "shipped product": "shipped_product",
  "product": "shipped_product",
  "live site": "live_site",
  "website": "live_site",
  // Achievement variants
  "achievement": "achievement",
  "award": "achievement",
  "accomplishment": "achievement",
  "recognition": "achievement",
  // Credential variants
  "certification": "certification",
  "certificate": "certification",
  "license": "certification",
  // Publication variants
  "publication": "publication",
  "article": "publication",
  "blog post": "publication",
  "paper": "publication",
  // Open source variants
  "open source": "open_source",
  "open_source": "open_source",
  "contribution": "open_source",
  // Education variants
  "education": "education",
  "degree": "education",
  "school": "education",
  "university": "education",
  "course": "education",
  // Skill variants
  "skill": "skill",
  "skills": "skill",
  "competency": "skill",
  "technology": "skill",
  "tool": "skill",
}

function resolveSourceType(category: string): ApprovedSourceType | null {
  const normalized = category.toLowerCase().trim()
  return CATEGORY_TO_SOURCE_TYPE[normalized] ?? null
}

// ── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are HireWire Coach, a strategic career advisor embedded in a job application operating system.

Your role:
- Answer career questions using the user's actual evidence, profile, and job history
- Identify and collect missing profile facts that would strengthen job applications
- Save structured, factual evidence entries when the user shares new career information
- Reference prior evidence and profile before asking questions the user has already answered
- Never overstate capabilities or make claims unsupported by the user's actual background

Tools available to you:
- getProfile: read the user's career profile
- getEvidence: read saved evidence from the evidence library
- saveEvidence: save a new structured evidence entry (only factual, verifiable information)

When saving evidence:
- Use the category field to describe the type (e.g. "work experience", "project", "certification")
- Be specific about titles and descriptions
- Do not save speculative or unverified claims
- Confirm with the user before saving if the information is ambiguous

Keep responses concise and grounded. Do not pad responses or repeat what the user just said.`

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  const { messages } = await request.json()
  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "messages array required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      // ── Read profile ─────────────────────────────────────────────────────
      getProfile: tool({
        description: "Read the user's career profile including name, title, skills, experience, and education.",
        parameters: z.object({}),
        execute: async () => {
          const { data, error } = await supabase
            .from("user_profile")
            .select("name, title, email, location, summary, skills, tools, domains, certifications, linkedin_url, github_url, website_url, experience, education")
            .eq("user_id", user.id)
            .single()
          if (error) return { error: "Could not load profile" }
          return data ?? { message: "No profile found" }
        },
      }),

      // ── Read evidence ─────────────────────────────────────────────────────
      getEvidence: tool({
        description: "Read saved evidence entries from the user's evidence library.",
        parameters: z.object({
          source_type: z
            .enum(["work_experience", "project", "portfolio_entry", "shipped_product", "live_site", "achievement", "certification", "publication", "open_source", "education", "skill"])
            .optional()
            .describe("Filter by source type. Omit to return all active evidence."),
        }),
        execute: async ({ source_type }) => {
          let query = supabase
            .from("evidence_library")
            .select("id, source_type, source_title, role_name, company_name, date_range, responsibilities, tools_used, outcomes, confidence_level, is_user_approved")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("priority_rank", { ascending: false })

          if (source_type) {
            query = query.eq("source_type", source_type)
          }

          const { data, error } = await query
          if (error) return { error: "Could not load evidence" }
          return { evidence: data ?? [], count: data?.length ?? 0 }
        },
      }),

      // ── Save evidence ─────────────────────────────────────────────────────
      // The AI provides a human-readable `category`; the mapping layer resolves
      // it to an approved source_type before any DB write.
      saveEvidence: tool({
        description: "Save a new structured evidence entry to the user's evidence library. Use this when the user shares new factual career information.",
        parameters: z.object({
          title: z.string().describe("A clear, specific title for this evidence entry"),
          category: z
            .string()
            .describe(
              "Type of evidence. Use one of: work experience, project, portfolio entry, shipped product, live site, achievement, certification, publication, open source, education, skill"
            ),
          role_name: z.string().optional().describe("Job title or role (for work experience)"),
          company_name: z.string().optional().describe("Employer or institution name"),
          date_range: z.string().optional().describe("Date range e.g. Jan 2020 – Mar 2023"),
          description: z.string().optional().describe("Brief description of this evidence"),
          tools_used: z.array(z.string()).optional().describe("Technologies, tools, or skills involved"),
          outcomes: z.array(z.string()).optional().describe("Measurable results or achievements"),
        }),
        execute: async ({ title, category, role_name, company_name, date_range, description, tools_used, outcomes }) => {
          // Resolve category → approved source_type before any DB write
          const source_type = resolveSourceType(category)

          if (!source_type) {
            return {
              error: `Unrecognized category: "${category}". Use one of: work experience, project, portfolio entry, shipped product, live site, achievement, certification, publication, open source, education, skill.`,
            }
          }

          const { data, error } = await supabase
            .from("evidence_library")
            .insert({
              user_id: user.id,
              source_type,
              source_title: title,
              role_name: role_name ?? null,
              company_name: company_name ?? null,
              date_range: date_range ?? null,
              responsibilities: description ? [description] : null,
              tools_used: tools_used ?? null,
              outcomes: outcomes ?? null,
              confidence_level: "medium",
              evidence_weight: "medium",
              is_user_approved: false,
              visibility_status: "active",
              is_active: true,
              priority_rank: 0,
            })
            .select("id, source_type, source_title")
            .single()

          if (error) {
            console.error("coach saveEvidence error:", error)
            return { error: "Failed to save evidence entry" }
          }

          return {
            saved: true,
            id: data.id,
            source_type: data.source_type,
            title: data.source_title,
          }
        },
      }),
    },
    maxSteps: 5,
  })

  return result.toDataStreamResponse()
}
