"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Lightbulb,
  ArrowRight,
  Info,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { DetectedGap, GapAnalysisResult } from "@/lib/gap-detection"

interface PreGenerationReviewProps {
  gapAnalysis: GapAnalysisResult
  onContinueGenerate: () => void
  onOpenCoach: (gap?: DetectedGap) => void
  onDismiss: () => void
  isGenerating?: boolean
  jobTitle?: string
  company?: string
}

export function PreGenerationReview({
  gapAnalysis,
  onContinueGenerate,
  onOpenCoach,
  onDismiss,
  isGenerating = false,
  jobTitle,
  company,
}: PreGenerationReviewProps) {
  const [expandedGap, setExpandedGap] = useState<string | null>(null)

  const { gaps, critical_gaps, coverage_percentage, can_generate, generation_warning, recommended_action } = gapAnalysis
  // Ensure unique keys by combining index with original ID to prevent React key collisions
  const topGaps = gaps.slice(0, 5).map((g, i) => ({ ...g, id: `review-gap-${i}-${g.id}` }))
  const hasCriticalGaps = critical_gaps.length > 0

  // Determine UI state
  const statusConfig = {
    blocked: {
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/20",
      title: "Significant gaps detected",
      description: "Your evidence may not fully support this role. Consider strengthening your profile first.",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      title: "Some gaps to consider",
      description: "A few requirements aren't clearly supported. Addressing these could strengthen your materials.",
    },
    ready: {
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      title: "Good evidence coverage",
      description: "Your experience aligns well with this role.",
    },
  }

  const status = !can_generate ? "blocked" : hasCriticalGaps ? "warning" : "ready"
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <Card className={cn("border", config.borderColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <StatusIcon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{config.title}</CardTitle>
              <CardDescription className="mt-1">
                {config.description}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Coverage indicator */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Evidence coverage</span>
              <span className="font-medium">{coverage_percentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  coverage_percentage >= 70 ? "bg-green-500" :
                  coverage_percentage >= 40 ? "bg-amber-500" : "bg-destructive"
                )}
                style={{ width: `${coverage_percentage}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      {topGaps.length > 0 && (
        <>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Areas to strengthen</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {topGaps.length} gap{topGaps.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-2">
              {topGaps.map((gap, idx) => (
                <GapItem
                  key={`${idx}-${gap.id}`}
                  gap={gap}
                  isExpanded={expandedGap === gap.id}
                  onToggle={() => setExpandedGap(expandedGap === gap.id ? null : gap.id)}
                  onAskCoach={() => onOpenCoach(gap)}
                />
              ))}
            </div>

            {gaps.length > 5 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                +{gaps.length - 5} more gap{gaps.length - 5 !== 1 ? "s" : ""} identified
              </p>
            )}
          </CardContent>
        </>
      )}

      <Separator />

      {/* Actions */}
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {hasCriticalGaps && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onOpenCoach()}
            >
              <MessageSquare className="h-4 w-4" />
              Clarify with Coach
            </Button>
          )}

          <Button
            className="flex-1 gap-2"
            onClick={onContinueGenerate}
            disabled={isGenerating || !can_generate}
            variant={hasCriticalGaps ? "secondary" : "default"}
          >
            {isGenerating ? (
              "Generating..."
            ) : (
              <>
                {hasCriticalGaps ? "Generate Anyway" : "Generate Materials"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {generation_warning && status !== "ready" && (
          <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            {generation_warning}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Individual gap item component
function GapItem({
  gap,
  isExpanded,
  onToggle,
  onAskCoach,
}: {
  gap: DetectedGap
  isExpanded: boolean
  onToggle: () => void
  onAskCoach: () => void
}) {
  const severityConfig = {
    critical: { color: "text-destructive", bg: "bg-destructive/10", label: "Critical" },
    important: { color: "text-amber-600", bg: "bg-amber-50", label: "Important" },
    minor: { color: "text-blue-600", bg: "bg-blue-50", label: "Minor" },
  }

  const config = severityConfig[gap.severity]

  return (
    <div 
      className={cn(
        "rounded-lg border p-3 transition-all cursor-pointer hover:bg-muted/50",
        isExpanded && "bg-muted/30"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <ChevronRight 
          className={cn(
            "h-4 w-4 mt-0.5 text-muted-foreground transition-transform flex-shrink-0",
            isExpanded && "rotate-90"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">
              {gap.requirement}
            </p>
            <Badge variant="outline" className={cn("text-xs flex-shrink-0", config.color)}>
              {gap.requirement_source}
            </Badge>
          </div>

          {isExpanded && (
            <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm text-muted-foreground">
                {gap.gap_description}
              </p>
              
              {gap.current_evidence && (
                <div className="text-xs bg-muted rounded p-2">
                  <span className="font-medium">Related evidence:</span>{" "}
                  <span className="text-muted-foreground">{gap.current_evidence}</span>
                </div>
              )}

              <Button 
                size="sm" 
                variant="outline" 
                className="w-full gap-2"
                onClick={onAskCoach}
              >
                <MessageSquare className="h-3 w-3" />
                Clarify this with Coach
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
