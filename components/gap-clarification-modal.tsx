"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  AlertTriangle, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle2,
  Lightbulb,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { DetectedGap, GapAnalysisResult } from "@/lib/gap-detection"
import type { ResponseHandling } from "@/lib/coach-prompts/gap-questions"

interface GapClarificationModalProps {
  open: boolean
  onClose: () => void
  gapAnalysis: GapAnalysisResult
  jobId: string
  jobTitle?: string
  company?: string
  onComplete: (clarifications: GapClarification[]) => void
}

export interface GapClarification {
  gap_id: string
  gap_requirement: string
  question: string
  answer: string
  routing: ResponseHandling
  addressed_at: string
}

export function GapClarificationModal({
  open,
  onClose,
  gapAnalysis,
  jobId,
  jobTitle,
  company,
  onComplete,
}: GapClarificationModalProps) {
  const [currentGapIndex, setCurrentGapIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [routings, setRoutings] = useState<Record<string, ResponseHandling>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Get top 3 critical/important gaps
  const topGaps = gapAnalysis.gaps
    .filter(g => g.severity === "critical" || g.severity === "important")
    .slice(0, 3)

  const currentGap = topGaps[currentGapIndex]
  const isLastGap = currentGapIndex === topGaps.length - 1
  const progress = ((currentGapIndex + 1) / topGaps.length) * 100

  if (!currentGap) {
    return null
  }

  const handleNext = async () => {
    const answer = answers[currentGap.id]
    if (!answer?.trim()) {
      toast.error("Please provide an answer or skip this question")
      return
    }

    if (isLastGap) {
      // Save all clarifications
      setIsSaving(true)
      try {
        const clarifications: GapClarification[] = topGaps
          .filter(gap => answers[gap.id]?.trim())
          .map(gap => ({
            gap_id: gap.id,
            gap_requirement: gap.requirement,
            question: gap.coach_question,
            answer: answers[gap.id],
            routing: routings[gap.id] || "use_for_job_only",
            addressed_at: new Date().toISOString(),
          }))

        // Save to job
        const response = await fetch(`/api/jobs/${jobId}/clarifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clarifications }),
        })

        if (!response.ok) {
          throw new Error("Failed to save clarifications")
        }

        toast.success("Clarifications saved!")
        onComplete(clarifications)
        onClose()
      } catch (error) {
        toast.error("Failed to save clarifications")
      } finally {
        setIsSaving(false)
      }
    } else {
      setCurrentGapIndex(currentGapIndex + 1)
    }
  }

  const handleSkip = () => {
    if (isLastGap) {
      // Complete with whatever we have
      const clarifications: GapClarification[] = topGaps
        .filter(gap => answers[gap.id]?.trim())
        .map(gap => ({
          gap_id: gap.id,
          gap_requirement: gap.requirement,
          question: gap.coach_question,
          answer: answers[gap.id],
          routing: routings[gap.id] || "use_for_job_only",
          addressed_at: new Date().toISOString(),
        }))
      onComplete(clarifications)
      onClose()
    } else {
      setCurrentGapIndex(currentGapIndex + 1)
    }
  }

  const handleRoutingChange = (value: ResponseHandling) => {
    setRoutings({ ...routings, [currentGap.id]: value })
  }

  const severityConfig = {
    critical: { color: "text-destructive", bg: "bg-destructive/10", label: "Critical" },
    important: { color: "text-amber-600", bg: "bg-amber-50", label: "Important" },
    minor: { color: "text-blue-600", bg: "bg-blue-50", label: "Minor" },
  }

  const config = severityConfig[currentGap.severity]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Quick Clarification
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              {currentGapIndex + 1} of {topGaps.length}
            </Badge>
          </div>
          <DialogDescription>
            {jobTitle && company 
              ? `Strengthen your application for ${jobTitle} at ${company}`
              : "Answer a few questions to improve your materials"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Gap context */}
        <div className={cn("p-3 rounded-lg border", config.bg)}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
            <div>
              <p className="text-sm font-medium">{currentGap.requirement}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentGap.gap_description}
              </p>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm">{currentGap.coach_question}</p>
          </div>

          <Textarea
            placeholder="Your answer..."
            value={answers[currentGap.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [currentGap.id]: e.target.value })}
            className="min-h-[100px]"
          />

          {/* Routing preference */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">How should we use this?</Label>
            <RadioGroup
              value={routings[currentGap.id] || "use_for_job_only"}
              onValueChange={(v) => handleRoutingChange(v as ResponseHandling)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="use_for_job_only" id="job-only" />
                <Label htmlFor="job-only" className="text-xs font-normal cursor-pointer">
                  This job only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="save_to_profile" id="save-profile" />
                <Label htmlFor="save-profile" className="text-xs font-normal cursor-pointer">
                  Save to profile
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLastGap ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
