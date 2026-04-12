/**
 * POST /api/resume/upload
 *
 * Canonical resume upload route. Single flow:
 *   1. Extract text (PDF / DOCX / TXT / JSON body)
 *   2. Store raw record in source_resumes (filename, content_text)
 *   3. Parse via lib/resumeParser → ParsedResume (canonical shape)
 *   4. Update source_resumes.parsed_data
 *   5. Pre-fill user_profile if fields are empty
 *   6. Map to evidence rows via lib/mapResumeToEvidence
 *   7. Deduplicate + insert / update evidence_library
 *   8. Return canonical summary
 *
 * source_resumes columns: user_id, file_name, parsed_text, file_type, 
 * parsed_data, parse_status, parsed_at, is_primary.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseResumeText } from "@/lib/resumeParser"
import { mapResumeToEvidence, dedupeKey } from "@/lib/mapResumeToEvidence"

// Extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default
  const data = await pdfParse(buffer)
  return data.text
}

// Extract text from DOCX
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth — getUser() verifies JWT. Fall back to getSession() for sandbox/
    // deprecated-middleware environments where tokens aren't refreshed.
    let userId: string | undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── 1. Extract text ──────────────────────────────────────────────────────
    let rawText = ""
    let filename = "resume.txt"

    const contentType = request.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      const textField = formData.get("text") as string | null

      if (file) {
        filename = file.name

        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        try {
          if (file.type === "application/pdf") {
            rawText = await extractTextFromPDF(buffer)
          } else if (
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.type === "application/msword"
          ) {
            rawText = await extractTextFromDOCX(buffer)
          } else {
            rawText = await file.text()
          }
        } catch (extractError) {
          console.error("Text extraction error:", extractError)
          return NextResponse.json({ error: "Failed to extract text from file." }, { status: 400 })
        }
      } else if (textField) {
        rawText = textField
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json()
      rawText = body.text ?? ""
      filename = body.filename ?? "resume.txt"
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json({ error: "No resume text received or text too short." }, { status: 400 })
    }

    // ── 2. Store raw record ──────────────────────────────────────────────────
    const { data: sourceResume, error: insertResumeError } = await supabase
      .from("source_resumes")
      .insert({
        user_id: userId,
        file_name: filename,
        parsed_text: rawText,
        file_type: "text/plain",
        parse_status: "pending",
      })
      .select("id")
      .single()

    if (insertResumeError || !sourceResume) {
      console.error("source_resumes insert error:", insertResumeError)
      return NextResponse.json(
        { error: "Failed to store resume record", detail: insertResumeError?.message },
        { status: 500 }
      )
    }

    const sourceResumeId = sourceResume.id

    // ── 3. Parse via Claude ───────────────────────────────────────────────────
    let parsed
    try {
      parsed = await parseResumeText(rawText)
    } catch (parseError) {
      console.error("Resume parse error:", parseError)
      await supabase.from("source_resumes").delete().eq("id", sourceResumeId)
      return NextResponse.json(
        { error: "Failed to parse resume. Please try again." },
        { status: 500 }
      )
    }

    // ── 4. Update source_resumes with parsed_data ────────────────────────────
    await supabase
      .from("source_resumes")
      .update({ 
        parsed_data: parsed,
        parse_status: "completed",
        parsed_at: new Date().toISOString(),
      })
      .eq("id", sourceResumeId)

    // ── 5. Pre-fill user_profile if fields are empty ─────────────────────────
    const { data: profile } = await supabase
      .from("user_profile")
      .select("full_name, location, summary, skills, links, email, phone")
      .eq("user_id", userId)
      .single()

    if (profile) {
      const updates: Record<string, unknown> = {}
      if (!profile.full_name && parsed.full_name) updates.full_name = parsed.full_name
      if (!profile.location && parsed.location) updates.location = parsed.location
      if (!profile.summary && parsed.summary) updates.summary = parsed.summary
      if ((!profile.skills || profile.skills.length === 0)) {
        const allSkills = [...(parsed.skills ?? []), ...(parsed.tools ?? [])]
        if (allSkills.length > 0) updates.skills = allSkills
      }
      if (!profile.email && parsed.email) updates.email = parsed.email
      if (!profile.phone && parsed.phone) updates.phone = parsed.phone
      const currentLinks = (profile.links as Record<string, string>) || {}
      const newLinks = { ...currentLinks }
      if (!currentLinks.linkedin && parsed.linkedin_url) newLinks.linkedin = parsed.linkedin_url
      if (!currentLinks.github && parsed.github_url) newLinks.github = parsed.github_url
      if (!currentLinks.website && parsed.website_url) newLinks.website = parsed.website_url
      if (Object.keys(newLinks).length > Object.keys(currentLinks).length) updates.links = newLinks
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        await supabase.from("user_profile").update(updates).eq("user_id", userId)
      }
    }

    // ── 6. Map to evidence rows ──────────────────────────────────────────────
    const candidateRows = mapResumeToEvidence(parsed)

    if (candidateRows.length === 0) {
      return NextResponse.json({
        message: "Resume stored but no evidence rows could be extracted.",
        source_resume_id: sourceResumeId,
        inserted: 0,
        updated: 0,
        skipped: 0,
        evidence: [],
        full_name: parsed.full_name ?? null,
        location: parsed.location ?? null,
        summary: parsed.summary ?? null,
        skills: [...(parsed.skills ?? []), ...(parsed.tools ?? [])],
        experience_count: parsed.work_experience?.length ?? 0,
      })
    }

    // ── 7. Deduplicate against existing evidence ─────────────────────────────
    const { data: existing } = await supabase
      .from("evidence_library")
      .select("id, source_type, source_title, role_name, company_name, date_range")
      .eq("user_id", userId)

    const existingMap = new Map<string, string>()
    for (const row of existing ?? []) {
      const key = [
        row.source_type ?? "",
        (row.source_title ?? "").toLowerCase().trim(),
        (row.role_name ?? "").toLowerCase().trim(),
        (row.company_name ?? "").toLowerCase().trim(),
        (row.date_range ?? "").toLowerCase().trim(),
      ].join("|")
      existingMap.set(key, row.id)
    }

    const rowsToInsert: typeof candidateRows = []
    const skillsToUpdate: Array<{ id: string; tools_used: string[] | null }> = []
    let skippedCount = 0

    for (const row of candidateRows) {
      const key = dedupeKey(row)
      const existingId = existingMap.get(key)
      if (!existingId) {
        rowsToInsert.push(row)
      } else if (row.source_type === "skill") {
        skillsToUpdate.push({ id: existingId, tools_used: row.tools_used })
      } else {
        skippedCount++
      }
    }

    // ── 8a. Update existing skill rows ───────────────────────────────────────
    for (const update of skillsToUpdate) {
      await supabase
        .from("evidence_library")
        .update({
          tools_used: update.tools_used,
          source_resume_id: sourceResumeId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.id)
        .eq("user_id", userId)
    }

    // ── 8b. Insert new evidence rows ─────────────────────────────────────────
    let inserted: Array<{ id: string; source_type: string; source_title: string }> = []

    if (rowsToInsert.length > 0) {
      const { data: insertedData, error: evidenceError } = await supabase
        .from("evidence_library")
        .insert(
          rowsToInsert.map((row) => ({
            ...row,
            user_id: userId,
            source_resume_id: sourceResumeId,
          }))
        )
        .select("id, source_type, source_title")

      if (evidenceError) {
        console.error("evidence_library insert error:", evidenceError)
        return NextResponse.json(
          { error: "Failed to insert evidence rows", detail: evidenceError.message },
          { status: 500 }
        )
      }

      inserted = insertedData ?? []
    }

    // ── 9. Return canonical summary ──────────────────────────────────────────
    return NextResponse.json({
      message: "Resume processed successfully",
      source_resume_id: sourceResumeId,
      inserted: inserted.length,
      updated: skillsToUpdate.length,
      skipped: skippedCount,
      evidence: inserted.map((e) => ({ id: e.id, type: e.source_type, title: e.source_title })),
      // Contact info for onboarding pre-fill
      full_name: parsed.full_name ?? null,
      location: parsed.location ?? null,
      summary: parsed.summary ?? null,
      skills: [...(parsed.skills ?? []), ...(parsed.tools ?? [])],
      experience_count: parsed.work_experience?.length ?? 0,
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

// GET - Retrieve user's source resumes
export async function GET() {
  try {
    const supabase = await createClient()

    let userId: string | undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { userId = user.id } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: resumes, error } = await supabase
      .from("source_resumes")
      .select("id, file_name, parsed_text, parsed_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 })
    }

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 })
  }
}

// DELETE - Remove a source resume
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    let userId: string | undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { userId = user.id } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const resumeId = searchParams.get("id")

    if (!resumeId) {
      return NextResponse.json({ error: "Resume ID required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("source_resumes")
      .delete()
      .eq("id", resumeId)
      .eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
