import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logWorkflowTransition } from "@/lib/audit"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params
  const body = await request.json().catch(() => ({})) as {
    status?: string
    scorePayload?: Record<string, unknown>
    jobScorePayload?: Record<string, unknown> | null
  }

  if (!body.scorePayload || !body.jobScorePayload) {
    return NextResponse.json({ success: false, error: "Missing scoring payload" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // Update jobs first — the .eq("user_id") here is the ownership gate for both writes.
  // job_scores is upserted only after ownership is confirmed; job_id is taken from
  // the verified URL param (not client body) to prevent cross-tenant score injection.
  const jobResult = await supabase
    .from("jobs")
    .update({
      ...(body.status ? { status: body.status } : {}),
      ...body.scorePayload,
    })
    .eq("id", jobId)
    .eq("user_id", user.id)

  if (jobResult.error) {
    return NextResponse.json({ success: false, error: jobResult.error.message }, { status: 500 })
  }

  const scoreResult = await supabase
    .from("job_scores")
    .upsert(
      { ...body.jobScorePayload, job_id: jobId },
      { onConflict: "job_id" }
    )

  if (scoreResult.error) {
    return NextResponse.json({ success: false, error: scoreResult.error.message }, { status: 500 })
  }

  await logWorkflowTransition(user.id, jobId, "score_persisted", {
    score: body.scorePayload.score ?? null,
    status: body.status ?? null,
  })

  return NextResponse.json({ success: true })
}
