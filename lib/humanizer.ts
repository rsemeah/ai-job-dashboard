/**
 * HireWire Humanizer
 *
 * The single source of truth for all human-readable formatting.
 * Pattern: Humanizr/Humanizer (.NET) — one central module, all display transforms.
 *
 * RULE: If a raw DB value is shown to a user, it goes through this module.
 * No inline STATUS_LABELS in pages. No scattered toLocaleString() calls.
 * No hardcoded "free" === plan checks in components.
 */

import type { CanonicalJobStatus, CanonicalGenerationStatus } from '@/lib/job-lifecycle'
import type { JobFit, JobSource, SeniorityLevel, ResumeTemplateType } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusDisplay {
  label: string
  color: string
  description: string
  isProcessing?: boolean
  isTerminal?: boolean
}

export interface FitDisplay {
  label: string
  color: string
  description: string
  score_range: string
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB STATUS
// ─────────────────────────────────────────────────────────────────────────────

const JOB_STATUS_DISPLAY: Record<CanonicalJobStatus, StatusDisplay> = {
  draft:        { label: 'Draft',          color: 'bg-gray-100 text-gray-700',        description: 'Created, not yet analyzed' },
  queued:       { label: 'Queued',         color: 'bg-blue-100 text-blue-700',        description: 'Waiting for analysis',       isProcessing: true },
  analyzing:    { label: 'Analyzing…',     color: 'bg-indigo-100 text-indigo-700',    description: 'Extracting job intelligence', isProcessing: true },
  analyzed:     { label: 'Analyzed',       color: 'bg-cyan-100 text-cyan-700',        description: 'Analysis complete' },
  generating:   { label: 'Generating…',    color: 'bg-purple-100 text-purple-700',    description: 'Building tailored materials', isProcessing: true },
  ready:        { label: 'Ready',          color: 'bg-green-100 text-green-800',      description: 'Ready to apply' },
  applied:      { label: 'Applied',        color: 'bg-emerald-100 text-emerald-800',  description: 'Application submitted' },
  interviewing: { label: 'Interviewing',   color: 'bg-blue-100 text-blue-800',        description: 'In interview loop' },
  offered:      { label: 'Offered',        color: 'bg-green-100 text-green-800',      description: 'Offer received',             isTerminal: true },
  rejected:     { label: 'Rejected',       color: 'bg-red-100 text-red-700',          description: 'No offer',                   isTerminal: true },
  archived:     { label: 'Archived',       color: 'bg-gray-100 text-gray-500',        description: 'No longer active',           isTerminal: true },
  needs_review: { label: 'Needs Review',   color: 'bg-amber-100 text-amber-800',      description: 'Manual quality review needed' },
  error:        { label: 'Error',          color: 'bg-red-100 text-red-800',          description: 'Flow failed',                isTerminal: true },
}

export function humanizeJobStatus(status: string | null | undefined): StatusDisplay {
  if (!status) return { label: '—', color: 'bg-gray-100 text-gray-500', description: '' }
  return JOB_STATUS_DISPLAY[status as CanonicalJobStatus] ?? {
    label: status,
    color: 'bg-gray-100 text-gray-600',
    description: '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION STATUS
// ─────────────────────────────────────────────────────────────────────────────

const GENERATION_STATUS_DISPLAY: Record<CanonicalGenerationStatus, StatusDisplay> = {
  pending:      { label: 'Pending',         color: 'bg-gray-100 text-gray-600',    description: 'Waiting to generate' },
  generating:   { label: 'Generating…',     color: 'bg-purple-100 text-purple-700', description: 'Building documents',    isProcessing: true },
  ready:        { label: 'Documents Ready', color: 'bg-green-100 text-green-800',  description: 'Documents generated successfully' },
  needs_review: { label: 'Needs Review',    color: 'bg-amber-100 text-amber-800',  description: 'Quality review required' },
  failed:       { label: 'Failed',          color: 'bg-red-100 text-red-700',      description: 'Generation failed' },
}

export function humanizeGenerationStatus(status: string | null | undefined): StatusDisplay {
  if (!status) return { label: '—', color: 'bg-gray-100 text-gray-500', description: '' }
  return GENERATION_STATUS_DISPLAY[status as CanonicalGenerationStatus] ?? {
    label: status,
    color: 'bg-gray-100 text-gray-600',
    description: '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB FIT
// ─────────────────────────────────────────────────────────────────────────────

const FIT_DISPLAY: Record<NonNullable<JobFit>, FitDisplay> = {
  HIGH:   { label: 'Strong Fit',  color: 'bg-green-100 text-green-800',   description: 'Strong alignment with your background', score_range: '70–100' },
  MEDIUM: { label: 'Partial Fit', color: 'bg-yellow-100 text-yellow-800', description: 'Some alignment, gaps to address',        score_range: '40–69' },
  LOW:    { label: 'Weak Fit',    color: 'bg-red-100 text-red-700',       description: 'Significant gaps or misalignment',       score_range: '0–39' },
}

export function humanizeFit(fit: string | null | undefined): FitDisplay {
  if (!fit) return { label: '—', color: 'bg-gray-100 text-gray-500', description: '', score_range: '' }
  return FIT_DISPLAY[fit as NonNullable<JobFit>] ?? { label: fit, color: 'bg-gray-100 text-gray-600', description: '', score_range: '' }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE SOURCE TYPE
// ─────────────────────────────────────────────────────────────────────────────

type EvidenceSourceType =
  | 'work_experience' | 'project' | 'portfolio_entry' | 'shipped_product'
  | 'live_site' | 'achievement' | 'certification' | 'publication'
  | 'open_source' | 'education' | 'skill'

const EVIDENCE_SOURCE_TYPE_LABELS: Record<EvidenceSourceType, string> = {
  work_experience:  'Work Experience',
  project:          'Project',
  portfolio_entry:  'Portfolio Entry',
  shipped_product:  'Shipped Product',
  live_site:        'Live Site',
  achievement:      'Achievement',
  certification:    'Certification',
  publication:      'Publication',
  open_source:      'Open Source',
  education:        'Education',
  skill:            'Skill',
}

export function humanizeEvidenceSourceType(type: string | null | undefined): string {
  if (!type) return '—'
  return EVIDENCE_SOURCE_TYPE_LABELS[type as EvidenceSourceType] ?? type
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE LEVEL
// ─────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_DISPLAY: Record<'high' | 'medium' | 'low', { label: string; color: string }> = {
  high:   { label: 'High confidence',   color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium confidence', color: 'bg-yellow-100 text-yellow-800' },
  low:    { label: 'Low confidence',    color: 'bg-gray-100 text-gray-600' },
}

export function humanizeConfidence(level: string | null | undefined): { label: string; color: string } {
  if (!level) return { label: '—', color: 'bg-gray-100 text-gray-500' }
  return CONFIDENCE_DISPLAY[level as 'high' | 'medium' | 'low'] ?? { label: level, color: 'bg-gray-100 text-gray-600' }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE WEIGHT
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeEvidenceWeight(weight: string | null | undefined): string {
  const map: Record<string, string> = {
    highest: 'Highest priority',
    high:    'High priority',
    medium:  'Medium priority',
    low:     'Low priority',
  }
  return weight ? (map[weight] ?? weight) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// VISIBILITY STATUS
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeVisibilityStatus(status: string | null | undefined): string {
  const map: Record<string, string> = {
    active:   'Active',
    hidden:   'Hidden',
    archived: 'Archived',
  }
  return status ? (map[status] ?? status) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanDisplay {
  label: string
  badge: string
  color: string
  isPro: boolean
}

const PLAN_DISPLAY: Record<string, PlanDisplay> = {
  free: { label: 'Free Plan', badge: 'Free', color: 'bg-gray-100 text-gray-600', isPro: false },
  pro:  { label: 'Pro',       badge: 'Pro',  color: 'bg-black text-white',       isPro: true },
}

export function humanizePlan(planType: string | null | undefined): PlanDisplay {
  if (!planType) return PLAN_DISPLAY.free
  return PLAN_DISPLAY[planType] ?? PLAN_DISPLAY.free
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION STRATEGY
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeGenerationStrategy(strategy: string | null | undefined): string {
  const map: Record<string, string> = {
    direct_match:        'Direct Match — evidence strongly supports this role',
    adjacent_transition: 'Adjacent Transition — transferable experience emphasized',
    stretch_honest:      'Stretch Role — gaps acknowledged, learning ability foregrounded',
    do_not_generate:     'Generation Blocked — role too much of a stretch',
  }
  return strategy ? (map[strategy] ?? strategy) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB SOURCE (ATS platform)
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeJobSource(source: string | null | undefined): string {
  const map: Record<string, string> = {
    GREENHOUSE:      'Greenhouse',
    LEVER:           'Lever',
    WORKDAY:         'Workday',
    LINKEDIN:        'LinkedIn',
    INDEED:          'Indeed',
    ASHBY:           'Ashby',
    ICIMS:           'iCIMS',
    SMARTRECRUITERS: 'SmartRecruiters',
    MANUAL:          'Manual Entry',
    OTHER:           'Other',
  }
  return source ? (map[source] ?? source) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUME TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeResumeTemplate(template: string | null | undefined): string {
  const map: Record<string, string> = {
    professional_cv:      'Professional CV',
    technical_resume:     'Technical Resume',
    non_technical_resume: 'Non-Technical Resume',
    classic_ats:          'Classic ATS',
    technical_ats:        'Technical (ATS)',
    executive_minimal:    'Executive Minimal',
    product_manager:      'Product Manager',
    premium_minimal:      'Premium Minimal',
    early_career:         'Early Career',
    recruiter_first:      'Recruiter-First',
  }
  return template ? (map[template] ?? template) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// SENIORITY LEVEL
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeSeniority(level: string | null | undefined): string {
  const map: Record<string, string> = {
    Entry:     'Entry Level',
    Mid:       'Mid Level',
    Senior:    'Senior',
    Lead:      'Lead',
    Principal: 'Principal',
    Director:  'Director',
    VP:        'VP',
    'C-Level': 'C-Level / Executive',
  }
  return level ? (map[level] ?? level) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// ATS AUDIT SEVERITY
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeAuditSeverity(severity: string | null | undefined): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
    warning:  { label: 'Warning',  color: 'bg-amber-100 text-amber-800' },
    info:     { label: 'Info',     color: 'bg-blue-100 text-blue-700' },
  }
  return severity ? (map[severity] ?? { label: severity, color: 'bg-gray-100 text-gray-600' }) : { label: '—', color: '' }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATES — relative and formatted
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a relative time string: "3 minutes ago", "2 days ago", "just now". Safe with null/undefined — returns "—" */
export function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 30)  return 'just now'
  if (diffSec < 60)  return `${diffSec} seconds ago`

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60)  return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)   return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7)   return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`

  const diffWk = Math.floor(diffDay / 7)
  if (diffWk < 5)    return diffWk === 1 ? '1 week ago' : `${diffWk} weeks ago`

  const diffMo = Math.floor(diffDay / 30)
  if (diffMo < 12)   return diffMo === 1 ? '1 month ago' : `${diffMo} months ago`

  const diffYr = Math.floor(diffDay / 365)
  return diffYr === 1 ? '1 year ago' : `${diffYr} years ago`
}

/** Returns a short formatted date: "May 7, 2026" */
export function shortDate(dateStr: string | null | undefined, locale = 'en-US'): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Returns a full formatted datetime: "May 7, 2026 at 3:42 PM" */
export function fullDateTime(dateStr: string | null | undefined, locale = 'en-US'): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Returns a cover-letter–safe date: "May 7, 2026" */
export function coverLetterDate(locale = 'en-US'): string {
  return new Date().toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────────────────
// NUMBERS
// ─────────────────────────────────────────────────────────────────────────────

/** Compact number formatting: 1200 → "1.2K", 1500000 → "1.5M" */
export function compactNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Ordinal: 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th" */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

/** Pluralize: pluralize('application', 3) → "3 applications" */
export function pluralize(word: string, count: number, plural?: string): string {
  if (count === 1) return `1 ${word}`
  return `${count} ${plural ?? word + 's'}`
}

/** Score display: 78 → "78 / 100" */
export function scoreDisplay(score: number | null | undefined): string {
  if (score == null || isNaN(score)) return '—'
  return `${Math.round(score)} / 100`
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION METHOD
// ─────────────────────────────────────────────────────────────────────────────

export function humanizeApplicationMethod(method: string | null | undefined): string {
  const map: Record<string, string> = {
    manual:    'Applied manually',
    email:     'Applied via email',
    portal:    'Applied via portal',
    recruiter: 'Applied via recruiter',
  }
  return method ? (map[method] ?? method) : 'Applied'
}
