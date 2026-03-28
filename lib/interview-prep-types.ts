/**
 * Interview Prep Types
 * Evidence-first interview preparation system
 */

// ============================================================================
// INTERVIEW SNAPSHOT
// ============================================================================

export interface InterviewSnapshot {
  why_role_fits: string
  top_credibility_reasons: string[]
  top_risks: string[]
  lead_story: string
}

// ============================================================================
// BEST ANGLES
// ============================================================================

export interface BestAngle {
  id: string
  what_you_did: string
  why_it_matters: string
  proof: string
  requirement_mapped: string
  concise_way_to_say_it: string
  evidence_id?: string
  evidence_title?: string
}

// ============================================================================
// TELL ME ABOUT YOURSELF
// ============================================================================

export interface TellMeAboutYourself {
  short_version: string  // 30 seconds
  medium_version: string // 60 seconds
  long_version: string   // 90 seconds
  evidence_ids: string[]
}

// ============================================================================
// WHY THIS ROLE
// ============================================================================

export interface WhyThisRole {
  answer: string
  what_you_have_done_tie_in: string
  what_company_needs_tie_in: string
  evidence_ids: string[]
}

// ============================================================================
// BEHAVIORAL STORIES
// ============================================================================

export type StoryStrengthRating = "strong" | "medium" | "weak" | "needs_proof"

export interface BehavioralStory {
  id: string
  situation: string
  task: string
  action: string
  result: string
  themes: string[] // leadership, conflict, failure, innovation, etc.
  evidence_id?: string
  evidence_title?: string
  short_version: string
  full_version: string
  strength_rating?: StoryStrengthRating
}

// ============================================================================
// LIKELY QUESTIONS
// ============================================================================

export type QuestionConfidence = "high" | "medium" | "low"

export interface InterviewQuestion {
  id: string
  question: string
  why_asking: string
  best_evidence: string
  answer_outline: string
  red_flags: string[]
  confidence: QuestionConfidence
}

export interface LikelyQuestions {
  recruiter: InterviewQuestion[]
  hiring_manager: InterviewQuestion[]
  panel: InterviewQuestion[]
  technical: InterviewQuestion[]
  executive: InterviewQuestion[]
}

// ============================================================================
// RESUME DEFENSE
// ============================================================================

export interface ResumeDefenseItem {
  id: string
  claim: string
  meaning: string
  evidence_support: string
  how_to_explain: string
  what_not_to_overstate?: string
}

// ============================================================================
// GAP HANDLING
// ============================================================================

export interface GapHandlingItem {
  id: string
  gap: string
  honest_framing: string
  redirect_to: string
  what_to_say: string
  what_not_to_say: string
}

// ============================================================================
// COMPANY ALIGNMENT
// ============================================================================

export interface CompanyAlignment {
  what_they_care_about: string[]
  recurring_themes: string[]
  language_to_mirror: string[]
  achievements_to_emphasize: string[]
}

// ============================================================================
// QUESTIONS TO ASK
// ============================================================================

export interface QuestionsToAsk {
  role: string[]
  team: string[]
  success_metrics: string[]
  cross_functional: string[]
  process: string[]
  growth: string[]
}

// ============================================================================
// OBJECTION HANDLING
// ============================================================================

export interface ObjectionHandlingItem {
  id: string
  objection: string
  why_they_think_that: string
  best_response: string
  neutralizing_evidence: string[]
}

// ============================================================================
// QUICK SHEET (Day-of summary)
// ============================================================================

export interface QuickSheet {
  top_5_talking_points: string[]
  top_3_stories: string[]
  top_risks: string[]
  top_questions_to_ask: string[]
  thirty_second_close: string
}

// ============================================================================
// FULL INTERVIEW PREP RECORD
// ============================================================================

export interface InterviewPrep {
  id: string
  job_id: string
  created_at: string
  updated_at: string
  generation_model?: string
  generation_version: string
  fit_level?: string
  strategy?: string
  evidence_coverage_percent?: number
  
  interview_snapshot: InterviewSnapshot
  best_angles: BestAngle[]
  tell_me_about_yourself: TellMeAboutYourself
  why_this_role: WhyThisRole
  behavioral_stories: BehavioralStory[]
  likely_questions: LikelyQuestions
  resume_defense: ResumeDefenseItem[]
  gap_handling: GapHandlingItem[]
  company_alignment: CompanyAlignment
  questions_to_ask: QuestionsToAsk
  objection_handling: ObjectionHandlingItem[]
  quick_sheet: QuickSheet
  
  user_marked_stories?: {
    strong_ids: string[]
    weak_ids: string[]
    needs_proof_ids: string[]
  }
  saved_to_bank_ids?: string[]
}

// ============================================================================
// INTERVIEW BANK ITEM
// ============================================================================

export type InterviewBankItemType = "story" | "answer" | "question" | "angle"

export interface InterviewBankItem {
  id: string
  created_at: string
  updated_at: string
  item_type: InterviewBankItemType
  title: string
  content: Record<string, unknown>
  source_job_id?: string
  source_evidence_id?: string
  tags: string[]
  is_favorite: boolean
  use_count: number
}

// ============================================================================
// GENERATION REQUEST/RESPONSE
// ============================================================================

export interface GenerateInterviewPrepRequest {
  job_id: string
  regenerate_section?: keyof InterviewPrep
  interview_type?: "recruiter" | "manager" | "panel" | "behavioral" | "technical" | "executive"
}

export interface GenerateInterviewPrepResponse {
  success: boolean
  interview_prep?: InterviewPrep
  error?: string
  generation_time_ms?: number
}
