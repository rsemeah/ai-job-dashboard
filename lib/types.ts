/**
 * HireWire TruthSerum Types
 * Evidence-based career operating system for Ro
 * 
 * Architecture:
 * - Frontend: URL intake, analysis display, document review
 * - API Routes: Direct job analysis and document generation
 * - Supabase: Persistent state (jobs, profiles, evidence, documents)
 */

// ============================================================================
// ROLE FAMILIES (for categorization and tailoring)
// ============================================================================

export const ROLE_FAMILIES = [
  "AI Technical Product Manager",
  "Technical Product Manager",
  "AI Product Manager",
  "Product Manager",
  "Senior Product Manager",
  "Systems Product Manager",
  "Workflow Product Manager",
  "Analytics Product Manager",
  "Product Owner",
  "Program Manager",
  "Other",
] as const

export type RoleFamily = typeof ROLE_FAMILIES[number]

// Best fit vs stretch titles
export const BEST_FIT_TITLES = [
  "AI Technical Product Manager",
  "Technical Product Manager",
  "AI Product Manager",
  "Product Manager",
  "Senior Product Manager",
  "Senior Technical Product Manager",
] as const

export const STRETCH_TITLES = [
  "Lead Product Manager",
  "Principal Product Manager",
  "Director of Product",
] as const

// ============================================================================
// JOB LIFECYCLE STATES
// ============================================================================

export type JobStatus =
  | "NEW"                   // Just analyzed, ready for review
  | "REVIEWING"             // User is reviewing fit
  | "GENERATING"            // Materials being generated
  | "SCORED"                // Scored with materials generated
  | "READY"                 // Ready to apply (materials complete)
  | "APPLIED"               // Application submitted
  | "INTERVIEWING"          // In interview process
  | "OFFERED"               // Received offer
  | "REJECTED"              // Rejected by company
  | "DECLINED"              // User declined opportunity
  | "ARCHIVED"              // User archived/not interested
  | "NEEDS_REVIEW"          // Data quality issues
  | "ERROR"                 // Processing failed

export type JobFit = "HIGH" | "MEDIUM" | "LOW" | null

export type JobSource = 
  | "GREENHOUSE" 
  | "LEVER" 
  | "WORKDAY" 
  | "LINKEDIN" 
  | "INDEED"
  | "ASHBY"
  | "ICIMS"
  | "SMARTRECRUITERS"
  | "MANUAL" 
  | "OTHER"

export type SeniorityLevel = "Entry" | "Mid" | "Senior" | "Lead" | "Principal" | "Director" | "VP" | "C-Level"

// ============================================================================
// JOB RECORD
// ============================================================================

export interface Job {
  id: string
  
  // Core identification
  title: string
  company: string
  source: JobSource
  source_url: string | null
  
  // Lifecycle state
  status: JobStatus
  
  // Scoring
  fit: JobFit
  score: number | null
  
  // TruthSerum categorization
  role_family: RoleFamily | null
  industry_guess: string | null
  seniority_level: SeniorityLevel | null
  
  // Timestamps
  created_at: string
  analyzed_at?: string | null
  scored_at?: string | null
  applied_at?: string | null
  
  // Parsed job details
  location?: string | null
  salary_range?: string | null
  employment_type?: string | null
  raw_description?: string | null
  responsibilities?: string[] | null
  qualifications_required?: string[] | null
  qualifications_preferred?: string[] | null
  ats_keywords?: string[] | null
  keywords_extracted?: string[] | null
  
  // Scoring breakdown
  score_reasoning?: Record<string, unknown> | null
  score_strengths?: string[] | null
  score_gaps?: string[] | null
  
  // Generated materials
  generated_resume?: string | null
  generated_cover_letter?: string | null
  generation_timestamp?: string | null
  
  // Quality tracking
  generation_quality_score?: number | null
  generation_quality_issues?: string[] | null
  quality_passed?: boolean
  
  // Strategy notes
  resume_strategy?: string | null
  cover_letter_strategy?: string | null
  evidence_map?: Record<string, unknown> | null
  
  // Error tracking
  error_message?: string | null
  error_step?: string | null
}

// ============================================================================
// EVIDENCE LIBRARY
// ============================================================================

export interface EvidenceRecord {
  id: string
  source_type: "work_experience" | "project" | "portfolio_entry" | "shipped_product" | "live_site" | "achievement" | "certification" | "publication" | "open_source"
  source_title: string
  source_url?: string | null
  
  // Context
  project_name?: string | null
  role_name?: string | null
  company_name?: string | null
  date_range?: string | null
  
  // Categorization
  industries?: string[] | null
  role_family_tags?: RoleFamily[] | null
  
  // Content
  responsibilities?: string[] | null
  tools_used?: string[] | null
  systems_used?: string[] | null
  workflows_created?: string[] | null
  outcomes?: string[] | null
  proof_snippet?: string | null
  
  // Pre-approved content for generation
  approved_keywords?: string[] | null
  approved_achievement_bullets?: string[] | null
  
  // TruthSerum fields
  user_problem?: string | null
  business_goal?: string | null
  what_shipped?: string | null
  what_visible?: string | null
  what_not_to_overstate?: string | null
  
  // Quality and approval
  confidence_level: "high" | "medium" | "low"
  evidence_weight: "highest" | "high" | "medium" | "low"
  is_user_approved: boolean
  visibility_status: "active" | "hidden" | "archived"
  
  // Metadata
  is_active: boolean
  priority_rank?: number
  created_at: string
  updated_at: string
}

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  location: string | null
  summary: string | null
  experience: ProfileExperience[]
  education: ProfileEducation[]
  skills: string[]
  certifications: string[]
  links: Record<string, string>
  created_at: string
  updated_at: string
}

export interface ProfileExperience {
  title: string
  company: string
  location?: string
  start_date: string
  end_date?: string
  description?: string
  highlights?: string[]
}

export interface ProfileEducation {
  degree: string
  school: string
  field?: string
  start_year?: string
  end_year?: string
  honors?: string
  gpa?: string
}

// ============================================================================
// QUALITY CHECKS
// ============================================================================

export interface QualityCheck {
  invented_claims: string[]
  vague_bullets: string[]
  ai_filler: string[]
  repeated_structures: string[]
  unsupported_claims: string[]
  overall_passed: boolean
  improvement_suggestions: string[]
}

// Banned phrases that should never appear in generated output
export const BANNED_PHRASES = [
  "results driven professional",
  "dynamic professional",
  "seasoned leader",
  "proven track record",
  "team player",
  "fast paced environment",
  "leveraged synergies",
  "spearheaded",
  "responsible for various",
  "worked on various",
  "supported various initiatives",
  "passionate about",
  "excited to apply",
  "thrilled to",
  "I am confident",
  "I believe I would be",
] as const

// ============================================================================
// UI DISPLAY CONFIGURATION
// ============================================================================

export const STATUS_CONFIG: Record<JobStatus, { 
  label: string
  color: string
  description: string
  isProcessing?: boolean
  isTerminal?: boolean
}> = {
  NEW: { label: "New", color: "blue", description: "Just added" },
  REVIEWING: { label: "Reviewing", color: "yellow", description: "Under review" },
  GENERATING: { label: "Generating", color: "purple", description: "Creating materials", isProcessing: true },
  SCORED: { label: "Scored", color: "cyan", description: "Fit assessed" },
  READY: { label: "Ready", color: "green", description: "Ready to apply" },
  APPLIED: { label: "Applied", color: "emerald", description: "Application sent" },
  INTERVIEWING: { label: "Interview", color: "cyan", description: "In progress" },
  OFFERED: { label: "Offer", color: "green", description: "Congratulations!" },
  REJECTED: { label: "Rejected", color: "red", description: "Not selected", isTerminal: true },
  DECLINED: { label: "Declined", color: "gray", description: "You passed", isTerminal: true },
  ARCHIVED: { label: "Archived", color: "gray", description: "No longer active", isTerminal: true },
  NEEDS_REVIEW: { label: "Review", color: "amber", description: "Data needs attention" },
  ERROR: { label: "Error", color: "red", description: "Processing failed" },
}

export const FIT_CONFIG: Record<NonNullable<JobFit>, { label: string; color: string; description: string }> = {
  HIGH: { label: "High Fit", color: "green", description: "Strong alignment with skills and experience" },
  MEDIUM: { label: "Medium Fit", color: "yellow", description: "Some alignment, may need emphasis on transferable skills" },
  LOW: { label: "Low Fit", color: "red", description: "Significant gaps or misalignment" },
}

// Status groupings for views
export const STATUS_GROUPS = {
  active: ["NEW", "REVIEWING", "GENERATING", "SCORED", "READY"],
  applied: ["APPLIED", "INTERVIEWING", "OFFERED"],
  closed: ["REJECTED", "DECLINED", "ARCHIVED"],
  attention: ["NEEDS_REVIEW", "ERROR"],
} as const

// Industry categories for filtering
export const INDUSTRIES = [
  "AI",
  "SaaS",
  "FinTech",
  "EdTech",
  "Developer Tools",
  "Workflow Automation",
  "Analytics",
  "Platform",
  "Decision Support",
  "Knowledge Systems",
  "E-commerce",
  "Enterprise",
  "Consumer",
  "Healthcare",
  "Other",
] as const
