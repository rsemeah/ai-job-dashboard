/**
 * Claim Safety System
 * 
 * Classifies claims by confidence level and source verification.
 * Used for both generation-time safety and UI trust indicators.
 */

import type { BulletProvenance } from "./truthserum"

// ============================================================================
// TYPES
// ============================================================================

export type ClaimConfidence =
  | "source_verified"      // Directly from uploaded evidence with proof
  | "user_confirmed"       // Explicitly entered or approved by user
  | "normalized_rewrite"   // Same meaning as verified source, rephrased
  | "plausible_inferred"   // Reasonable inference, not explicitly stated
  | "unsupported_blocked"  // Would require invention - BLOCKED

export interface ClaimAssessment {
  claim_text: string
  confidence: ClaimConfidence
  source_evidence_id?: string
  source_description?: string
  risk_flags: string[]
  can_use_in_resume: boolean
  can_use_in_cover_letter: boolean
  needs_user_confirmation: boolean
  suggested_action?: "use" | "confirm" | "rewrite" | "block"
  rewrite_suggestion?: string
}

export interface DocumentSafetyCheck {
  document_type: "resume" | "cover_letter"
  total_claims: number
  verified_claims: number
  needs_confirmation: number
  blocked_claims: number
  overall_safe: boolean
  safety_score: number // 0-100
  issues: ClaimIssue[]
  can_export: boolean
  export_warning?: string
}

export interface ClaimIssue {
  id: string
  severity: "critical" | "warning" | "info"
  claim_text: string
  issue_type: "unsupported" | "vague" | "invented_metric" | "banned_phrase" | "ownership_unclear"
  description: string
  location?: string
  suggested_fix?: string
}

// ============================================================================
// CONFIDENCE CLASSIFICATION
// ============================================================================

/**
 * Classify a claim's confidence level based on provenance
 */
export function classifyClaimConfidence(
  bulletProvenance: BulletProvenance | null,
  hasExplicitMetric: boolean = false,
  userApproved: boolean = false
): ClaimConfidence {
  if (!bulletProvenance) {
    return "unsupported_blocked"
  }

  // High confidence from user or strong evidence
  if (userApproved) {
    return "user_confirmed"
  }

  if (bulletProvenance.claim_confidence === "high" && bulletProvenance.source_evidence_id) {
    return "source_verified"
  }

  // Medium confidence - normalized rewrite
  if (bulletProvenance.claim_confidence === "medium" && bulletProvenance.source_evidence_id) {
    return "normalized_rewrite"
  }

  // Low confidence but has source - needs confirmation
  if (bulletProvenance.source_evidence_id) {
    return "plausible_inferred"
  }

  // No source - blocked
  return "unsupported_blocked"
}

/**
 * Assess a single claim for safety
 */
export function assessClaim(
  claimText: string,
  provenance: BulletProvenance | null,
  context: {
    userApproved?: boolean
    hasExplicitMetric?: boolean
    evidenceSource?: string
  } = {}
): ClaimAssessment {
  const confidence = classifyClaimConfidence(
    provenance,
    context.hasExplicitMetric,
    context.userApproved
  )

  const riskFlags: string[] = []

  // Check for invented metrics
  if (hasInventedMetric(claimText)) {
    riskFlags.push("potentially_invented_metric")
  }

  // Check for ownership inflation
  if (hasOwnershipInflation(claimText)) {
    riskFlags.push("ownership_unclear")
  }

  // Check for vague language
  if (isVague(claimText)) {
    riskFlags.push("vague_language")
  }

  // Check for banned phrases
  const bannedPhrase = containsBannedPhrase(claimText)
  if (bannedPhrase) {
    riskFlags.push(`banned_phrase:${bannedPhrase}`)
  }

  // Determine usability
  const isBlocked = confidence === "unsupported_blocked"
  const needsConfirmation = confidence === "plausible_inferred" || riskFlags.length > 0

  return {
    claim_text: claimText,
    confidence,
    source_evidence_id: provenance?.source_evidence_id,
    source_description: provenance?.source_evidence_title,
    risk_flags: riskFlags,
    can_use_in_resume: !isBlocked,
    can_use_in_cover_letter: !isBlocked,
    needs_user_confirmation: needsConfirmation,
    suggested_action: isBlocked ? "block" : needsConfirmation ? "confirm" : "use",
    rewrite_suggestion: isVague(claimText) ? generateRewriteSuggestion(claimText) : undefined,
  }
}

/**
 * Check an entire document for safety issues
 */
export function checkDocumentSafety(
  documentText: string,
  provenanceMap: Map<string, BulletProvenance>,
  documentType: "resume" | "cover_letter"
): DocumentSafetyCheck {
  const lines = documentText.split("\n").filter(line => line.trim())
  const issues: ClaimIssue[] = []
  let issueIndex = 0

  let verifiedClaims = 0
  let needsConfirmation = 0
  let blockedClaims = 0

  for (const line of lines) {
    // Skip headers and short lines
    if (line.length < 20 || isHeaderLine(line)) continue

    const provenance = findProvenanceForLine(line, provenanceMap)
    const assessment = assessClaim(line, provenance)

    if (assessment.confidence === "source_verified" || assessment.confidence === "user_confirmed") {
      verifiedClaims++
    } else if (assessment.confidence === "unsupported_blocked") {
      blockedClaims++
      issues.push({
        id: `issue-${issueIndex++}`,
        severity: "critical",
        claim_text: truncate(line, 100),
        issue_type: "unsupported",
        description: "This claim is not supported by your evidence",
        suggested_fix: "Add supporting evidence or remove this claim",
      })
    } else if (assessment.needs_user_confirmation) {
      needsConfirmation++
      if (assessment.risk_flags.length > 0) {
        const issueType = assessment.risk_flags[0].includes("banned") ? "banned_phrase" :
          assessment.risk_flags[0].includes("invented") ? "invented_metric" :
          assessment.risk_flags[0].includes("vague") ? "vague" : "ownership_unclear"

        issues.push({
          id: `issue-${issueIndex++}`,
          severity: "warning",
          claim_text: truncate(line, 100),
          issue_type: issueType,
          description: getIssueDescription(assessment.risk_flags[0]),
          suggested_fix: assessment.rewrite_suggestion,
        })
      }
    }
  }

  const totalClaims = verifiedClaims + needsConfirmation + blockedClaims
  const safetyScore = totalClaims > 0 
    ? Math.round(((verifiedClaims + needsConfirmation * 0.5) / totalClaims) * 100)
    : 100

  const hasCriticalIssues = issues.some(i => i.severity === "critical")
  const hasMultipleWarnings = issues.filter(i => i.severity === "warning").length > 3

  return {
    document_type: documentType,
    total_claims: totalClaims,
    verified_claims: verifiedClaims,
    needs_confirmation: needsConfirmation,
    blocked_claims: blockedClaims,
    overall_safe: !hasCriticalIssues && !hasMultipleWarnings,
    safety_score: safetyScore,
    issues: issues.slice(0, 10), // Return top 10 issues
    can_export: blockedClaims === 0,
    export_warning: hasCriticalIssues 
      ? "Document contains unsupported claims that should be addressed before exporting"
      : hasMultipleWarnings 
        ? "Several claims may need strengthening"
        : undefined,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hasInventedMetric(text: string): boolean {
  // Check for suspiciously round numbers that might be invented
  const suspiciousPatterns = [
    /increased.*by\s+exactly\s+\d+%/i,
    /\b(100|200|500|1000)\s*(percent|%|x)/i,
    /saved.*\$\d{6,}/i, // Large dollar amounts
  ]
  return suspiciousPatterns.some(pattern => pattern.test(text))
}

function hasOwnershipInflation(text: string): boolean {
  // Check for ownership claims that might be inflated
  const inflationPatterns = [
    /single-handedly/i,
    /solely responsible/i,
    /completely transformed/i,
    /revolutionized/i,
  ]
  return inflationPatterns.some(pattern => pattern.test(text))
}

function isVague(text: string): boolean {
  const vaguePatterns = [
    /various\s+(projects|tasks|responsibilities)/i,
    /helped with/i,
    /assisted in/i,
    /worked on/i,
    /responsible for/i,
    /handled\s+multiple/i,
  ]
  return vaguePatterns.some(pattern => pattern.test(text))
}

const BANNED_PHRASES = [
  "results driven",
  "team player",
  "fast learner",
  "think outside the box",
  "go-getter",
  "passionate about",
  "leverage my skills",
  "hit the ground running",
  "synergy",
  "proactive",
]

function containsBannedPhrase(text: string): string | null {
  const textLower = text.toLowerCase()
  for (const phrase of BANNED_PHRASES) {
    if (textLower.includes(phrase)) {
      return phrase
    }
  }
  return null
}

function isHeaderLine(line: string): boolean {
  const headerPatterns = [
    /^[A-Z\s]{2,}$/, // ALL CAPS
    /^(experience|education|skills|projects|summary|objective|certifications)/i,
    /^\d{4}\s*[-–]\s*(present|\d{4})$/i, // Date ranges
  ]
  return headerPatterns.some(pattern => pattern.test(line.trim()))
}

function findProvenanceForLine(
  line: string,
  provenanceMap: Map<string, BulletProvenance>
): BulletProvenance | null {
  // Try exact match first
  if (provenanceMap.has(line)) {
    return provenanceMap.get(line)!
  }

  // Try partial match
  for (const [key, value] of provenanceMap) {
    if (line.includes(key) || key.includes(line)) {
      return value
    }
  }

  return null
}

function generateRewriteSuggestion(text: string): string {
  if (text.includes("responsible for")) {
    return "Try starting with an action verb like 'Led', 'Built', 'Designed', or 'Implemented'"
  }
  if (text.includes("helped with") || text.includes("assisted")) {
    return "Describe your specific contribution and measurable outcome"
  }
  if (text.includes("various")) {
    return "Be specific about what you worked on and quantify the scope"
  }
  return "Add specific details, metrics, or outcomes"
}

function getIssueDescription(riskFlag: string): string {
  if (riskFlag.includes("banned")) {
    const phrase = riskFlag.split(":")[1]
    return `Contains generic phrase "${phrase}" that weakens your resume`
  }
  if (riskFlag.includes("invented")) {
    return "Metric may not be supported by your evidence"
  }
  if (riskFlag.includes("vague")) {
    return "This bullet is too vague and could apply to anyone"
  }
  if (riskFlag.includes("ownership")) {
    return "Ownership level is unclear - did you lead or participate?"
  }
  return "This claim may need verification"
}

function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length - 3) + "..."
}

// ============================================================================
// UI HELPERS
// ============================================================================

export function getConfidenceLabel(confidence: ClaimConfidence): string {
  const labels: Record<ClaimConfidence, string> = {
    source_verified: "Verified",
    user_confirmed: "Confirmed",
    normalized_rewrite: "Rephrased",
    plausible_inferred: "Inferred",
    unsupported_blocked: "Unsupported",
  }
  return labels[confidence]
}

export function getConfidenceColor(confidence: ClaimConfidence): string {
  const colors: Record<ClaimConfidence, string> = {
    source_verified: "text-green-600",
    user_confirmed: "text-green-600",
    normalized_rewrite: "text-blue-600",
    plausible_inferred: "text-amber-600",
    unsupported_blocked: "text-destructive",
  }
  return colors[confidence]
}

export function getConfidenceBadgeVariant(confidence: ClaimConfidence): "default" | "secondary" | "outline" | "destructive" {
  const variants: Record<ClaimConfidence, "default" | "secondary" | "outline" | "destructive"> = {
    source_verified: "default",
    user_confirmed: "default",
    normalized_rewrite: "secondary",
    plausible_inferred: "outline",
    unsupported_blocked: "destructive",
  }
  return variants[confidence]
}
