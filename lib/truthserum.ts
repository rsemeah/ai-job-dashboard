/**
 * TruthSerum Core Utilities
 * Evidence-first, truth-locked generation system
 * 
 * This module provides:
 * 1. Evidence validation and blocking rules
 * 2. Generic language detection
 * 3. Bullet provenance tracking
 * 4. Score calculation with grounded metrics
 * 5. Strategy-aware generation rules
 */

import type { EvidenceRecord, Job } from "./types"

// ============================================================================
// TYPES FOR TRUTH-LOCKED GENERATION
// ============================================================================

export type GenerationStrategy = 
  | "direct_match"      // Strong fit - can be assertive
  | "adjacent_transition" // Related experience - lean on nearby evidence
  | "stretch_honest"    // Weak fit - surface gaps, avoid overclaiming
  | "do_not_generate"   // Too risky - block export

export type EvidenceUsageRule = 
  | "active"           // Can use anywhere
  | "interview_only"   // Don't put in resume/cover letter
  | "cover_letter_only" // Only for cover letter, not resume bullets
  | "blocked"          // Never use
  | "unsupported"      // Needs verification before use

export type WorkflowStepStatus = 
  | "not_started"
  | "in_progress" 
  | "complete"
  | "warning"
  | "blocked"

export interface BulletProvenance {
  bullet_text: string
  source_evidence_id: string
  source_evidence_title: string
  source_role?: string
  source_company?: string
  matched_requirement_id?: string
  matched_requirement_text?: string
  claim_confidence: "high" | "medium" | "low"
  keywords_covered: string[]
  risk_flags: string[]
  is_metric_rich: boolean
  concrete_signal_count: number
}

export interface ParagraphProvenance {
  paragraph_text: string
  evidence_used: string[]
  matched_job_theme: string
  claim_confidence: "high" | "medium" | "low"
  unsupported_language: string[]
}

export interface ScoreBreakdown {
  ats_score: number
  ats_reasoning: string
  truth_score: number
  truth_reasoning: string
  role_alignment_score: number
  role_alignment_reasoning: string
  recruiter_clarity_score: number
  recruiter_clarity_reasoning: string
  tool_match_score: number
  tool_match_reasoning: string
  metric_density_score: number
  metric_density_reasoning: string
  genericity_penalty: number
  genericity_reasoning: string
  overall_score: number
}

export interface RedTeamIssue {
  id: string
  type: "banned_phrase" | "vague_bullet" | "ai_filler" | "missing_metric" | "unsupported_claim" | "weak_concrete_signal"
  severity: "critical" | "warning" | "info"
  location: "resume" | "cover_letter"
  original_text: string
  issue_description: string
  suggested_fixes: RedTeamFix[]
}

export interface RedTeamFix {
  action: "rewrite_bullet" | "swap_evidence" | "add_metric" | "remove_phrase" | "make_concrete" | "block_claim" | "regenerate_section"
  label: string
  description: string
}

// ============================================================================
// BANNED PHRASES AND GENERIC LANGUAGE DETECTION
// ============================================================================

export const BANNED_PHRASES = [
  // Results/driven
  "results driven",
  "results-driven",
  "outcome driven",
  "data driven professional",
  // Team/collaboration fluff
  "collaborated with cross functional teams",
  "cross-functional collaboration",
  "worked closely with",
  "partnered with stakeholders",
  "team player",
  "fast learner",
  // Value/growth fluff
  "delivered value",
  "drive growth",
  "drove results",
  "moved the needle",
  "high quality products",
  "deliver impact",
  // Responsibility hedging
  "responsible for",
  "helped with",
  "assisted in",
  "supported various",
  "worked on various",
  "participated in",
  // AI/corporate filler
  "I am excited to apply",
  "I would be thrilled",
  "passionate about",
  "leverage my skills",
  "hit the ground running",
  "think outside the box",
  "synergy",
  "dynamic environment",
  "fast-paced environment",
  "self-starter",
  "detail-oriented",
  "proven track record",
  "seasoned professional",
  "spearheaded initiatives",
  "at the end of the day",
  "circle back",
  "low-hanging fruit",
  "core competencies",
  "value-add",
  "best-in-class",
  "cutting-edge",
  "game-changer",
  "paradigm shift",
  "robust solution",
  "scalable solutions",
  "stakeholder alignment",
  "strategic thinking",
  "thought leader",
]

export const VAGUE_PATTERNS = [
  /improved\s+\w+\s+significantly/i,
  /increased\s+\w+\s+substantially/i,
  /enhanced\s+\w+\s+greatly/i,
  /various\s+\w+/i,
  /multiple\s+stakeholders/i,
  /several\s+teams/i,
  /many\s+projects/i,
  /numerous\s+initiatives/i,
  /key\s+initiatives/i,
  /strategic\s+initiatives/i,
]

/**
 * Detect banned phrases in text
 */
export function detectBannedPhrases(text: string): string[] {
  const lowerText = text.toLowerCase()
  const found: string[] = []
  
  for (const phrase of BANNED_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      found.push(phrase)
    }
  }
  
  return found
}

/**
 * Detect vague patterns in text
 */
export function detectVaguePatterns(text: string): string[] {
  const found: string[] = []
  
  for (const pattern of VAGUE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      found.push(match[0])
    }
  }
  
  return found
}

/**
 * Check if a bullet has enough concrete signal
 * Concrete signal = at least 2 of: action, system/artifact, business context, result/metric
 */
export function analyzeBulletConcreteness(bullet: string): {
  has_action: boolean
  has_system: boolean
  has_context: boolean
  has_result: boolean
  concrete_signal_count: number
  is_concrete_enough: boolean
} {
  // Action verbs that indicate concrete work
  const actionVerbs = /^(led|built|shipped|launched|created|designed|implemented|deployed|migrated|integrated|reduced|increased|improved|automated|defined|owned|managed|developed|established|scaled)/i
  
  // Systems, tools, or artifacts
  const systemPatterns = /(api|platform|system|tool|feature|product|service|dashboard|pipeline|database|model|integration|sdk|cli|infrastructure)/i
  
  // Business context indicators
  const contextPatterns = /(for|serving|across|with|enabling|supporting)\s+(customers|users|partners|teams|enterprise|business|revenue)/i
  
  // Results with specificity (numbers, percentages, timeframes)
  const resultPatterns = /(\d+[%kKmM]?|\$\d+|[\d,]+\s*(users|customers|partners|requests|transactions)|reduced|increased|improved)\s+/i
  
  const has_action = actionVerbs.test(bullet.trim())
  const has_system = systemPatterns.test(bullet)
  const has_context = contextPatterns.test(bullet)
  const has_result = resultPatterns.test(bullet)
  
  const concrete_signal_count = [has_action, has_system, has_context, has_result].filter(Boolean).length
  
  return {
    has_action,
    has_system,
    has_context,
    has_result,
    concrete_signal_count,
    is_concrete_enough: concrete_signal_count >= 2
  }
}

/**
 * Check if bullet contains metrics
 */
export function hasMetrics(text: string): boolean {
  const metricPatterns = [
    /\d+%/,                    // Percentages
    /\$[\d,]+[kKmM]?/,         // Dollar amounts
    /[\d,]+\s*(users|customers|partners|resellers)/i,  // User counts
    /[\d,]+\s*(requests|transactions|outputs)/i,       // Volume metrics
    /\d+x\s/,                  // Multipliers
    /(reduced|increased|improved)\s+by\s+\d+/i,        // Delta metrics
    /\d+\s*(weeks?|months?|days?)\s+(to|from)/i,       // Time improvements
  ]
  
  return metricPatterns.some(p => p.test(text))
}

// ============================================================================
// EVIDENCE VALIDATION AND BLOCKING
// ============================================================================

export interface EvidenceWithRules extends EvidenceRecord {
  usage_rule: EvidenceUsageRule
  blocked_reason?: string
}

/**
 * Get usage rule for evidence based on its properties
 */
export function getEvidenceUsageRule(evidence: EvidenceRecord): EvidenceUsageRule {
  // Check confidence level
  if (evidence.confidence_level === "low") {
    return "unsupported"
  }
  
  // Check visibility
  if (evidence.visibility_status === "archived" || evidence.visibility_status === "hidden") {
    return "blocked"
  }
  
  // Check if active
  if (!evidence.is_active) {
    return "blocked"
  }
  
  // Check what_not_to_overstate - if it mentions "interview only"
  if (evidence.what_not_to_overstate?.toLowerCase().includes("interview only")) {
    return "interview_only"
  }
  
  // Check what_not_to_overstate - if it mentions "cover letter only"
  if (evidence.what_not_to_overstate?.toLowerCase().includes("cover letter only")) {
    return "cover_letter_only"
  }
  
  return "active"
}

/**
 * Filter evidence for resume generation (excludes interview_only and cover_letter_only)
 */
export function filterEvidenceForResume(evidence: EvidenceRecord[]): EvidenceRecord[] {
  return evidence.filter(e => {
    const rule = getEvidenceUsageRule(e)
    return rule === "active"
  })
}

/**
 * Filter evidence for cover letter generation (excludes interview_only)
 */
export function filterEvidenceForCoverLetter(evidence: EvidenceRecord[]): EvidenceRecord[] {
  return evidence.filter(e => {
    const rule = getEvidenceUsageRule(e)
    return rule === "active" || rule === "cover_letter_only"
  })
}

// ============================================================================
// GENERATION STRATEGY DETERMINATION
// ============================================================================

/**
 * Determine generation strategy based on job fit and evidence coverage
 */
export function determineGenerationStrategy(
  job: Job,
  requiredCoverage: number,
  evidenceQuality: number
): { strategy: GenerationStrategy; reasoning: string } {
  const fitScore = job.score || 0
  
  // Direct match: High fit + good coverage + quality evidence
  if (fitScore >= 80 && requiredCoverage >= 70 && evidenceQuality >= 70) {
    return {
      strategy: "direct_match",
      reasoning: `Strong fit (${fitScore}/100) with ${requiredCoverage}% requirement coverage. Can be assertive in claims.`
    }
  }
  
  // Adjacent transition: Medium fit or some coverage gaps
  if (fitScore >= 60 && requiredCoverage >= 50) {
    return {
      strategy: "adjacent_transition",
      reasoning: `Good fit (${fitScore}/100) but ${100 - requiredCoverage}% requirements need adjacent framing. Lean on transferable skills without claiming direct ownership.`
    }
  }
  
  // Stretch honest: Lower fit but still possible
  if (fitScore >= 40 || requiredCoverage >= 30) {
    return {
      strategy: "stretch_honest",
      reasoning: `Stretch fit (${fitScore}/100) with significant gaps. Surface gaps honestly, avoid overclaiming. Consider if worth pursuing.`
    }
  }
  
  // Do not generate: Too risky
  return {
    strategy: "do_not_generate",
    reasoning: `Poor fit (${fitScore}/100) with only ${requiredCoverage}% coverage. Generating materials would require invention. Not recommended.`
  }
}

// ============================================================================
// SCORE CALCULATION WITH GROUNDED METRICS
// ============================================================================

/**
 * Calculate comprehensive score breakdown based on actual data
 */
export function calculateScoreBreakdown(
  job: Job,
  evidence: EvidenceRecord[],
  selectedEvidenceIds: string[],
  generatedResume?: string,
  generatedCoverLetter?: string
): ScoreBreakdown {
  const selectedEvidence = evidence.filter(e => selectedEvidenceIds.includes(e.id))
  
  // ATS Score: Based on keyword coverage
  const jobKeywords = [
    ...(job.ats_keywords || []),
    ...(job.keywords_extracted || [])
  ].map(k => k.toLowerCase())
  
  const evidenceKeywords = selectedEvidence.flatMap(e => 
    [...(e.approved_keywords || []), ...(e.tools_used || [])]
  ).map(k => k.toLowerCase())
  
  const resumeText = (generatedResume || "").toLowerCase()
  const keywordsInResume = jobKeywords.filter(k => resumeText.includes(k))
  const atsScore = jobKeywords.length > 0 
    ? Math.round((keywordsInResume.length / jobKeywords.length) * 100)
    : 50
  
  // Truth Score: Based on evidence confidence and usage
  const highConfidenceCount = selectedEvidence.filter(e => e.confidence_level === "high").length
  const totalSelected = selectedEvidence.length || 1
  const truthScore = Math.round((highConfidenceCount / totalSelected) * 100)
  
  // Role Alignment: Based on must-haves covered
  const requiredQuals = job.qualifications_required || []
  const evidenceText = selectedEvidence.map(e => 
    [...(e.responsibilities || []), ...(e.outcomes || [])].join(" ")
  ).join(" ").toLowerCase()
  
  const requiredCovered = requiredQuals.filter(req => {
    const reqWords = req.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    return reqWords.some(w => evidenceText.includes(w))
  }).length
  
  const roleAlignmentScore = requiredQuals.length > 0
    ? Math.round((requiredCovered / requiredQuals.length) * 100)
    : 50
  
  // Recruiter Clarity: Based on bullet concreteness
  const resumeBullets = (generatedResume || "")
    .split("\n")
    .filter(line => line.trim().startsWith("-") || line.trim().startsWith("•"))
  
  const concreteBullets = resumeBullets.filter(b => 
    analyzeBulletConcreteness(b).is_concrete_enough
  ).length
  
  const recruiterClarityScore = resumeBullets.length > 0
    ? Math.round((concreteBullets / resumeBullets.length) * 100)
    : 50
  
  // Tool Match: Explicit tool overlap
  const jobTools = (job.ats_keywords || [])
    .filter(k => /^[A-Z]/.test(k) || /js|sql|api/i.test(k))
    .map(k => k.toLowerCase())
  
  const evidenceTools = selectedEvidence.flatMap(e => e.tools_used || []).map(t => t.toLowerCase())
  const matchedTools = jobTools.filter(t => evidenceTools.some(et => et.includes(t) || t.includes(et)))
  
  const toolMatchScore = jobTools.length > 0
    ? Math.round((matchedTools.length / jobTools.length) * 100)
    : 70
  
  // Metric Density: Actual metrics in evidence and output
  const bulletsWithMetrics = resumeBullets.filter(b => hasMetrics(b)).length
  const metricDensityScore = resumeBullets.length > 0
    ? Math.round((bulletsWithMetrics / resumeBullets.length) * 100)
    : 30
  
  // Genericity Penalty: Based on banned phrases and vague bullets
  const bannedInResume = detectBannedPhrases(generatedResume || "")
  const vagueInResume = detectVaguePatterns(generatedResume || "")
  const weakBullets = resumeBullets.filter(b => !analyzeBulletConcreteness(b).is_concrete_enough)
  
  const genericityPenalty = Math.min(30, 
    bannedInResume.length * 5 + 
    vagueInResume.length * 3 + 
    weakBullets.length * 2
  )
  
  // Overall Score
  const weights = {
    ats: 0.15,
    truth: 0.20,
    roleAlignment: 0.25,
    recruiterClarity: 0.15,
    toolMatch: 0.10,
    metricDensity: 0.15
  }
  
  const weightedScore = 
    atsScore * weights.ats +
    truthScore * weights.truth +
    roleAlignmentScore * weights.roleAlignment +
    recruiterClarityScore * weights.recruiterClarity +
    toolMatchScore * weights.toolMatch +
    metricDensityScore * weights.metricDensity
  
  const overallScore = Math.max(0, Math.round(weightedScore - genericityPenalty))
  
  return {
    ats_score: atsScore,
    ats_reasoning: `${keywordsInResume.length}/${jobKeywords.length} job keywords found in resume`,
    truth_score: truthScore,
    truth_reasoning: `${highConfidenceCount}/${totalSelected} evidence items have high confidence`,
    role_alignment_score: roleAlignmentScore,
    role_alignment_reasoning: `${requiredCovered}/${requiredQuals.length} required qualifications covered by evidence`,
    recruiter_clarity_score: recruiterClarityScore,
    recruiter_clarity_reasoning: `${concreteBullets}/${resumeBullets.length} bullets have concrete signal`,
    tool_match_score: toolMatchScore,
    tool_match_reasoning: `${matchedTools.length}/${jobTools.length} required tools matched`,
    metric_density_score: metricDensityScore,
    metric_density_reasoning: `${bulletsWithMetrics}/${resumeBullets.length} bullets contain metrics`,
    genericity_penalty: genericityPenalty,
    genericity_reasoning: `${bannedInResume.length} banned phrases, ${vagueInResume.length} vague patterns, ${weakBullets.length} weak bullets`,
    overall_score: overallScore
  }
}

// ============================================================================
// WORKFLOW STATUS CALCULATION
// ============================================================================

export interface WorkflowStatus {
  evidence_match: WorkflowStepStatus
  evidence_match_reason: string
  scoring: WorkflowStepStatus
  scoring_reason: string
  red_team: WorkflowStepStatus
  red_team_reason: string
  export_ready: WorkflowStepStatus
  export_reason: string
}

/**
 * Calculate workflow status for a job based on actual state
 */
export function calculateWorkflowStatus(
  job: Job,
  hasEvidenceMap: boolean,
  criticalIssueCount: number,
  truthScore: number,
  genericityPenalty: number
): WorkflowStatus {
  // Evidence Match status
  let evidenceMatchStatus: WorkflowStepStatus = "not_started"
  let evidenceMatchReason = "No evidence has been mapped to requirements yet"
  
  if (hasEvidenceMap) {
    const requiredCount = (job.qualifications_required || []).length
    const gaps = (job.score_gaps || []).length
    
    if (gaps > requiredCount * 0.3) {
      evidenceMatchStatus = "warning"
      evidenceMatchReason = `${gaps} requirements still have gaps`
    } else {
      evidenceMatchStatus = "complete"
      evidenceMatchReason = "Evidence mapped to all major requirements"
    }
  }
  
  // Scoring status
  let scoringStatus: WorkflowStepStatus = "not_started"
  let scoringReason = "Job has not been scored yet"
  
  if (job.score !== null) {
    if (truthScore < 60 || genericityPenalty > 15) {
      scoringStatus = "warning"
      scoringReason = truthScore < 60 
        ? `Truth score too low (${truthScore}%)`
        : `Genericity penalty too high (${genericityPenalty} pts)`
    } else {
      scoringStatus = "complete"
      scoringReason = `Scored at ${job.score}/100`
    }
  }
  
  // Red Team status
  let redTeamStatus: WorkflowStepStatus = "not_started"
  let redTeamReason = "Materials not yet reviewed for quality issues"
  
  if (job.generated_resume || job.generated_cover_letter) {
    if (criticalIssueCount > 0) {
      redTeamStatus = "blocked"
      redTeamReason = `${criticalIssueCount} critical issues must be fixed`
    } else if ((job.generation_quality_issues || []).length > 0) {
      redTeamStatus = "warning"
      redTeamReason = `${(job.generation_quality_issues || []).length} issues to review`
    } else {
      redTeamStatus = "complete"
      redTeamReason = "No quality issues detected"
    }
  }
  
  // Export status
  let exportStatus: WorkflowStepStatus = "not_started"
  let exportReason = "Complete all workflow steps to enable export"
  
  if (evidenceMatchStatus === "complete" && scoringStatus === "complete" && redTeamStatus === "complete") {
    exportStatus = "complete"
    exportReason = "Ready to export and apply"
  } else if (redTeamStatus === "blocked") {
    exportStatus = "blocked"
    exportReason = "Fix critical issues before exporting"
  } else if (evidenceMatchStatus === "warning" || scoringStatus === "warning" || redTeamStatus === "warning") {
    exportStatus = "warning"
    exportReason = "Review warnings before applying"
  }
  
  return {
    evidence_match: evidenceMatchStatus,
    evidence_match_reason: evidenceMatchReason,
    scoring: scoringStatus,
    scoring_reason: scoringReason,
    red_team: redTeamStatus,
    red_team_reason: redTeamReason,
    export_ready: exportStatus,
    export_reason: exportReason
  }
}

// ============================================================================
// RED TEAM ANALYSIS
// ============================================================================

/**
 * Perform comprehensive red team analysis on generated content
 */
export function performRedTeamAnalysis(
  resume: string,
  coverLetter: string,
  evidence: EvidenceRecord[]
): RedTeamIssue[] {
  const issues: RedTeamIssue[] = []
  let issueId = 0
  
  // Check resume for banned phrases
  const resumeBannedPhrases = detectBannedPhrases(resume)
  for (const phrase of resumeBannedPhrases) {
    issues.push({
      id: `rt-${++issueId}`,
      type: "banned_phrase",
      severity: "critical",
      location: "resume",
      original_text: phrase,
      issue_description: `Banned phrase "${phrase}" detected. This language is generic and damages credibility.`,
      suggested_fixes: [
        { action: "remove_phrase", label: "Remove Phrase", description: "Delete this phrase entirely" },
        { action: "rewrite_bullet", label: "Rewrite", description: "Replace with specific, concrete language" }
      ]
    })
  }
  
  // Check cover letter for banned phrases
  const coverLetterBannedPhrases = detectBannedPhrases(coverLetter)
  for (const phrase of coverLetterBannedPhrases) {
    issues.push({
      id: `rt-${++issueId}`,
      type: "banned_phrase",
      severity: "critical",
      location: "cover_letter",
      original_text: phrase,
      issue_description: `Banned phrase "${phrase}" detected. This sounds like AI-generated filler.`,
      suggested_fixes: [
        { action: "remove_phrase", label: "Remove", description: "Delete and rephrase" },
        { action: "rewrite_bullet", label: "Rewrite", description: "Use direct, specific language" }
      ]
    })
  }
  
  // Check resume bullets for weak concrete signal
  const resumeBullets = resume
    .split("\n")
    .filter(line => line.trim().startsWith("-") || line.trim().startsWith("•"))
  
  for (const bullet of resumeBullets) {
    const analysis = analyzeBulletConcreteness(bullet)
    
    if (!analysis.is_concrete_enough) {
      issues.push({
        id: `rt-${++issueId}`,
        type: "weak_concrete_signal",
        severity: "warning",
        location: "resume",
        original_text: bullet.trim(),
        issue_description: `Bullet lacks concrete signal (only ${analysis.concrete_signal_count}/4). Missing: ${[
          !analysis.has_action && "action verb",
          !analysis.has_system && "system/artifact",
          !analysis.has_context && "business context",
          !analysis.has_result && "measurable result"
        ].filter(Boolean).join(", ")}`,
        suggested_fixes: [
          { action: "add_metric", label: "Add Metric", description: "Include a specific number or outcome" },
          { action: "make_concrete", label: "Add Specifics", description: "Add system name, team size, or business impact" },
          { action: "swap_evidence", label: "Use Different Evidence", description: "Replace with a more specific accomplishment" }
        ]
      })
    }
    
    // Check for missing metrics in achievement bullets
    if (!hasMetrics(bullet) && /led|shipped|built|launched|created/i.test(bullet)) {
      issues.push({
        id: `rt-${++issueId}`,
        type: "missing_metric",
        severity: "info",
        location: "resume",
        original_text: bullet.trim(),
        issue_description: "Achievement bullet has no quantifiable metric. Numbers make claims verifiable.",
        suggested_fixes: [
          { action: "add_metric", label: "Add Metric", description: "Add user count, percentage, or dollar amount if available in evidence" }
        ]
      })
    }
  }
  
  // Check for vague patterns
  const vagueInResume = detectVaguePatterns(resume)
  for (const vague of vagueInResume) {
    issues.push({
      id: `rt-${++issueId}`,
      type: "vague_bullet",
      severity: "warning",
      location: "resume",
      original_text: vague,
      issue_description: `Vague language pattern: "${vague}". Be specific about what, how much, or who.`,
      suggested_fixes: [
        { action: "make_concrete", label: "Be Specific", description: "Replace with exact numbers, names, or outcomes" }
      ]
    })
  }
  
  return issues
}
