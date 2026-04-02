/**
 * Gap Clarification Question Templates
 * 
 * Targeted questions for the AI coach to ask when filling evidence gaps.
 * Each question type has a specific purpose and expected response handling.
 */

import type { DetectedGap, GapCategory } from "../gap-detection"

// ============================================================================
// TYPES
// ============================================================================

export type QuestionPurpose =
  | "clarify_skill"           // Confirm skill possession and level
  | "add_metric"              // Get specific numbers for achievements
  | "clarify_ownership"       // Determine lead vs participate
  | "add_context"             // Get situation/task details
  | "confirm_tool"            // Verify technology experience
  | "add_outcome"             // Get result/impact details
  | "clarify_scope"           // Understand scale/scope
  | "fill_gap"                // General gap filling

export type ResponseHandling =
  | "save_to_profile"         // Add to user_profile or evidence_library
  | "use_for_job_only"        // Use in generation but don't persist
  | "ask_user_preference"     // Let user decide

export interface GapQuestion {
  id: string
  gap_id: string
  question_text: string
  purpose: QuestionPurpose
  response_handling: ResponseHandling
  follow_up_if_yes?: string
  follow_up_if_no?: string
  example_good_response?: string
  coaching_hint?: string
}

export interface QuestionSet {
  gap: DetectedGap
  questions: GapQuestion[]
  max_questions: number
  introduction: string
}

// ============================================================================
// QUESTION TEMPLATES BY GAP CATEGORY
// ============================================================================

const QUESTION_TEMPLATES: Record<GapCategory, (gap: DetectedGap) => GapQuestion[]> = {
  missing_skill: (gap) => [
    {
      id: `q-${gap.id}-skill-1`,
      gap_id: gap.id,
      question_text: `Have you worked with ${gap.requirement} in any of your roles? If so, what specific projects or tasks involved it?`,
      purpose: "clarify_skill",
      response_handling: "save_to_profile",
      example_good_response: "Yes, I used it at [Company] to build [specific thing]",
      coaching_hint: "If they have the skill, ask for a concrete example to document",
    },
    {
      id: `q-${gap.id}-skill-2`,
      gap_id: gap.id,
      question_text: `What's a similar skill or technology you've used that might transfer? Sometimes adjacent experience is valuable.`,
      purpose: "fill_gap",
      response_handling: "ask_user_preference",
      coaching_hint: "Help them identify transferable skills",
    },
  ],

  missing_tool: (gap) => [
    {
      id: `q-${gap.id}-tool-1`,
      gap_id: gap.id,
      question_text: `Have you used ${gap.requirement}? If yes, describe what you built or configured with it.`,
      purpose: "confirm_tool",
      response_handling: "save_to_profile",
      follow_up_if_yes: "Great! What was the scale - personal project, team tool, or production system?",
      follow_up_if_no: "Have you used any similar tools in this category?",
    },
  ],

  missing_experience: (gap) => [
    {
      id: `q-${gap.id}-exp-1`,
      gap_id: gap.id,
      question_text: `The role asks for ${gap.requirement}. Can you think of any experience - even from side projects, volunteer work, or education - that's related?`,
      purpose: "fill_gap",
      response_handling: "save_to_profile",
      coaching_hint: "Broaden their thinking beyond formal work experience",
    },
    {
      id: `q-${gap.id}-exp-2`,
      gap_id: gap.id,
      question_text: `What's the closest experience you have to ${gap.requirement}? We can work with adjacent experience.`,
      purpose: "add_context",
      response_handling: "ask_user_preference",
    },
  ],

  weak_evidence: (gap) => [
    {
      id: `q-${gap.id}-weak-1`,
      gap_id: gap.id,
      question_text: `For "${truncate(gap.current_evidence || "", 50)}" - can you add specific details? What exactly did you do, and what was the result?`,
      purpose: "add_context",
      response_handling: "save_to_profile",
      example_good_response: "I designed a new data pipeline that reduced processing time from 4 hours to 20 minutes",
    },
  ],

  missing_metric: (gap) => [
    {
      id: `q-${gap.id}-metric-1`,
      gap_id: gap.id,
      question_text: `Can you add a number to "${truncate(gap.current_evidence || "", 50)}"? For example: how many users, what percentage improvement, how much time saved, or what scale?`,
      purpose: "add_metric",
      response_handling: "save_to_profile",
      example_good_response: "It served about 10,000 daily users and reduced load time by roughly 40%",
      coaching_hint: "Even approximate numbers are better than none. 'About 50' beats 'many'",
    },
    {
      id: `q-${gap.id}-metric-2`,
      gap_id: gap.id,
      question_text: `If you don't have exact numbers, what's a reasonable estimate? Recruiters understand that not everything is precisely measured.`,
      purpose: "add_metric",
      response_handling: "save_to_profile",
    },
  ],

  ownership_unclear: (gap) => [
    {
      id: `q-${gap.id}-own-1`,
      gap_id: gap.id,
      question_text: `For this work, were you the primary owner/lead, a key contributor, or part of a larger team? Each is valid - we just want to represent it accurately.`,
      purpose: "clarify_ownership",
      response_handling: "save_to_profile",
      coaching_hint: "Help them claim appropriate credit without overclaiming",
    },
    {
      id: `q-${gap.id}-own-2`,
      gap_id: gap.id,
      question_text: `What specific decisions did you make, and what parts did you personally implement?`,
      purpose: "clarify_ownership",
      response_handling: "save_to_profile",
    },
  ],

  domain_gap: (gap) => [
    {
      id: `q-${gap.id}-domain-1`,
      gap_id: gap.id,
      question_text: `The role is in ${gap.requirement}. Have you worked in this industry or a related one? Even brief exposure counts.`,
      purpose: "fill_gap",
      response_handling: "ask_user_preference",
    },
    {
      id: `q-${gap.id}-domain-2`,
      gap_id: gap.id,
      question_text: `What transferable knowledge do you have from other industries that would apply here?`,
      purpose: "fill_gap",
      response_handling: "use_for_job_only",
    },
  ],

  seniority_mismatch: (gap) => [
    {
      id: `q-${gap.id}-senior-1`,
      gap_id: gap.id,
      question_text: `This role may expect more seniority than your current title suggests. Have you taken on responsibilities beyond your title - like mentoring, leading initiatives, or making architectural decisions?`,
      purpose: "clarify_ownership",
      response_handling: "save_to_profile",
      coaching_hint: "Help surface hidden leadership experience",
    },
  ],
}

// ============================================================================
// QUESTION GENERATION
// ============================================================================

/**
 * Generate a set of targeted questions for a detected gap
 */
export function generateGapQuestions(gap: DetectedGap): QuestionSet {
  const templateFn = QUESTION_TEMPLATES[gap.category]
  const questions = templateFn ? templateFn(gap) : getDefaultQuestions(gap)

  // Take only the most relevant questions
  const selectedQuestions = questions.slice(0, 2)

  return {
    gap,
    questions: selectedQuestions,
    max_questions: 3,
    introduction: generateIntroduction(gap),
  }
}

/**
 * Generate questions for multiple gaps (for batch coaching)
 */
export function generateGapQuestionSets(
  gaps: DetectedGap[],
  maxGaps: number = 3
): QuestionSet[] {
  // Prioritize critical gaps, then important
  const sortedGaps = [...gaps].sort((a, b) => {
    const severityOrder = { critical: 0, important: 1, minor: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return sortedGaps.slice(0, maxGaps).map(generateGapQuestions)
}

/**
 * Generate the coaching introduction for a gap
 */
function generateIntroduction(gap: DetectedGap): string {
  const intros: Record<GapCategory, string> = {
    missing_skill: `I noticed the role requires **${gap.requirement}**. Let me help you surface any relevant experience.`,
    missing_tool: `This role mentions **${gap.requirement}**. Let's see if you have related experience we can highlight.`,
    missing_experience: `The job asks for ${gap.requirement}. Even adjacent experience can be valuable here.`,
    weak_evidence: `Your experience with "${truncate(gap.current_evidence || "", 40)}" could be stronger with specific details.`,
    missing_metric: `Adding numbers would strengthen this achievement. Let's find some specifics.`,
    ownership_unclear: `Let's clarify your role in this work so we represent it accurately.`,
    domain_gap: `The role is in a specific domain. Let's explore your transferable knowledge.`,
    seniority_mismatch: `This role may expect senior-level impact. Let's surface any hidden leadership experience.`,
  }

  return intros[gap.category] || `Let's address this gap in your evidence: ${gap.requirement}`
}

/**
 * Default questions for any gap type
 */
function getDefaultQuestions(gap: DetectedGap): GapQuestion[] {
  return [
    {
      id: `q-${gap.id}-default-1`,
      gap_id: gap.id,
      question_text: gap.coach_question,
      purpose: "fill_gap",
      response_handling: "ask_user_preference",
    },
  ]
}

// ============================================================================
// SYSTEM PROMPT ADDITIONS FOR COACH
// ============================================================================

export const GAP_CLARIFICATION_SYSTEM_PROMPT = `
## Gap Clarification Mode

When entering gap clarification mode, you help users strengthen their evidence for specific job requirements.

### Principles
1. **Ask one question at a time** - Don't overwhelm with multiple questions
2. **Explain why you're asking** - Users should understand the purpose
3. **Accept approximate answers** - "About 50" is better than nothing
4. **Clarify persistence** - Tell users whether their answer will be saved to their profile or used only for this job
5. **Don't interrogate** - If they don't have the experience, that's okay. Move on or help frame adjacent experience.

### Question Flow
1. Start with the most impactful gap (usually missing required skills or weak key achievements)
2. Ask maximum 3 questions per session
3. After each answer, either:
   - Save to evidence library (for durable facts)
   - Note for this job only (for job-specific framing)
   - Ask a follow-up if clarification is needed
4. Summarize what you learned and how it will help

### Response Handling
When the user answers a gap question, determine:
- If it's a durable fact (skill, achievement, metric) → Use saveEvidence tool to persist
- If it's job-specific context → Store for this generation only
- If unclear → Ask if they want to save it for future applications

### Example Exchange
User enters gap clarification for: "AWS experience"

Coach: "I noticed the role requires AWS experience. Have you used AWS services in any of your roles? If so, which services and what did you build?"

User: "Yes, I set up EC2 instances and configured S3 buckets for our image storage at my last job."

Coach: "That's relevant experience. About how many instances did you manage, and how much data was in S3? Even approximate numbers help."
[After response, use saveEvidence to add this to their evidence library]
`

// ============================================================================
// HELPERS
// ============================================================================

function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length - 3) + "..."
}
