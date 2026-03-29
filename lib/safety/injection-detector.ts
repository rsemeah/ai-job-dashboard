/**
 * Prompt Injection Detector - Identifies jailbreak and manipulation attempts
 * Adapted from QBos + AuthenticHadith patterns
 */

export interface InjectionDetectionResult {
  detected: boolean
  category: InjectionCategory | null
  confidence: 'low' | 'medium' | 'high'
  patterns: string[]
}

export type InjectionCategory = 
  | 'role_manipulation'
  | 'instruction_override'
  | 'system_prompt_extraction'
  | 'context_escape'
  | 'encoding_bypass'
  | 'authority_impersonation'

// Injection detection patterns with categories
const INJECTION_PATTERNS: Array<{
  pattern: RegExp
  category: InjectionCategory
  confidence: 'low' | 'medium' | 'high'
  name: string
}> = [
  // Role manipulation attempts
  {
    pattern: /(?:ignore|forget|disregard|override|bypass)\s+(?:all\s+)?(?:previous|prior|above|earlier|your)\s+(?:instructions?|rules?|guidelines?|prompts?|constraints?)/i,
    category: 'instruction_override',
    confidence: 'high',
    name: 'instruction_override_direct',
  },
  {
    pattern: /(?:you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you(?:'re| are))|roleplay\s+as|imagine\s+you(?:'re| are))\s+(?:a\s+)?(?:different|new|evil|unrestricted|unfiltered|jailbroken)/i,
    category: 'role_manipulation',
    confidence: 'high',
    name: 'role_switch_malicious',
  },
  {
    pattern: /(?:DAN|Do Anything Now|STAN|DUDE|AIM|KEVIN|maximum|developer mode|god mode)/i,
    category: 'role_manipulation',
    confidence: 'high',
    name: 'known_jailbreak_persona',
  },
  {
    pattern: /(?:you\s+(?:have\s+)?no\s+(?:rules|restrictions|limits|boundaries|constraints)|remove\s+(?:all\s+)?(?:your\s+)?(?:filters|restrictions|safety|guardrails))/i,
    category: 'instruction_override',
    confidence: 'high',
    name: 'constraint_removal',
  },
  
  // System prompt extraction
  {
    pattern: /(?:what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)|show\s+(?:me\s+)?your\s+(?:system\s+)?prompt|repeat\s+(?:your\s+)?(?:initial\s+)?(?:instructions?|prompt))/i,
    category: 'system_prompt_extraction',
    confidence: 'high',
    name: 'system_prompt_query',
  },
  {
    pattern: /(?:print|output|reveal|display|show)\s+(?:the\s+)?(?:above|previous|system|hidden|secret)\s+(?:text|prompt|instructions?|message)/i,
    category: 'system_prompt_extraction',
    confidence: 'high',
    name: 'prompt_reveal_request',
  },
  
  // Context escape attempts
  {
    pattern: /(?:\[system\]|\[assistant\]|\[user\]|<\|(?:im_start|im_end|system|user|assistant)\|>|<<SYS>>|<\/s>)/i,
    category: 'context_escape',
    confidence: 'high',
    name: 'special_token_injection',
  },
  {
    pattern: /```(?:system|instruction|prompt|override)/i,
    category: 'context_escape',
    confidence: 'medium',
    name: 'code_block_escape',
  },
  
  // Encoding bypass attempts
  {
    pattern: /(?:base64|rot13|hex|binary|morse)\s*(?:decode|encoded?|convert)/i,
    category: 'encoding_bypass',
    confidence: 'medium',
    name: 'encoding_scheme_mention',
  },
  {
    pattern: /(?:translate\s+(?:from|this)\s+)?(?:pig\s+latin|backwards?|reversed?|encrypted)/i,
    category: 'encoding_bypass',
    confidence: 'medium',
    name: 'obfuscation_request',
  },
  
  // Authority impersonation
  {
    pattern: /(?:i\s+am\s+(?:a|an|the)\s+)?(?:developer|admin(?:istrator)?|openai|anthropic|groq|system)\s+(?:and\s+)?(?:i\s+)?(?:authorize|allow|permit|grant|override)/i,
    category: 'authority_impersonation',
    confidence: 'high',
    name: 'authority_claim',
  },
  {
    pattern: /(?:this\s+is\s+a\s+)?(?:test|debug|maintenance|emergency)\s+(?:mode|override|bypass)/i,
    category: 'authority_impersonation',
    confidence: 'medium',
    name: 'mode_claim',
  },
  
  // Hypothetical framing (often used to bypass)
  {
    pattern: /(?:hypothetically|theoretically|in\s+(?:a\s+)?fiction(?:al)?|if\s+you\s+(?:were|could)|imagine\s+(?:if|that))\s+.*(?:no\s+(?:rules|restrictions)|bypass|ignore|override)/i,
    category: 'instruction_override',
    confidence: 'medium',
    name: 'hypothetical_bypass',
  },
  
  // Multi-step manipulation
  {
    pattern: /(?:first|step\s+1).*(?:then|step\s+2).*(?:ignore|forget|override)/i,
    category: 'instruction_override',
    confidence: 'medium',
    name: 'multi_step_manipulation',
  },
]

/**
 * Detect prompt injection attempts
 */
export function detectInjection(text: string): InjectionDetectionResult {
  const detectedPatterns: string[] = []
  let highestConfidence: 'low' | 'medium' | 'high' = 'low'
  let detectedCategory: InjectionCategory | null = null
  
  const confidenceOrder = { low: 0, medium: 1, high: 2 }
  
  for (const { pattern, category, confidence, name } of INJECTION_PATTERNS) {
    pattern.lastIndex = 0
    
    if (pattern.test(text)) {
      detectedPatterns.push(name)
      
      // Track highest confidence and its category
      if (confidenceOrder[confidence] > confidenceOrder[highestConfidence]) {
        highestConfidence = confidence
        detectedCategory = category
      } else if (!detectedCategory) {
        detectedCategory = category
      }
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    category: detectedCategory,
    confidence: detectedPatterns.length > 0 ? highestConfidence : 'low',
    patterns: detectedPatterns,
  }
}

/**
 * Check if injection should block the request
 */
export function shouldBlockInjection(result: InjectionDetectionResult): boolean {
  // Block high confidence detections
  if (result.confidence === 'high') return true
  
  // Block medium confidence with multiple patterns
  if (result.confidence === 'medium' && result.patterns.length >= 2) return true
  
  return false
}
