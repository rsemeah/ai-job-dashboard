import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || null)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  const { data: existing } = await supabase
    .from("user_profile")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (existing) {
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
        avatar_url: body.avatar_url,
        linkedin_url: body.linkedin_url ?? null,
        github_url: body.github_url ?? null,
        website_url: body.website_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } else {
    const { data, error } = await supabase
      .from("user_profile")
      .insert({
        user_id: user.id,
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        location: body.location,
        summary: body.summary,
        experience: body.experience,
        education: body.education,
        skills: body.skills,
        avatar_url: body.avatar_url,
        linkedin_url: body.linkedin_url ?? null,
        github_url: body.github_url ?? null,
        website_url: body.website_url ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }
}
