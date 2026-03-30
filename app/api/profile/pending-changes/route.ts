import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Pending Profile Changes API
 * 
 * GET: List pending changes for the current user
 * POST: Create a new pending change proposal
 * PATCH: Approve/reject a pending change
 */

// Type for proposed changes
interface ProposedChange {
  field: string
  old_value: unknown
  new_value: unknown
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: changes, error } = await supabase
    .from("pending_profile_changes")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ changes })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { proposed_changes, summary, source = "coach_chat" } = body

  if (!proposed_changes || !summary) {
    return NextResponse.json(
      { error: "proposed_changes and summary are required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("pending_profile_changes")
    .insert({
      user_id: user.id,
      proposed_changes,
      summary,
      source,
      status: "pending"
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ change: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { change_id, action } = body

  if (!change_id || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "change_id and action (approve/reject) are required" },
      { status: 400 }
    )
  }

  // Get the pending change
  const { data: change, error: fetchError } = await supabase
    .from("pending_profile_changes")
    .select("*")
    .eq("id", change_id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .single()

  if (fetchError || !change) {
    return NextResponse.json(
      { error: "Pending change not found" },
      { status: 404 }
    )
  }

  if (action === "reject") {
    // Just update status to rejected
    const { error: updateError } = await supabase
      .from("pending_profile_changes")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: "user"
      })
      .eq("id", change_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: "rejected" })
  }

  // action === "approve" - apply the changes to user_profile
  const proposedChanges = change.proposed_changes as Record<string, ProposedChange>
  
  // Build the update object from proposed changes
  const updatePayload: Record<string, unknown> = {}
  for (const [field, change_data] of Object.entries(proposedChanges)) {
    updatePayload[field] = change_data.new_value
  }

  // Apply changes to user_profile
  const { error: profileError } = await supabase
    .from("user_profile")
    .update(updatePayload)
    .eq("user_id", user.id)

  if (profileError) {
    return NextResponse.json(
      { error: `Failed to apply changes: ${profileError.message}` },
      { status: 500 }
    )
  }

  // Update pending change status
  await supabase
    .from("pending_profile_changes")
    .update({
      status: "applied",
      reviewed_at: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      reviewed_by: "user"
    })
    .eq("id", change_id)

  // Create audit record
  await supabase
    .from("profile_change_audit")
    .insert({
      user_id: user.id,
      change_id: change_id,
      changes_applied: proposedChanges
    })

  return NextResponse.json({ 
    success: true, 
    action: "applied",
    changes_applied: Object.keys(updatePayload)
  })
}
