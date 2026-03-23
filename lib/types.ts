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

// Minimal Job interface - only columns that exist in user's Supabase
export interface Job {
  id: string
  title: string
  company: string
  source: JobSource
  status: JobStatus
  fit: JobFit
  score: number | null
  created_at: string
  // These are optional - may or may not exist in schema
  raw_description?: string | null
  source_url?: string | null
  location?: string | null
  salary_range?: string | null
  score_reasoning?: string[] | null
  score_strengths?: string[] | null
  score_gaps?: string[] | null
  keywords_extracted?: string[] | null
}
