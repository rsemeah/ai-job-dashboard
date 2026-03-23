import { Badge } from "@/components/ui/badge"
import type { JobStatus, JobFit } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Loader2, Clock } from "lucide-react"

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  REVIEWING: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  SCORED: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  READY: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  READY_TO_APPLY: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  APPLIED: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20",
  REJECTED: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  INTERVIEW: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20",
  OFFER: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  ARCHIVED: "bg-muted text-muted-foreground hover:bg-muted/80",
}

const fitColors: Record<string, string> = {
  HIGH: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  LOW: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  UNSCORED: "bg-muted text-muted-foreground hover:bg-muted/80",
}

// Status labels for display
const statusLabels: Record<string, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  SCORED: "Scored",
  READY: "Ready",
  READY_TO_APPLY: "Ready",
  APPLIED: "Applied",
  REJECTED: "Rejected",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ARCHIVED: "Archived",
}

export function StatusBadge({ status }: { status: JobStatus | null | undefined }) {
  const safeStatus = status || "NEW"
  const colorClass = statusColors[safeStatus] || "bg-muted/50 text-muted-foreground hover:bg-muted/60"
  const label = statusLabels[safeStatus] || safeStatus.replace(/_/g, " ")
  
  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium", colorClass)}
    >
      {label}
    </Badge>
  )
}

// Enhanced status badge with processing indicator
export function StatusBadgeWithIndicator({ 
  status, 
  isProcessing = false 
}: { 
  status: JobStatus | null | undefined
  isProcessing?: boolean 
}) {
  const safeStatus = status || "NEW"
  const colorClass = statusColors[safeStatus] || "bg-muted/50 text-muted-foreground hover:bg-muted/60"
  const label = statusLabels[safeStatus] || safeStatus.replace(/_/g, " ")
  
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

function StatusIcon({ status, isProcessing }: { status: string; isProcessing?: boolean }) {
  if (isProcessing) {
    return <Loader2 className="h-3 w-3 animate-spin" />
  }

  switch (status) {
    case "NEW":
      return <Circle className="h-3 w-3" />
    case "REVIEWING":
      return <Loader2 className="h-3 w-3 animate-spin" />
    case "SCORED":
    case "READY":
    case "READY_TO_APPLY":
      return <CheckCircle2 className="h-3 w-3" />
    case "APPLIED":
    case "INTERVIEW":
      return <Clock className="h-3 w-3" />
    case "OFFER":
      return <CheckCircle2 className="h-3 w-3" />
    default:
      return null
  }
}

export function FitBadge({ fit }: { fit: JobFit | null | undefined }) {
  const safeFit = fit || "UNSCORED"
  const colorClass = fitColors[safeFit] || "bg-muted/50 text-muted-foreground hover:bg-muted/60"
  
  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium", colorClass)}
    >
      {safeFit}
    </Badge>
  )
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return (
      <span className="text-muted-foreground text-sm italic">Pending</span>
    )
  }
  
  // Color based on score
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
  const safeSource = source || "Unknown"
  return (
    <Badge variant="secondary" className="font-medium">
      {safeSource}
    </Badge>
  )
}

// Compact review status indicator (icon only)
export function ReviewStatusIndicator({ 
  status 
}: { 
  status: "pending" | "processing" | "complete" | "error" 
}) {
  switch (status) {
    case "pending":
      return (
        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" title="Pending" />
      )
    case "processing":
      return (
        <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" title="Processing" />
      )
    case "complete":
      return (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" title="Complete" />
      )
    case "error":
      return (
        <Circle className="h-3.5 w-3.5 text-red-500" title="Error" />
      )
  }
}
