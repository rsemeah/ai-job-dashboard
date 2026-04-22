/**
 * lib/resume/extractEducation.ts
 *
 * Extracts education and certification entries from raw resume text
 * and returns rows ready to insert into evidence_library.
 *
 * Called from app/api/resume/upload/route.ts after parseResumeText().
 */

import { generateText, Output } from "ai"
import { CLAUDE_MODELS } from "@/lib/adapters/anthropic"
import { z } from "zod"

// ── Schemas ──────────────────────────────────────────────────────────────────

const EducationEntrySchema = z.object({
  normalized_label: z.string(),
  credential_type: z.enum(["degree", "certification", "license", "course"]),
  institution: z.string(),
  field: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  honors: z.string().nullable(),
})

const EducationResultSchema = z.object({
  entries: z.array(EducationEntrySchema),
})

export type EducationEntry = z.infer<typeof EducationEntrySchema>

// ── Proof snippet builder ─────────────────────────────────────────────────────

export function buildEducationProofSnippet(entry: EducationEntry): string {
  const parts: string[] = [entry.normalized_label, entry.institution]
  if (entry.field && entry.field !== entry.normalized_label) {
    parts.push(`Field: ${entry.field}`)
  }
  const dateRange = [entry.start_date, entry.end_date].filter(Boolean).join(" – ")
  if (dateRange) parts.push(dateRange)
  if (entry.honors) parts.push(entry.honors)
  return parts.join(" | ")
}

// ── Evidence row builder ──────────────────────────────────────────────────────

export function buildEducationEvidenceRows(
  entries: EducationEntry[],
  userId: string,
  sourceResumeId: string
): Record<string, unknown>[] {
  return entries.map((entry) => ({
    user_id: userId,
    source_resume_id: sourceResumeId,
    source_type: "education",
    source_title: entry.normalized_label,
    source_url: null,
    proof_snippet: buildEducationProofSnippet(entry),
    normalized_label: entry.normalized_label,
    credential_type: entry.credential_type,
    confidence_score: 1.0,
    raw_resume_section: "education",
    confidence_level: "high",
    evidence_weight: "medium",
    is_active: true,
    is_user_approved: false,
    visibility_status: "active",
    priority_rank: 0,
    company_name: entry.institution,
    date_range: [entry.start_date, entry.end_date].filter(Boolean).join(" – ") || null,
    role_name: entry.field || null,
  }))
}

// ── Main extractor ────────────────────────────────────────────────────────────

export async function extractEducationFromResumeText(
  rawText: string
): Promise<EducationEntry[]> {
  try {
    const result = await generateText({
      model: CLAUDE_MODELS.SONNET,
      output: Output.object({ schema: EducationResultSchema }),
      prompt: `Extract ALL education credentials and certifications from the resume text below.
Include every degree, certification, license, and course. Do not invent information not present in the text.

For each entry return:
- normalized_label: Full credential name (e.g. "Bachelor of Science in Information Technology")
- credential_type: One of "degree" | "certification" | "license" | "course"
- institution: School name or certifying body
- field: Field of study or subject area
- start_date: YYYY-MM format if present, otherwise null
- end_date: YYYY-MM format if present, otherwise null
- honors: Any honors, GPA, distinction — or null if none

RESUME TEXT:
${rawText}`,
    })
    const data = result.experimental_output
    return Array.isArray(data?.entries) ? data.entries : []
  } catch (err) {
    console.error("[extractEducation] Failed:", err)
    return []
  }
}
