/**
 * POST /api/linkedin/import
 *
 * Accepts raw text pasted from a LinkedIn profile page.
 * Runs the same AI extraction pipeline as the resume upload route:
 *   1. Parse text → structured fields
 *   2. Extract education entries
 *   3. Map to evidence rows
 *   4. Upsert to evidence_library
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseResumeText } from "@/lib/resumeParser"
import { mapResumeToEvidence, dedupeKey } from "@/lib/mapResumeToEvidence"
import { extractEducationFromResumeText, buildEducationEvidenceRows } from "@/lib/resume/extractEducation"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    const userId = user.id

    const body = await request.json()
    const rawText: string = typeof body.rawText === "string" ? body.rawText.trim() : ""

    if (rawText.length < 50) {
      return NextResponse.json(
        { success: false, error: "Text too short. Paste more of your LinkedIn profile content." },
        { status: 400 }
      )
    }

    // ── Parse text into structured fields ────────────────────────────────────
    let parsed
    try {
      parsed = await parseResumeText(rawText)
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse LinkedIn text. Please try again." },
        { status: 500 }
      )
    }

    // ── Extract education evidence rows ───────────────────────────────────────
    const educationEntries = await extractEducationFromResumeText(rawText)
    let educationInserted = 0

    if (educationEntries.length > 0) {
      const educationRows = buildEducationEvidenceRows(educationEntries, userId, "linkedin_import")
      const { error: eduError } = await supabase
        .from("evidence_library")
        .upsert(educationRows, {
          onConflict: "user_id,source_title,source_type",
          ignoreDuplicates: false,
        })
      if (eduError) {
        console.error("[linkedin/import] education upsert error:", eduError)
      } else {
        educationInserted = educationEntries.length
      }
    }

    // ── Map to evidence rows (excluding education — handled above) ────────────
    const candidateRows = mapResumeToEvidence(parsed).filter(
      (r) => r.source_type !== "education"
    )

    if (candidateRows.length === 0 && educationInserted === 0) {
      return NextResponse.json({
        success: true,
        itemsExtracted: 0,
        message: "No evidence items could be extracted from this text.",
      })
    }

    // ── Deduplicate against existing evidence ─────────────────────────────────
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

    const rowsToInsert = candidateRows.filter((row) => !existingMap.has(dedupeKey(row)))

    let inserted = 0
    if (rowsToInsert.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from("evidence_library")
        .upsert(
          rowsToInsert.map((row) => ({
            ...row,
            user_id: userId,
          })),
          {
            onConflict: "user_id,source_title,source_type",
            ignoreDuplicates: true,
          }
        )
        .select("id")

      if (insertError) {
        console.error("[linkedin/import] evidence upsert error:", insertError)
        return NextResponse.json(
          { success: false, error: "Failed to save evidence items." },
          { status: 500 }
        )
      }
      inserted = insertedData?.length ?? 0
    }

    return NextResponse.json({
      success: true,
      itemsExtracted: inserted + educationInserted,
    })
  } catch (error) {
    console.error("[linkedin/import] error:", error)
    return NextResponse.json(
      { success: false, error: "Import failed. Please try again." },
      { status: 500 }
    )
  }
}
