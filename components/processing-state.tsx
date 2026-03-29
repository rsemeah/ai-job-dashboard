"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Clock, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ProcessingStatus = 
  | "idle"
  | "queued" 
  | "processing" 
  | "complete" 
  | "warning"
  | "error"

interface ProcessingStateProps {
  status: ProcessingStatus
  title: string
  message?: string
  progress?: number // 0-100
  onRetry?: () => void
  onCancel?: () => void
  className?: string
  compact?: boolean
}

const statusConfig: Record<ProcessingStatus, {
  icon: typeof Loader2
  iconClass: string
  bgClass: string
  borderClass: string
  label: string
}> = {
  idle: {
    icon: Clock,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted/50",
    borderClass: "border-border",
    label: "Waiting",
  },
  queued: {
    icon: Clock,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    label: "Queued",
  },
  processing: {
    icon: Loader2,
    iconClass: "text-blue-600 animate-spin",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    label: "Processing",
  },
  complete: {
    icon: CheckCircle2,
    iconClass: "text-green-600",
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    label: "Complete",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    label: "Needs Attention",
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-600",
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    label: "Failed",
  },
}

export function ProcessingState({
  status,
  title,
  message,
  progress,
  onRetry,
  onCancel,
  className,
  compact = false,
}: ProcessingStateProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        config.bgClass,
        config.borderClass,
        className
      )}>
        <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconClass)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {message && (
            <p className="text-xs text-muted-foreground truncate">{message}</p>
          )}
        </div>
        {status === "error" && onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry} className="flex-shrink-0">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("border", config.borderClass, className)}>
      <CardContent className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        config.bgClass
      )}>
        <div className={cn(
          "rounded-full p-3 mb-4",
          status === "processing" ? "bg-blue-100" : "bg-white/50"
        )}>
          <Icon className={cn("h-6 w-6", config.iconClass)} />
        </div>
        
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
          {config.label}
        </p>
        <h3 className="font-semibold mb-2">{title}</h3>
        
        {message && (
          <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
        )}

        {/* Progress bar for processing state */}
        {status === "processing" && progress !== undefined && (
          <div className="w-full max-w-xs mb-4">
            <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === "error" && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          )}
          {(status === "processing" || status === "queued") && onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Inline status indicator for tables/lists
export function StatusIndicator({ 
  status, 
  size = "sm" 
}: { 
  status: ProcessingStatus
  size?: "sm" | "md" 
}) {
  const config = statusConfig[status]
  const Icon = config.icon
  const sizeClasses = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn(sizeClasses, config.iconClass)} />
      <span className={cn(
        "text-xs font-medium",
        status === "error" ? "text-red-600" : 
        status === "complete" ? "text-green-600" :
        status === "processing" ? "text-blue-600" :
        "text-muted-foreground"
      )}>
        {config.label}
      </span>
    </div>
  )
}
