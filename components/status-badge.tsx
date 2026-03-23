import { Badge } from "@/components/ui/badge"
import type { JobStatus, JobFit } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusColors: Record<JobStatus, string> = {
  NEW: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  SCORED: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  READY_TO_APPLY: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  APPLIED: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20",
  REJECTED: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  INTERVIEW: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20",
  OFFER: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  ARCHIVED: "bg-muted text-muted-foreground hover:bg-muted/80",
}

const fitColors: Record<JobFit, string> = {
  HIGH: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  LOW: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  UNSCORED: "bg-muted text-muted-foreground hover:bg-muted/80",
}

export function StatusBadge({ status }: { status: JobStatus }) {
  const colorClass = statusColors[status as keyof typeof statusColors] || "bg-muted text-muted-foreground hover:bg-muted/80"
  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium", colorClass)}
    >
      {String(status).replace(/_/g, " ")}
    </Badge>
  )
}

export function FitBadge({ fit }: { fit: JobFit }) {
  const colorClass = fitColors[fit as keyof typeof fitColors] || "bg-muted text-muted-foreground hover:bg-muted/80"
  return (
    <Badge 
      variant="outline" 
      className={cn("border-transparent font-medium", colorClass)}
    >
      {fit || "UNSCORED"}
    </Badge>
  )
}

export function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="secondary" className="font-medium">
      {source}
    </Badge>
  )
}
