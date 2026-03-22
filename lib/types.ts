// Enums matching Supabase schema exactly
export type JobSource = 'JOBOT' | 'ZIPRECRUITER' | 'GREENHOUSE' | 'MANUAL'

export type JobStatus = 
  | 'NEW' 
  | 'SCORED' 
  | 'READY_TO_APPLY' 
  | 'APPLIED' 
  | 'REJECTED' 
  | 'INTERVIEW' 
  | 'OFFER' 
  | 'ARCHIVED'

export type JobFit = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED'

export type DocType = 'RESUME' | 'COVER_LETTER' | 'APPLICATION_ANSWERS'

export type WorkflowStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR'

export type InterviewType = 'PHONE' | 'VIDEO' | 'ONSITE' | 'TECHNICAL'

export type SubmissionMethod = 'MANUAL' | 'API' | 'EMAIL'

// Database table interfaces
export interface Job {
  id: string
  title: string
  company: string
  source: JobSource
  source_url: string | null
  raw_description: string
  location: string | null
  salary_range: string | null
  is_remote: boolean
  status: JobStatus
  fit: JobFit
  score: number | null
  score_reasoning: Record<string, unknown> | null
  score_strengths: string[] | null
  score_gaps: string[] | null
  keywords_extracted: string[] | null
  created_at: string
  scored_at: string | null
  applied_at: string | null
}

export interface GeneratedDocument {
  id: string
  job_id: string
  doc_type: DocType
  content: string
  model_used: string
  prompt_version: string
}

export interface Application {
  id: string
  job_id: string
  submitted_at: string
  submission_method: SubmissionMethod
  portal_url: string | null
  confirmation_code: string | null
  response_received: boolean
  response_date: string | null
  interview_date: string | null
  interview_type: InterviewType | null
}

export interface WorkflowLog {
  id: string
  job_id: string
  workflow_name: string
  step_name: string
  status: WorkflowStatus
  error_message: string | null
  created_at: string
}

// View interfaces
export interface ReadyQueueItem {
  id: string
  title: string
  company: string
  score: number
  fit: JobFit
  docs_generated_count: number
}

// Settings interface
export interface Settings {
  active_resume: string
  score_threshold: number
  source_toggles: Record<JobSource, boolean>
}
