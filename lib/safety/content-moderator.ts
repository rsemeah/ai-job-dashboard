/**
 * Content Moderator - Detects harmful content specific to HireWire (career/hiring context)
 * Adapted from AuthenticHadith + Amina safety patterns
 */

export interface ModerationResult {
  allowed: boolean
  category: ContentCategory | null
  severity: 'low' | 'medium' | 'high'
  flags: string[]
}

export type ContentCategory =
  | 'harassment'
  | 'discrimination'
  | 'illegal_hiring'
  | 'fraud'
  | 'violence'
  | 'explicit_content'
  | 'credential_fabrication'
  | 'protected_class_inquiry'
  | 'hate_speech'

// Blocked content patterns organized by category
const CONTENT_PATTERNS: Array<{
  pattern: RegExp
  category: ContentCategory
  severity: 'low' | 'medium' | 'high'
  flag: string
}> = [
  // Discrimination in hiring (protected classes)
  {
    pattern: /(?:don'?t\s+hire|exclude|reject|discriminate\s+against)\s+(?:people\s+(?:who\s+are|from)|anyone\s+(?:who\s+is|from))\s+(?:\w+\s+){0,3}(?:race|religion|gender|age|disabled?|pregnant|national\s+origin|ethnicity)/i,
    category: 'discrimination',
    severity: 'high',
    flag: 'discriminatory_hiring_instruction',
  },
  {
    pattern: /(?:only\s+hire|prefer\s+hiring|look\s+for)\s+(?:\w+\s+){0,2}(?:white|black|asian|hispanic|latino|male|female|young|christian|muslim|jewish|straight|gay)/i,
    category: 'discrimination',
    severity: 'high',
    flag: 'discriminatory_preference',
  },
  
  // Protected class inquiries (illegal interview questions)
  {
    pattern: /(?:ask|find\s+out|determine|verify)\s+(?:if|whether|about)\s+(?:they|candidate|applicant|she|he)(?:'s|\s+is)?\s+(?:married|pregnant|planning\s+to\s+have\s+(?:kids|children|babies)|religious|gay|straight|disabled|how\s+old)/i,
    category: 'protected_class_inquiry',
    severity: 'high',
    flag: 'illegal_interview_question',
  },
  {
    pattern: /(?:what\s+(?:is|are)\s+(?:your|their)\s+)?(?:religion|sexual\s+orientation|marital\s+status|citizenship|national\s+origin|age|disability\s+status)/i,
    category: 'protected_class_inquiry',
    severity: 'medium',
    flag: 'protected_class_question',
  },
  
  // Credential fabrication
  {
    pattern: /(?:fake|fabricate|forge|falsify|make\s+up|invent|create\s+fake)\s+(?:\w+\s+){0,3}(?:degree|diploma|certification|credential|experience|reference|employment\s+history|resume|cv)/i,
    category: 'credential_fabrication',
    severity: 'high',
    flag: 'credential_fabrication_request',
  },
  {
    pattern: /(?:lie\s+about|exaggerate|misrepresent)\s+(?:my|your|their)\s+(?:experience|qualifications?|skills?|education|background)/i,
    category: 'credential_fabrication',
    severity: 'high',
    flag: 'misrepresentation_request',
  },
  
  // Fraud / Deception
  {
    pattern: /(?:how\s+to\s+)?(?:cheat|scam|defraud|trick|deceive)\s+(?:\w+\s+){0,3}(?:employer|recruiter|hr|hiring\s+manager|company|interview)/i,
    category: 'fraud',
    severity: 'high',
    flag: 'fraud_request',
  },
  {
    pattern: /(?:bypass|circumvent|cheat)\s+(?:\w+\s+){0,2}(?:background\s+check|reference\s+check|drug\s+test|screening)/i,
    category: 'fraud',
    severity: 'high',
    flag: 'screening_bypass_request',
  },
  
  // Illegal hiring practices
  {
    pattern: /(?:pay\s+(?:them\s+)?under\s+the\s+table|avoid\s+(?:paying\s+)?(?:taxes|benefits)|misclassify\s+(?:as\s+)?(?:contractor|1099)|exploit\s+(?:undocumented|illegal)\s+workers?)/i,
    category: 'illegal_hiring',
    severity: 'high',
    flag: 'illegal_employment_practice',
  },
  {
    pattern: /(?:wage\s+theft|steal\s+(?:wages?|tips)|not\s+pay\s+(?:overtime|minimum\s+wage))/i,
    category: 'illegal_hiring',
    severity: 'high',
    flag: 'wage_violation',
  },
  
  // Harassment content
  {
    pattern: /(?:harass|intimidate|threaten|bully|stalk)\s+(?:\w+\s+){0,3}(?:coworker|colleague|employee|boss|manager|interviewer)/i,
    category: 'harassment',
    severity: 'high',
    flag: 'workplace_harassment',
  },
  {
    pattern: /(?:get\s+(?:revenge|back\s+at)|sabotage|undermine|ruin)\s+(?:\w+\s+){0,3}(?:former\s+(?:employer|boss|coworker)|ex-(?:employer|boss))/i,
    category: 'harassment',
    severity: 'medium',
    flag: 'revenge_request',
  },
  
  // Violence
  {
    pattern: /(?:hurt|harm|attack|assault|kill|murder|shoot|stab)\s+(?:\w+\s+){0,3}(?:boss|manager|coworker|colleague|interviewer|recruiter|hr)/i,
    category: 'violence',
    severity: 'high',
    flag: 'violence_threat',
  },
  {
    pattern: /(?:bring\s+(?:a\s+)?(?:gun|weapon|knife)|workplace\s+violence)/i,
    category: 'violence',
    severity: 'high',
    flag: 'weapon_mention',
  },
  
  // Hate speech
  {
    pattern: /\b(?:n[i1]gg(?:er|a)|f[a4]gg?[o0]t|k[i1]ke|sp[i1]c|ch[i1]nk|r[e3]t[a4]rd)\b/i,
    category: 'hate_speech',
    severity: 'high',
    flag: 'slur_detected',
  },
  
  // Explicit content
  {
    pattern: /(?:sexual|nude|naked|porn|nsfw)\s+(?:content|images?|photos?|videos?)/i,
    category: 'explicit_content',
    severity: 'high',
    flag: 'explicit_content_request',
  },
]

/**
 * Moderate content for harmful patterns
 */
export function moderateContent(text: string): ModerationResult {
  const flags: string[] = []
  let highestSeverity: 'low' | 'medium' | 'high' = 'low'
  let detectedCategory: ContentCategory | null = null
  
  const severityOrder = { low: 0, medium: 1, high: 2 }
  
  for (const { pattern, category, severity, flag } of CONTENT_PATTERNS) {
    pattern.lastIndex = 0
    
    if (pattern.test(text)) {
      flags.push(flag)
      
      if (severityOrder[severity] > severityOrder[highestSeverity]) {
        highestSeverity = severity
        detectedCategory = category
      } else if (!detectedCategory) {
        detectedCategory = category
      }
    }
  }
  
  // Content is allowed if no high-severity flags detected
  const allowed = highestSeverity !== 'high'
  
  return {
    allowed,
    category: detectedCategory,
    severity: flags.length > 0 ? highestSeverity : 'low',
    flags,
  }
}
