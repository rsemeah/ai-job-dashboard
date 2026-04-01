import type { createClient } from "@/lib/supabase/server"
import { normalizeJobStatus } from "@/lib/job-lifecycle"
import { recordRunStep } from "@/lib/logs/runLedger"
import { type JobFlowContext, createJobFlowContext } from "@/lib/context/job-flow"

type ServerSupabase = Awaited<ReturnType<typeof createClient>>
type RequestLike = {
  headers: {
    get(name: string): string | null
  }
}

type RunStep = {
  step: string
  status: "started" | "success" | "error" | "skipped"
  summary: string
  error?: string
}

export interface RunJobFlowInput {
  supabase: ServerSupabase
  request: RequestLike
  userId: string
  jobId: string
  triggerInterviewPrep?: boolean
}

export interface RunJobFlowResult {
  success: boolean
  jobId: string
  correlationId: string
  steps: RunStep[]
  generation?: {
    attempted: boolean
    success: boolean
    error?: string | null
    strategy?: string
    quality_passed?: boolean
  }
}

export async function runJobFlow(input: RunJobFlowInput): Promise<RunJobFlowResult> {
  const { supabase, request, userId, jobId, triggerInterviewPrep = false } = input
  const steps: RunStep[] = []
  
  // Create execution context for this flow
  const ctx: JobFlowContext = createJobFlowContext({ request, userId, jobId })

  const addStep = async (
    step: string,
    status: RunStep["status"],
    summary: string,
    error?: string
  ) => {
    const entry: RunStep = { step, status, summary, ...(error ? { error } : {}) }
    steps.push(entry)
    await recordRunStep(supabase, {
      jobId,
      userId,
      step,
      status,
      summary,
      errorDetails: error,
    })
  }

  try {
    await addStep("intake", "success", "Job accepted for orchestration")

    const { data: existingJob } = await supabase
      .from("jobs")
      .select("status, analyzed_at")
      .eq("id", jobId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!existingJob) {
      await addStep("load_job", "error", "Job not found for current user", "not_found")
      return { success: false, jobId, correlationId: ctx.correlationId, steps }
    }

    const currentStatus = normalizeJobStatus(existingJob.status)
    if (currentStatus === "queued" || currentStatus === "draft") {
      await supabase
        .from("jobs")
        .update({ status: "analyzing" })
        .eq("id", jobId)
        .eq("user_id", userId)
      await addStep("analysis", "started", "Analysis step started")
      await addStep("analysis", "success", "Analysis placeholder complete")
    } else {
      await addStep("analysis", "skipped", "Analysis already completed")
    }

    await supabase
      .from("jobs")
      .update({ status: "generating", generation_status: "generating" })
      .eq("id", jobId)
      .eq("user_id", userId)
    await addStep("generate_documents", "started", "Document generation started")

    // Use context for baseUrl and cookie forwarding
    const generationResponse = await fetch(`${ctx.baseUrl}/api/generate-documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": ctx.correlationId,
        ...(ctx.cookieHeader ? { Cookie: ctx.cookieHeader } : {}),
      },
      body: JSON.stringify({ job_id: jobId }),
    })

    const generationPayload = await generationResponse.json()
    if (!generationPayload.success) {
      const errorMessage = generationPayload.error || "Document generation failed"
      await supabase
        .from("jobs")
        .update({ status: "error", generation_status: "failed", generation_error: errorMessage })
        .eq("id", jobId)
        .eq("user_id", userId)
      await addStep("generate_documents", "error", "Document generation failed", errorMessage)
      return {
        success: false,
        jobId,
        correlationId: ctx.correlationId,
        steps,
        generation: {
          attempted: true,
          success: false,
          error: errorMessage,
        },
      }
    }

    const qualityPassed = !!generationPayload.quality_check?.passed
    const terminalStatus = qualityPassed ? "ready" : "needs_review"
    await supabase
      .from("jobs")
      .update({ status: terminalStatus })
      .eq("id", jobId)
      .eq("user_id", userId)

    await addStep(
      "generate_documents",
      "success",
      qualityPassed ? "Documents generated and ready" : "Documents generated, manual review required"
    )

    if (triggerInterviewPrep) {
      await addStep("interview_prep", "started", "Interview prep requested")
      try {
        const prepResponse = await fetch(`${ctx.baseUrl}/api/generate-interview-prep`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-ID": ctx.correlationId,
            ...(ctx.cookieHeader ? { Cookie: ctx.cookieHeader } : {}),
          },
          body: JSON.stringify({ job_id: jobId }),
        })
        const prepPayload = await prepResponse.json()
        if (prepPayload.success) {
          await addStep("interview_prep", "success", "Interview prep generated")
        } else {
          await addStep("interview_prep", "error", "Interview prep failed", prepPayload.error || "unknown_error")
        }
      } catch (prepError) {
        await addStep(
          "interview_prep",
          "error",
          "Interview prep failed",
          prepError instanceof Error ? prepError.message : "unknown_error"
        )
      }
    } else {
      await addStep("interview_prep", "skipped", "Interview prep not requested")
    }

    return {
      success: true,
      jobId,
      correlationId: ctx.correlationId,
      steps,
      generation: {
        attempted: true,
        success: true,
        strategy: generationPayload.strategy,
        quality_passed: qualityPassed,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Run flow failed"
    await supabase
      .from("jobs")
      .update({ status: "error", generation_status: "failed", generation_error: errorMessage })
      .eq("id", jobId)
      .eq("user_id", userId)

    await addStep("flow", "error", "Orchestration failed", errorMessage)

    return {
      success: false,
      jobId,
      correlationId: ctx.correlationId,
      steps,
      generation: {
        attempted: true,
        success: false,
        error: errorMessage,
      },
    }
  }
}
