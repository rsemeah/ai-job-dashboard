/**
 * Canonical Evidence Model
 * 
 * This module provides a normalized evidence layer that merges signals from:
 * - user_profile (manual profile data)
 * - source_resumes (uploaded resumes)
 * - evidence_library (structured evidence records)
 * - website/portfolio (future)
 * - LinkedIn/GitHub (future)
 * 
 * Every evidence item carries provenance, confidence, and approval status.
 * This enables trustworthy, traceable document generation.
 */

import type { EvidenceRecord, UserProfile, ProfileExperience } from "./types"

// ============================================================================
// CANONICAL EVIDENCE TYPES
// ============================================================================

export type EvidenceSource = 
  | "user_profile"
  | "source_resume"
  | "evidence_library"
  | "website"
  | "linkedin"
  | "github"
  | "user_input"
  | "ai_inferred"

export type EvidenceType =
  | "work_experience"
  | "project"
  | "achievement"
  | "skill"
  | "certification"
  | "education"
  | "publication"
  | "portfolio_entry"
  | "shipped_product"
  | "open_source"
  | "metric"
  | "testimonial"

export type QuantificationSafety =
  | "explicit_metric"       // User-provided or source-documented number
  | "derived_metric"        // Deterministically calculated from known inputs
  | "qualitative_supported" // Directional claim supported by evidence
  | "unsupported_blocked"   // Would require invention - BLOCKED

export type RequirementMatchType =
  | "direct_match"          // Evidence directly proves this requirement
  | "partial_match"         // Evidence partially covers this requirement
  | "adjacent_transferable" // Related experience that transfers
  | "unsupported"           // Requirement not covered by evidence
  | "missing"               // No relevant evidence found

export type GapCategory =
  | "missing_evidence"      // Have the experience, just not documented
  | "missing_skill"         // Don't have the skill
  | "missing_direct_experience" // Have adjacent experience, not direct
  | "weak_phrasing"         // Evidence exists but poorly stated
  | "unsupported_claim"     // Claim made without evidence
  | "transferable_unproven" // Could transfer but not demonstrated

// ============================================================================
// CANONICAL EVIDENCE OBJECT
// ============================================================================

export interface CanonicalEvidence {
  id: string
  source: EvidenceSource
  source_id?: string           // ID from source table (evidence_library.id, etc.)
  
  // Core content
  text: string                 // The actual evidence text/claim
  title?: string               // Title/header if applicable
  evidence_type: EvidenceType
  
  // Context
  company?: string
  role?: string
  date_range?: string
  
  // Confidence and quality
  confidence: "high" | "medium" | "low"
  is_verified: boolean         // Has user explicitly verified this?
  
  // Tags and categorization
  tags: string[]
  skills: string[]
  industries: string[]
  
  // Approval status for different outputs
  approved_for_resume: boolean
  approved_for_cover_letter: boolean
  approved_for_interview: boolean
  
  // Quantification safety
  quantification_safety: QuantificationSafety
  numeric_claims: NumericClaim[]
  
  // Requirement matching (populated during job analysis)
  requirement_matches?: RequirementMatch[]
}

export interface NumericClaim {
  claim_text: string           // "reduced churn by 25%"
  value: string                // "25%"
  safety: QuantificationSafety
  source_proof?: string        // Where this number came from
  is_blocked: boolean          // Should this be blocked from generation?
}

export interface RequirementMatch {
  requirement_id: string
  requirement_text: string
  match_type: RequirementMatchType
  evidence_strength: number    // 0-100
  reasoning: string
}

// ============================================================================
// FIT SCORING TYPES (EXPLAINABLE)
// ============================================================================

export type FitBand = 
  | "strong_match"
  | "moderate_match"
  | "stretch_but_viable"
  | "low_match"

export interface ExplainableFitScore {
  // Summary
  band: FitBand
  score: number                // 0-100, only shown if explainable
  confidence: "high" | "medium" | "low"
  
  // Breakdown
  matched_requirements_count: number
  partial_matches_count: number
  missing_requirements_count: number
  total_requirements_count: number
  
  // Detailed matches
  strengths: FitStrength[]
  gaps: FitGap[]
  
  // Scoring explanation
  score_explanation: string
  dimension_scores: DimensionScores
  
  // Warnings
  warnings: string[]
}

export interface FitStrength {
  requirement: string
  evidence_text: string
  evidence_source: EvidenceSource
  match_type: RequirementMatchType
  confidence: "high" | "medium" | "low"
}

export interface FitGap {
  requirement: string
  gap_category: GapCategory
  severity: "critical" | "moderate" | "minor"
  suggestion?: string          // How to address this gap
  transferable_evidence?: string // Related evidence that might help
}

export interface DimensionScores {
  experience: number           // Years and depth of relevant experience
  evidence: number             // Quality and quantity of proof
  skills: number               // Technical skill match
  seniority: number            // Level alignment
  ats: number                  // Keyword coverage
}

// ============================================================================
// QUANTIFICATION POLICY
// ============================================================================

/**
 * Strict quantification policy for HireWire
 * 
 * ALLOWED:
 * - User-provided numbers
 * - Numbers found in uploaded resume, website, LinkedIn, or structured evidence
 * - Deterministic derivations from known inputs
 * 
 * CONDITIONALLY ALLOWED:
 * - Directional qualitative phrasing (reduced, improved, increased)
 *   Only when directly supported by underlying project/role evidence
 * 
 * NOT ALLOWED:
 * - Invented percentages
 * - Invented time saved
 * - Invented revenue impact
 * - Invented churn reduction
 * - Invented adoption gains
 * - Invented conversion uplift
 */

export const UNSAFE_METRIC_PATTERNS = [
  /reduced\s+(?:churn|costs?|time|errors?|bugs?)\s+by\s+\d+%/i,
  /increased\s+(?:revenue|sales|conversion|adoption|engagement)\s+by\s+\d+%/i,
  /improved\s+(?:efficiency|productivity|performance)\s+by\s+\d+%/i,
  /saved\s+\$[\d,]+[kKmM]?/i,
  /generated\s+\$[\d,]+[kKmM]?\s+in\s+(?:revenue|savings)/i,
  /grew\s+(?:team|user\s*base|customer\s*base)\s+by\s+\d+%/i,
  /achieved\s+\d+%\s+(?:improvement|reduction|increase)/i,
  /\d+x\s+(?:improvement|faster|better|more)/i,
]

export const SAFE_QUALITATIVE_ALTERNATIVES: Record<string, string> = {
  "reduced churn by X%": "Improved customer retention visibility by identifying behavioral patterns",
  "increased revenue by X%": "Strengthened revenue operations through systematic pipeline improvements",
  "improved efficiency by X%": "Streamlined workflows reducing manual touchpoints",
  "saved $X": "Delivered cost efficiencies through process automation",
  "grew team by X%": "Scaled team capabilities to meet growing product demands",
  "achieved X% improvement": "Drove measurable improvements through data-driven iteration",
}

/**
 * Check if a claim contains unsafe/invented metrics
 */
export function detectUnsafeMetrics(text: string): { 
  has_unsafe: boolean
  unsafe_claims: string[]
  safe_alternatives: string[]
} {
  const unsafe_claims: string[] = []
  const safe_alternatives: string[] = []
  
  for (const pattern of UNSAFE_METRIC_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      unsafe_claims.push(match[0])
      
      // Find best alternative
      for (const [unsafe, safe] of Object.entries(SAFE_QUALITATIVE_ALTERNATIVES)) {
        if (match[0].toLowerCase().includes(unsafe.split(" ")[0].toLowerCase())) {
          safe_alternatives.push(safe)
          break
        }
      }
    }
  }
  
  return {
    has_unsafe: unsafe_claims.length > 0,
    unsafe_claims,
    safe_alternatives,
  }
}

/**
 * Classify the quantification safety of a bullet point
 */
export function classifyQuantificationSafety(
  bullet: string,
  knownMetrics: Set<string> = new Set()
): QuantificationSafety {
  // Check for numeric claims
  const hasNumbers = /\d+/.test(bullet)
  
  if (!hasNumbers) {
    // No numbers - check if it's qualitative with support
    const qualitativeVerbs = /reduced|improved|increased|enhanced|accelerated|strengthened|streamlined/i
    if (qualitativeVerbs.test(bullet)) {
      return "qualitative_supported"
    }
    return "qualitative_supported" // No metrics, safe
  }
  
  // Has numbers - check if they're in known metrics
  const numbers = bullet.match(/\d+%?/g) || []
  const allKnown = numbers.every(n => knownMetrics.has(n))
  
  if (allKnown) {
    return "explicit_metric"
  }
  
  // Check for unsafe patterns
  const { has_unsafe } = detectUnsafeMetrics(bullet)
  if (has_unsafe) {
    return "unsupported_blocked"
  }
  
  // Has numbers but not in known metrics - could be derived
  return "derived_metric"
}

/**
 * Rewrite an unsafe metric claim to a safe qualitative version
 */
export function rewriteToQualitative(unsafeBullet: string): string {
  // Extract the core action and context
  const { unsafe_claims, safe_alternatives } = detectUnsafeMetrics(unsafeBullet)
  
  if (unsafe_claims.length > 0 && safe_alternatives.length > 0) {
    return safe_alternatives[0]
  }
  
  // Generic fallback rewrites
  if (/reduced.*\d+%/i.test(unsafeBullet)) {
    return unsafeBullet.replace(/reduced\s+\w+\s+by\s+\d+%/i, "achieved meaningful reduction in")
  }
  if (/increased.*\d+%/i.test(unsafeBullet)) {
    return unsafeBullet.replace(/increased\s+\w+\s+by\s+\d+%/i, "drove significant growth in")
  }
  if (/improved.*\d+%/i.test(unsafeBullet)) {
    return unsafeBullet.replace(/improved\s+\w+\s+by\s+\d+%/i, "strengthened")
  }
  
  return unsafeBullet
}

// ============================================================================
// EVIDENCE NORMALIZATION
// ============================================================================

/**
 * Convert a ProfileExperience to CanonicalEvidence items
 */
export function normalizeProfileExperience(
  exp: ProfileExperience,
  userId: string
): CanonicalEvidence[] {
  const items: CanonicalEvidence[] = []
  
  // Main experience entry
  items.push({
    id: `profile_exp_${exp.company}_${exp.title}`.replace(/\s+/g, "_"),
    source: "user_profile",
    text: exp.description || `${exp.title} at ${exp.company}`,
    title: exp.title,
    evidence_type: "work_experience",
    company: exp.company,
    role: exp.title,
    date_range: `${exp.start_date} - ${exp.end_date || "Present"}`,
    confidence: "high", // User-provided
    is_verified: true,
    tags: [],
    skills: [],
    industries: [],
    approved_for_resume: true,
    approved_for_cover_letter: true,
    approved_for_interview: true,
    quantification_safety: "qualitative_supported",
    numeric_claims: [],
  })
  
  // Extract highlights as separate evidence items
  if (exp.highlights) {
    for (const highlight of exp.highlights) {
      const safety = classifyQuantificationSafety(highlight)
      items.push({
        id: `profile_highlight_${exp.company}_${items.length}`.replace(/\s+/g, "_"),
        source: "user_profile",
        text: highlight,
        evidence_type: "achievement",
        company: exp.company,
        role: exp.title,
        date_range: `${exp.start_date} - ${exp.end_date || "Present"}`,
        confidence: "high",
        is_verified: true,
        tags: [],
        skills: [],
        industries: [],
        approved_for_resume: safety !== "unsupported_blocked",
        approved_for_cover_letter: safety !== "unsupported_blocked",
        approved_for_interview: true,
        quantification_safety: safety,
        numeric_claims: extractNumericClaims(highlight),
      })
    }
  }
  
  return items
}

/**
 * Convert an EvidenceRecord to CanonicalEvidence
 */
export function normalizeEvidenceRecord(
  record: EvidenceRecord
): CanonicalEvidence {
  // Combine all text fields for main text
  const textParts = [
    record.what_shipped,
    record.what_visible,
    record.proof_snippet,
    ...(record.outcomes || []),
  ].filter(Boolean)
  
  const mainText = textParts.join(". ") || record.source_title
  const safety = classifyQuantificationSafety(mainText)
  
  return {
    id: record.id,
    source: "evidence_library",
    source_id: record.id,
    text: mainText,
    title: record.source_title,
    evidence_type: record.source_type as EvidenceType,
    company: record.company_name || undefined,
    role: record.role_name || undefined,
    date_range: record.date_range || undefined,
    confidence: record.confidence_level,
    is_verified: record.is_user_approved,
    tags: [...(record.industries || []), ...(record.role_family_tags || [])],
    skills: record.tools_used || [],
    industries: record.industries || [],
    approved_for_resume: record.is_user_approved && safety !== "unsupported_blocked",
    approved_for_cover_letter: record.is_user_approved && safety !== "unsupported_blocked",
    approved_for_interview: true, // Always allow in interview prep
    quantification_safety: safety,
    numeric_claims: extractNumericClaims(mainText),
  }
}

/**
 * Extract numeric claims from text for safety tracking
 */
export function extractNumericClaims(text: string): NumericClaim[] {
  const claims: NumericClaim[] = []
  
  // Match patterns like "increased X by Y%", "$X revenue", "Y users"
  const patterns = [
    /(\w+\s+\w+\s+by\s+\d+%)/gi,
    /(\$[\d,]+[kKmM]?\s+(?:in\s+)?\w+)/gi,
    /([\d,]+\s+(?:users?|customers?|partners?|transactions?))/gi,
    /(\d+x\s+\w+)/gi,
  ]
  
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        const safety = classifyQuantificationSafety(match)
        claims.push({
          claim_text: match,
          value: match.match(/[\d,]+%?/)?.[0] || match,
          safety,
          is_blocked: safety === "unsupported_blocked",
        })
      }
    }
  }
  
  return claims
}

// ============================================================================
// REQUIREMENT MATCHING
// ============================================================================

/**
 * Match evidence against job requirements
 */
export function matchEvidenceToRequirement(
  evidence: CanonicalEvidence,
  requirement: string
): RequirementMatch {
  const requirementLower = requirement.toLowerCase()
  const evidenceLower = evidence.text.toLowerCase()
  const skillsLower = evidence.skills.map(s => s.toLowerCase())
  
  // Check for direct skill/keyword match
  const keywords = requirementLower.split(/\s+/).filter(w => w.length > 3)
  const matchedKeywords = keywords.filter(kw => 
    evidenceLower.includes(kw) || skillsLower.some(s => s.includes(kw))
  )
  
  const matchRatio = matchedKeywords.length / Math.max(keywords.length, 1)
  
  let match_type: RequirementMatchType
  let evidence_strength: number
  let reasoning: string
  
  if (matchRatio >= 0.7) {
    match_type = "direct_match"
    evidence_strength = 80 + (matchRatio * 20)
    reasoning = `Strong keyword overlap: ${matchedKeywords.join(", ")}`
  } else if (matchRatio >= 0.4) {
    match_type = "partial_match"
    evidence_strength = 50 + (matchRatio * 30)
    reasoning = `Partial keyword match: ${matchedKeywords.join(", ")}`
  } else if (matchRatio >= 0.2 || evidence.industries.some(i => requirementLower.includes(i.toLowerCase()))) {
    match_type = "adjacent_transferable"
    evidence_strength = 30 + (matchRatio * 40)
    reasoning = "Related experience that may transfer"
  } else {
    match_type = "unsupported"
    evidence_strength = matchRatio * 30
    reasoning = "Limited overlap with requirement"
  }
  
  return {
    requirement_id: requirement.slice(0, 50).replace(/\s+/g, "_"),
    requirement_text: requirement,
    match_type,
    evidence_strength: Math.round(evidence_strength),
    reasoning,
  }
}

/**
 * Calculate explainable fit score from evidence and requirements
 */
export function calculateExplainableFit(
  canonicalEvidence: CanonicalEvidence[],
  requirements: string[],
  preferredQualifications: string[] = [],
  dimensionScores: DimensionScores
): ExplainableFitScore {
  const strengths: FitStrength[] = []
  const gaps: FitGap[] = []
  const warnings: string[] = []
  
  let directMatches = 0
  let partialMatches = 0
  let missing = 0
  
  // Match each requirement against evidence
  for (const requirement of requirements) {
    let bestMatch: RequirementMatch | null = null
    let bestEvidence: CanonicalEvidence | null = null
    
    for (const evidence of canonicalEvidence) {
      if (!evidence.approved_for_resume) continue
      
      const match = matchEvidenceToRequirement(evidence, requirement)
      if (!bestMatch || match.evidence_strength > bestMatch.evidence_strength) {
        bestMatch = match
        bestEvidence = evidence
      }
    }
    
    if (bestMatch && bestEvidence) {
      if (bestMatch.match_type === "direct_match") {
        directMatches++
        strengths.push({
          requirement,
          evidence_text: bestEvidence.text.slice(0, 200),
          evidence_source: bestEvidence.source,
          match_type: bestMatch.match_type,
          confidence: bestEvidence.confidence,
        })
      } else if (bestMatch.match_type === "partial_match") {
        partialMatches++
        strengths.push({
          requirement,
          evidence_text: bestEvidence.text.slice(0, 200),
          evidence_source: bestEvidence.source,
          match_type: bestMatch.match_type,
          confidence: "medium",
        })
      } else if (bestMatch.match_type === "adjacent_transferable") {
        gaps.push({
          requirement,
          gap_category: "transferable_unproven",
          severity: "moderate",
          suggestion: "Emphasize transferable skills from related experience",
          transferable_evidence: bestEvidence.text.slice(0, 150),
        })
      } else {
        missing++
        gaps.push({
          requirement,
          gap_category: "missing_direct_experience",
          severity: "critical",
          suggestion: "Consider if this is a stretch role",
        })
      }
    } else {
      missing++
      gaps.push({
        requirement,
        gap_category: "missing_evidence",
        severity: "critical",
        suggestion: "Add evidence for this requirement to your profile",
      })
    }
  }
  
  // Calculate weighted score
  const totalRequired = requirements.length || 1
  const coverageScore = (directMatches + partialMatches * 0.6) / totalRequired
  
  // Weight dimension scores
  const weightedScore = (
    dimensionScores.experience * 0.30 +
    dimensionScores.evidence * 0.25 +
    dimensionScores.skills * 0.20 +
    dimensionScores.seniority * 0.15 +
    dimensionScores.ats * 0.10
  )
  
  // Combine coverage and dimension scores
  const finalScore = Math.round((coverageScore * 50) + (weightedScore * 0.5))
  
  // Determine band
  let band: FitBand
  if (finalScore >= 75 && missing <= totalRequired * 0.1) {
    band = "strong_match"
  } else if (finalScore >= 55 && missing <= totalRequired * 0.3) {
    band = "moderate_match"
  } else if (finalScore >= 40 || partialMatches >= totalRequired * 0.5) {
    band = "stretch_but_viable"
  } else {
    band = "low_match"
  }
  
  // Determine confidence based on evidence quality
  const highConfidenceEvidence = canonicalEvidence.filter(e => e.confidence === "high").length
  const confidence = highConfidenceEvidence >= canonicalEvidence.length * 0.7 ? "high" :
                     highConfidenceEvidence >= canonicalEvidence.length * 0.4 ? "medium" : "low"
  
  // Add warnings for sparse evidence
  if (canonicalEvidence.length < 5) {
    warnings.push("Limited evidence in profile - consider adding more work history")
  }
  if (gaps.filter(g => g.severity === "critical").length > 3) {
    warnings.push("Multiple critical gaps identified - this may be a stretch role")
  }
  
  return {
    band,
    score: finalScore,
    confidence,
    matched_requirements_count: directMatches,
    partial_matches_count: partialMatches,
    missing_requirements_count: missing,
    total_requirements_count: totalRequired,
    strengths,
    gaps,
    score_explanation: `Score based on ${directMatches}/${totalRequired} direct matches, ${partialMatches} partial matches. ${confidence} confidence due to ${highConfidenceEvidence} high-quality evidence items.`,
    dimension_scores: dimensionScores,
    warnings,
  }
}
