import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type {
  Job,
  JobEnriched,
  Recommendation,
  AgePriority,
  ScoreKeywords,
  JobStatus,
  JobFit,
  JobSource,
  DocType,
  LogStatus,
  WorkflowName,
} from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Enrichment helpers ────────────────────────────────────────────────────────

export function getRecommendation(score: number | null): Recommendation {
  if (score === null) return "SKIP"
  if (score >= 80) return "APPLY"
  if (score >= 65) return "REVIEW"
  return "SKIP"
}

export function getAgePriority(
  createdAt: string,
  postedAt: string | null,
): AgePriority {
  const ref = postedAt ?? createdAt
  const diffHours = (Date.now() - new Date(ref).getTime()) / 3_600_000
  if (diffHours < 24) return "HOT"
  if (diffHours < 72) return "WARM"
  return "COLD"
}

export function getAgeLabel(
  createdAt: string,
  postedAt: string | null,
): string {
  const ref = postedAt ?? createdAt
  const diffH = Math.floor((Date.now() - new Date(ref).getTime()) / 3_600_000)
  if (diffH < 1) return "Just posted"
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return "1d ago"
  if (diffD < 7) return `${diffD}d ago`
  if (diffD < 30) return `${Math.floor(diffD / 7)}w ago`
  return `${Math.floor(diffD / 30)}mo ago`
}

export function enrichJob(job: Job): JobEnriched {
  return {
    ...job,
    recommendation: getRecommendation(job.score),
    age_priority: getAgePriority(job.created_at, job.posted_at),
    age_label: getAgeLabel(job.created_at, job.posted_at),
  }
}

// ── Safe JSONB parsers ────────────────────────────────────────────────────────

export function parseJsonArray(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p.map(String)
    } catch {
      // fall through
    }
  }
  return []
}

export function parseKeywords(raw: unknown): ScoreKeywords | null {
  if (!raw) return null
  const obj =
    typeof raw === "string"
      ? safeJsonParse<Record<string, unknown>>(raw)
      : (raw as Record<string, unknown>)
  if (!obj || typeof obj !== "object") return null
  return {
    skills: Array.isArray(obj.skills) ? obj.skills.map(String) : [],
    tools: Array.isArray(obj.tools) ? obj.tools.map(String) : [],
    responsibilities: Array.isArray(obj.responsibilities)
      ? obj.responsibilities.map(String)
      : [],
  }
}

export function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + "…"
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const DAILY_TARGET = 25

// ── Status / fit color configs ────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; className: string; dot: string }
> = {
  NEW: {
    label: "New",
    className: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  SCORED: {
    label: "Scored",
    className: "bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  READY_TO_APPLY: {
    label: "Ready",
    className: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  APPLIED: {
    label: "Applied",
    className: "bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-600",
    dot: "bg-red-500",
  },
  INTERVIEW: {
    label: "Interview",
    className: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  OFFER: {
    label: "Offer",
    className: "bg-green-50 text-green-700",
    dot: "bg-green-600",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-zinc-100 text-zinc-500",
    dot: "bg-zinc-400",
  },
}

export const FIT_CONFIG: Record<
  JobFit,
  { label: string; className: string }
> = {
  HIGH: { label: "High", className: "bg-emerald-50 text-emerald-700" },
  MEDIUM: { label: "Medium", className: "bg-amber-50 text-amber-700" },
  LOW: { label: "Low", className: "bg-red-50 text-red-600" },
  UNSCORED: { label: "Unscored", className: "bg-zinc-100 text-zinc-500" },
}

export const REC_CONFIG: Record<
  Recommendation,
  { label: string; className: string }
> = {
  APPLY: { label: "▶ APPLY", className: "bg-emerald-500 text-white" },
  REVIEW: { label: "◉ REVIEW", className: "bg-amber-400 text-amber-950" },
  SKIP: { label: "✕ SKIP", className: "bg-zinc-200 text-zinc-600" },
}

export const SOURCE_CONFIG: Record<
  JobSource,
  { label: string; className: string }
> = {
  GREENHOUSE: {
    label: "Greenhouse",
    className: "bg-emerald-50 text-emerald-700",
  },
  ZIPRECRUITER: {
    label: "ZipRecruiter",
    className: "bg-blue-50 text-blue-700",
  },
  JOBOT: { label: "Jobot", className: "bg-orange-50 text-orange-700" },
  MANUAL: { label: "Manual", className: "bg-zinc-100 text-zinc-600" },
}

export const LOG_STATUS_CONFIG: Record<
  LogStatus,
  { icon: string; className: string }
> = {
  SUCCESS: { icon: "✓", className: "bg-emerald-50 text-emerald-700" },
  ERROR: { icon: "✕", className: "bg-red-50 text-red-700" },
  SKIPPED: { icon: "—", className: "bg-zinc-100 text-zinc-500" },
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  RESUME: "Resume",
  COVER_LETTER: "Cover Letter",
  APPLICATION_ANSWERS: "App Answers",
  FOLLOW_UP_EMAIL: "Follow-up Email",
}

export const WORKFLOW_LABELS: Record<WorkflowName, string> = {
  JOB_INTAKE: "Job Intake",
  JOB_SCORING: "Scoring",
  DOCUMENT_GENERATION: "Doc Gen",
  APPLICATION_TRACKING: "Tracking",
}

export function scoreColorClass(score: number | null): string {
  if (score === null) return "text-zinc-400"
  if (score >= 80) return "text-emerald-600"
  if (score >= 65) return "text-amber-600"
  return "text-red-500"
}
