import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AnalyzeJobInputSchema } from "@/lib/schemas/job-intake"
import { analyzeJobCore } from "@/lib/analyze/analyze-job-core"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parseResult = AnalyzeJobInputSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { job_url } = parseResult.data

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const result = await analyzeJobCore(job_url, supabase, user, request)

    if (!result.success) {
      const status = "retryAfter" in result ? 429 : 500
      return NextResponse.json({ success: false, error: result.error }, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in analyze-job:", error)
    const errorMessage = error instanceof Error ? error.message : "Analysis failed"
    const isRateLimit = errorMessage.includes("rate_limit") || errorMessage.includes("Rate limit")
    if (isRateLimit) {
      return NextResponse.json(
        { success: false, error: "AI service is temporarily busy. Please wait 30 seconds and try again.", retryAfter: 30 },
        { status: 429 }
      )
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
