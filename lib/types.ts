/**
 * HireWire Canonical Types
 * 
 * Architecture:
 * - Frontend: Thin client only (URL intake, display state from Supabase)
 * - n8n: Owns all orchestration and business logic (parsing, scoring, generation)
 * - Supabase: Owns all persistent state (jobs, profiles, documents, events)
 */

// ============================================================================
// JOB LIFECYCLE STATES (Canonical - owned by n8n)
// ============================================================================

export type JobStatus =
  | "submitted"             // URL submitted, waiting for n8n
  | "fetching"              // n8n fetching the job page
  | "parsing"               // n8n extracting job details
  | "parsed"                // Successfully parsed, ready for scoring
  | "parsed_partial"        // Partial extraction, manual review may be needed
  | "duplicate"             // Duplicate of existing job
  | "scoring"               // n8n scoring against profile
  | "scored"                // Score calculated
  | "below_threshold"       // Score below apply threshold
  | "generating_documents"  // n8n generating resume/cover letter
  | "manual_review_required"// Needs human review before proceeding
  | "ready"                 // Ready to apply (materials complete)
  | "applied"               // Application submitted
  | "interviewing"          // In interview process
  | "offered"               // Received offer
  | "rejected"              // Rejected by company
  | "declined"              // User declined opportunity
  | "archived"              // User archived/not interested
  | "error"                 // Processing failed

// Fit assessment from n8n scoring
export type JobFit = "HIGH" | "MEDIUM" | "LOW" | null

// Source detection - determined by n8n
export type JobSource = 
  | "greenhouse" 
  | "lever" 
  | "workday" 
  | "linkedin" 
  | "indeed"
  | "ashbyhq"
  | "icims"
  | "smartrecruiters"
  | "manual" 
  | "unknown"

// Parse quality indicator
export type ParseQuality = "full" | "partial" | "failed"

// ============================================================================
// JOB RECORD (from Supabase jobs table)
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
  
  // Scoring (populated by n8n)
  fit: JobFit
  score: number | null
  
  // Timestamps
  created_at: string
  parsed_at?: string | null
  scored_at?: string | null
  applied_at?: string | null
  
  // Parsed job details (from n8n)
  location?: string | null
  salary_range?: string | null
  employment_type?: string | null
  raw_description?: string | null
  parsed_requirements?: string[] | null
  parsed_responsibilities?: string[] | null
  parsed_qualifications?: string[] | null
  parsed_benefits?: string[] | null
  
  // Parse quality
  parse_quality?: ParseQuality | null
  parse_missing_fields?: string[] | null
  
  // Structured scoring breakdown (from n8n)
  score_title_match?: number | null
  score_seniority_match?: number | null
  score_domain_match?: number | null
  score_location_match?: number | null
  score_skills_match?: number | null
  score_compensation_match?: number | null
  score_dealbreakers?: string[] | null
  score_reasoning?: Record<string, unknown> | null
  score_summary?: string | null
  score_strengths?: string[] | null
  score_gaps?: string[] | null
  keywords_extracted?: string[] | null
  
  // Generated materials (from n8n)
  generated_resume?: string | null
  generated_cover_letter?: string | null
  generation_profile_version?: string | null
  generation_timestamp?: string | null
  
  // Deduplication tracking
  canonical_url?: string | null
  ats_job_id?: string | null
  fingerprint_hash?: string | null
  duplicate_of_job_id?: string | null
  
  // Error tracking
  error_message?: string | null
  error_step?: string | null
}

// ============================================================================
// USER PROFILE (from Supabase user_profile table)
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
// PROCESSING EVENTS (from Supabase processing_events table)
// ============================================================================

export type ProcessingEventType =
  | "intake_received"
  | "fetch_started"
  | "fetch_complete"
  | "fetch_failed"
  | "parse_started"
  | "parse_complete"
  | "parse_partial"
  | "parse_failed"
  | "duplicate_found"
  | "scoring_started"
  | "scoring_complete"
  | "scoring_failed"
  | "generation_started"
  | "generation_complete"
  | "generation_failed"
  | "manual_review_required"
  | "status_changed"
  | "error"

export interface ProcessingEvent {
  id: string
  job_id: string
  event_type: ProcessingEventType
  message?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// ============================================================================
// API CONTRACTS (Frontend <-> n8n Webhook)
// ============================================================================

export interface IntakeRequest {
  url: string
  source_hint?: string | null
  submitted_by_user_id?: string | null
  request_id?: string
}

export interface IntakeResponse {
  accepted: boolean
  request_id?: string
  job_id?: string | null
  status: "processing_started" | "duplicate_found" | "invalid_url" | "error"
  message?: string
  duplicate?: boolean
  partial_parse?: boolean
}

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
  submitted: { label: "Submitted", color: "yellow", description: "Sent to n8n", isProcessing: true },
  fetching: { label: "Fetching", color: "blue", description: "Downloading job page", isProcessing: true },
  parsing: { label: "Parsing", color: "blue", description: "Extracting details", isProcessing: true },
  parsed: { label: "Parsed", color: "cyan", description: "Details extracted" },
  parsed_partial: { label: "Partial", color: "amber", description: "Some details missing" },
  duplicate: { label: "Duplicate", color: "gray", description: "Already exists", isTerminal: true },
  scoring: { label: "Scoring", color: "purple", description: "Analyzing fit", isProcessing: true },
  scored: { label: "Scored", color: "purple", description: "Review your fit" },
  below_threshold: { label: "Low Score", color: "orange", description: "Below apply threshold" },
  generating_documents: { label: "Generating", color: "indigo", description: "Creating materials", isProcessing: true },
  manual_review_required: { label: "Review", color: "amber", description: "Needs your input" },
  ready: { label: "Ready", color: "green", description: "Ready to apply" },
  applied: { label: "Applied", color: "emerald", description: "Application sent" },
  interviewing: { label: "Interview", color: "cyan", description: "In progress" },
  offered: { label: "Offer", color: "green", description: "Congratulations!" },
  rejected: { label: "Rejected", color: "red", description: "Not selected", isTerminal: true },
  declined: { label: "Declined", color: "gray", description: "You passed", isTerminal: true },
  archived: { label: "Archived", color: "gray", description: "No longer active", isTerminal: true },
  error: { label: "Error", color: "red", description: "Processing failed" },
}

export const FIT_CONFIG: Record<NonNullable<JobFit>, { label: string; color: string }> = {
  HIGH: { label: "High Fit", color: "green" },
  MEDIUM: { label: "Medium Fit", color: "yellow" },
  LOW: { label: "Low Fit", color: "red" },
}

// Workflow stages for progress display
export const WORKFLOW_STAGES = [
  { key: "submitted", statuses: ["submitted", "fetching", "parsing"], label: "Submitted" },
  { key: "parsed", statuses: ["parsed", "parsed_partial"], label: "Parsed" },
  { key: "scored", statuses: ["scoring", "scored", "below_threshold"], label: "Scored" },
  { key: "ready", statuses: ["generating_documents", "ready", "manual_review_required"], label: "Ready" },
  { key: "applied", statuses: ["applied", "interviewing", "offered"], label: "Applied" },
] as const
