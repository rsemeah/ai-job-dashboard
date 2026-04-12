import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "jobId is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from("interview_prep")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      interview_prep: data,
    })

  } catch (error) {
    console.error("[v0] Error fetching interview prep:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch interview prep" },
      { status: 500 }
    )
  }
}

// Mark a story as strong/weak/needs_proof
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const body = await request.json()
    const { story_id, rating } = body

    if (!jobId || !story_id || !rating) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!["strong", "weak", "needs_proof"].includes(rating)) {
      return NextResponse.json(
        { success: false, error: "Invalid rating value" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Get current interview prep
    const { data: prep, error: fetchError } = await supabase
      .from("interview_prep")
      .select("user_marked_stories")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !prep) {
      return NextResponse.json(
        { success: false, error: "Interview prep not found" },
        { status: 404 }
      )
    }

    // Update the marked stories
    const currentMarks = prep.user_marked_stories || { strong_ids: [], weak_ids: [], needs_proof_ids: [] }
    
    // Remove from all arrays first
    currentMarks.strong_ids = currentMarks.strong_ids?.filter((id: string) => id !== story_id) || []
    currentMarks.weak_ids = currentMarks.weak_ids?.filter((id: string) => id !== story_id) || []
    currentMarks.needs_proof_ids = currentMarks.needs_proof_ids?.filter((id: string) => id !== story_id) || []

    // Add to the appropriate array
    if (rating === "strong") {
      currentMarks.strong_ids.push(story_id)
    } else if (rating === "weak") {
      currentMarks.weak_ids.push(story_id)
    } else if (rating === "needs_proof") {
      currentMarks.needs_proof_ids.push(story_id)
    }

    // Update the record
    const { error: updateError } = await supabase
      .from("interview_prep")
      .update({ user_marked_stories: currentMarks })
      .eq("job_id", jobId)
      .eq("user_id", user.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user_marked_stories: currentMarks,
    })

  } catch (error) {
    console.error("[v0] Error updating story rating:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update story rating" },
      { status: 500 }
    )
  }
}
