/**
 * POST /api/resume/upload
 *
 * Accepts a resume as multipart/form-data (file) or JSON ({text}).
 * Supported files: text/plain (.txt). PDF/DOCX not yet supported.
 *
 * Flow:
 *   1. Extract text from request
 *   2. Store raw record in source_resumes
 *   3. Parse via Groq → ParsedResume
 *   4. Update source_resumes.parsed_data
 *   5. Map to evidence rows via mapResumeToEvidence
 *   6. Deduplicate against existing evidence for this user
 *   7. Insert new rows / update skills rows
 *   8. Return summary
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseResumeText } from "@/lib/resumeParser"
import { mapResumeToEvidence, dedupeKey } from "@/lib/mapResumeToEvidence"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check — getUser() verifies the token against the Supabase API.
  // If middleware is inactive (e.g. v0 sandbox, deprecated middleware convention),
  // the session cookie may be present but the token unrefreshed. Fall back to
  // getSession() which reads the JWT directly from the cookie without verification.
  let userId: string | undefined
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    userId = user.id
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      userId = session.user.id
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── 1. Extract text from the request ──────────────────────────────────────
  let resumeText = ""
  let filename = "resume.txt"

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const textField = formData.get("text") as string | null

    if (file) {
      filename = file.name
      const fileType = file.type

      if (fileType === "application/pdf" ||
          fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          fileType === "application/msword") {
        return NextResponse.json(
          { error: "PDF and Word upload not yet supported. Please paste your resume text or upload a .txt file." },
          { status: 415 }
        )
      }

      resumeText = await file.text()
    } else if (textField) {
      resumeText = textField
    }
  } else if (contentType.includes("application/json")) {
    const body = await request.json()
    resumeText = body.text ?? ""
    filename = body.filename ?? "resume.txt"
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ error: "No resume text received" }, { status: 400 })
  }

  // ── 2. Store raw record in source_resumes ─────────────────────────────────
  const { data: sourceResume, error: insertResumeError } = await supabase
    .from("source_resumes")
    .insert({
      user_id: userId,
      filename,
      content_text: resumeText,
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

  // ── 3. Parse via Groq ─────────────────────────────────────────────────────
  let parsed
  try {
    parsed = await parseResumeText(resumeText)
  } catch (parseError) {
    console.error("Resume parse error:", parseError)
    await supabase.from("source_resumes").delete().eq("id", sourceResumeId)
    return NextResponse.json(
      { error: "Failed to parse resume. Ensure GROQ_API_KEY is configured." },
      { status: 500 }
    )
  }

  // ── 4. Update source_resumes with parsed_data ─────────────────────────────
  await supabase
    .from("source_resumes")
    .update({ parsed_data: parsed })
    .eq("id", sourceResumeId)

  // ── 5. Map to evidence rows ───────────────────────────────────────────────
  const candidateRows = mapResumeToEvidence(parsed)

  if (candidateRows.length === 0) {
    return NextResponse.json({
      message: "Resume stored but no evidence rows could be extracted.",
      source_resume_id: sourceResumeId,
      inserted: 0,
      updated: 0,
      skipped: 0,
    })
  }

  // ── 6. Deduplicate against existing evidence ──────────────────────────────
  const { data: existing } = await supabase
    .from("evidence_library")
    .select("id, source_type, source_title, role_name, company_name, date_range")
    .eq("user_id", userId)

  const existingMap = new Map<string, string>() // dedupeKey → row id
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
  const skillsToUpdate: Array<{ id: string; tools_used: string[] | null; source_resume_id: string }> = []
  let skippedCount = 0

  for (const row of candidateRows) {
    const key = dedupeKey(row)
    const existingId = existingMap.get(key)

    if (!existingId) {
      rowsToInsert.push(row)
    } else if (row.source_type === "skill") {
      skillsToUpdate.push({
        id: existingId,
        tools_used: row.tools_used,
        source_resume_id: sourceResumeId,
      })
    } else {
      skippedCount++
    }
  }

  // ── 7a. Update existing skills rows ──────────────────────────────────────
  for (const update of skillsToUpdate) {
    await supabase
      .from("evidence_library")
      .update({
        tools_used: update.tools_used,
        source_resume_id: update.source_resume_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", update.id)
      .eq("user_id", userId)
  }

  // ── 7b. Insert new evidence rows ──────────────────────────────────────────
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

  // ── 8. Return summary ─────────────────────────────────────────────────────
  return NextResponse.json({
    message: "Resume processed successfully",
    source_resume_id: sourceResumeId,
    inserted: inserted.length,
    updated: skillsToUpdate.length,
    skipped: skippedCount,
    evidence: inserted.map((e) => ({ id: e.id, type: e.source_type, title: e.source_title })),
  })
}
