// Enums - using string unions for flexibility
export type JobSource = 'JOBOT' | 'ZIPRECRUITER' | 'GREENHOUSE' | 'LEVER' | 'WORKDAY' | 'MANUAL' | string

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

export type JobFit = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED' | string | null

// Job interface - core fields are required, workflow fields are optional
export interface Job {
  id: string
  title: string
  company: string
  source: JobSource
  status: JobStatus
  fit: JobFit
  score: number | null
  created_at: string
  // Optional timestamp fields
  scored_at?: string | null
  applied_at?: string | null
  // Optional fields - may or may not exist in schema
  raw_description?: string | null
  source_url?: string | null
  location?: string | null
  salary_range?: string | null
  score_reasoning?: Record<string, unknown> | string[] | null
  score_strengths?: string[] | null
  score_gaps?: string[] | null
  keywords_extracted?: string[] | null
}
