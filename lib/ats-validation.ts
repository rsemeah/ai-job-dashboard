/**
 * ATS Validation System
 * 
 * Validates documents for ATS (Applicant Tracking System) compatibility
 * and export safety before download/copy.
 */

import { checkDocumentSafety, type DocumentSafetyCheck, type ClaimIssue } from "./claim-safety"
import type { BulletProvenance } from "./truthserum"

// ============================================================================
// TYPES
// ============================================================================

export type AuditSeverity = "critical" | "warning" | "info"
export type AuditCategory = "content" | "formatting" | "ats" | "safety"

export interface AuditItem {
  id: string
  category: AuditCategory
  severity: AuditSeverity
  title: string
  description: string
  location?: string
  can_override: boolean
  suggested_fix?: string
}

export interface ExportAuditResult {
  document_type: "resume" | "cover_letter"
  export_format: "docx" | "txt" | "html" | "copy"
  
  // Overall status
  can_export: boolean
  requires_override: boolean
  overall_score: number // 0-100
  
  // Audit items by category
  content_issues: AuditItem[]
  formatting_issues: AuditItem[]
  ats_issues: AuditItem[]
  safety_issues: AuditItem[]
  
  // Summary counts
  critical_count: number
  warning_count: number
  info_count: number
  
  // Safety check integration
  safety_check: DocumentSafetyCheck | null
  
  // User message
  summary_message: string
}

// ============================================================================
// AUDIT RULES
// ============================================================================

const ATS_RULES = {
  // Contact info must be parseable
  contact_required: true,
  // These sections should be standard
  standard_sections: ["experience", "education", "skills"],
  // Avoid these in ATS-focused exports
  risky_elements: ["tables", "columns", "graphics", "headers", "footers"],
  // Font safety
  safe_fonts: ["Arial", "Calibri", "Times New Roman", "Helvetica", "Georgia"],
  // Date formats ATS can parse
  date_formats: [
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i,
    /\b\d{4}\s*[-–]\s*(Present|\d{4})\b/i,
  ],
}

const REQUIRED_CONTACT_FIELDS = ["name", "email"]
const RECOMMENDED_CONTACT_FIELDS = ["phone", "location"]

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

/**
 * Run a complete export audit on a document
 */
export function runExportAudit(
  documentText: string,
  documentType: "resume" | "cover_letter",
  exportFormat: "docx" | "txt" | "html" | "copy",
  options: {
    candidateName?: string
    candidateEmail?: string
    candidatePhone?: string
    provenanceMap?: Map<string, BulletProvenance>
    templateId?: string
  } = {}
): ExportAuditResult {
  const items: AuditItem[] = []
  let itemIndex = 0

  // Run content/safety checks
  const safetyCheck = options.provenanceMap
    ? checkDocumentSafety(documentText, options.provenanceMap, documentType)
    : null

  // Add safety issues
  if (safetyCheck) {
    for (const issue of safetyCheck.issues) {
      items.push({
        id: `audit-${itemIndex++}`,
        category: "safety",
        severity: issue.severity,
        title: getSafetyTitle(issue.issue_type),
        description: issue.description,
        location: issue.claim_text,
        can_override: issue.severity !== "critical",
        suggested_fix: issue.suggested_fix,
      })
    }
  }

  // Check contact information
  const contactAudit = auditContactInfo(documentText, options)
  items.push(...contactAudit.map(item => ({ ...item, id: `audit-${itemIndex++}` })))

  // Check content quality
  const contentAudit = auditContent(documentText, documentType)
  items.push(...contentAudit.map(item => ({ ...item, id: `audit-${itemIndex++}` })))

  // Check ATS compatibility (mainly for DOCX/TXT)
  if (exportFormat === "docx" || exportFormat === "txt") {
    const atsAudit = auditATSCompatibility(documentText)
    items.push(...atsAudit.map(item => ({ ...item, id: `audit-${itemIndex++}` })))
  }

  // Categorize items
  const content_issues = items.filter(i => i.category === "content")
  const formatting_issues = items.filter(i => i.category === "formatting")
  const ats_issues = items.filter(i => i.category === "ats")
  const safety_issues = items.filter(i => i.category === "safety")

  // Count by severity
  const critical_count = items.filter(i => i.severity === "critical").length
  const warning_count = items.filter(i => i.severity === "warning").length
  const info_count = items.filter(i => i.severity === "info").length

  // Determine export status
  const hasCritical = critical_count > 0
  const hasNonOverridable = items.some(i => !i.can_override)

  // Calculate score
  let score = 100
  score -= critical_count * 20
  score -= warning_count * 5
  score -= info_count * 1
  score = Math.max(0, Math.min(100, score))

  // Generate summary message
  const summaryMessage = generateSummaryMessage(critical_count, warning_count, hasCritical)

  return {
    document_type: documentType,
    export_format: exportFormat,
    can_export: !hasNonOverridable,
    requires_override: hasCritical && !hasNonOverridable,
    overall_score: score,
    content_issues,
    formatting_issues,
    ats_issues,
    safety_issues,
    critical_count,
    warning_count,
    info_count,
    safety_check: safetyCheck,
    summary_message: summaryMessage,
  }
}

// ============================================================================
// AUDIT HELPERS
// ============================================================================

function auditContactInfo(
  text: string,
  options: { candidateName?: string; candidateEmail?: string; candidatePhone?: string }
): Omit<AuditItem, "id">[] {
  const issues: Omit<AuditItem, "id">[] = []

  // Check for name
  const hasName = options.candidateName || /^[A-Z][a-z]+\s+[A-Z][a-z]+/m.test(text)
  if (!hasName) {
    issues.push({
      category: "content",
      severity: "critical",
      title: "Missing name",
      description: "Your name should appear prominently at the top of the document",
      can_override: false,
      suggested_fix: "Add your full name at the top of the document",
    })
  }

  // Check for email
  const hasEmail = options.candidateEmail || /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)
  if (!hasEmail) {
    issues.push({
      category: "content",
      severity: "critical",
      title: "Missing email",
      description: "An email address is required for employers to contact you",
      can_override: false,
      suggested_fix: "Add your email address to the contact section",
    })
  }

  // Check for phone (warning, not critical)
  const hasPhone = options.candidatePhone || /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)
  if (!hasPhone) {
    issues.push({
      category: "content",
      severity: "warning",
      title: "No phone number",
      description: "Including a phone number makes it easier for recruiters to reach you",
      can_override: true,
      suggested_fix: "Consider adding a phone number",
    })
  }

  return issues
}

function auditContent(
  text: string,
  documentType: "resume" | "cover_letter"
): Omit<AuditItem, "id">[] {
  const issues: Omit<AuditItem, "id">[] = []

  // Check document length
  const wordCount = text.split(/\s+/).length
  
  if (documentType === "resume") {
    if (wordCount < 150) {
      issues.push({
        category: "content",
        severity: "warning",
        title: "Resume seems short",
        description: `Only ${wordCount} words. Most effective resumes have 300-700 words.`,
        can_override: true,
        suggested_fix: "Consider adding more detail about your achievements",
      })
    }
    if (wordCount > 1200) {
      issues.push({
        category: "content",
        severity: "warning",
        title: "Resume may be too long",
        description: `${wordCount} words. Consider focusing on the most relevant experience.`,
        can_override: true,
      })
    }
  }

  if (documentType === "cover_letter") {
    if (wordCount < 100) {
      issues.push({
        category: "content",
        severity: "warning",
        title: "Cover letter seems short",
        description: `Only ${wordCount} words. A compelling cover letter typically has 250-400 words.`,
        can_override: true,
      })
    }
    if (wordCount > 600) {
      issues.push({
        category: "content",
        severity: "info",
        title: "Cover letter may be long",
        description: `${wordCount} words. Hiring managers often prefer concise letters.`,
        can_override: true,
      })
    }
  }

  // Check for bullet density in resumes
  if (documentType === "resume") {
    const bulletLines = text.split("\n").filter(line => 
      line.trim().startsWith("•") || 
      line.trim().startsWith("-") ||
      line.trim().startsWith("*")
    ).length

    if (bulletLines < 5) {
      issues.push({
        category: "content",
        severity: "info",
        title: "Few bullet points",
        description: "Bullet points help recruiters scan your experience quickly",
        can_override: true,
      })
    }
  }

  return issues
}

function auditATSCompatibility(text: string): Omit<AuditItem, "id">[] {
  const issues: Omit<AuditItem, "id">[] = []

  // Check for standard section headers
  const hasExperience = /\b(experience|work history|employment)\b/i.test(text)
  const hasEducation = /\b(education|academic)\b/i.test(text)
  const hasSkills = /\b(skills|technical skills|core competencies)\b/i.test(text)

  if (!hasExperience) {
    issues.push({
      category: "ats",
      severity: "warning",
      title: "Missing Experience section header",
      description: "ATS systems look for standard section headers like 'Experience' or 'Work History'",
      can_override: true,
      suggested_fix: "Use 'Experience' or 'Work History' as your section header",
    })
  }

  if (!hasEducation) {
    issues.push({
      category: "ats",
      severity: "info",
      title: "No Education section detected",
      description: "Most ATS systems expect an Education section",
      can_override: true,
    })
  }

  // Check date format
  const hasParseableDates = ATS_RULES.date_formats.some(pattern => pattern.test(text))
  if (!hasParseableDates) {
    issues.push({
      category: "ats",
      severity: "info",
      title: "Date format may not parse well",
      description: "Use formats like 'Jan 2020 - Present' or '2018 - 2022' for best ATS compatibility",
      can_override: true,
    })
  }

  return issues
}

function getSafetyTitle(issueType: string): string {
  const titles: Record<string, string> = {
    unsupported: "Unsupported claim",
    vague: "Vague language",
    invented_metric: "Unverified metric",
    banned_phrase: "Generic phrasing",
    ownership_unclear: "Unclear ownership",
  }
  return titles[issueType] || "Content issue"
}

function generateSummaryMessage(critical: number, warning: number, blocked: boolean): string {
  if (blocked) {
    return `${critical} critical issue${critical !== 1 ? "s" : ""} must be resolved before exporting`
  }
  if (critical > 0) {
    return `${critical} issue${critical !== 1 ? "s" : ""} found. You can override and export, but consider addressing them.`
  }
  if (warning > 0) {
    return `${warning} suggestion${warning !== 1 ? "s" : ""} to improve your document`
  }
  return "Your document is ready to export"
}

// ============================================================================
// QUICK CHECK FUNCTION
// ============================================================================

/**
 * Quick check for export eligibility without full audit
 */
export function canExportQuick(
  documentText: string,
  options: { candidateName?: string; candidateEmail?: string } = {}
): { canExport: boolean; reason?: string } {
  // Must have name and email
  const hasName = options.candidateName || /^[A-Z][a-z]+\s+[A-Z][a-z]+/m.test(documentText)
  const hasEmail = options.candidateEmail || /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(documentText)

  if (!hasName) {
    return { canExport: false, reason: "Missing name in document" }
  }
  if (!hasEmail) {
    return { canExport: false, reason: "Missing email in document" }
  }

  // Check minimum content
  if (documentText.length < 200) {
    return { canExport: false, reason: "Document is too short" }
  }

  return { canExport: true }
}
