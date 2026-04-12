import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/jobs/[id]/quality-pass
 * 
 * Centralized endpoint for marking a job as quality-approved.
 * Called from Red Team review after human approval of generated materials.
 * 
 * This is a critical gate in the workflow - a job cannot be marked as "applied"
 * until quality_passed = true.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { 
      issues_acknowledged = [],
      resolved_count = 0,
      notes = null 
    } = body
    
    // Verify job exists and belongs to user
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, generated_resume, generated_cover_letter, quality_passed")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle()
    
    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      )
    }
    
    // Verify materials exist before allowing quality approval
    if (!job.generated_resume && !job.generated_cover_letter) {
      return NextResponse.json(
        { success: false, error: "Cannot approve quality - no generated materials" },
        { status: 400 }
      )
    }
    
    // Check if already approved (idempotent)
    if (job.quality_passed) {
      return NextResponse.json({
        success: true,
        already_approved: true,
        job_id: jobId,
      })
    }
    
    // Update job with quality approval
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        quality_passed: true,
        quality_passed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
    
    if (updateError) {
      console.error("Error updating job quality_passed:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to update job" },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase.from("audit_events").insert({
      user_id: user.id,
      job_id: jobId,
      event_type: "quality_passed",
      outcome: "approved",
      reason: `Red Team review passed${issues_acknowledged.length > 0 ? ` with ${issues_acknowledged.length} non-critical issues acknowledged` : ""}`,
      metadata: {
        approved_at: new Date().toISOString(),
        issues_acknowledged,
        resolved_count,
        notes,
      },
    })
    
    return NextResponse.json({
      success: true,
      job_id: jobId,
      quality_passed: true,
      approved_at: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error("Quality pass error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/[id]/quality-pass
 * 
 * Revoke quality approval (e.g., if materials need regeneration)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Revoke quality approval
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        quality_passed: false,
        quality_passed_at: null,
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
    
    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Failed to revoke quality approval" },
        { status: 500 }
      )
    }
    
    // Log audit event
    await supabase.from("audit_events").insert({
      user_id: user.id,
      job_id: jobId,
      event_type: "quality_passed",
      outcome: "revoked",
      reason: "Quality approval revoked for regeneration",
    })
    
    return NextResponse.json({
      success: true,
      job_id: jobId,
      quality_passed: false,
    })
    
  } catch (error) {
    console.error("Quality pass revoke error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
