/**
 * HireWire Safety Middleware
 * Pre-flight safety checks before calling the AI model
 * 
 * Combines:
 * - PII Detection (SSN, credit cards, bank accounts, etc.)
 * - Prompt Injection Detection (jailbreaks, manipulation)
 * - Content Moderation (harassment, discrimination, fraud, etc.)
 */

import { detectPII, hasHighRiskPII, redactPIIFromText, type PIIDetectionResult } from './pii-detector'
import { detectInjection, shouldBlockInjection, type InjectionDetectionResult } from './injection-detector'
import { moderateContent, type ModerationResult, type ContentCategory } from './content-moderator'

export { detectPII, hasHighRiskPII, redactPIIFromText } from './pii-detector'
export { detectInjection, shouldBlockInjection } from './injection-detector'
export { moderateContent } from './content-moderator'

export interface SafetyCheckResult {
  allowed: boolean
  violations: SafetyViolation[]
  blockedResponse: string | null
  auditRecord: SafetyAuditRecord
}

export interface SafetyViolation {
  type: 'pii' | 'injection' | 'content'
  category: string
  severity: 'low' | 'medium' | 'high'
  details: string
}

export interface SafetyAuditRecord {
  timestamp: string
  blocked: boolean
  violations: SafetyViolation[]
  inputRedacted: string
  userId?: string
}

// Canned refusal responses by category
const BLOCKED_RESPONSES: Record<string, string> = {
  // PII
  pii_high_risk: "I noticed you've included sensitive personal information like SSN, credit card, or bank account numbers. For your security, I can't process requests containing this data. Please remove any sensitive information and try again.",
  pii_general: "I noticed some personal information in your message. For privacy reasons, I'd recommend not sharing sensitive details. How can I help you with your career goals?",
  
  // Injection
  injection: "I'm here to help with your career journey! Let's focus on job searching, resume writing, interview prep, or career advice. What would you like to work on?",
  
  // Content categories
  discrimination: "I can't help with requests that involve discrimination based on protected characteristics. Equal opportunity employment is both ethical and legally required. How else can I assist with your hiring needs?",
  protected_class_inquiry: "Questions about protected characteristics (religion, marital status, age, disability, etc.) are illegal in hiring contexts. I can help you develop legal, effective interview questions instead.",
  credential_fabrication: "I can't help fabricate or misrepresent credentials. Instead, let me help you present your genuine experience in the best possible light, or identify ways to build the skills you need.",
  fraud: "I'm not able to assist with deceptive practices. Let's focus on legitimate strategies to strengthen your candidacy or improve your hiring process.",
  illegal_hiring: "I can't assist with practices that violate employment law. I can help you understand compliant hiring practices instead.",
  harassment: "I'm not able to help with anything that could harm others. If you're dealing with a difficult workplace situation, I can suggest constructive approaches.",
  violence: "I'm not able to engage with content involving violence or threats. If you're experiencing a crisis, please reach out to appropriate support services.",
  hate_speech: "I can't engage with hateful content. Let's keep our conversation respectful and productive.",
  explicit_content: "I'm focused on career and professional topics. Let me know how I can help with your job search or career development.",
  
  // Default
  default: "I'm not able to help with that particular request. As your career coach, I'm here to help with job searching, resume writing, interview preparation, and career advice. What would you like to work on?",
}

/**
 * Main safety check function - run before calling the AI model
 */
export function checkSafety(
  messages: Array<{ role: string; content?: string; parts?: Array<{ type: string; text?: string }> }>,
  userId?: string
): SafetyCheckResult {
  const violations: SafetyViolation[] = []
  
  // Extract text from all user messages
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => {
      if (m.content) return m.content
      if (m.parts) {
        return m.parts
          .filter(p => p.type === 'text' && p.text)
          .map(p => p.text)
          .join(' ')
      }
      return ''
    })
    .join('\n')
  
  // Skip if no user text
  if (!userText.trim()) {
    return {
      allowed: true,
      violations: [],
      blockedResponse: null,
      auditRecord: createAuditRecord(true, [], '', userId),
    }
  }
  
  // 1. Check for PII
  const piiResult = detectPII(userText)
  if (piiResult.found) {
    const isHighRisk = hasHighRiskPII(piiResult)
    violations.push({
      type: 'pii',
      category: isHighRisk ? 'high_risk_pii' : 'general_pii',
      severity: isHighRisk ? 'high' : 'medium',
      details: `Found ${piiResult.count} PII instance(s): ${piiResult.types.join(', ')}`,
    })
  }
  
  // 2. Check for prompt injection
  const injectionResult = detectInjection(userText)
  if (injectionResult.detected) {
    violations.push({
      type: 'injection',
      category: injectionResult.category || 'unknown',
      severity: injectionResult.confidence,
      details: `Detected patterns: ${injectionResult.patterns.join(', ')}`,
    })
  }
  
  // 3. Check content moderation
  const moderationResult = moderateContent(userText)
  if (!moderationResult.allowed || moderationResult.flags.length > 0) {
    violations.push({
      type: 'content',
      category: moderationResult.category || 'unknown',
      severity: moderationResult.severity,
      details: `Content flags: ${moderationResult.flags.join(', ')}`,
    })
  }
  
  // Determine if we should block
  const shouldBlock = 
    hasHighRiskPII(piiResult) ||
    shouldBlockInjection(injectionResult) ||
    !moderationResult.allowed
  
  // Get appropriate blocked response
  let blockedResponse: string | null = null
  if (shouldBlock) {
    blockedResponse = getBlockedResponse(violations)
  }
  
  // Create audit record
  const auditRecord = createAuditRecord(
    !shouldBlock,
    violations,
    redactPIIFromText(userText),
    userId
  )
  
  return {
    allowed: !shouldBlock,
    violations,
    blockedResponse,
    auditRecord,
  }
}

/**
 * Get the appropriate blocked response based on violations
 */
function getBlockedResponse(violations: SafetyViolation[]): string {
  // Priority: content > injection > pii
  const contentViolation = violations.find(v => v.type === 'content' && v.severity === 'high')
  if (contentViolation) {
    return BLOCKED_RESPONSES[contentViolation.category] || BLOCKED_RESPONSES.default
  }
  
  const injectionViolation = violations.find(v => v.type === 'injection')
  if (injectionViolation && (injectionViolation.severity === 'high' || 
      (injectionViolation.severity === 'medium' && violations.filter(v => v.type === 'injection').length >= 2))) {
    return BLOCKED_RESPONSES.injection
  }
  
  const piiViolation = violations.find(v => v.type === 'pii')
  if (piiViolation) {
    return piiViolation.severity === 'high' 
      ? BLOCKED_RESPONSES.pii_high_risk 
      : BLOCKED_RESPONSES.pii_general
  }
  
  return BLOCKED_RESPONSES.default
}

/**
 * Create an audit record for logging
 */
function createAuditRecord(
  allowed: boolean,
  violations: SafetyViolation[],
  inputRedacted: string,
  userId?: string
): SafetyAuditRecord {
  return {
    timestamp: new Date().toISOString(),
    blocked: !allowed,
    violations,
    inputRedacted: inputRedacted.substring(0, 500), // Truncate for logging
    userId,
  }
}

/**
 * Log a safety audit event (for compliance/debugging)
 */
export function logSafetyAudit(record: SafetyAuditRecord): void {
  // In production, this would send to a logging service
  // For now, we log to console in development
  if (process.env.NODE_ENV === 'development' && record.blocked) {
    console.log('[v0] Safety audit - BLOCKED:', {
      timestamp: record.timestamp,
      violations: record.violations.map(v => `${v.type}:${v.category}`),
      userId: record.userId,
    })
  }
}
