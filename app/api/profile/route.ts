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
    .maybeSingle()

  if (error) {
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
    .maybeSingle()

  // Validate linkedin_raw_text: if provided it must be at least 200 chars
  const linkedinRawText = body.linkedin_raw_text ?? null
  if (linkedinRawText !== null && linkedinRawText.trim().length > 0 && linkedinRawText.trim().length < 200) {
    return NextResponse.json(
      { error: "LinkedIn text must be at least 200 characters or left empty." },
      { status: 400 }
    )
  }

  // Normalize education to canonical shape {degree, school, year} and deduplicate
  const rawEducation: Array<Record<string, unknown>> = Array.isArray(body.education) ? body.education : []
  const seenEdu = new Set<string>()
  const normalizedEducation = rawEducation
    .map((edu) => {
      const degree = String(edu.degree || "")
      const school = String(edu.school || "")
      let year = String(edu.year || "")
      if (!year && edu.date_range) {
        const match = String(edu.date_range).match(/\d{4}/)
        if (match) year = match[0]
      }
      return { degree, school, year }
    })
    .filter((edu) => {
      const key = `${edu.degree.toLowerCase()}|${edu.school.toLowerCase()}`
      if (seenEdu.has(key)) return false
      seenEdu.add(key)
      return true
    })

  const profileFields = {
    full_name: body.full_name,
    title: body.title ?? null,
    email: body.email || user.email,
    phone: body.phone,
    location: body.location,
    summary: body.summary,
    experience: body.experience,
    education: normalizedEducation,
    skills: body.skills,
    avatar_url: body.avatar_url,
    // linkedin_url does not exist on user_profile — owned by user_profile_links
    github_url: body.github_url ?? null,
    website_url: body.website_url ?? null,
    linkedin_raw_text: linkedinRawText?.trim() || null,
    // links is owned by profile_links table — do not write here
  }

  if (existing) {
    const { data, error } = await supabase
      .from("user_profile")
      .update({ ...profileFields, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
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
      .insert({ user_id: user.id, ...profileFields })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }
}
