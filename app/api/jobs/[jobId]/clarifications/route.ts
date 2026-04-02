import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ResponseHandling } from "@/lib/coach-prompts/gap-questions"

interface GapClarification {
  gap_id: string
  gap_requirement: string
  question: string
  answer: string
  routing: ResponseHandling
  addressed_at: string
}

/**
 * POST /api/jobs/[id]/clarifications
 * 
 * Save gap clarification answers for a job.
 * Routes answers to:
 * - job.gap_clarifications (job-specific context)
 * - user_profile or evidence_library (if user chose to save)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { clarifications } = body as { clarifications: GapClarification[] }

  if (!clarifications || !Array.isArray(clarifications)) {
    return NextResponse.json({ error: "clarifications array required" }, { status: 400 })
  }

  // Verify job belongs to user
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, gap_clarifications, gaps_addressed")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Process each clarification
  const existingClarifications = (job.gap_clarifications as GapClarification[]) || []
  const existingAddressed = job.gaps_addressed || []
  const newClarifications: GapClarification[] = []
  const newAddressed: string[] = []
  const savedToProfile: string[] = []
  const savedToEvidence: string[] = []

  for (const clarification of clarifications) {
    // Always save to job context
    newClarifications.push(clarification)
    newAddressed.push(clarification.gap_id)

    // Route based on user preference
    if (clarification.routing === "save_to_profile") {
      // Determine what kind of data this is and save appropriately
      const answer = clarification.answer.toLowerCase()
      const requirement = clarification.gap_requirement.toLowerCase()

      // Check if it's a skill
      const isSkill = requirement.includes("skill") || 
                      requirement.includes("proficiency") ||
                      requirement.includes("experience with")

      // Check if it's a tool/technology
      const isTool = requirement.includes("python") || 
                     requirement.includes("sql") || 
                     requirement.includes("aws") ||
                     requirement.includes("java") ||
                     requirement.includes("react") ||
                     requirement.includes("node")

      if (isSkill || isTool) {
        // Extract skill/tool name and add to profile skills
        const { data: profile } = await supabase
          .from("user_profile")
          .select("skills")
          .eq("user_id", user.id)
          .single()

        if (profile) {
          const currentSkills = profile.skills || []
          // Simple extraction: use the requirement as the skill if not already present
          const skillToAdd = clarification.gap_requirement.split(" ").slice(0, 3).join(" ")
          
          if (!currentSkills.includes(skillToAdd)) {
            await supabase
              .from("user_profile")
              .update({ 
                skills: [...currentSkills, skillToAdd],
                updated_at: new Date().toISOString()
              })
              .eq("user_id", user.id)
            
            savedToProfile.push(skillToAdd)
          }
        }
      } else {
        // Save as evidence item
        const { data: evidence, error: evidenceError } = await supabase
          .from("evidence_library")
          .insert({
            user_id: user.id,
            source_type: "clarification",
            source_title: `Clarification: ${clarification.gap_requirement}`,
            achievement: clarification.answer,
            confidence_level: "medium",
            is_active: true,
            priority_rank: 0,
          })
          .select()
          .single()

        if (!evidenceError && evidence) {
          savedToEvidence.push(evidence.id)
        }
      }
    }
  }

  // Update job with clarifications
  const allClarifications = [...existingClarifications, ...newClarifications]
  const allAddressed = [...new Set([...existingAddressed, ...newAddressed])]

  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      gap_clarifications: allClarifications,
      gaps_addressed: allAddressed,
    })
    .eq("id", jobId)
    .eq("user_id", user.id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to save clarifications" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    clarifications_saved: newClarifications.length,
    gaps_addressed: allAddressed.length,
    saved_to_profile: savedToProfile,
    saved_to_evidence: savedToEvidence,
  })
}

/**
 * GET /api/jobs/[id]/clarifications
 * 
 * Get existing clarifications for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .select("gap_clarifications, gaps_addressed")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    clarifications: job.gap_clarifications || [],
    gaps_addressed: job.gaps_addressed || [],
  })
}
