/**
 * HireWire Canonical Contract
 * 
 * This file defines the strict data shapes for HireWire go-live.
 * All new work must use these types, not legacy mixed schema types.
 * 
 * Tables:
 * - users: Auth linkage + plan state
 * - profiles: User profile data
 * - jobs: Job tracking (NO generated_resume/cover_letter fields)
 * - job_scores: Scoring data separated from jobs
 * - documents: Generated document metadata (URLs point to storage)
 * - applications: Application tracking
 * - subscriptions: Stripe subscription state
 */

// ============================================================================
// PLAN & SUBSCRIPTION TYPES
// ============================================================================

export type PlanType = "free" | "pro" | "enterprise"

export type SubscriptionStatus = 
  | "active" 
  | "canceled" 
  | "past_due" 
  | "trialing"
  | "incomplete"
  | "incomplete_expired"

export interface PlanLimits {
  jobs_per_month: number
  generations_per_month: number
  exports_per_month: number
  evidence_items: number
  interview_prep: boolean
  priority_support: boolean
  custom_templates: boolean
}

// Launch-safe limits (Enterprise removed from UI, kept here for type safety)
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    jobs_per_month: 5,
    generations_per_month: 5,
    exports_per_month: -1, // Not tracked - removed from UI
    evidence_items: -1, // Unlimited for free - low cost, high engagement
    interview_prep: false,
    priority_support: false,
    custom_templates: false,
  },
  pro: {
    jobs_per_month: -1, // unlimited
    generations_per_month: -1, // unlimited
    exports_per_month: -1, // unlimited
    evidence_items: -1, // unlimited
    interview_prep: true,
    priority_support: true,
    custom_templates: true,
  },
  enterprise: {
    // Enterprise kept for type safety but hidden from UI
    jobs_per_month: -1,
    generations_per_month: -1,
    exports_per_month: -1,
    evidence_items: -1,
    interview_prep: true,
    priority_support: true,
    custom_templates: true,
  },
}

// ============================================================================
// USER TABLE (links to auth.users)
// ============================================================================

export interface HireWireUser {
  id: string // references auth.users.id
  email: string
  created_at: string
  plan_type: PlanType
  subscription_status: SubscriptionStatus | null
  stripe_customer_id: string | null
  onboarding_complete: boolean
  
  // Usage tracking
  jobs_this_month?: number
  generations_this_month?: number
  exports_this_month?: number
  usage_reset_at?: string
}

// ============================================================================
// PROFILES TABLE
// ============================================================================

export interface HireWireProfile {
  id: string
  user_id: string
  full_name: string
  headline: string | null
  years_experience: number | null
  education: Education[]
  skills: string[]
  linkedin_url: string | null
  portfolio_links: PortfolioLink[]
  created_at: string
  updated_at: string
}

export interface Education {
  institution: string
  degree: string
  field_of_study: string | null
  start_year: number | null
  end_year: number | null
  gpa: string | null
}

export interface PortfolioLink {
  label: string
  url: string
}

// ============================================================================
// JOBS TABLE (clean - no generated content fields)
// ============================================================================

export type JobStatus = 
  | "draft"
  | "analyzing"
  | "analyzed"
  | "scoring"
  | "scored"
  | "generating"
  | "ready"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn"
  | "error"

export type JobSource = 
  | "GREENHOUSE"
  | "LEVER"
  | "LINKEDIN"
  | "INDEED"
  | "WORKDAY"
  | "ASHBY"
  | "ICIMS"
  | "SMARTRECRUITERS"
  | "OTHER"

export interface HireWireJob {
  id: string
  user_id: string
  job_url: string
  company_name: string | null
  role_title: string | null
  job_description: string | null
  source: JobSource
  status: JobStatus
  created_at: string
  updated_at: string
  
  // Optional parsed data
  location: string | null
  salary_range: string | null
  employment_type: string | null
  
  // Error tracking
  error_message: string | null
  error_step: string | null
}

// ============================================================================
// JOB SCORES TABLE
// ============================================================================

export interface HireWireJobScore {
  id: string
  job_id: string
  user_id: string
  
  // Individual dimension scores (0-100)
  experience_relevance: number
  evidence_quality: number
  skills_match: number
  seniority_alignment: number
  ats_keywords: number
  
  // Composite
  overall_score: number
  confidence_score: number
  
  // Versioning
  scoring_version: string
  created_at: string
  
  // Optional details
  score_reasoning?: Record<string, string>
  strengths?: string[]
  gaps?: string[]
}

// ============================================================================
// DOCUMENTS TABLE (metadata only - content in storage)
// ============================================================================

export type DocumentType = "resume" | "cover_letter"

export interface HireWireDocument {
  id: string
  job_id: string
  user_id: string
  document_type: DocumentType
  
  // Storage URLs (Vercel Blob or Supabase Storage)
  resume_url: string | null
  cover_letter_url: string | null
  
  // Generation metadata
  version: number
  generated_by: string // model/version
  created_at: string
  
  // Quality tracking
  quality_score: number | null
  quality_passed: boolean
}

// ============================================================================
// APPLICATIONS TABLE
// ============================================================================

export type ApplicationStatus = 
  | "draft"
  | "submitted"
  | "viewed"
  | "in_review"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn"

export type ApplicationMethod = 
  | "direct"
  | "linkedin_easy_apply"
  | "recruiter"
  | "referral"
  | "other"

export interface HireWireApplication {
  id: string
  job_id: string
  user_id: string
  applied_at: string
  method: ApplicationMethod
  status: ApplicationStatus
  
  // Optional tracking
  follow_up_date: string | null
  notes: string | null
}

// ============================================================================
// SUBSCRIPTIONS TABLE
// ============================================================================

export interface HireWireSubscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  plan_type: PlanType
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// PREMIUM FEATURE FLAGS
// ============================================================================

export type PremiumFeature = 
  | "unlimited_jobs"
  | "unlimited_generations"
  | "unlimited_exports"
  | "interview_prep"
  | "custom_templates"
  | "priority_support"
  | "advanced_analytics"
  | "ai_coach"

export function isPremiumFeature(feature: PremiumFeature, plan: PlanType): boolean {
  const limits = PLAN_LIMITS[plan]
  
  switch (feature) {
    case "unlimited_jobs":
      return limits.jobs_per_month === -1
    case "unlimited_generations":
      return limits.generations_per_month === -1
    case "unlimited_exports":
      return limits.exports_per_month === -1
    case "interview_prep":
      return limits.interview_prep
    case "custom_templates":
      return limits.custom_templates
    case "priority_support":
      return limits.priority_support
    case "advanced_analytics":
      return plan !== "free"
    case "ai_coach":
      return plan !== "free"
    default:
      return false
  }
}

// ============================================================================
// USAGE CHECKING
// ============================================================================

export interface UsageState {
  jobs_used: number
  jobs_limit: number
  generations_used: number
  generations_limit: number
  exports_used: number
  exports_limit: number
  evidence_count: number
  evidence_limit: number
}

export function canPerformAction(
  action: "add_job" | "generate" | "export" | "add_evidence",
  usage: UsageState,
  plan: PlanType
): { allowed: boolean; reason?: string } {
  const limits = PLAN_LIMITS[plan]
  
  switch (action) {
    case "add_job":
      if (limits.jobs_per_month === -1) return { allowed: true }
      if (usage.jobs_used >= limits.jobs_per_month) {
        return { 
          allowed: false, 
          reason: `You've reached your monthly limit of ${limits.jobs_per_month} jobs. Upgrade to Pro for unlimited jobs.`
        }
      }
      return { allowed: true }
      
    case "generate":
      if (limits.generations_per_month === -1) return { allowed: true }
      if (usage.generations_used >= limits.generations_per_month) {
        return { 
          allowed: false, 
          reason: `You've reached your monthly limit of ${limits.generations_per_month} document generations. Upgrade to Pro for unlimited generations.`
        }
      }
      return { allowed: true }
      
    case "export":
      if (limits.exports_per_month === -1) return { allowed: true }
      if (usage.exports_used >= limits.exports_per_month) {
        return { 
          allowed: false, 
          reason: `You've reached your monthly limit of ${limits.exports_per_month} exports. Upgrade to Pro for unlimited exports.`
        }
      }
      return { allowed: true }
      
    case "add_evidence":
      if (limits.evidence_items === -1) return { allowed: true }
      if (usage.evidence_count >= limits.evidence_items) {
        return { 
          allowed: false, 
          reason: `You've reached your limit of ${limits.evidence_items} evidence items. Upgrade to Pro for unlimited evidence.`
        }
      }
      return { allowed: true }
      
    default:
      return { allowed: true }
  }
}
