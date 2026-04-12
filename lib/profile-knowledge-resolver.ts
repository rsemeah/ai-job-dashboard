/**
 * Profile Knowledge Resolver
 * 
 * Maps abstract project references to known profile entities.
 * Uses explicit user profile data and evidence to ground all claims.
 * 
 * Key principle: Only substitute when grounded in real user profile data.
 * Never invent names, links, or metrics.
 */

import type { EvidenceRecord } from "./types"

// ============================================================================
// TYPES
// ============================================================================

export interface KnownProduct {
  name: string
  description: string
  website?: string
  github?: string
  liveUrl?: string
  role?: string
  techStack?: string[]
  evidenceIds: string[]
  confidence: "explicit" | "inferred" | "weak"
}

export interface ProfileKnowledge {
  products: KnownProduct[]
  websites: { name: string; url: string; purpose: string }[]
  repos: { name: string; url: string; project?: string }[]
  companies: { name: string; role?: string; context?: string }[]
  metrics: { value: string; context: string; evidenceId: string }[]
  tools: string[]
  domains: string[]
}

export interface EnhancementSuggestion {
  type: "product_name" | "website" | "repo" | "metric" | "context" | "scope"
  confidence: "safe" | "needs_review" | "blocked"
  original: string
  enhanced: string
  source: string
  reason: string
}

// ============================================================================
// ABSTRACT PATTERN DETECTION
// ============================================================================

/**
 * Patterns that indicate abstract/generic language that could be strengthened
 */
const ABSTRACT_PATTERNS = [
  { pattern: /\b(AI|ML|machine learning)\s+(platform|system|tool|application|product)\b/gi, type: "ai_product" },
  { pattern: /\b(career|job|hiring)\s+(platform|system|tool|application)\b/gi, type: "career_product" },
  { pattern: /\b(trading|finance|fintech)\s+(platform|system|tool|application)\b/gi, type: "trading_product" },
  { pattern: /\b(analytics|dashboard|reporting)\s+(platform|system|tool|application)\b/gi, type: "analytics_product" },
  { pattern: /\b(study|learning|education)\s+(platform|system|tool|application)\b/gi, type: "education_product" },
  { pattern: /\b(lead|CRM|sales)\s+(platform|system|tool|application)\b/gi, type: "sales_product" },
  { pattern: /\bpersonal\s+(portfolio|website|site)\b/gi, type: "portfolio" },
  { pattern: /\b(built|developed|created|designed)\s+(?:a|an|the)?\s*(platform|system|tool|application|website)\b/gi, type: "generic_build" },
  { pattern: /\breal\s*estate\s+(intelligence|analytics|platform)\b/gi, type: "real_estate_product" },
]

// ============================================================================
// PRODUCT IDENTITY MATCHING
// ============================================================================

/**
 * Product hints are now dynamically extracted from user evidence.
 * 
 * REMOVED: Hardcoded founder-specific product mappings (HireWire, TradeSwarm, 
 * PhonePop, Authentic Hadith, Clarity) that biased multi-user generation.
 * 
 * Product matching now relies solely on:
 * 1. Explicit product_name fields in evidence
 * 2. PascalCase/camelCase product names extracted from evidence text
 * 3. User's own evidence library - no global hints
 */
const PRODUCT_HINTS: Record<string, string[]> = {
  // Empty - product hints are now user-scoped and data-driven
  // Each user's evidence library defines their own product vocabulary
}

/**
 * Extract known products from evidence library
 */
export function extractKnownProducts(evidence: EvidenceRecord[]): KnownProduct[] {
  const products: Map<string, KnownProduct> = new Map()
  
  for (const ev of evidence) {
    // Skip inactive evidence
    if (!ev.is_active) continue
    
    // Extract from project_name if it looks like a named product
    if (ev.project_name && isNamedProduct(ev.project_name)) {
      const existing = products.get(ev.project_name.toLowerCase())
      if (existing) {
        existing.evidenceIds.push(ev.id)
      } else {
        products.set(ev.project_name.toLowerCase(), {
          name: ev.project_name,
          description: ev.business_goal || ev.what_shipped || "",
          website: ev.source_url?.includes("http") && !ev.source_url.includes("github") 
            ? ev.source_url 
            : undefined,
          github: ev.source_url?.includes("github") ? ev.source_url : undefined,
          role: ev.role_name,
          techStack: [...(ev.tools_used || []), ...(ev.systems_used || [])],
          evidenceIds: [ev.id],
          confidence: "explicit",
        })
      }
    }
    
    // Also check what_shipped and what_visible for product names
    const shippedProducts = extractProductNamesFromText(ev.what_shipped || "")
    const visibleProducts = extractProductNamesFromText(ev.what_visible || "")
    
    for (const prodName of [...shippedProducts, ...visibleProducts]) {
      if (!products.has(prodName.toLowerCase())) {
        products.set(prodName.toLowerCase(), {
          name: prodName,
          description: ev.what_shipped || "",
          website: ev.source_url?.includes("http") && !ev.source_url.includes("github") 
            ? ev.source_url 
            : undefined,
          github: ev.source_url?.includes("github") ? ev.source_url : undefined,
          role: ev.role_name,
          techStack: [...(ev.tools_used || []), ...(ev.systems_used || [])],
          evidenceIds: [ev.id],
          confidence: "inferred",
        })
      }
    }
  }
  
  return Array.from(products.values())
}

/**
 * Check if a string looks like a named product (not generic)
 */
function isNamedProduct(name: string): boolean {
  if (!name) return false
  
  const genericWords = [
    "project", "system", "platform", "tool", "application", 
    "app", "website", "site", "dashboard", "api", "service",
    "internal", "external", "custom", "new", "main"
  ]
  
  const lowerName = name.toLowerCase().trim()
  
  // Too short or just generic words
  if (lowerName.length < 3) return false
  if (genericWords.includes(lowerName)) return false
  
  // Starts with capital letter and is a proper noun-like name
  if (/^[A-Z][a-zA-Z0-9]+$/.test(name.trim())) return true
  
  // Contains multiple capital letters (camelCase or PascalCase)
  if (/[A-Z].*[A-Z]/.test(name)) return true
  
  // Known product patterns
  for (const knownProduct of Object.keys(PRODUCT_HINTS)) {
    if (lowerName.includes(knownProduct.toLowerCase())) return true
  }
  
  return false
}

/**
 * Extract product names from text
 */
function extractProductNamesFromText(text: string): string[] {
  if (!text) return []
  
  const products: string[] = []
  
  // Look for PascalCase or camelCase words
  const matches = text.match(/\b[A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]+)*\b/g) || []
  
  for (const match of matches) {
    if (isNamedProduct(match)) {
      products.push(match)
    }
  }
  
  return products
}

// ============================================================================
// BULLET ENHANCEMENT
// ============================================================================

/**
 * Try to match an abstract description to a known product
 */
export function matchToKnownProduct(
  abstractText: string, 
  knownProducts: KnownProduct[]
): KnownProduct | null {
  const lowerText = abstractText.toLowerCase()
  
  // First, check direct product name matches
  for (const product of knownProducts) {
    if (lowerText.includes(product.name.toLowerCase())) {
      return product
    }
  }
  
  // Then, check hint-based matching
  for (const [productName, hints] of Object.entries(PRODUCT_HINTS)) {
    for (const hint of hints) {
      if (lowerText.includes(hint.toLowerCase())) {
        // Find if we have evidence for this product
        const matchingProduct = knownProducts.find(
          p => p.name.toLowerCase() === productName.toLowerCase()
        )
        if (matchingProduct) {
          return matchingProduct
        }
      }
    }
  }
  
  return null
}

/**
 * Enhance a bullet with known profile data
 */
export function enhanceBullet(
  bullet: string,
  knownProducts: KnownProduct[],
  profileKnowledge: ProfileKnowledge
): EnhancementSuggestion[] {
  const suggestions: EnhancementSuggestion[] = []
  
  // Check for abstract patterns
  for (const { pattern, type } of ABSTRACT_PATTERNS) {
    const match = bullet.match(pattern)
    if (match) {
      // Try to find a matching known product
      const product = matchToKnownProduct(bullet, knownProducts)
      
      if (product && product.confidence === "explicit") {
        // Safe to auto-substitute
        const enhanced = bullet.replace(
          match[0],
          `${product.name}${product.description ? `, ${product.description.split(".")[0]}` : ""}`
        )
        
        suggestions.push({
          type: "product_name",
          confidence: "safe",
          original: match[0],
          enhanced: product.name,
          source: `Evidence: ${product.evidenceIds[0]}`,
          reason: `Matched to known product "${product.name}" from evidence library`,
        })
      } else if (product && product.confidence === "inferred") {
        // Needs user review
        suggestions.push({
          type: "product_name",
          confidence: "needs_review",
          original: match[0],
          enhanced: product.name,
          source: `Evidence: ${product.evidenceIds[0]}`,
          reason: `Possible match to "${product.name}" - please verify`,
        })
      }
    }
  }
  
  // Check for missing metrics that we have in evidence
  const hasMetric = /\d+%|\$[\d,]+|\d+[xX]|\d+\s*(users?|customers?|clients?|teams?|projects?)/i.test(bullet)
  if (!hasMetric) {
    // Look for metrics in profile knowledge
    for (const metric of profileKnowledge.metrics) {
      // Check if the bullet context matches the metric context
      if (bulletContextMatchesMetricContext(bullet, metric.context)) {
        suggestions.push({
          type: "metric",
          confidence: "needs_review",
          original: "(no metric)",
          enhanced: metric.value,
          source: `Evidence: ${metric.evidenceId}`,
          reason: `Found metric "${metric.value}" in evidence that may apply`,
        })
      }
    }
  }
  
  return suggestions
}

/**
 * Check if bullet context matches metric context
 */
function bulletContextMatchesMetricContext(bullet: string, metricContext: string): boolean {
  const bulletWords = bullet.toLowerCase().split(/\s+/)
  const contextWords = metricContext.toLowerCase().split(/\s+/)
  
  // Count overlapping meaningful words
  const meaningfulWords = contextWords.filter(w => w.length > 3)
  const overlapCount = meaningfulWords.filter(w => bulletWords.includes(w)).length
  
  return overlapCount >= 2
}

// ============================================================================
// FULL PROFILE KNOWLEDGE EXTRACTION
// ============================================================================

// ============================================================================
// PROFILE LINK NORMALIZATION
// ============================================================================

export interface NormalizedProfileLinks {
  linkedin?: string
  github?: string
  portfolio?: string
  website?: string
}

/**
 * Normalize ProfileLink[] (from profile_links table) into a flat object.
 * Prefers is_primary=true entries; falls back to first found per type.
 * Also accepts legacy flat object shape for backward compatibility.
 */
export function normalizeProfileLinks(
  links: Array<{ link_type: string; url: string; is_primary?: boolean }> | { portfolio?: string; linkedin?: string; github?: string } | null | undefined
): NormalizedProfileLinks {
  if (!links) return {}

  // Legacy flat object shape
  if (!Array.isArray(links)) {
    return {
      linkedin: links.linkedin,
      github: links.github,
      portfolio: links.portfolio,
    }
  }

  const result: NormalizedProfileLinks = {}
  // Process primary links first, then non-primary
  const sorted = [...links].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
  for (const link of sorted) {
    const type = link.link_type as keyof NormalizedProfileLinks
    if (!result[type]) result[type] = link.url
  }
  return result
}

// ============================================================================
// FULL PROFILE KNOWLEDGE EXTRACTION
// ============================================================================

/**
 * Build complete profile knowledge from all sources
 */
export function buildProfileKnowledge(
  profile: {
    full_name?: string
    email?: string
    phone?: string
    location?: string
    summary?: string
    skills?: string[]
    links?: Array<{ link_type: string; url: string; is_primary?: boolean }> | { portfolio?: string; linkedin?: string; github?: string } | null
    experience?: Array<{ title: string; company: string; description?: string }>
  },
  evidence: EvidenceRecord[]
): ProfileKnowledge {
  const knowledge: ProfileKnowledge = {
    products: extractKnownProducts(evidence),
    websites: [],
    repos: [],
    companies: [],
    metrics: [],
    tools: [],
    domains: [],
  }

  const normalizedLinks = normalizeProfileLinks(profile.links)

  // Extract from profile links
  if (normalizedLinks.portfolio) {
    knowledge.websites.push({
      name: extractDomainName(normalizedLinks.portfolio),
      url: normalizedLinks.portfolio,
      purpose: "portfolio",
    })
  }
  if (normalizedLinks.github) {
    knowledge.repos.push({
      name: "GitHub Profile",
      url: normalizedLinks.github,
    })
  }
  if (normalizedLinks.website) {
    knowledge.websites.push({
      name: extractDomainName(normalizedLinks.website),
      url: normalizedLinks.website,
      purpose: "website",
    })
  }
  
  // Extract from profile experience
  for (const exp of profile.experience || []) {
    knowledge.companies.push({
      name: exp.company,
      role: exp.title,
    })
  }
  
  // Extract from evidence
  for (const ev of evidence) {
    if (!ev.is_active) continue
    
    // Companies
    if (ev.company_name) {
      const existing = knowledge.companies.find(c => c.name === ev.company_name)
      if (!existing) {
        knowledge.companies.push({
          name: ev.company_name,
          role: ev.role_name,
          context: ev.business_goal,
        })
      }
    }
    
    // Tools
    for (const tool of [...(ev.tools_used || []), ...(ev.systems_used || [])]) {
      if (!knowledge.tools.includes(tool)) {
        knowledge.tools.push(tool)
      }
    }
    
    // Domains/industries
    for (const industry of ev.industries || []) {
      if (!knowledge.domains.includes(industry)) {
        knowledge.domains.push(industry)
      }
    }
    
    // Metrics from outcomes
    for (const outcome of ev.outcomes || []) {
      if (/\d+%|\$[\d,]+|\d+[xX]|\d+\s*(users?|customers?)/i.test(outcome)) {
        knowledge.metrics.push({
          value: outcome,
          context: ev.what_shipped || ev.business_goal || "",
          evidenceId: ev.id,
        })
      }
    }
    
    // URLs
    if (ev.source_url) {
      if (ev.source_url.includes("github.com")) {
        knowledge.repos.push({
          name: extractRepoName(ev.source_url),
          url: ev.source_url,
          project: ev.project_name,
        })
      } else if (ev.source_url.includes("http")) {
        knowledge.websites.push({
          name: extractDomainName(ev.source_url),
          url: ev.source_url,
          purpose: ev.project_name || "project",
        })
      }
    }
  }
  
  return knowledge
}

/**
 * Extract domain name from URL
 */
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/**
 * Extract repo name from GitHub URL
 */
function extractRepoName(url: string): string {
  const match = url.match(/github\.com\/[^/]+\/([^/]+)/)
  return match ? match[1] : "Repository"
}

// ============================================================================
// AUTO-REPAIR LOGIC
// ============================================================================

export interface AutoRepairResult {
  canAutoFix: boolean
  needsUserConfirmation: boolean
  needsMoreEvidence: boolean
  fixedText?: string
  suggestions: EnhancementSuggestion[]
  confidence: "high" | "medium" | "low"
}

/**
 * Attempt to auto-repair a weak bullet using profile knowledge
 */
export function attemptAutoRepair(
  bullet: string,
  knownProducts: KnownProduct[],
  profileKnowledge: ProfileKnowledge
): AutoRepairResult {
  const suggestions = enhanceBullet(bullet, knownProducts, profileKnowledge)
  
  // Categorize suggestions
  const safeFixed = suggestions.filter(s => s.confidence === "safe")
  const needsReview = suggestions.filter(s => s.confidence === "needs_review")
  const blocked = suggestions.filter(s => s.confidence === "blocked")
  
  if (blocked.length > 0) {
    return {
      canAutoFix: false,
      needsUserConfirmation: false,
      needsMoreEvidence: true,
      suggestions: blocked,
      confidence: "low",
    }
  }
  
  if (safeFixed.length > 0 && needsReview.length === 0) {
    // Apply safe fixes
    let fixedText = bullet
    for (const fix of safeFixed) {
      if (fix.type === "product_name") {
        fixedText = fixedText.replace(fix.original, fix.enhanced)
      }
    }
    
    return {
      canAutoFix: true,
      needsUserConfirmation: false,
      needsMoreEvidence: false,
      fixedText,
      suggestions: safeFixed,
      confidence: "high",
    }
  }
  
  if (needsReview.length > 0) {
    return {
      canAutoFix: false,
      needsUserConfirmation: true,
      needsMoreEvidence: false,
      suggestions: needsReview,
      confidence: "medium",
    }
  }
  
  // No improvements found
  return {
    canAutoFix: false,
    needsUserConfirmation: false,
    needsMoreEvidence: false,
    suggestions: [],
    confidence: "low",
  }
}
