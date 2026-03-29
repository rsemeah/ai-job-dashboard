import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()
  
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data || null)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  
  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_profile")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  
  if (existing) {
    // Update existing profile
    const { data, error } = await supabase
      .from("user_profile")
      .update({
        full_name: body.full_name,
        email: body.email || user.email,
        phone: body.phone,
        location: body.location,
        summary: body.summary,
        experience: body.experience,
        education: body.education,
        skills: body.skills,
        avatar_url: body.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } else {
    // Create new profile
    const { data, error } = await supabase
      .from("user_profile")
      .insert({
        user_id: user.id,
        full_name: body.full_name,
        email: body.email || user.email,
        phone: body.phone,
        location: body.location,
        summary: body.summary,
        experience: body.experience,
        education: body.education,
        skills: body.skills,
        avatar_url: body.avatar_url,
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  }
}
