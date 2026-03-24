import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .limit(1)
    .single()
  
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data || null)
}

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await request.json()
  
  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_profile")
    .select("id")
    .limit(1)
    .single()
  
  if (existing) {
    // Update existing profile
    const { data, error } = await supabase
      .from("user_profile")
      .update({
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        location: body.location,
        summary: body.summary,
        experience: body.experience,
        education: body.education,
        skills: body.skills,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
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
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        location: body.location,
        summary: body.summary,
        experience: body.experience,
        education: body.education,
        skills: body.skills,
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  }
}
