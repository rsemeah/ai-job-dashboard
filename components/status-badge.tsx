import { Badge } from "@/components/ui/badge"
import type { JobStatus, JobFit } from "@/lib/types"
import { normalizeJobStatus } from "@/lib/job-lifecycle"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Loader2, Clock, AlertCircle, AlertTriangle, FileX } from "lucide-react"

// Editorial status colors - subtle and sophisticated
const statusColors: Record<JobStatus, string> = {
  draft: "bg-secondary text-foreground/70 border-border",
  queued: "bg-secondary text-foreground/70 border-border",
  analyzing: "bg-secondary text-foreground/70 border-border",
  analyzed: "bg-secondary text-foreground/80 border-border",
  generating: "bg-secondary text-foreground/70 border-border",
  ready: "bg-primary/10 text-primary border-primary/20",
  applied: "bg-emerald-50 text-emerald-700 border-emerald-200",
  interviewing: "bg-blue-50 text-blue-700 border-blue-200",
  offered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-secondary text-muted-foreground border-border",
  archived: "bg-secondary text-muted-foreground border-border",
  needs_review: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
}

// Editorial fit colors
const fitColors: Record<string, string> = {
  HIGH: "bg-primary/10 text-primary border-primary/20",
  MEDIUM: "bg-secondary text-foreground/70 border-border",
  LOW: "bg-secondary text-muted-foreground border-border",
}

// Status labels
const statusLabels: Record<JobStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  analyzing: "Analyzing",
  analyzed: "Analyzed",
  generating: "Generating",
  ready: "Ready",
  applied: "Applied",
  interviewing: "Interview",
  offered: "Offer",
  rejected: "Rejected",
  archived: "Archived",
  needs_review: "Review Needed",
  error: "Error",
}

// Processing states
const processingStatuses: JobStatus[] = [
  "queued", "analyzing", "generating"
]

export function StatusBadge({ status }: { status: JobStatus | string | null | undefined }) {
  const safeStatus = normalizeJobStatus(status, "draft")
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
  const safeStatus = normalizeJobStatus(status, "draft")
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
    case "queued":
    case "analyzing":
    case "generating":
      return <Loader2 className="h-3 w-3 animate-spin" />
    case "draft":
    case "analyzed":
    case "ready":
    case "offered":
      return <CheckCircle2 className="h-3 w-3" />
    case "needs_review":
      return <AlertTriangle className="h-3 w-3" />
    case "applied":
    case "interviewing":
      return <Clock className="h-3 w-3" />
    case "error":
    case "rejected":
      return <AlertCircle className="h-3 w-3" />
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
