/**
 * HireWire Canonical Resume Schema
 *
 * ARCHITECTURE DECISIONS (locked):
 * - HireWire-native schema (not JSON Resume, but adapter-compatible)
 * - Evidence provenance tracked at bullet level
 * - No layout assumptions in schema — renderers own all presentation
 * - AST carries page-break hints, not solved breaks
 * - Versioned for migration safety
 */

export const SCHEMA_VERSION = '1.0.0'

// ─── CONTACT ─────────────────────────────────────────────────────────────────

export interface HWContact {
  full_name: string
  email?: string
  phone?: string
  location?: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  website_url?: string
}

// ─── EXPERIENCE ──────────────────────────────────────────────────────────────

export interface HWExperienceBullet {
  text: string
  evidence_id?: string
  claim_confidence: 'high' | 'medium' | 'low'
  has_metric: boolean
  keywords: string[]
}

export interface HWExperience {
  id: string
  title: string
  company: string
  location?: string
  start_date: string
  end_date?: string
  is_current: boolean
  bullets: HWExperienceBullet[]
  page_break_hint?: 'before' | 'avoid'
}

// ─── EDUCATION ───────────────────────────────────────────────────────────────

export interface HWEducation {
  id: string
  degree: string
  school: string
  field?: string
  start_year?: string
  end_year?: string
  honors?: string
  gpa?: string
}

// ─── SKILLS ──────────────────────────────────────────────────────────────────

export interface HWSkillGroup {
  category: string
  skills: string[]
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────

export interface HWProject {
  id: string
  name: string
  description: string
  tech_stack: string[]
  url?: string
  github_url?: string
  impact?: string
  evidence_id?: string
  page_break_hint?: 'before' | 'avoid'
}

// ─── CERTIFICATIONS ──────────────────────────────────────────────────────────

export interface HWCertification {
  id: string
  name: string
  issuer: string
  date: string
  url?: string
}

// ─── PUBLICATIONS (CV only) ──────────────────────────────────────────────────

export interface HWPublication {
  id: string
  title: string
  venue: string
  date: string
  url?: string
  co_authors?: string[]
}

// ─── CANONICAL DOCUMENT ──────────────────────────────────────────────────────

export interface HWResumeDocument {
  // Meta — never rendered, used for versioning + audit
  schema_version: string
  generated_at: string
  job_id: string
  user_id: string
  template_id: string
  generation_strategy: string

  // Content — sections are ordered by template, not schema
  contact: HWContact
  summary: string
  experience: HWExperience[]
  education: HWEducation[]
  skills: HWSkillGroup[]
  projects?: HWProject[]
  certifications?: HWCertification[]
  publications?: HWPublication[]

  // ATS metadata — consumed by export and validation layers
  ats_keywords: string[]
  target_job_title: string

  // Provenance — never rendered, used for audit
  evidence_ids_used: string[]
  blocked_evidence_ids: string[]
}
