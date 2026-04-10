"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Job, JobStatus, JobFit, RoleFamily, GenerationStatus } from "@/lib/types"
import { STATUS_CONFIG, FIT_CONFIG, ROLE_FAMILIES } from "@/lib/types"
import { normalizeJobStatus } from "@/lib/job-lifecycle"
import { updateJobStatus } from "@/lib/actions/jobs"
import { applyToJob } from "@/lib/actions/apply"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ExternalLink,
  CheckCircle2,
  Send,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Loader2,
  Copy,
  AlertCircle,
  MapPin,
  DollarSign,
  Target,
  Briefcase,
  XCircle,
  RefreshCw,
  Save,
  Eye,
  Lock,
  AlertTriangle,
  Clock,
  MessageSquare,
} from "lucide-react"
import { toast } from "sonner"
import { ExportButtons } from "@/components/export-buttons"
import { ResumeTemplatePicker, ResumeActionsBar, getRecommendedTemplate } from "@/components/resume-templates"
import { DeleteJobDialog } from "@/components/delete-job-dialog"
import { PreGenerationReview } from "@/components/pre-generation-review"
import { TEMPLATE_CONFIGS } from "@/lib/resume-templates/config/resumeTemplates.config"
import type { TemplateId } from "@/lib/resume-templates/types/ResumeProps"
import { detectGaps, type GapAnalysisResult, type DetectedGap } from "@/lib/gap-detection"
import { GapClarificationModal, type GapClarification } from "@/components/gap-clarification-modal"
import { CoachGatedGeneration } from "@/components/coach-gated-generation"
import {
  deriveWorkflowStage,
  getWorkflowState,
  WORKFLOW_STAGES,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  type WorkflowStage,
} from "@/lib/job-workflow"
import { 
  ResumeWithProvenance, 
  CoverLetterWithProvenance,
  type BulletProvenance,
  type ParagraphProvenance,
} from "@/components/resume-with-provenance"
import { type ReadinessResult } from "@/lib/readiness"

// Available status transitions
const STATUS_OPTIONS: JobStatus[] = [
  "draft",
  "queued",
  "analyzing",
  "analyzed",
  "generating",
  "ready",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "archived",
  "needs_review",
  "error",
]

interface JobDetailProps {
  job: Job
  readiness?: ReadinessResult | null
}

// Fit badge component with proper styling and explainable tooltip
function FitBadge({ fit, score, scoreReasoning }: { 
  fit: JobFit; 
  score: number | null;
  scoreReasoning?: {
    fit_band?: string;
    confidence?: string;
    matched_requirements?: number;
    total_requirements?: number;
    score_explanation?: string;
  } | null;
}) {
  if (!fit) return <Badge variant="outline" className="text-xs">Unscored</Badge>
  
  const config = FIT_CONFIG[fit]
  const colorClasses = {
    HIGH: "bg-green-100 text-green-800 border-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    LOW: "bg-red-100 text-red-800 border-red-200",
  }
  
  // Map fit band to display labels
  const fitBandLabels: Record<string, string> = {
    "strong_match": "Strong Match",
    "moderate_match": "Moderate Match",
    "stretch_but_viable": "Stretch Fit",
    "low_match": "Low Match",
  }
  
  const displayLabel = scoreReasoning?.fit_band 
    ? fitBandLabels[scoreReasoning.fit_band] || config.label
    : config.label
  
  const confidenceLabel = scoreReasoning?.confidence 
    ? `(${scoreReasoning.confidence} confidence)`
    : ""
  
  return (
    <div className="flex items-center gap-2">
      <Badge className={`${colorClasses[fit]} border`}>
        {displayLabel} {score ? `${score}/100` : ""}
      </Badge>
      {scoreReasoning?.matched_requirements !== undefined && scoreReasoning?.total_requirements !== undefined && (
        <span className="text-xs text-muted-foreground">
          {scoreReasoning.matched_requirements}/{scoreReasoning.total_requirements} requirements matched {confidenceLabel}
        </span>
      )}
    </div>
  )
}

// Status badge component
function StatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className="text-xs">
      {config.label}
    </Badge>
  )
}

// Workflow step status types
type WorkflowStatus = "not_started" | "in_progress" | "complete" | "warning" | "blocked"

// Workflow step card with status
function WorkflowStepCard({
  step,
  title,
  description,
  status,
  statusReason,
  color,
}: {
  step: number
  title: string
  description: string
  status: WorkflowStatus
  statusReason: string
  color: "blue" | "green" | "red" | "purple"
}) {
  const colorClasses = {
    blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-100", text: "text-green-600", border: "border-green-200" },
    red: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
  }

  const statusConfig = {
    not_started: { icon: Clock, className: "text-muted-foreground", label: "Not Started" },
    in_progress: { icon: Loader2, className: "text-blue-500 animate-spin", label: "In Progress" },
    complete: { icon: CheckCircle2, className: "text-green-500", label: "Complete" },
    warning: { icon: AlertTriangle, className: "text-amber-500", label: "Needs Attention" },
    blocked: { icon: Lock, className: "text-red-500", label: "Blocked" },
  }

  const StatusIcon = statusConfig[status].icon

  return (
    <div className={`p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer ${
      status === "blocked" ? "opacity-60" : ""
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full ${colorClasses[color].bg} flex items-center justify-center`}>
            <span className={`text-sm font-bold ${colorClasses[color].text}`}>{step}</span>
          </div>
          <h4 className="font-medium">{title}</h4>
        </div>
        <StatusIcon className={`h-4 w-4 ${statusConfig[status].className}`} />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className={`text-xs mt-2 ${statusConfig[status].className}`}>
        {statusReason}
      </p>
    </div>
  )
}

// Generation status banner with retry button
function GenerationStatusBanner({ 
  status, 
  error, 
  attempts,
  onRetry,
  isRetrying,
  retryCountdown = 0,
}: { 
  status: GenerationStatus | null | undefined
  error: string | null | undefined
  attempts: number | null | undefined
  onRetry: () => void
  isRetrying: boolean
  retryCountdown?: number
}) {
  if (!status) return null
  
  const configs: Record<GenerationStatus, {
    icon: typeof CheckCircle2
    className: string
    bgClassName: string
    label: string
    showRetry: boolean
  }> = {
    pending: {
      icon: Clock,
      className: "text-blue-600",
      bgClassName: "bg-blue-50 border-blue-200",
      label: "Ready to generate materials",
      showRetry: false,
    },
    generating: {
      icon: Loader2,
      className: "text-blue-600 animate-spin",
      bgClassName: "bg-blue-50 border-blue-200",
      label: "Generating resume and cover letter...",
      showRetry: false,
    },
    ready: {
      icon: CheckCircle2,
      className: "text-green-600",
      bgClassName: "bg-green-50 border-green-200",
      label: "Materials ready for download",
      showRetry: false,
    },
    failed: {
      icon: XCircle,
      className: "text-red-600",
      bgClassName: "bg-red-50 border-red-200",
      // Show user-friendly error message, not technical details
      label: error?.includes("profile") ? "Complete your profile to generate materials" :
             error?.includes("evidence") ? "Add evidence to your library first" :
             error?.includes("stretch") ? "This role may not be a good fit" :
             "Generation failed - tap retry to try again",
      showRetry: true,
    },
    needs_review: {
      icon: AlertTriangle,
      className: "text-amber-600",
      bgClassName: "bg-amber-50 border-amber-200",
      label: "Materials generated but have quality issues",
      showRetry: true,
    },
  }
  
  const config = configs[status]
  const StatusIcon = config.icon
  
  return (
    <div className={`p-4 rounded-lg border flex items-center justify-between ${config.bgClassName}`}>
      <div className="flex items-center gap-3">
        <StatusIcon className={`h-5 w-5 ${config.className}`} />
        <div>
          <p className={`font-medium ${config.className}`}>{config.label}</p>
          {attempts && attempts > 1 && (
            <p className="text-xs text-muted-foreground">
              Attempted {attempts} time{attempts > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
      {config.showRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          disabled={isRetrying || retryCountdown > 0}
          className="gap-2"
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isRetrying ? "Retrying..." : retryCountdown > 0 ? `Retry in ${retryCountdown}s` : "Retry Generation"}
        </Button>
      )}
    </div>
  )
}

export function JobDetail({ job, readiness }: JobDetailProps) {
  const router = useRouter()
  const [status, setStatus] = useState<JobStatus>(normalizeJobStatus(job.status))
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [candidateName, setCandidateName] = useState("Candidate")
  
  // Template state - get recommended template based on job info
  const recommendedTemplateId = getRecommendedTemplate(
    job.industry_guess,
    job.title,
    job.seniority_level
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>(recommendedTemplateId)
  
  // Pre-generation gap review state
  const [showGapReview, setShowGapReview] = useState(false)
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null)
  const [isLoadingGaps, setIsLoadingGaps] = useState(false)
  const [selectedGapForCoach, setSelectedGapForCoach] = useState<DetectedGap | null>(null)
  const [showGapClarification, setShowGapClarification] = useState(false)
  const [pendingClarifications, setPendingClarifications] = useState<GapClarification[]>([])
  const [showCoachGated, setShowCoachGated] = useState(false)

  // Sync local status when job prop updates (e.g. after router.refresh())
  useEffect(() => {
    setStatus(normalizeJobStatus(job.status))
  }, [job.status])

  // Load candidate name from profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        const { data } = await supabase
          .from("user_profile")
          .select("full_name")
          .eq("user_id", user.id)
          .single()
        
        if (data?.full_name) {
          setCandidateName(data.full_name)
        }
      } catch (error) {
        // Silently fail, use default
      }
    }
    loadProfile()
  }, [])

  // Semantic workflow state - prefer server-computed readiness, fallback to local derivation
  const workflowState = getWorkflowState(job)
  // Use readiness from server if available (single source of truth)
  const currentStage = readiness?.stage || workflowState.stage
  const stageIndex = readiness?.stage_index ?? workflowState.stageIndex
  
  // Gate flags from readiness (server-computed) or fallback
  const canGenerate = readiness?.can_generate ?? workflowState.canGenerate
  const canInterviewPrep = readiness?.can_interview_prep ?? (!!job.generated_resume && !!job.generated_cover_letter)
  const canApply = readiness?.can_apply ?? false
  const reasonsNotReady = readiness?.reasons_not_ready || workflowState.blockers
  
  // State for provenance display
  const [showProvenance, setShowProvenance] = useState(false)
  
  // Extract provenance data from evidence_map if available
  const evidenceMapData = job.evidence_map as {
    bullet_provenance?: BulletProvenance[]
    paragraph_provenance?: ParagraphProvenance[]
    selected_evidence_ids?: string[]
    blocked_evidence?: { id: string; title: string; reason: string }[]
  } | null
  
  const bulletProvenance = evidenceMapData?.bullet_provenance || []
  const paragraphProvenance = evidenceMapData?.paragraph_provenance || []

  // Computed states
  const hasResume = !!job.generated_resume
  const hasCoverLetter = !!job.generated_cover_letter
  const hasScore = job.score !== null
  const isReadyToApply = status === "ready" || (hasResume && hasCoverLetter && hasScore)
  const hasError = status === "error"
  const needsReview = status === "needs_review"
  
  // Export readiness - block if critical quality issues exist
  const criticalIssueCount = (job.generation_quality_issues || []).filter(
    (issue: string) => issue.toLowerCase().includes("banned_phrase") || issue.toLowerCase().includes("critical")
  ).length
  const hasBlockingIssues = criticalIssueCount > 0 || !job.quality_passed

  const handleStatusChange = (newStatus: JobStatus) => {
    setStatus(newStatus)
    startTransition(async () => {
      const result = await updateJobStatus(job.id, newStatus)
      if (result.success) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`)
      } else {
        toast.error(result.error || "Failed to update status")
        setStatus(job.status)
      }
    })
  }

  const [retryCountdown, setRetryCountdown] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Run gap detection before generation
  const runGapDetection = async () => {
    setIsLoadingGaps(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      
      // Load user evidence and profile
      const [evidenceResult, profileResult] = await Promise.all([
        supabase.from("evidence_library").select("*").eq("is_active", true),
        supabase.from("user_profile").select("*").limit(1).maybeSingle()
      ])
      
      const evidence = evidenceResult.data || []
      const profile = profileResult.data
      
      // Run gap detection
      const result = detectGaps(
        {
          qualifications_required: job.qualifications_required || [],
          qualifications_preferred: job.qualifications_preferred || [],
          tech_stack: job.tech_stack || [],
          keywords: job.keywords || [],
          responsibilities: job.responsibilities || [],
          seniority_level: job.seniority_level,
          industry_guess: job.industry_guess,
        },
        evidence,
        profile ? {
          skills: profile.skills || [],
          experience: profile.experience || [],
        } : null,
        job.score_gaps || []
      )
      
      result.job_id = job.id
      setGapAnalysis(result)
      
      // Show Coach-gated flow for critical gaps, review for moderate gaps, direct for minimal
      if (result.critical_gaps.length > 0) {
        // Critical gaps: must go through Coach first
        setShowCoachGated(true)
      } else if (result.gaps.length > 2) {
        // Moderate gaps: show review with option to engage Coach
        setShowGapReview(true)
      } else {
        // Few/no gaps - proceed directly to generation
        handleGenerateMaterials()
      }
    } catch (error) {
      console.error("Gap detection error:", error)
      // On error, proceed to generation anyway
      handleGenerateMaterials()
    } finally {
      setIsLoadingGaps(false)
    }
  }

  const handleGenerateMaterials = async (templateId?: TemplateId) => {
    setIsGenerating(true)
    setGenerationError(null)
    
    // Use provided templateId or fall back to selected state
    const effectiveTemplateId = templateId || selectedTemplateId
    
    try {
      const response = await fetch("/api/generate-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          job_id: job.id,
          template_id: effectiveTemplateId,
          // Pass selected evidence if available from evidence_map
          selected_evidence_ids: job.evidence_map && typeof job.evidence_map === 'object' && 'selected_evidence_ids' in job.evidence_map
            ? job.evidence_map.selected_evidence_ids
            : undefined
        }),
      })
      const data = await response.json()
      
      if (data.success) {
        // Show strategy info in success message
        const strategyLabel = data.strategy === "direct_match" ? "Direct Match" :
          data.strategy === "adjacent_transition" ? "Adjacent Transition" :
          data.strategy === "stretch_honest" ? "Stretch Fit" : data.strategy
        
        // Check if quality passed and if auto-retry was needed
        const wasRetried = data.was_auto_retried
        const qualityPassed = data.quality_check?.passed
        
        toast.success(`Materials generated (${strategyLabel})`, {
          description: wasRetried 
            ? "Auto-improved after quality check" 
            : qualityPassed 
              ? "Quality checks passed"
              : `${data.quality_check?.issues?.banned_phrases?.length || 0} issues to review`
        })
        router.refresh()
      } else {
        // Convert technical errors to user-friendly messages
        const getUserFriendlyError = (error: string): { title: string; description: string } => {
          if (error?.includes("profile not found") || error?.includes("Profile not found")) {
            return {
              title: "Profile Required",
              description: "Please complete your profile before generating materials"
            }
          }
          if (error?.includes("evidence") && error?.includes("not found")) {
            return {
              title: "Add Some Evidence First",
              description: "Add work experience to your Evidence Library to generate tailored materials"
            }
          }
          if (error?.includes("Job not found")) {
            return {
              title: "Job Not Found",
              description: "This job may have been deleted"
            }
          }
          if (error?.includes("stretch") || error?.includes("blocked")) {
            return {
              title: "Generation Blocked",
              description: "This role is too much of a stretch based on your current evidence"
            }
          }
          // Default - don't show technical details
          return {
            title: "Generation Failed",
            description: "Something went wrong. Please try again or contact support."
          }
        }
        
        // Handle rate limit specially
        if (data.isRateLimit || response.status === 429) {
          const retryAfter = data.retryAfter || 30
          setRetryCountdown(retryAfter)
          setGenerationError("AI service is temporarily busy")
          
          // Start countdown
          const interval = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev <= 1) {
                clearInterval(interval)
                setGenerationError(null)
                return 0
              }
              return prev - 1
            })
          }, 1000)
          
          toast.error("AI service is busy", {
            description: `Please wait ${retryAfter} seconds before retrying`
          })
        } else if (data.strategy === "do_not_generate") {
          // Generation was blocked due to poor fit
          const friendly = getUserFriendlyError("blocked")
          setGenerationError(friendly.description)
          toast.error(friendly.title, {
            description: data.strategy_reasoning || friendly.description
          })
        } else {
          const friendly = getUserFriendlyError(data.error || "")
          setGenerationError(friendly.description)
          toast.error(friendly.title, {
            description: friendly.description
          })
        }
      }
    } catch (err) {
      setGenerationError("Something went wrong. Please try again.")
      toast.error("Connection Error", {
        description: "Please check your internet connection and try again"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyNow = async () => {
    // Gate check: must have quality passed (Red Team approval)
    if (!canApply) {
      toast.error("Cannot apply yet", {
        description: reasonsNotReady.length > 0 
          ? reasonsNotReady[0] 
          : "Complete Red Team review before applying"
      })
      return
    }
    
    // Copy resume to clipboard
    if (job.generated_resume) {
      navigator.clipboard.writeText(job.generated_resume)
      toast.success("Resume copied to clipboard!")
    }
    
    // Open job posting
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
    
    // Prompt user to confirm application
    setTimeout(() => {
      toast.info("Mark as applied when done", {
        action: {
          label: "Mark Applied",
          onClick: async () => {
            const result = await applyToJob(job.id, "manual")
            if (result.success) {
              toast.success("Marked as applied!")
              setStatus("applied")
              router.refresh()
            } else {
              toast.error(result.error || "Failed to mark as applied")
            }
          },
        },
      })
    }, 1000)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
        {job.source_url && (
          <Button variant="outline" size="sm" onClick={() => window.open(job.source_url!, "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Original
          </Button>
        )}
      </div>

      {/* Workflow Progress Bar - Semantic state visualization */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Workflow Progress
            </h3>
            <Badge variant="outline" className="text-xs">
              {STAGE_LABELS[currentStage]}
            </Badge>
          </div>
          
          {/* Stage progress dots */}
          <div className="flex items-center gap-1">
            {WORKFLOW_STAGES.slice(0, -1).map((stage, idx) => {
              const isComplete = idx < stageIndex
              const isCurrent = idx === stageIndex
              const isPending = idx > stageIndex
              
              return (
                <div key={stage} className="flex-1 flex items-center">
                  <div
                    className={`
                      flex-shrink-0 w-3 h-3 rounded-full transition-colors
                      ${isComplete ? "bg-green-500" : ""}
                      ${isCurrent ? "bg-primary ring-2 ring-primary/20" : ""}
                      ${isPending ? "bg-muted-foreground/30" : ""}
                    `}
                    title={`${STAGE_LABELS[stage]}: ${STAGE_DESCRIPTIONS[stage]}`}
                  />
                  {idx < WORKFLOW_STAGES.length - 2 && (
                    <div 
                      className={`
                        flex-1 h-0.5 mx-1
                        ${isComplete ? "bg-green-500" : "bg-muted-foreground/20"}
                      `}
                    />
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Stage labels (abbreviated) */}
          <div className="flex items-center gap-1 mt-1">
            {WORKFLOW_STAGES.slice(0, -1).map((stage, idx) => {
              const isCurrent = idx === stageIndex
              return (
                <div key={stage} className="flex-1">
                  <span 
                    className={`
                      text-[10px] truncate block
                      ${isCurrent ? "font-medium text-primary" : "text-muted-foreground"}
                    `}
                    title={STAGE_LABELS[stage]}
                  >
                    {STAGE_LABELS[stage].split(" ")[0]}
                  </span>
                </div>
              )
            })}
          </div>
          
          {/* Next action hint */}
          {workflowState.nextAction && !workflowState.isComplete && (
            <div className="mt-3 flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Next:</span>
                <span className="font-medium text-foreground">{workflowState.nextAction.description}</span>
              </div>
              <Button 
                size="sm" 
                variant={workflowState.nextAction.variant}
                asChild
              >
                <Link href={workflowState.nextAction.href}>
                  {workflowState.nextAction.label}
                </Link>
              </Button>
            </div>
          )}
          
          {/* Blockers */}
          {reasonsNotReady.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-amber-600">Attention needed:</span>
                  <ul className="mt-1 space-y-0.5">
                    {reasonsNotReady.map((blocker, idx) => (
                      <li key={idx} className="text-muted-foreground">{blocker}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Summary - Most important, at top */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1">
                {job.company}
              </p>
              <CardTitle className="text-2xl font-serif font-medium tracking-tight">
                {job.title}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                <FitBadge 
                  fit={job.fit} 
                  score={job.score} 
                  scoreReasoning={job.score_reasoning as {
                    fit_band?: string;
                    confidence?: string;
                    matched_requirements?: number;
                    total_requirements?: number;
                    score_explanation?: string;
                  } | null}
                />
                {job.role_family && (
                  <Badge variant="secondary">{job.role_family}</Badge>
                )}
                {job.seniority_level && (
                  <Badge variant="outline">{job.seniority_level}</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <StatusBadge status={status} />
              <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick facts row */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            {job.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{job.location}</span>
              </div>
            )}
            {job.salary_range && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                <span>{job.salary_range}</span>
              </div>
            )}
            {job.industry_guess && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>{job.industry_guess}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span suppressHydrationWarning>
                {job.created_at?.split("T")[0] || "Unknown"}
              </span>
            </div>
          </div>

          {/* Source & Parse Confidence Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="text-xs">
              Source: {job.source || "UNKNOWN"}
            </Badge>
            {job.source_url && (
              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                URL Analyzed
              </Badge>
            )}
            {job.raw_description && (
              <Badge variant="outline" className={`text-xs ${
                job.responsibilities?.length && job.qualifications_required?.length
                  ? "bg-green-50 border-green-200 text-green-700"
                  : job.responsibilities?.length || job.qualifications_required?.length
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                Parse: {
                  job.responsibilities?.length && job.qualifications_required?.length
                    ? "High"
                    : job.responsibilities?.length || job.qualifications_required?.length
                    ? "Medium"
                    : "Low"
                }
              </Badge>
            )}
            {!job.raw_description && !job.source_url && (
              <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                Manual Entry
              </Badge>
            )}
          </div>

          <Separator className="my-4" />

          {/* Decision blocks */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Why It Fits */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Why It Fits
              </h4>
              {job.score_strengths && job.score_strengths.length > 0 ? (
                <ul className="space-y-1">
                  {job.score_strengths.slice(0, 5).map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-600 mt-1">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Generate materials to see fit analysis</p>
              )}
            </div>

            {/* Main Gaps */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Main Gaps
              </h4>
              {job.score_gaps && job.score_gaps.length > 0 ? (
                <ul className="space-y-1">
                  {job.score_gaps.slice(0, 5).map((g, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-600 mt-1">-</span>
                      {g}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No significant gaps identified</p>
              )}
            </div>
          </div>

          {/* Explainable Score Breakdown - Show when v3.0 scoring is available */}
          {job.score_reasoning && (job.score_reasoning as { scoring_version?: string }).scoring_version === "3.0-explainable" && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Score Breakdown
                </h4>
                <p className="text-xs text-muted-foreground">
                  {(job.score_reasoning as { score_explanation?: string }).score_explanation}
                </p>
                
                {/* Dimension scores */}
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries((job.score_reasoning as { dimension_scores?: Record<string, number> }).dimension_scores || {}).map(([dim, score]) => (
                    <div key={dim} className="text-center">
                      <div className={`text-lg font-bold ${
                        Number(score) >= 70 ? "text-green-600" : 
                        Number(score) >= 40 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {Math.round(Number(score))}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{dim}</div>
                    </div>
                  ))}
                </div>
                
                {/* Warnings */}
                {(job.score_reasoning as { warnings?: string[] }).warnings?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {((job.score_reasoning as { warnings?: string[] }).warnings || []).map((warning, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator className="my-4" />

          {/* Pre-generation gap review */}
          {showGapReview && gapAnalysis && (
            <PreGenerationReview
              gapAnalysis={gapAnalysis}
              onContinueGenerate={() => {
                setShowGapReview(false)
                handleGenerateMaterials()
              }}
              onOpenCoach={(gap) => {
                setSelectedGapForCoach(gap || null)
                setShowGapClarification(true)
                setShowGapReview(false)
              }}
              onDismiss={() => setShowGapReview(false)}
              isGenerating={isGenerating}
              jobTitle={job.title}
              company={job.company_name}
            />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {!hasResume || !hasCoverLetter ? (
              <Button 
                onClick={() => runGapDetection()} 
                disabled={isGenerating || isLoadingGaps}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : isLoadingGaps ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Evidence...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate New Resume & Cover Letter
                  </>
                )}
              </Button>
            ) : hasBlockingIssues && hasResume ? (
              <Link href={`/jobs/${job.id}/red-team`}>
                <Button variant="destructive" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Fix {criticalIssueCount || "Quality"} Issues First
                </Button>
              </Link>
            ) : (
<Button onClick={handleApplyNow} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="mr-2 h-4 w-4" />
                Apply Now
              </Button>
              )}
              
              {/* Export Buttons */}
              {(hasResume || hasCoverLetter) && (
                <ExportButtons
                  jobId={job.id}
                  hasResume={hasResume}
                  hasCoverLetter={hasCoverLetter}
                  resumeText={job.generated_resume || undefined}
                  coverLetterText={job.generated_cover_letter || undefined}
                  candidateName={candidateName}
                  company={job.company}
                  role={job.title}
                />
              )}
              
              <Button variant="outline" onClick={() => handleStatusChange("archived")}>
              <Save className="mr-2 h-4 w-4" />
              Save for Later
            </Button>
            {hasResume && canGenerate && (
              <Button variant="outline" onClick={() => handleGenerateMaterials()} disabled={isGenerating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            )}
            
            {/* Interview Prep Button */}
            <Link href={`/jobs/${job.id}/interview-prep`}>
              <Button variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Interview Prep
              </Button>
            </Link>
            
            {/* Delete Button */}
            <DeleteJobDialog
              jobId={job.id}
              jobTitle={job.title}
              company={job.company}
              variant="button"
              redirectTo="/jobs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error/Warning Banners */}
      {hasError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Processing Error</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {job.error_message || "An error occurred during processing."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {needsReview && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-600">Needs Review</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Some data may need manual verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TruthSerum Workflow - Command Center */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                TruthSerum Workflow
              </CardTitle>
              <CardDescription>
                Complete each step to build an evidence-backed application
              </CardDescription>
            </div>
            {/* Strategy Badge */}
            {job.resume_strategy && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  job.resume_strategy === "direct_match" ? "border-green-500 text-green-700 bg-green-50" :
                  job.resume_strategy === "adjacent_transition" ? "border-blue-500 text-blue-700 bg-blue-50" :
                  job.resume_strategy === "stretch_honest" ? "border-amber-500 text-amber-700 bg-amber-50" :
                  "border-red-500 text-red-700 bg-red-50"
                }`}
              >
                {job.resume_strategy === "direct_match" ? "Direct Match" :
                 job.resume_strategy === "adjacent_transition" ? "Adjacent Transition" :
                 job.resume_strategy === "stretch_honest" ? "Stretch Fit" :
                 "Not Recommended"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategy Reasoning */}
          {job.score_reasoning && typeof job.score_reasoning === 'object' && 'strategy_reasoning' in job.score_reasoning && (
            <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Eye className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span><strong>Strategy:</strong> {String(job.score_reasoning.strategy_reasoning)}</span>
              </p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            {/* Evidence Match Step */}
            <Link href={`/jobs/${job.id}/evidence-match`}>
              <WorkflowStepCard
                step={1}
                title="Evidence Match"
                description="Map requirements to your verified evidence"
                status={
                  !job.evidence_map ? "not_started" :
                  (job.score_gaps?.length || 0) > (job.qualifications_required?.length || 1) * 0.3 ? "warning" :
                  "complete"
                }
                statusReason={
                  !job.evidence_map ? "No evidence mapped yet" :
                  (job.score_gaps?.length || 0) > 0 
                    ? `${Object.keys(job.evidence_map).length} mapped, ${job.score_gaps?.length || 0} gaps`
                    : `${Object.keys(job.evidence_map).length} requirements matched`
                }
                color="blue"
              />
            </Link>
            
            {/* Scoring Step */}
            <Link href={`/jobs/${job.id}/scoring`}>
              <WorkflowStepCard
                step={2}
                title="Scoring Center"
                description="Review detailed fit breakdown and decide"
                status={
                  job.score === null ? "not_started" :
                  job.score < 40 ? "blocked" :
                  job.score < 60 ? "warning" :
                  "complete"
                }
                statusReason={
                  job.score === null ? "Not scored yet" :
                  job.score < 40 ? `Score: ${job.score}/100 - Poor fit` :
                  job.score < 60 ? `Score: ${job.score}/100 - Stretch fit` :
                  `Score: ${job.score}/100 - Good fit`
                }
                color="green"
              />
            </Link>
            
            {/* Red Team Step */}
            <Link href={`/jobs/${job.id}/red-team`}>
              <WorkflowStepCard
                step={3}
                title="Red Team Review"
                description="Quality check before export"
                status={
                  !job.generated_resume ? "not_started" :
                  !job.quality_passed && (job.generation_quality_issues?.length || 0) > 0 ? "blocked" :
                  (job.generation_quality_issues?.length || 0) > 0 ? "warning" :
                  job.quality_passed ? "complete" :
                  "in_progress"
                }
                statusReason={
                  !job.generated_resume ? "Generate materials first" :
                  !job.quality_passed && (job.generation_quality_issues?.length || 0) > 0 
                    ? `${job.generation_quality_issues?.length} critical issues block export`
                    : (job.generation_quality_issues?.length || 0) > 0 
                    ? `${job.generation_quality_issues?.length} issues to review`
                    : job.quality_passed ? "Approved for export"
                    : "Run quality review"
                }
                color="red"
              />
            </Link>
            
            {/* Interview Prep Step */}
            <Link href={`/jobs/${job.id}/interview-prep`}>
              <WorkflowStepCard
                step={4}
                title="Interview Prep"
                description="Evidence-based interview coaching"
                status={
                  !hasResume ? "blocked" :
                  job.status === "ready" || job.status === "applied" || job.status === "interviewing" ? "not_started" :
                  "not_started"
                }
                statusReason={hasResume ? "Ready to generate prep" : "Generate materials first"}
                color="purple"
              />
            </Link>
          </div>

          {/* Quick Action */}
          {!job.evidence_map && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                <strong>Next:</strong> Start by mapping your evidence to job requirements
              </span>
              <Link href={`/jobs/${job.id}/evidence-match`} className="ml-auto">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Start Matching
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fit">Fit</TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="cover">Cover Letter</TabsTrigger>
          <TabsTrigger value="source">Source</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {job.responsibilities && job.responsibilities.length > 0 ? (
                  <ul className="space-y-2">
                    {job.responsibilities.map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">-</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No responsibilities extracted</p>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-dashed">
                      <strong>Why:</strong> {
                        !job.raw_description ? "No job description available. Try re-analyzing the URL or adding manually." :
                        job.source === "LINKEDIN" ? "LinkedIn blocks detailed parsing. Responsibilities may be in the raw description." :
                        "The job posting format may not have clear responsibility sections."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {job.qualifications_required && job.qualifications_required.length > 0 ? (
                  <ul className="space-y-2">
                    {job.qualifications_required.map((q, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">-</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No requirements extracted</p>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-dashed">
                      <strong>Why:</strong> {
                        !job.raw_description ? "No job description available. Try re-analyzing the URL or adding manually." :
                        job.source === "LINKEDIN" ? "LinkedIn blocks detailed parsing. Requirements may be in the raw description." :
                        "The job posting may not have a distinct requirements section, or parsing confidence was low."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Keywords */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">ATS Keywords</CardTitle>
                <CardDescription>Important phrases to include in your application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.ats_keywords && job.ats_keywords.length > 0 ? (
                    job.ats_keywords.map((k, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {k}
                      </Badge>
                    ))
                  ) : job.keywords_extracted && job.keywords_extracted.length > 0 ? (
                    (job.keywords_extracted as string[]).map((k: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {k}
                      </Badge>
                    ))
                  ) : (
                    <div className="space-y-2 w-full">
                      <p className="text-sm text-muted-foreground">No keywords extracted</p>
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-dashed">
                        <strong>Why:</strong> {
                          !job.raw_description ? "No job description available to extract keywords from." :
                          job.source === "LINKEDIN" ? "LinkedIn parsing may limit keyword extraction. Check raw description." :
                          "Keyword extraction requires a text-rich job description with technical terms."
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fit Tab */}
        <TabsContent value="fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fit Analysis</CardTitle>
              <CardDescription>How well this role aligns with your evidence library</CardDescription>
            </CardHeader>
            <CardContent>
              {hasScore ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">{job.score}</div>
                      <p className="text-sm text-muted-foreground mt-1">Fit Score</p>
                    </div>
                    <div className="flex-1">
                      <FitBadge fit={job.fit} score={null} />
                      <p className="text-sm text-muted-foreground mt-2">
                        {job.fit && FIT_CONFIG[job.fit]?.description}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Strengths */}
                    <div>
                      <h4 className="font-medium mb-3 text-green-700">Matched Strengths</h4>
                      {job.score_strengths && job.score_strengths.length > 0 ? (
                        <ul className="space-y-2">
                          {job.score_strengths.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No strengths identified</p>
                      )}
                    </div>

                    {/* Gaps */}
                    <div>
                      <h4 className="font-medium mb-3 text-amber-700">Areas to Address</h4>
                      {job.score_gaps && job.score_gaps.length > 0 ? (
                        <ul className="space-y-2">
                          {job.score_gaps.map((g, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No significant gaps</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No fit analysis yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate materials to see detailed fit analysis
                  </p>
                  <Button onClick={() => handleGenerateMaterials()} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate Materials"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resume Tab */}
        <TabsContent value="resume">
          {/* Generation Status Banner */}
          <GenerationStatusBanner
            status={job.generation_status}
            error={generationError ?? job.generation_error}
            attempts={job.generation_attempts}
            onRetry={() => handleGenerateMaterials()}
            isRetrying={isGenerating}
            retryCountdown={retryCountdown}
          />
          
          {hasResume ? (
            /* Post-Generation: Show resume with template switcher */
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Tailored Resume</CardTitle>
                    <CardDescription>
                      Using <strong>{TEMPLATE_CONFIGS[selectedTemplateId]?.label}</strong> template
                    </CardDescription>
                  </div>
                  <ResumeActionsBar
                    jobId={job.id}
                    resumeText={job.generated_resume || undefined}
                    currentTemplateId={selectedTemplateId}
                    onChangeTemplate={setSelectedTemplateId}
                    candidateName={candidateName}
                    company={job.company}
                    role={job.title}
                    targetIndustry={job.industry_guess}
                    targetRole={job.title}
                    seniorityLevel={job.seniority_level}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ResumeWithProvenance
                  resumeText={job.generated_resume || ""}
                  bulletProvenance={bulletProvenance}
                  showProvenance={showProvenance}
                  onToggleProvenance={setShowProvenance}
                />
              </CardContent>
            </Card>
          ) : (
            /* Pre-Generation: Show template picker */
            <div className="mt-4">
              <ResumeTemplatePicker
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={setSelectedTemplateId}
                onGenerate={handleGenerateMaterials}
                isGenerating={isGenerating}
                targetIndustry={job.industry_guess}
                targetRole={job.title}
                seniorityLevel={job.seniority_level}
                previewData={{ name: candidateName, title: job.title }}
                hasExistingResume={false}
              />
            </div>
          )}
        </TabsContent>

        {/* Cover Letter Tab */}
        <TabsContent value="cover">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Tailored Cover Letter</CardTitle>
                  <CardDescription>Personalized for this company and role</CardDescription>
                </div>
                {hasCoverLetter && (
                  <ExportButtons
                    jobId={job.id}
                    hasResume={false}
                    hasCoverLetter={hasCoverLetter}
                    coverLetterText={job.generated_cover_letter || undefined}
                    candidateName={candidateName}
                    company={job.company}
                    role={job.title}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
          {hasCoverLetter ? (
          <CoverLetterWithProvenance
            coverLetterText={job.generated_cover_letter || ""}
            paragraphProvenance={paragraphProvenance}
            showProvenance={showProvenance}
            onToggleProvenance={setShowProvenance}
          />
          ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No cover letter generated yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click below to generate a tailored cover letter
                  </p>
                  <Button onClick={handleGenerateMaterials} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate Cover Letter"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Tab */}
        <TabsContent value="source">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Original Job Posting
              </CardTitle>
              <CardDescription>Raw content from the job listing</CardDescription>
            </CardHeader>
            <CardContent>
              {job.raw_description ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
                    {job.raw_description}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No raw description available</p>
                  {job.source_url && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.open(job.source_url!, "_blank")}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Original Posting
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Gap Clarification Modal */}
      {gapAnalysis && (
        <GapClarificationModal
          open={showGapClarification}
          onClose={() => setShowGapClarification(false)}
          gapAnalysis={gapAnalysis}
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          onComplete={(clarifications) => {
            setPendingClarifications(clarifications)
            // After clarification, trigger generation with the new context
            handleGenerateMaterials()
          }}
        />
      )}

      {/* Coach-Gated Generation Modal - for critical gaps */}
      {gapAnalysis && (
        <CoachGatedGeneration
          open={showCoachGated}
          onClose={() => setShowCoachGated(false)}
          gapAnalysis={gapAnalysis}
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          score={job.score}
          onGenerateUnlocked={() => {
            setShowCoachGated(false)
            handleGenerateMaterials()
          }}
        />
      )}
    </div>
  )
}
