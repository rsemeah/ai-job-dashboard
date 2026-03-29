export const CANONICAL_JOB_STATUSES = [
  "draft",
  "queued",
  "analyzing",
  "analyzed",
  "generating",
  "ready",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "archived",
  "needs_review",
  "error",
] as const

export type CanonicalJobStatus = typeof CANONICAL_JOB_STATUSES[number]

const LEGACY_JOB_STATUS_MAP: Record<string, CanonicalJobStatus> = {
  new: "queued",
  reviewing: "analyzed",
  scored: "analyzed",
  manual_review_required: "needs_review",
  generating_documents: "generating",
  ready_to_apply: "ready",
  interview: "interviewing",
  declined: "archived",
  submitted: "queued",
  fetching: "analyzing",
  parsing: "analyzing",
  parsed: "analyzed",
  parsed_partial: "needs_review",
  duplicate: "analyzed",
  scoring: "analyzing",
  below_threshold: "needs_review",
}

export function normalizeJobStatus(
  status: string | null | undefined,
  fallback: CanonicalJobStatus = "draft"
): CanonicalJobStatus {
  if (!status) return fallback
  const normalized = status.trim().toLowerCase()

  if ((CANONICAL_JOB_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as CanonicalJobStatus
  }

  return LEGACY_JOB_STATUS_MAP[normalized] || fallback
}

export const JOB_STATUS_CONFIG: Record<
  CanonicalJobStatus,
  {
    label: string
    color: string
    description: string
    isProcessing?: boolean
    isTerminal?: boolean
  }
> = {
  draft: { label: "Draft", color: "gray", description: "Created, pending queue" },
  queued: { label: "Queued", color: "blue", description: "Waiting for processing", isProcessing: true },
  analyzing: { label: "Analyzing", color: "indigo", description: "Extracting job intelligence", isProcessing: true },
  analyzed: { label: "Analyzed", color: "cyan", description: "Analysis complete" },
  generating: { label: "Generating", color: "purple", description: "Building tailored materials", isProcessing: true },
  ready: { label: "Ready", color: "green", description: "Ready to apply" },
  applied: { label: "Applied", color: "emerald", description: "Application submitted" },
  interviewing: { label: "Interviewing", color: "blue", description: "In interview loop" },
  offered: { label: "Offered", color: "green", description: "Offer received", isTerminal: true },
  rejected: { label: "Rejected", color: "red", description: "No offer", isTerminal: true },
  archived: { label: "Archived", color: "gray", description: "No longer active", isTerminal: true },
  needs_review: { label: "Needs Review", color: "amber", description: "Manual quality review needed" },
  error: { label: "Error", color: "red", description: "Flow failed", isTerminal: true },
}

export const JOB_STATUS_GROUPS = {
  active: ["draft", "queued", "analyzing", "analyzed", "generating", "ready"],
  applied: ["applied", "interviewing", "offered"],
  closed: ["rejected", "archived"],
  attention: ["needs_review", "error"],
} as const

const ALLOWED_TRANSITIONS: Record<CanonicalJobStatus, CanonicalJobStatus[]> = {
  draft: ["queued", "archived"],
  queued: ["analyzing", "error", "archived"],
  analyzing: ["analyzed", "needs_review", "error"],
  analyzed: ["generating", "needs_review", "archived", "error"],
  generating: ["ready", "needs_review", "error"],
  ready: ["applied", "archived", "needs_review"],
  applied: ["interviewing", "offered", "rejected", "archived"],
  interviewing: ["offered", "rejected", "archived"],
  offered: ["archived"],
  rejected: ["archived"],
  archived: [],
  needs_review: ["generating", "ready", "archived", "error"],
  error: ["queued", "generating", "archived", "needs_review"],
}

export function canTransitionJobStatus(
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined
): boolean {
  const from = normalizeJobStatus(fromStatus)
  const to = normalizeJobStatus(toStatus)
  if (from === to) return true
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export const CANONICAL_GENERATION_STATUSES = [
  "pending",
  "generating",
  "ready",
  "needs_review",
  "failed",
] as const

export type CanonicalGenerationStatus = typeof CANONICAL_GENERATION_STATUSES[number]

export function normalizeGenerationStatus(
  status: string | null | undefined,
  fallback: CanonicalGenerationStatus = "pending"
): CanonicalGenerationStatus {
  if (!status) return fallback
  const normalized = status.trim().toLowerCase()
  if ((CANONICAL_GENERATION_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as CanonicalGenerationStatus
  }
  return fallback
}
