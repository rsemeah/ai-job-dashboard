/**
 * POST /api/resume/upload
 *
 * Accepts a resume as multipart/form-data.
 * Supported: text/plain files, or a `text` field with pasted content.
 * PDF support requires adding pdf-parse as a dependency (deferred).
 *
 * Flow:
 *   1. Extract text from request
 *   2. Store raw record in source_resumes
 *   3. Parse via Groq → ParsedResume
 *   4. Update source_resumes.parsed_data
 *   5. Map to evidence rows via mapResumeToEvidence
 *   6. Deduplicate against existing evidence for this user
 *   7. Insert new rows with source_resume_id attached
 *   8. Return summary
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseResumeText } from "@/lib/resumeParser"
import { mapResumeToEvidence, dedupeKey } from "@/lib/mapResumeToEvidence"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
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

      if (fileType === "application/pdf") {
        // PDF parsing requires pdf-parse (not yet installed).
        // Instruct the client to send text content instead.
        return NextResponse.json(
          {
            error: "PDF upload is not yet supported. Please paste your resume text into the text field, or upload a .txt file.",
          },
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
      user_id: user.id,
      filename,
      content_text: resumeText,
    })
    .select("id")
    .single()

  if (insertResumeError || !sourceResume) {
    console.error("source_resumes insert error:", insertResumeError)
    return NextResponse.json(
      { error: "Failed to store resume record" },
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
    // Clean up the orphaned source_resumes row
    await supabase.from("source_resumes").delete().eq("id", sourceResumeId)
    return NextResponse.json(
      { error: "Failed to parse resume. Check GROQ_API_KEY is configured." },
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
      skipped: 0,
    })
  }

  // ── 6. Deduplicate against existing evidence ──────────────────────────────
  // Fetch existing evidence rows for this user to compare dedupe keys.
  const { data: existing } = await supabase
    .from("evidence_library")
    .select("source_type, source_title, role_name, company_name, date_range")
    .eq("user_id", user.id)

  const existingKeys = new Set<string>(
    (existing ?? []).map((row) =>
      [
        row.source_type ?? "",
        (row.source_title ?? "").toLowerCase().trim(),
        (row.role_name ?? "").toLowerCase().trim(),
        (row.company_name ?? "").toLowerCase().trim(),
        (row.date_range ?? "").toLowerCase().trim(),
      ].join("|")
    )
  )

  const newRows = candidateRows.filter(
    (row) => !existingKeys.has(dedupeKey(row))
  )
  const skippedCount = candidateRows.length - newRows.length

  if (newRows.length === 0) {
    return NextResponse.json({
      message: "All evidence rows already exist. No new rows inserted.",
      source_resume_id: sourceResumeId,
      inserted: 0,
      skipped: skippedCount,
    })
  }

  // ── 7. Insert new evidence rows ───────────────────────────────────────────
  const rowsToInsert = newRows.map((row) => ({
    ...row,
    user_id: user.id,
    source_resume_id: sourceResumeId,
  }))

  const { data: inserted, error: evidenceError } = await supabase
    .from("evidence_library")
    .insert(rowsToInsert)
    .select("id, source_type, source_title")

  if (evidenceError) {
    console.error("evidence_library insert error:", evidenceError)
    return NextResponse.json(
      {
        error: "Failed to insert evidence rows",
        detail: evidenceError.message,
      },
      { status: 500 }
    )
  }

  // ── 8. Return summary ─────────────────────────────────────────────────────
  return NextResponse.json({
    message: "Resume processed successfully",
    source_resume_id: sourceResumeId,
    inserted: inserted?.length ?? 0,
    skipped: skippedCount,
    evidence: inserted?.map((e) => ({ id: e.id, type: e.source_type, title: e.source_title })) ?? [],
  })
}
