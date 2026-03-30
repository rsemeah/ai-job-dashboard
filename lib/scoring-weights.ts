/**
 * Role-Aware Scoring Weights Configuration
 * 
 * Single source of truth for role-based weight profiles.
 * Weights always sum to 100 across all dimensions.
 * 
 * Dimensions:
 * - experience_relevance: How relevant is past experience to the role?
 * - evidence_quality: How well-documented and verifiable is the evidence?
 * - skills_match: Do specific skills/tools match the requirements?
 * - seniority_alignment: Does seniority level match expectations?
 * - ats_keywords: ATS keyword coverage (usually matters least)
 * 
 * Key Patterns:
 * 1. Experience dominates technical + leadership roles
 * 2. Evidence dominates marketing + sales roles
 * 3. Skills dominate entry-level roles
 * 4. ATS is never dominant
 * 5. Seniority is a modifier, not a driver
 */

export interface ScoringWeights {
  experience_relevance: number
  evidence_quality: number
  skills_match: number
  seniority_alignment: number
  ats_keywords: number
}

export interface RoleWeightProfile {
  role: string
  category: string
  weights: ScoringWeights
  description: string
}

// ============================================================================
// DEFAULT BALANCED PROFILE
// ============================================================================

export const DEFAULT_WEIGHTS: ScoringWeights = {
  experience_relevance: 30,
  evidence_quality: 30,
  skills_match: 20,
  seniority_alignment: 10,
  ats_keywords: 10,
}

// ============================================================================
// ROLE WEIGHT PROFILES - Production-Ready (50 roles)
// Format: experience / evidence / skills / seniority / ats
// ============================================================================

export const ROLE_WEIGHT_PROFILES: RoleWeightProfile[] = [
  // ============================================================================
  // TECH / PRODUCT / DATA
  // ============================================================================
  {
    role: "Software Engineer",
    category: "Tech",
    weights: { experience_relevance: 35, evidence_quality: 25, skills_match: 25, seniority_alignment: 10, ats_keywords: 5 },
    description: "Technical skills and experience balanced"
  },
  {
    role: "Senior Software Engineer",
    category: "Tech",
    weights: { experience_relevance: 40, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 0 },
    description: "Experience weighted higher for senior roles"
  },
  {
    role: "Frontend Engineer",
    category: "Tech",
    weights: { experience_relevance: 30, evidence_quality: 25, skills_match: 30, seniority_alignment: 10, ats_keywords: 5 },
    description: "Frontend-specific skills emphasized"
  },
  {
    role: "Backend Engineer",
    category: "Tech",
    weights: { experience_relevance: 35, evidence_quality: 25, skills_match: 25, seniority_alignment: 10, ats_keywords: 5 },
    description: "Backend systems experience"
  },
  {
    role: "Full Stack Engineer",
    category: "Tech",
    weights: { experience_relevance: 30, evidence_quality: 25, skills_match: 30, seniority_alignment: 10, ats_keywords: 5 },
    description: "Breadth of technical skills"
  },
  {
    role: "DevOps Engineer",
    category: "Tech",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Infrastructure and tooling experience"
  },
  {
    role: "Data Engineer",
    category: "Tech",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Data infrastructure skills"
  },
  {
    role: "Data Scientist",
    category: "Tech",
    weights: { experience_relevance: 30, evidence_quality: 30, skills_match: 25, seniority_alignment: 10, ats_keywords: 5 },
    description: "Statistical and ML skills"
  },
  {
    role: "Machine Learning Engineer",
    category: "Tech",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 25, seniority_alignment: 5, ats_keywords: 5 },
    description: "ML/AI technical depth"
  },
  {
    role: "AI Engineer",
    category: "Tech",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 25, seniority_alignment: 5, ats_keywords: 5 },
    description: "AI systems experience"
  },
  {
    role: "Product Manager",
    category: "Tech",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Product delivery and strategy"
  },
  {
    role: "Technical Product Manager",
    category: "Tech",
    weights: { experience_relevance: 40, evidence_quality: 30, skills_match: 20, seniority_alignment: 5, ats_keywords: 5 },
    description: "Technical depth emphasized"
  },
  {
    role: "AI Technical Product Manager",
    category: "Tech",
    weights: { experience_relevance: 40, evidence_quality: 30, skills_match: 20, seniority_alignment: 5, ats_keywords: 5 },
    description: "AI/ML product experience"
  },
  {
    role: "Product Designer",
    category: "Tech",
    weights: { experience_relevance: 30, evidence_quality: 30, skills_match: 25, seniority_alignment: 10, ats_keywords: 5 },
    description: "Portfolio evidence critical"
  },
  {
    role: "UX Researcher",
    category: "Tech",
    weights: { experience_relevance: 25, evidence_quality: 35, skills_match: 20, seniority_alignment: 15, ats_keywords: 5 },
    description: "Research portfolio and methodology"
  },
  {
    role: "QA Engineer",
    category: "Tech",
    weights: { experience_relevance: 30, evidence_quality: 25, skills_match: 25, seniority_alignment: 10, ats_keywords: 10 },
    description: "Testing skills and process knowledge"
  },

  // ============================================================================
  // BUSINESS / OPERATIONS
  // ============================================================================
  {
    role: "Operations Manager",
    category: "Business",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Operations leadership experience"
  },
  {
    role: "Business Analyst",
    category: "Business",
    weights: { experience_relevance: 30, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 10 },
    description: "Analytical and domain skills"
  },
  {
    role: "Management Consultant",
    category: "Business",
    weights: { experience_relevance: 40, evidence_quality: 35, skills_match: 15, seniority_alignment: 10, ats_keywords: 0 },
    description: "Consulting track record"
  },
  {
    role: "Project Manager",
    category: "Business",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Project delivery experience"
  },
  {
    role: "Program Manager",
    category: "Business",
    weights: { experience_relevance: 40, evidence_quality: 30, skills_match: 20, seniority_alignment: 5, ats_keywords: 5 },
    description: "Complex program coordination"
  },

  // ============================================================================
  // SALES / GTM
  // ============================================================================
  {
    role: "Account Executive",
    category: "Sales",
    weights: { experience_relevance: 30, evidence_quality: 35, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Sales results and quota attainment"
  },
  {
    role: "SDR",
    category: "Sales",
    weights: { experience_relevance: 25, evidence_quality: 30, skills_match: 25, seniority_alignment: 10, ats_keywords: 10 },
    description: "Prospecting metrics and energy"
  },
  {
    role: "BDR",
    category: "Sales",
    weights: { experience_relevance: 25, evidence_quality: 30, skills_match: 25, seniority_alignment: 10, ats_keywords: 10 },
    description: "Business development metrics"
  },
  {
    role: "Sales Manager",
    category: "Sales",
    weights: { experience_relevance: 35, evidence_quality: 35, skills_match: 15, seniority_alignment: 10, ats_keywords: 5 },
    description: "Team leadership and results"
  },
  {
    role: "Customer Success Manager",
    category: "Sales",
    weights: { experience_relevance: 30, evidence_quality: 35, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Retention and expansion metrics"
  },
  {
    role: "Partnerships Manager",
    category: "Sales",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Partnership development track record"
  },

  // ============================================================================
  // MARKETING
  // ============================================================================
  {
    role: "Marketing Manager",
    category: "Marketing",
    weights: { experience_relevance: 30, evidence_quality: 35, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Campaign results and metrics"
  },
  {
    role: "Growth Marketer",
    category: "Marketing",
    weights: { experience_relevance: 25, evidence_quality: 40, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Growth experiment results"
  },
  {
    role: "Performance Marketer",
    category: "Marketing",
    weights: { experience_relevance: 25, evidence_quality: 40, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "ROAS and campaign performance"
  },
  {
    role: "Content Marketing Manager",
    category: "Marketing",
    weights: { experience_relevance: 25, evidence_quality: 35, skills_match: 20, seniority_alignment: 10, ats_keywords: 10 },
    description: "Content portfolio and metrics"
  },
  {
    role: "Social Media Manager",
    category: "Marketing",
    weights: { experience_relevance: 20, evidence_quality: 35, skills_match: 20, seniority_alignment: 10, ats_keywords: 15 },
    description: "Social metrics and engagement"
  },

  // ============================================================================
  // FINANCE / ANALYTICS
  // ============================================================================
  {
    role: "Financial Analyst",
    category: "Finance",
    weights: { experience_relevance: 30, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 10 },
    description: "Financial modeling skills"
  },
  {
    role: "Investment Analyst",
    category: "Finance",
    weights: { experience_relevance: 35, evidence_quality: 35, skills_match: 15, seniority_alignment: 10, ats_keywords: 5 },
    description: "Investment track record"
  },
  {
    role: "Accountant",
    category: "Finance",
    weights: { experience_relevance: 30, evidence_quality: 25, skills_match: 20, seniority_alignment: 10, ats_keywords: 15 },
    description: "Technical accounting skills"
  },
  {
    role: "FP&A Analyst",
    category: "Finance",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Financial planning experience"
  },
  {
    role: "Risk Analyst",
    category: "Finance",
    weights: { experience_relevance: 30, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 10 },
    description: "Risk assessment methodology"
  },

  // ============================================================================
  // HEALTHCARE
  // ============================================================================
  {
    role: "Registered Nurse",
    category: "Healthcare",
    weights: { experience_relevance: 40, evidence_quality: 30, skills_match: 15, seniority_alignment: 10, ats_keywords: 5 },
    description: "Clinical experience critical"
  },
  {
    role: "Physician Assistant",
    category: "Healthcare",
    weights: { experience_relevance: 40, evidence_quality: 30, skills_match: 15, seniority_alignment: 10, ats_keywords: 5 },
    description: "Medical practice experience"
  },
  {
    role: "Medical Assistant",
    category: "Healthcare",
    weights: { experience_relevance: 30, evidence_quality: 25, skills_match: 20, seniority_alignment: 10, ats_keywords: 15 },
    description: "Clinical support skills"
  },

  // ============================================================================
  // LEGAL / COMPLIANCE
  // ============================================================================
  {
    role: "Lawyer",
    category: "Legal",
    weights: { experience_relevance: 40, evidence_quality: 35, skills_match: 15, seniority_alignment: 10, ats_keywords: 0 },
    description: "Legal track record and specialization"
  },
  {
    role: "Attorney",
    category: "Legal",
    weights: { experience_relevance: 40, evidence_quality: 35, skills_match: 15, seniority_alignment: 10, ats_keywords: 0 },
    description: "Legal track record and specialization"
  },
  {
    role: "Compliance Analyst",
    category: "Legal",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Regulatory compliance experience"
  },

  // ============================================================================
  // CONSTRUCTION / FIELD
  // ============================================================================
  {
    role: "Construction Manager",
    category: "Construction",
    weights: { experience_relevance: 40, evidence_quality: 30, skills_match: 15, seniority_alignment: 10, ats_keywords: 5 },
    description: "Project delivery track record"
  },
  {
    role: "Project Engineer",
    category: "Construction",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Technical engineering experience"
  },

  // ============================================================================
  // RETAIL / SERVICE
  // ============================================================================
  {
    role: "Store Manager",
    category: "Retail",
    weights: { experience_relevance: 35, evidence_quality: 30, skills_match: 15, seniority_alignment: 10, ats_keywords: 10 },
    description: "Retail management experience"
  },
  {
    role: "Customer Service Rep",
    category: "Retail",
    weights: { experience_relevance: 20, evidence_quality: 25, skills_match: 20, seniority_alignment: 10, ats_keywords: 25 },
    description: "Service skills and attitude"
  },

  // ============================================================================
  // ENTRY / GENERAL
  // ============================================================================
  {
    role: "Entry-Level",
    category: "Entry",
    weights: { experience_relevance: 20, evidence_quality: 20, skills_match: 30, seniority_alignment: 20, ats_keywords: 10 },
    description: "Skills and potential over experience"
  },
  {
    role: "Internship",
    category: "Entry",
    weights: { experience_relevance: 15, evidence_quality: 20, skills_match: 35, seniority_alignment: 20, ats_keywords: 10 },
    description: "Learning potential and foundational skills"
  },
  {
    role: "Administrative Assistant",
    category: "Entry",
    weights: { experience_relevance: 25, evidence_quality: 25, skills_match: 20, seniority_alignment: 10, ats_keywords: 20 },
    description: "Organizational and communication skills"
  },

  // ============================================================================
  // SPECIALIZED / CREATIVE
  // ============================================================================
  {
    role: "Graphic Designer",
    category: "Creative",
    weights: { experience_relevance: 25, evidence_quality: 35, skills_match: 25, seniority_alignment: 10, ats_keywords: 5 },
    description: "Portfolio quality paramount"
  },
  {
    role: "Video Editor",
    category: "Creative",
    weights: { experience_relevance: 25, evidence_quality: 35, skills_match: 25, seniority_alignment: 10, ats_keywords: 5 },
    description: "Portfolio and reel quality"
  },
  {
    role: "Copywriter",
    category: "Creative",
    weights: { experience_relevance: 25, evidence_quality: 40, skills_match: 20, seniority_alignment: 10, ats_keywords: 5 },
    description: "Writing samples and results"
  },

  // ============================================================================
  // FALLBACK
  // ============================================================================
  {
    role: "Other",
    category: "Other",
    weights: { experience_relevance: 30, evidence_quality: 30, skills_match: 20, seniority_alignment: 10, ats_keywords: 10 },
    description: "Default balanced weights"
  },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get weights for a specific role (case-insensitive partial match)
 */
export function getWeightsForRole(role: string | null | undefined): ScoringWeights {
  if (!role) return DEFAULT_WEIGHTS
  
  const roleLower = role.toLowerCase().trim()
  
  // Try exact match first
  const exactMatch = ROLE_WEIGHT_PROFILES.find(
    p => p.role.toLowerCase() === roleLower
  )
  if (exactMatch) return exactMatch.weights
  
  // Try partial match (role contains the profile role or vice versa)
  const partialMatch = ROLE_WEIGHT_PROFILES.find(
    p => roleLower.includes(p.role.toLowerCase()) || p.role.toLowerCase().includes(roleLower)
  )
  if (partialMatch) return partialMatch.weights
  
  // Try keyword matching
  const keywords = roleLower.split(/\s+/)
  const keywordMatch = ROLE_WEIGHT_PROFILES.find(p => {
    const profileKeywords = p.role.toLowerCase().split(/\s+/)
    return keywords.some(kw => profileKeywords.some(pk => pk.includes(kw) || kw.includes(pk)))
  })
  if (keywordMatch) return keywordMatch.weights
  
  return DEFAULT_WEIGHTS
}

/**
 * Get the role profile for a role
 */
export function getRoleProfile(role: string | null | undefined): RoleWeightProfile | null {
  if (!role) return null
  
  const roleLower = role.toLowerCase().trim()
  
  return ROLE_WEIGHT_PROFILES.find(
    p => p.role.toLowerCase() === roleLower ||
         roleLower.includes(p.role.toLowerCase()) ||
         p.role.toLowerCase().includes(roleLower)
  ) || null
}

/**
 * Get the role profile description for a role
 */
export function getRoleProfileDescription(role: string | null | undefined): string {
  const profile = getRoleProfile(role)
  return profile?.description || "Default balanced weights"
}

/**
 * Validate that weights sum to 100
 */
export function validateWeights(weights: ScoringWeights): boolean {
  const sum = 
    weights.experience_relevance +
    weights.evidence_quality +
    weights.skills_match +
    weights.seniority_alignment +
    weights.ats_keywords
  
  return sum === 100
}

/**
 * Normalize weights to ensure they sum to 100
 */
export function normalizeWeights(weights: ScoringWeights): ScoringWeights {
  const sum = 
    weights.experience_relevance +
    weights.evidence_quality +
    weights.skills_match +
    weights.seniority_alignment +
    weights.ats_keywords
  
  if (sum === 100) return weights
  if (sum === 0) return DEFAULT_WEIGHTS
  
  const factor = 100 / sum
  
  // Calculate normalized values
  const normalized = {
    experience_relevance: Math.round(weights.experience_relevance * factor),
    evidence_quality: Math.round(weights.evidence_quality * factor),
    skills_match: Math.round(weights.skills_match * factor),
    seniority_alignment: Math.round(weights.seniority_alignment * factor),
    ats_keywords: Math.round(weights.ats_keywords * factor),
  }
  
  // Fix rounding errors by adjusting the largest value
  const newSum = Object.values(normalized).reduce((a, b) => a + b, 0)
  if (newSum !== 100) {
    const diff = 100 - newSum
    // Add/subtract diff from largest value
    const maxKey = Object.entries(normalized).reduce((a, b) => a[1] > b[1] ? a : b)[0] as keyof ScoringWeights
    normalized[maxKey] += diff
  }
  
  return normalized
}

/**
 * Calculate weighted score from individual scores and weights
 */
export function calculateWeightedScore(
  scores: {
    experience_relevance: number
    evidence_quality: number
    skills_match: number
    seniority_alignment: number
    ats_keywords: number
  },
  weights: ScoringWeights
): number {
  const normalizedWeights = normalizeWeights(weights)
  
  const weightedSum = 
    (scores.experience_relevance * normalizedWeights.experience_relevance / 100) +
    (scores.evidence_quality * normalizedWeights.evidence_quality / 100) +
    (scores.skills_match * normalizedWeights.skills_match / 100) +
    (scores.seniority_alignment * normalizedWeights.seniority_alignment / 100) +
    (scores.ats_keywords * normalizedWeights.ats_keywords / 100)
  
  return Math.round(weightedSum)
}

/**
 * Get all available role options for UI dropdown, grouped by category
 */
export function getAvailableRoles(): string[] {
  return ROLE_WEIGHT_PROFILES.map(p => p.role)
}

/**
 * Get roles grouped by category for UI
 */
export function getRolesByCategory(): Record<string, RoleWeightProfile[]> {
  return ROLE_WEIGHT_PROFILES.reduce((acc, profile) => {
    if (!acc[profile.category]) {
      acc[profile.category] = []
    }
    acc[profile.category].push(profile)
    return acc
  }, {} as Record<string, RoleWeightProfile[]>)
}

/**
 * Find closest matching role from job title
 */
export function inferRoleFromJobTitle(jobTitle: string | null | undefined): string {
  if (!jobTitle) return "Other"
  
  const titleLower = jobTitle.toLowerCase().trim()
  
  // Remove common suffixes like I, II, III, 1, 2, 3
  const cleanedTitle = titleLower.replace(/\s*(i|ii|iii|iv|v|1|2|3|sr\.?|jr\.?|senior|junior)\s*$/i, "").trim()
  
  // Try exact match first
  const exactMatch = ROLE_WEIGHT_PROFILES.find(p => 
    p.role.toLowerCase() === cleanedTitle || 
    p.role.toLowerCase() === titleLower
  )
  if (exactMatch) return exactMatch.role
  
  // Try partial match
  const partialMatch = ROLE_WEIGHT_PROFILES.find(p => 
    cleanedTitle.includes(p.role.toLowerCase()) || 
    p.role.toLowerCase().includes(cleanedTitle)
  )
  if (partialMatch) return partialMatch.role
  
  // Try keyword matching for common terms
  const keywordMap: Record<string, string> = {
    "product": "Product Manager",
    "engineer": "Software Engineer",
    "developer": "Software Engineer",
    "designer": "Product Designer",
    "data": "Data Scientist",
    "analyst": "Business Analyst",
    "marketing": "Marketing Manager",
    "sales": "Account Executive",
    "customer success": "Customer Success Manager",
    "operations": "Operations Manager",
    "program": "Program Manager",
    "project": "Project Manager",
    "qa": "QA Engineer",
    "quality": "QA Engineer",
    "devops": "DevOps Engineer",
    "sre": "DevOps Engineer",
    "frontend": "Frontend Engineer",
    "backend": "Backend Engineer",
    "fullstack": "Full Stack Engineer",
    "full-stack": "Full Stack Engineer",
    "ml": "Machine Learning Engineer",
    "machine learning": "Machine Learning Engineer",
    "ai": "AI Engineer",
    "ux": "Product Designer",
    "ui": "Product Designer",
    "growth": "Growth Marketer",
    "content": "Content Marketing Manager",
    "social": "Social Media Manager",
    "finance": "Financial Analyst",
    "accounting": "Accountant",
    "legal": "Lawyer",
    "compliance": "Compliance Analyst",
    "nurse": "Registered Nurse",
    "construction": "Construction Manager",
    "retail": "Store Manager",
    "admin": "Administrative Assistant",
    "intern": "Internship",
    "graphic": "Graphic Designer",
    "video": "Video Editor",
    "copy": "Copywriter",
  }
  
  for (const [keyword, role] of Object.entries(keywordMap)) {
    if (titleLower.includes(keyword)) {
      return role
    }
  }
  
  return "Other"
}
