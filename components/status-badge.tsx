import { Badge } from "@/components/ui/badge"
import type { JobStatus, JobFit, STATUS_CONFIG } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Loader2, Clock, AlertCircle, AlertTriangle, Copy, FileX } from "lucide-react"

// Status colors matching the canonical model
const statusColors: Record<JobStatus, string> = {
  submitted: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  fetching: "bg-blue-400/10 text-blue-400 hover:bg-blue-400/20",
  parsing: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  parsed: "bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20",
  parsed_partial: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  duplicate: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  scoring: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  scored: "bg-purple-600/10 text-purple-600 hover:bg-purple-600/20",
  below_threshold: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  generating_documents: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20",
  manual_review_required: "bg-amber-600/10 text-amber-600 hover:bg-amber-600/20",
  ready: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  applied: "bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20",
  interviewing: "bg-cyan-600/10 text-cyan-600 hover:bg-cyan-600/20",
  offered: "bg-green-600/10 text-green-600 hover:bg-green-600/20",
  rejected: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  declined: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  archived: "bg-muted text-muted-foreground hover:bg-muted/80",
  error: "bg-red-600/10 text-red-600 hover:bg-red-600/20",
}

// Fit colors
const fitColors: Record<string, string> = {
  HIGH: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  LOW: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
}

// Status labels
const statusLabels: Record<JobStatus, string> = {
  submitted: "Submitted",
  fetching: "Fetching",
  parsing: "Parsing",
  parsed: "Parsed",
  parsed_partial: "Partial Parse",
  duplicate: "Duplicate",
  scoring: "Scoring",
  scored: "Scored",
  below_threshold: "Low Score",
  generating_documents: "Generating",
  manual_review_required: "Review Needed",
  ready: "Ready",
  applied: "Applied",
  interviewing: "Interview",
  offered: "Offer",
  rejected: "Rejected",
  declined: "Declined",
  archived: "Archived",
  error: "Error",
}

// Processing states
const processingStatuses: JobStatus[] = [
  "submitted", "fetching", "parsing", "scoring", "generating_documents"
]

export function StatusBadge({ status }: { status: JobStatus | string | null | undefined }) {
  const safeStatus = (status as JobStatus) || "submitted"
  const colorClass = statusColors[safeStatus] || "bg-muted/50 text-muted-foreground"
  const label = statusLabels[safeStatus] || safeStatus
  
  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium", colorClass)}
    >
      {label}
    </Badge>
  )
}

export function StatusBadgeWithIndicator({ 
  status,
}: { 
  status: JobStatus | string | null | undefined
}) {
  const safeStatus = (status as JobStatus) || "submitted"
  const colorClass = statusColors[safeStatus] || "bg-muted/50 text-muted-foreground"
  const label = statusLabels[safeStatus] || safeStatus
  const isProcessing = processingStatuses.includes(safeStatus)
  
  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium gap-1.5", colorClass)}
    >
      <StatusIcon status={safeStatus} isProcessing={isProcessing} />
      {label}
    </Badge>
  )
}

function StatusIcon({ status, isProcessing }: { status: JobStatus; isProcessing?: boolean }) {
  if (isProcessing) {
    return <Loader2 className="h-3 w-3 animate-spin" />
  }

  switch (status) {
    case "submitted":
    case "fetching":
    case "parsing":
    case "scoring":
    case "generating_documents":
      return <Loader2 className="h-3 w-3 animate-spin" />
    case "parsed":
    case "scored":
    case "ready":
    case "offered":
      return <CheckCircle2 className="h-3 w-3" />
    case "parsed_partial":
    case "manual_review_required":
    case "below_threshold":
      return <AlertTriangle className="h-3 w-3" />
    case "duplicate":
      return <Copy className="h-3 w-3" />
    case "applied":
    case "interviewing":
      return <Clock className="h-3 w-3" />
    case "error":
    case "rejected":
      return <AlertCircle className="h-3 w-3" />
    case "declined":
    case "archived":
      return <FileX className="h-3 w-3" />
    default:
      return <Circle className="h-3 w-3" />
  }
}

export function FitBadge({ fit }: { fit: JobFit | null | undefined }) {
  if (!fit) {
    return (
      <Badge variant="outline" className="border-transparent bg-muted/50 text-muted-foreground">
        Unscored
      </Badge>
    )
  }
  
  const colorClass = fitColors[fit] || "bg-muted/50 text-muted-foreground"
  
  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium", colorClass)}
    >
      {fit} Fit
    </Badge>
  )
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return (
      <span className="text-muted-foreground text-sm italic">--</span>
    )
  }
  
  const colorClass = score >= 80 
    ? "text-emerald-600 dark:text-emerald-400" 
    : score >= 60 
    ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400"
  
  return (
    <span className={cn("font-mono font-bold", colorClass)}>{score}</span>
  )
}

export function SourceBadge({ source }: { source: string | null | undefined }) {
  const safeSource = source || "unknown"
  return (
    <Badge variant="secondary" className="font-medium uppercase text-xs">
      {safeSource}
    </Badge>
  )
}

export function ParseQualityBadge({ quality }: { quality: string | null | undefined }) {
  if (!quality) return null
  
  const config: Record<string, { label: string; color: string }> = {
    full: { label: "Full Parse", color: "bg-green-500/10 text-green-500" },
    partial: { label: "Partial Parse", color: "bg-amber-500/10 text-amber-500" },
    failed: { label: "Parse Failed", color: "bg-red-500/10 text-red-500" },
  }
  
  const { label, color } = config[quality] || { label: quality, color: "bg-muted text-muted-foreground" }
  
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", color)}>
      {label}
    </Badge>
  )
}
