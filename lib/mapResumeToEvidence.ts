/**
 * mapResumeToEvidence
 *
 * Translates a Groq-parsed resume object into evidence_library rows.
 * Each section maps to a semantically correct source_type value.
 *
 * Mapping rules (per alignment answers):
 *   work experience entries  → source_type: 'work_experience' (one row per job)
 *   education entries        → source_type: 'education' (one row per degree)
 *   skills section           → source_type: 'skill' (one row total, skills in tools_used[])
 *   certifications           → source_type: 'certification' (one row each)
 *   projects                 → source_type: 'project' (one row each)
 *
 * Deduplication key (used by the upload route before insert):
 *   (user_id, source_type, source_title, role_name, company_name, date_range)
 *   Exact match on all five → skip. Otherwise insert.
 */

export interface ParsedResume {
  work_experience: ParsedWorkExperience[]
  education: ParsedEducation[]
  skills: string[]
  tools: string[]
  domains: string[]
  certifications: ParsedCertification[]
  projects: ParsedProject[]
}

export interface ParsedWorkExperience {
  role: string
  company: string
  date_range?: string
  location?: string
  responsibilities?: string[]
  tools_used?: string[]
  outcomes?: string[]
}

export interface ParsedEducation {
  degree: string
  school: string
  field?: string
  date_range?: string
  honors?: string
}

export interface ParsedCertification {
  name: string
  issuer?: string
  date?: string
}

export interface ParsedProject {
  name: string
  description?: string
  tech_stack?: string[]
  outcomes?: string[]
  url?: string
}

/**
 * A single evidence row ready for insert into evidence_library.
 * source_resume_id is attached by the upload route before insert.
 */
export interface MappedEvidenceRow {
  source_type: "work_experience" | "education" | "skill" | "certification" | "project"
  source_title: string
  role_name: string | null
  company_name: string | null
  date_range: string | null
  responsibilities: string[] | null
  tools_used: string[] | null
  outcomes: string[] | null
  industries: string[] | null
  confidence_level: "high" | "medium" | "low"
  evidence_weight: "highest" | "high" | "medium" | "low"
  is_user_approved: boolean
  visibility_status: "active" | "hidden" | "archived"
  is_active: boolean
  priority_rank: number
}

export function mapResumeToEvidence(parsed: ParsedResume): MappedEvidenceRow[] {
  const rows: MappedEvidenceRow[] = []

  // ── Work experience ────────────────────────────────────────────────────────
  for (const job of parsed.work_experience ?? []) {
    if (!job.role || !job.company) continue
    rows.push({
      source_type: "work_experience",
      source_title: `${job.role} at ${job.company}`,
      role_name: job.role,
      company_name: job.company,
      date_range: job.date_range ?? null,
      responsibilities: job.responsibilities?.length ? job.responsibilities : null,
      tools_used: job.tools_used?.length ? job.tools_used : null,
      outcomes: job.outcomes?.length ? job.outcomes : null,
      industries: null,
      confidence_level: "high",
      evidence_weight: "high",
      is_user_approved: false,
      visibility_status: "active",
      is_active: true,
      priority_rank: 0,
    })
  }

  // ── Education ──────────────────────────────────────────────────────────────
  for (const edu of parsed.education ?? []) {
    if (!edu.degree || !edu.school) continue
    const title = edu.field
      ? `${edu.degree} in ${edu.field}, ${edu.school}`
      : `${edu.degree}, ${edu.school}`
    rows.push({
      source_type: "education",
      source_title: title,
      role_name: edu.degree,
      company_name: edu.school,
      date_range: edu.date_range ?? null,
      responsibilities: edu.honors ? [edu.honors] : null,
      tools_used: null,
      outcomes: null,
      industries: null,
      confidence_level: "high",
      evidence_weight: "medium",
      is_user_approved: false,
      visibility_status: "active",
      is_active: true,
      priority_rank: 0,
    })
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  // One structured row for all skills/tools/domains from the resume.
  // Per alignment: not one row per skill — one row per resume section.
  const allSkills = [
    ...(parsed.skills ?? []),
    ...(parsed.tools ?? []),
    ...(parsed.domains ?? []),
  ]
  if (allSkills.length > 0) {
    rows.push({
      source_type: "skill",
      source_title: "Professional Skills",
      role_name: null,
      company_name: null,
      date_range: null,
      responsibilities: null,
      tools_used: allSkills,
      outcomes: null,
      industries: parsed.domains?.length ? parsed.domains : null,
      confidence_level: "medium",
      evidence_weight: "medium",
      is_user_approved: false,
      visibility_status: "active",
      is_active: true,
      priority_rank: 0,
    })
  }

  // ── Certifications ─────────────────────────────────────────────────────────
  for (const cert of parsed.certifications ?? []) {
    if (!cert.name) continue
    rows.push({
      source_type: "certification",
      source_title: cert.name,
      role_name: null,
      company_name: cert.issuer ?? null,
      date_range: cert.date ?? null,
      responsibilities: null,
      tools_used: null,
      outcomes: null,
      industries: null,
      confidence_level: "high",
      evidence_weight: "medium",
      is_user_approved: false,
      visibility_status: "active",
      is_active: true,
      priority_rank: 0,
    })
  }

  // ── Projects ───────────────────────────────────────────────────────────────
  for (const proj of parsed.projects ?? []) {
    if (!proj.name) continue
    rows.push({
      source_type: "project",
      source_title: proj.name,
      role_name: null,
      company_name: null,
      date_range: null,
      responsibilities: proj.description ? [proj.description] : null,
      tools_used: proj.tech_stack?.length ? proj.tech_stack : null,
      outcomes: proj.outcomes?.length ? proj.outcomes : null,
      industries: null,
      confidence_level: "medium",
      evidence_weight: "medium",
      is_user_approved: false,
      visibility_status: "active",
      is_active: true,
      priority_rank: 0,
    })
  }

  return rows
}

/**
 * Builds a deduplication key from the five fields that define an exact duplicate.
 * Used by the upload route to skip rows that are already in evidence_library.
 */
export function dedupeKey(row: MappedEvidenceRow): string {
  return [
    row.source_type,
    (row.source_title ?? "").toLowerCase().trim(),
    (row.role_name ?? "").toLowerCase().trim(),
    (row.company_name ?? "").toLowerCase().trim(),
    (row.date_range ?? "").toLowerCase().trim(),
  ].join("|")
}
