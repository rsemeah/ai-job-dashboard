"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  AlertTriangle, 
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
  ArrowRight,
  FileText,
  MessageSquare,
  Target,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CoachChat } from "@/components/coach-chat"
import type { DetectedGap, GapAnalysisResult } from "@/lib/gap-detection"

interface CoachGatedGenerationProps {
  open: boolean
  onClose: () => void
  gapAnalysis: GapAnalysisResult
  jobId: string
  jobTitle: string
  company: string
  score: number | null
  onGenerateUnlocked: () => void
}

type GapStatus = "unaddressed" | "in_progress" | "addressed"

interface GapWithStatus extends DetectedGap {
  status: GapStatus
  coachResponse?: string
}

export function CoachGatedGeneration({
  open,
  onClose,
  gapAnalysis,
  jobId,
  jobTitle,
  company,
  score,
  onGenerateUnlocked,
}: CoachGatedGenerationProps) {
  // Track which gaps have been addressed via Coach
  const [gapsWithStatus, setGapsWithStatus] = useState<GapWithStatus[]>([])
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null)
  const [showCoach, setShowCoach] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize gaps with status
  useEffect(() => {
    if (gapAnalysis) {
      // Take top 5 critical/important gaps, ensure unique IDs to prevent React key collisions
      const topGaps = [...gapAnalysis.critical_gaps, ...gapAnalysis.gaps]
        .filter(g => g.severity === "critical" || g.severity === "important")
        .slice(0, 5)
        .map((g, index) => ({ 
          ...g, 
          id: `gated-gap-${index}-${g.id}`, // Ensure unique ID by combining index with original
          status: "unaddressed" as GapStatus 
        }))
      
      setGapsWithStatus(topGaps)
      
      // If no critical gaps, unlock immediately
      if (topGaps.filter(g => g.severity === "critical").length === 0) {
        setIsUnlocked(true)
      }
    }
  }, [gapAnalysis])

  // Calculate progress
  const addressedCount = gapsWithStatus.filter(g => g.status === "addressed").length
  const criticalGaps = gapsWithStatus.filter(g => g.severity === "critical")
  const criticalAddressed = criticalGaps.filter(g => g.status === "addressed").length
  const progress = gapsWithStatus.length > 0 
    ? (addressedCount / gapsWithStatus.length) * 100 
    : 100

  // Check if generation is unlocked (all critical gaps addressed)
  useEffect(() => {
    const allCriticalAddressed = criticalGaps.every(g => g.status === "addressed")
    setIsUnlocked(allCriticalAddressed || criticalGaps.length === 0)
  }, [gapsWithStatus])

  const selectedGap = gapsWithStatus.find(g => g.id === selectedGapId)

  const handleOpenCoach = (gapId: string) => {
    setSelectedGapId(gapId)
    setShowCoach(true)
    
    // Mark as in progress
    setGapsWithStatus(prev => 
      prev.map(g => g.id === gapId ? { ...g, status: "in_progress" } : g)
    )
  }

  const handleCoachComplete = () => {
    if (selectedGapId) {
      // Mark gap as addressed
      setGapsWithStatus(prev => 
        prev.map(g => g.id === selectedGapId ? { ...g, status: "addressed" } : g)
      )
      toast.success("Gap addressed!")
    }
    setShowCoach(false)
    setSelectedGapId(null)
  }

  const handleSkipGap = (gapId: string) => {
    // Mark as addressed (user chose to skip)
    setGapsWithStatus(prev => 
      prev.map(g => g.id === gapId ? { ...g, status: "addressed" } : g)
    )
  }

  const handleGenerate = async () => {
    setIsSaving(true)
    try {
      // Save gap resolutions to job
      const resolutions = gapsWithStatus
        .filter(g => g.status === "addressed")
        .map(g => ({
          gap_id: g.id,
          requirement: g.requirement,
          addressed_at: new Date().toISOString(),
        }))

      await fetch(`/api/jobs/${jobId}/clarifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clarifications: resolutions }),
      })

      onGenerateUnlocked()
    } catch (error) {
      toast.error("Failed to save progress")
    } finally {
      setIsSaving(false)
    }
  }

  const severityConfig = {
    critical: { 
      color: "text-red-600", 
      bg: "bg-red-50 border-red-200", 
      badge: "bg-red-100 text-red-700 border-red-200",
      label: "Critical Gap" 
    },
    important: { 
      color: "text-amber-600", 
      bg: "bg-amber-50 border-amber-200", 
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      label: "Important" 
    },
    minor: { 
      color: "text-blue-600", 
      bg: "bg-blue-50 border-blue-200", 
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      label: "Minor" 
    },
  }

  const statusConfig = {
    unaddressed: { icon: AlertTriangle, color: "text-muted-foreground" },
    in_progress: { icon: MessageSquare, color: "text-blue-500" },
    addressed: { icon: CheckCircle2, color: "text-green-500" },
  }

  // If showing coach chat
  if (showCoach && selectedGap) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Address Gap with Coach
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedGap.requirement}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCoach(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <CoachChat 
              compact
              jobContext={{
                jobId,
                title: jobTitle,
                company,
                score,
                status: "analyzing"
              }}
              gapContext={{
                jobTitle,
                company,
                gap: {
                  requirement: selectedGap.requirement,
                  category: selectedGap.category,
                  coach_question: selectedGap.coach_question,
                }
              }}
              initialMessage={`Help me address this gap for the ${jobTitle} role at ${company}: "${selectedGap.requirement}". ${selectedGap.coach_question}`}
            />
          </div>
          
          <div className="px-6 py-4 border-t flex justify-between">
            <Button variant="outline" onClick={() => setShowCoach(false)}>
              Back to Gaps
            </Button>
            <Button onClick={handleCoachComplete} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Addressed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Strengthen Your Application
          </DialogTitle>
          <DialogDescription>
            Address key gaps before generating materials for {jobTitle} at {company}
          </DialogDescription>
        </DialogHeader>

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {addressedCount} of {gapsWithStatus.length} gaps addressed
            </span>
            {isUnlocked ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Unlock className="mr-1 h-3 w-3" />
                Generation Unlocked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Lock className="mr-1 h-3 w-3" />
                Address {criticalGaps.length - criticalAddressed} critical gap{criticalGaps.length - criticalAddressed !== 1 ? "s" : ""} to unlock
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Gaps list */}
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {gapsWithStatus.map((gap) => {
              const config = severityConfig[gap.severity]
              const statusCfg = statusConfig[gap.status]
              const StatusIcon = statusCfg.icon

              return (
                <Card 
                  key={gap.id} 
                  className={cn(
                    "border transition-colors",
                    gap.status === "addressed" && "opacity-60",
                    gap.status === "in_progress" && "border-blue-300"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", statusCfg.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-xs", config.badge)}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{gap.requirement}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {gap.gap_description}
                          </p>
                        </div>
                      </div>
                      
                      {gap.status !== "addressed" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSkipGap(gap.id)}
                            className="text-xs"
                          >
                            Skip
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenCoach(gap.id)}
                            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <MessageSquare className="mr-1 h-3 w-3" />
                            Coach
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>

        {/* Empty state if no gaps */}
        {gapsWithStatus.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h3 className="font-medium mb-1">No critical gaps found!</h3>
            <p className="text-sm text-muted-foreground">
              Your evidence library aligns well with this role
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!isUnlocked || isSaving}
            className={cn(
              "gap-2",
              isUnlocked 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "opacity-50 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isUnlocked ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isUnlocked ? "Generate Materials" : "Unlock Generation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
