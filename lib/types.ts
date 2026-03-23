// Enums matching Supabase schema exactly
export type JobSource = 'JOBOT' | 'ZIPRECRUITER' | 'GREENHOUSE' | 'MANUAL' | string

export type JobStatus = 
  | 'NEW' 
  | 'SCORED' 
  | 'READY_TO_APPLY' 
  | 'APPLIED' 
  | 'REJECTED' 
  | 'INTERVIEW' 
  | 'OFFER' 
  | 'ARCHIVED'
  | string

export type JobFit = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED' | string
// ── Enums (must match Supabase schema exactly) ────────────────────────────────

export type JobStatus =
  | "NEW"
  | "SCORED"
  | "READY_TO_APPLY"
  | "APPLIED"
  | "REJECTED"
  | "INTERVIEW"
  | "OFFER"
  | "ARCHIVED"

export type JobFit = "HIGH" | "MEDIUM" | "LOW" | "UNSCORED"

export type JobSource = "JOBOT" | "ZIPRECRUITER" | "GREENHOUSE" | "MANUAL"

/** FOLLOW_UP_EMAIL is reserved — not yet implemented in workflows */
export type DocType =
  | "RESUME"
  | "COVER_LETTER"
  | "APPLICATION_ANSWERS"
  | "FOLLOW_UP_EMAIL"

/** Workflow names match n8n workflow identifiers */
export type WorkflowName =
  | "JOB_INTAKE"
  | "JOB_SCORING"
  | "DOCUMENT_GENERATION"
  | "APPLICATION_TRACKING"

/** Only terminal states are persisted to workflow_logs */
export type LogStatus = "SUCCESS" | "ERROR" | "SKIPPED"

export type InterviewType = "PHONE" | "VIDEO" | "ONSITE" | "TECHNICAL"

export type SubmissionMethod = "MANUAL" | "AUTOMATED" | "EMAIL"

/** UI-computed from score: 80+ → APPLY, 65–79 → REVIEW, <65 → SKIP */
export type Recommendation = "APPLY" | "REVIEW" | "SKIP"

/** UI-computed from posted_at / created_at */
export type AgePriority = "HOT" | "WARM" | "COLD"

// ── JSONB sub-shapes ──────────────────────────────────────────────────────────

/** Parsed from jobs.keywords_extracted JSONB */
export interface ScoreKeywords {
  skills: string[]
  tools: string[]
  responsibilities: string[]
}

// ── Core DB tables ────────────────────────────────────────────────────────────

// Simplified Job interface matching user's Supabase schema
export interface Job {
  id: string
  title: string
  company: string
  source: JobSource
  raw_description: string | null
  score: number | null
  fit: JobFit | null
  status: JobStatus
  created_at: string
  // Optional extended fields that may exist
  source_url?: string | null
  location?: string | null
  salary_range?: string | null
  is_remote?: boolean
  score_reasoning?: Record<string, unknown> | null
  score_strengths?: string[] | null
  score_gaps?: string[] | null
  keywords_extracted?: string[] | null
  scored_at?: string | null
  applied_at?: string | null
  source_url: string | null
  source_job_id: string | null
  raw_description: string
  location: string | null
  salary_range: string | null
  is_remote: boolean
  status: JobStatus
  fit: JobFit
  score: number | null
  /** JSONB — array of reasoning sentences, safely parsed */
  score_reasoning: string[] | null
  score_strengths: string[] | null
  score_gaps: string[] | null
  /** JSONB — parsed into ScoreKeywords or null */
  keywords_extracted: ScoreKeywords | null
  dedup_hash: string
  posted_at: string | null
  scored_at: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

export interface GeneratedDocument {
  id: string
  job_id: string
  base_resume_id: string
  doc_type: DocType
  content: string
  model_used: string
  prompt_version: string | null
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  job_id: string
  submitted_at: string | null
  submission_method: SubmissionMethod | null
  portal_url: string | null
  confirmation_code: string | null
  response_received: boolean
  response_date: string | null
  response_notes: string | null
  interview_date: string | null
  interview_type: InterviewType | null
  interview_notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowLog {
  id: string
  job_id: string | null
  workflow_name: WorkflowName
  step_name: string
  status: LogStatus
  input_snapshot: Record<string, unknown> | null
  output_snapshot: Record<string, unknown> | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

export interface BaseResume {
  id: string
  version: number
  is_active: boolean
  raw_text: string
  created_at: string
  updated_at: string
}

// ── View / derived types ──────────────────────────────────────────────────────

export interface ReadyQueueItem {
  id: string
  title: string
  company: string
  source: JobSource
  source_url: string | null
  score: number | null
  fit: JobFit
  salary_range: string | null
  is_remote: boolean
  status: JobStatus
  created_at: string
  docs_generated_count: number
}

export interface PipelineSummaryRow {
  status: JobStatus
  fit: JobFit
  count: number
}

// ── UI-enriched types ─────────────────────────────────────────────────────────

export interface JobEnriched extends Job {
  recommendation: Recommendation
  age_priority: AgePriority
  age_label: string
}

export interface JobDetail extends JobEnriched {
  documents: GeneratedDocument[]
  application: Application | null
  logs: WorkflowLog[]
}

// ── Input / filter types ──────────────────────────────────────────────────────

export interface ManualJobInput {
  title: string
  company: string
  source_url: string
  raw_description: string
  location: string
  salary_range: string
  is_remote: boolean
}

export interface JobFilters {
  status?: JobStatus[]
  fit?: JobFit[]
  source?: JobSource[]
  is_remote?: boolean
  search?: string
}

export interface LogFilters {
  workflow_name?: WorkflowName[]
  status?: LogStatus[]
  job_id?: string
  errors_only?: boolean
}

// ── Analytics / metrics ───────────────────────────────────────────────────────

export interface DailyApplicationPoint {
  date: string
  count: number
  target: number
}

export interface PipelineMetrics {
  total: number
  new_jobs: number
  scored: number
  ready: number
  applied: number
  interview: number
  offer: number
  rejected: number
  applied_today: number
  daily_target: number
}

// ── Settings (UI only) ────────────────────────────────────────────────────────

export interface Settings {
  active_resume: string
  score_threshold: number
  source_toggles: Record<JobSource, boolean>
}
