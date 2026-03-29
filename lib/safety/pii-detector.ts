/**
 * PII Detector - Identifies personally identifiable information in text
 * Adapted from QBos safety middleware patterns
 */

export interface PIIDetectionResult {
  found: boolean
  types: string[]
  count: number
  matches: Array<{
    type: string
    value: string
    redacted: string
  }>
}

// PII detection patterns
const PII_PATTERNS: Record<string, RegExp> = {
  // Social Security Number (US)
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  
  // Credit Card Numbers (major providers)
  credit_card: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  
  // Bank Account Numbers (generic patterns)
  bank_account: /\b[0-9]{8,17}\b(?=.*(?:account|routing|aba|swift|iban))/gi,
  
  // IBAN
  iban: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/gi,
  
  // Phone Numbers (US format)
  phone_us: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  
  // Email Addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // IP Addresses
  ip_address: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  
  // Driver's License (generic US patterns)
  drivers_license: /\b[A-Z]{1,2}[0-9]{5,8}\b/g,
  
  // Passport Numbers (US)
  passport: /\b[0-9]{9}\b(?=.*passport)/gi,
  
  // Date of Birth patterns
  dob: /\b(?:dob|date of birth|birthday|born)[:\s]*(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/gi,
  
  // Street Addresses (simplified)
  address: /\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,4}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|place|pl)\b/gi,
}

// Types that should always be blocked (high-risk PII)
const HIGH_RISK_TYPES = ['ssn', 'credit_card', 'bank_account', 'iban']

/**
 * Detect PII in text
 */
export function detectPII(text: string): PIIDetectionResult {
  const matches: PIIDetectionResult['matches'] = []
  const typesFound = new Set<string>()
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    
    let match
    while ((match = pattern.exec(text)) !== null) {
      typesFound.add(type)
      matches.push({
        type,
        value: match[0],
        redacted: redactValue(match[0], type),
      })
    }
  }
  
  return {
    found: matches.length > 0,
    types: Array.from(typesFound),
    count: matches.length,
    matches,
  }
}

/**
 * Redact a PII value for logging
 */
function redactValue(value: string, type: string): string {
  if (type === 'email') {
    const [local, domain] = value.split('@')
    return `${local.slice(0, 2)}***@${domain}`
  }
  
  if (type === 'phone_us') {
    return value.replace(/\d(?=\d{4})/g, '*')
  }
  
  if (type === 'ssn' || type === 'credit_card') {
    return value.replace(/\d(?=\d{4})/g, '*')
  }
  
  // Default: show first 2 and last 2 characters
  if (value.length > 4) {
    return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`
  }
  
  return '*'.repeat(value.length)
}

/**
 * Check if detected PII is high-risk and should block the request
 */
export function hasHighRiskPII(result: PIIDetectionResult): boolean {
  return result.types.some(type => HIGH_RISK_TYPES.includes(type))
}

/**
 * Redact PII from text for safe logging/display
 */
export function redactPIIFromText(text: string): string {
  let redactedText = text
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    pattern.lastIndex = 0
    redactedText = redactedText.replace(pattern, (match) => redactValue(match, type))
  }
  
  return redactedText
}
