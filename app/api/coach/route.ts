import { createClient } from "@/lib/supabase/server"
import { streamText } from "ai"
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts/coach"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { messages, jobContext, gapContext } = body

    // Build system prompt with optional context
    let systemPrompt = COACH_SYSTEM_PROMPT

    if (jobContext) {
      systemPrompt += `\n\n## Current Job Context\nThe user is working on this specific role:\n- Title: ${jobContext.title}\n- Company: ${jobContext.company}${jobContext.score != null ? `\n- Fit Score: ${jobContext.score}%` : ""}${jobContext.status ? `\n- Status: ${jobContext.status}` : ""}`
    }

    if (gapContext) {
      systemPrompt += `\n\n## Gap Clarification Mode\nHelp the user address this specific gap:\n- Job: ${gapContext.jobTitle} at ${gapContext.company}${gapContext.gap ? `\n- Gap: ${gapContext.gap.requirement}\n- Category: ${gapContext.gap.category}\n- Question: ${gapContext.gap.coach_question}` : ""}`
    }

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from("user_profile")
      .select("full_name, summary, skills, location")
      .eq("user_id", user.id)
      .single()

    if (profile) {
      systemPrompt += `\n\n## User Profile\n- Name: ${profile.full_name || "Not provided"}\n- Location: ${profile.location || "Not provided"}\n- Skills: ${Array.isArray(profile.skills) ? profile.skills.join(", ") : profile.skills || "Not provided"}\n- Summary: ${profile.summary || "Not provided"}`
    }

    const result = streamText({
      model: "openai/gpt-4o-mini",
      system: systemPrompt,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("[api/coach] error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
