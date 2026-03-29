import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runJobFlow } from "@/lib/orchestrator/runJobFlow"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params

    if (!jobId) {
      return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const triggerInterviewPrep = !!payload?.trigger_interview_prep

    const result = await runJobFlow({
      supabase,
      request,
      userId: user.id,
      jobId,
      triggerInterviewPrep,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Flow run failed",
      },
      { status: 500 }
    )
  }
}
