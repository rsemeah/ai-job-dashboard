"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CheckCircle2, AlertTriangle, Info, XCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClaimConfidence } from "@/lib/claim-safety"
import { getConfidenceLabel, getConfidenceColor, getConfidenceBadgeVariant } from "@/lib/claim-safety"

interface ClaimBadgeProps {
  confidence: ClaimConfidence
  sourceDescription?: string
  showLabel?: boolean
  size?: "sm" | "md"
  className?: string
}

const confidenceIcons: Record<ClaimConfidence, typeof CheckCircle2> = {
  source_verified: CheckCircle2,
  user_confirmed: CheckCircle2,
  normalized_rewrite: RefreshCw,
  plausible_inferred: Info,
  unsupported_blocked: XCircle,
}

const confidenceDescriptions: Record<ClaimConfidence, string> = {
  source_verified: "Directly from your uploaded evidence",
  user_confirmed: "You explicitly confirmed this",
  normalized_rewrite: "Rephrased from your evidence for clarity",
  plausible_inferred: "Inferred from your experience - consider confirming",
  unsupported_blocked: "Not supported by your evidence",
}

export function ClaimBadge({
  confidence,
  sourceDescription,
  showLabel = true,
  size = "sm",
  className,
}: ClaimBadgeProps) {
  const Icon = confidenceIcons[confidence]
  const label = getConfidenceLabel(confidence)
  const color = getConfidenceColor(confidence)
  const variant = getConfidenceBadgeVariant(confidence)
  const description = confidenceDescriptions[confidence]

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className={cn(
              "gap-1 cursor-help",
              size === "sm" && "text-xs py-0 px-1.5",
              size === "md" && "text-sm py-0.5 px-2",
              className
            )}
          >
            <Icon className={iconSize} />
            {showLabel && <span>{label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          {sourceDescription && (
            <p className="text-xs mt-1.5 pt-1.5 border-t">
              Source: {sourceDescription}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Inline indicator for within text
interface ClaimIndicatorProps {
  confidence: ClaimConfidence
  className?: string
}

export function ClaimIndicator({ confidence, className }: ClaimIndicatorProps) {
  const Icon = confidenceIcons[confidence]
  const color = getConfidenceColor(confidence)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center cursor-help", className)}>
            <Icon className={cn("h-3 w-3 ml-1", color)} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{getConfidenceLabel(confidence)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Summary bar for document overview
interface ClaimSummaryBarProps {
  verified: number
  confirmed: number
  inferred: number
  blocked: number
  className?: string
}

export function ClaimSummaryBar({
  verified,
  confirmed,
  inferred,
  blocked,
  className,
}: ClaimSummaryBarProps) {
  const total = verified + confirmed + inferred + blocked
  if (total === 0) return null

  const segments = [
    { count: verified + confirmed, color: "bg-green-500", label: "Verified" },
    { count: inferred, color: "bg-amber-500", label: "Needs review" },
    { count: blocked, color: "bg-destructive", label: "Unsupported" },
  ].filter(s => s.count > 0)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Claim confidence</span>
        <span>{Math.round(((verified + confirmed) / total) * 100)}% verified</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        {segments.map((segment, i) => (
          <TooltipProvider key={i}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn("h-full", segment.color)}
                  style={{ width: `${(segment.count / total) * 100}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{segment.label}: {segment.count} claims</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      <div className="flex gap-4 text-xs">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full", segment.color)} />
            <span className="text-muted-foreground">{segment.label} ({segment.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
