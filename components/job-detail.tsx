"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Job, JobStatus } from "@/lib/types"
import { updateJobStatus } from "@/lib/actions/jobs"
import { generateResume, generateCoverLetter, scoreJob } from "@/lib/actions/ai"
import { StatusBadge, FitBadge, SourceBadge, ScoreBadge } from "@/components/status-badge"
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
  CheckCircle,
  CheckCircle2,
  Send,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  FileText,
  Loader2,
  Sparkles,
  Copy,
  Mail,
  Target,
  RotateCcw,
  AlertCircle,
  Rocket,
} from "lucide-react"
import { toast } from "sonner"

const ALL_STATUSES: JobStatus[] = [
  "NEW",
  "SCORED",
  "READY_TO_APPLY",
  "APPLIED",
  "REJECTED",
  "INTERVIEW",
  "OFFER",
  "ARCHIVED",
]

// Workflow step definitions
const WORKFLOW_STEPS = [
  { status: "NEW", label: "New", description: "Job added" },
  { status: "SCORED", label: "Scored", description: "AI analyzed" },
  { status: "READY_TO_APPLY", label: "Ready", description: "Materials ready" },
  { status: "APPLIED", label: "Applied", description: "Application sent" },
  { status: "INTERVIEW", label: "Interview", description: "In progress" },
  { status: "OFFER", label: "Offer", description: "Decision time" },
]

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  const router = useRouter()
  const [status, setStatus] = useState<JobStatus>(job.status)
  const [isPending, startTransition] = useTransition()
  
  // AI generation state - initialize with cached values from database
  const [generatedResume, setGeneratedResume] = useState<string | null>(job.generated_resume || null)
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(job.generated_cover_letter || null)
  const [isGeneratingResume, setIsGeneratingResume] = useState(false)
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [localScore, setLocalScore] = useState(job.score)
  const [localFit, setLocalFit] = useState(job.fit)
  const [localStrengths, setLocalStrengths] = useState(job.score_strengths || [])
  const [localGaps, setLocalGaps] = useState(job.score_gaps || [])

  // Computed states
  const hasResume = !!generatedResume
  const hasCoverLetter = !!generatedCoverLetter
  const hasScore = localScore !== null
  const isReadyToApply = hasResume && hasCoverLetter && hasScore
  const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.status === status)

  const handleStatusChange = (newStatus: JobStatus) => {
    setStatus(newStatus)
    startTransition(async () => {
      const result = await updateJobStatus(job.id, newStatus)
      if (result.success) {
        toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`)
      } else {
        toast.error(result.error || "Failed to update status")
        setStatus(job.status)
      }
    })
  }

  const handleOpenJob = () => {
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
  }

  // Full auto-process: score + generate all materials
  const handleFullProcess = async () => {
    setIsProcessing(true)
    toast.info("Starting full AI processing...")
    
    try {
      const response = await fetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setLocalScore(result.score)
        setLocalFit(result.fit)
        
        // Refresh the page to get updated data
        router.refresh()
        
        toast.success("Processing complete!", {
          description: `Score: ${result.score}/100. Materials generated.`,
        })
        
        // Update local state
        if (result.score >= 60) {
          setStatus("READY_TO_APPLY")
        } else {
          setStatus("SCORED")
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Processing failed")
      }
    } catch (error) {
      toast.error("Failed to process job")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateResume = async () => {
    setIsGeneratingResume(true)
    try {
      const result = await generateResume(job)
      if (result.success) {
        setGeneratedResume(result.resume)
        toast.success("Resume generated!")
      } else {
        toast.error(result.error || "Failed to generate resume")
      }
    } catch (error) {
      toast.error("Failed to generate resume")
    } finally {
      setIsGeneratingResume(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    setIsGeneratingCoverLetter(true)
    try {
      const result = await generateCoverLetter(job)
      if (result.success) {
        setGeneratedCoverLetter(result.coverLetter)
        toast.success("Cover letter generated!")
      } else {
        toast.error(result.error || "Failed to generate cover letter")
      }
    } catch (error) {
      toast.error("Failed to generate cover letter")
    } finally {
      setIsGeneratingCoverLetter(false)
    }
  }

  const handleScoreJob = async () => {
    setIsScoring(true)
    try {
      const result = await scoreJob(job)
      if (result.success) {
        setLocalScore(result.score)
        setLocalFit(result.fit)
        setLocalStrengths(result.strengths)
        setLocalGaps(result.gaps)
        toast.success(`Scored: ${result.score}/100 (${result.fit} fit)`)
      } else {
        toast.error(result.error || "Failed to score job")
      }
    } catch (error) {
      toast.error("Failed to score job")
    } finally {
      setIsScoring(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  // One-click apply: Copy materials and open job
  const handleOneClickApply = () => {
    // Copy resume to clipboard
    if (generatedResume) {
      navigator.clipboard.writeText(generatedResume)
    }
    
    // Open job in new tab
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
    
    toast.success("Resume copied! Opening job posting...", {
      description: "Paste your resume in the application form.",
    })
  }

  // Mark as applied and record timestamp
  const handleMarkApplied = () => {
    handleStatusChange("APPLIED")
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
        
        {/* Quick Status Indicator */}
        <div className="flex items-center gap-2">
          {isReadyToApply && status !== "APPLIED" && (
            <Badge variant="default" className="bg-emerald-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Ready to Apply
            </Badge>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, index) => {
              const isComplete = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const isPending = index > currentStepIndex
              
              return (
                <div key={step.status} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                      isComplete ? "bg-emerald-500 text-white" :
                      isCurrent ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? "font-medium" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div className={`h-0.5 w-8 mx-2 ${
                      isComplete ? "bg-emerald-500" : "bg-muted"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Banner - Context-aware CTA */}
      {status === "NEW" && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Process this job with AI</p>
                <p className="text-sm text-muted-foreground">
                  Score fit, generate resume and cover letter in one click
                </p>
              </div>
            </div>
            <Button onClick={handleFullProcess} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Process Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {(status === "SCORED" || status === "READY_TO_APPLY") && !hasResume && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Materials needed</p>
                <p className="text-sm text-muted-foreground">
                  Generate resume and cover letter to apply
                </p>
              </div>
            </div>
            <Button onClick={handleFullProcess} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Materials
            </Button>
          </CardContent>
        </Card>
      )}

      {isReadyToApply && status !== "APPLIED" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Rocket className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-medium">Ready to apply!</p>
                <p className="text-sm text-muted-foreground">
                  Resume and cover letter are ready. Click to copy and open job posting.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleOneClickApply}>
                <Copy className="mr-2 h-4 w-4" />
                Copy & Open
              </Button>
              <Button onClick={handleMarkApplied} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Mark Applied
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    {job.company}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SourceBadge source={job.source} />
                  <FitBadge fit={localFit || "UNSCORED"} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="text-lg"><ScoreBadge score={localScore} /></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(job.created_at).toLocaleDateString()}
                </div>
                {job.source_url && (
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={handleOpenJob}>
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View Original
                  </Button>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Select 
                    value={status} 
                    onValueChange={(v) => handleStatusChange(v as JobStatus)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue={hasResume ? "resume" : "description"} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="scoring" className="relative">
                Scoring
                {hasScore && <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full" />}
              </TabsTrigger>
              <TabsTrigger value="resume" className="relative">
                Resume
                {hasResume && <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full" />}
              </TabsTrigger>
              <TabsTrigger value="cover" className="relative">
                Cover Letter
                {hasCoverLetter && <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description">
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {job.raw_description ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {job.raw_description}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No description available for this job.</p>
                        <p className="text-sm mt-2">The description may be fetched when processing.</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scoring">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Scoring Analysis</CardTitle>
                      <CardDescription>AI-generated fit assessment</CardDescription>
                    </div>
                    {!hasScore && (
                      <Button onClick={handleScoreJob} disabled={isScoring}>
                        {isScoring ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Target className="mr-2 h-4 w-4" />
                        )}
                        Score Now
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {hasScore ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold">{localScore}</div>
                        <div>
                          <p className="font-medium">Fit Score</p>
                          <p className="text-sm text-muted-foreground">out of 100</p>
                        </div>
                        <FitBadge fit={localFit || "MEDIUM"} />
                      </div>

                      {localStrengths && localStrengths.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Strengths
                          </h4>
                          <ul className="space-y-2">
                            {localStrengths.map((strength, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {localGaps && localGaps.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-amber-500" />
                            Gaps to Address
                          </h4>
                          <ul className="space-y-2">
                            {localGaps.map((gap, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <XCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button variant="outline" size="sm" onClick={handleScoreJob} disabled={isScoring}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Re-score
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        Score this job to see how well it matches your profile
                      </p>
                      <Button onClick={handleScoreJob} disabled={isScoring}>
                        {isScoring ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Target className="mr-2 h-4 w-4" />
                            Score Job Fit
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Generated Resume</CardTitle>
                      <CardDescription>AI-tailored resume for this position</CardDescription>
                    </div>
                    {hasResume && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedResume!, "Resume")}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateResume}
                          disabled={isGeneratingResume}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Regenerate
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasResume ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                        {generatedResume}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        Generate a tailored resume for this job
                      </p>
                      <Button onClick={handleGenerateResume} disabled={isGeneratingResume}>
                        {isGeneratingResume ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Resume
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cover">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Generated Cover Letter</CardTitle>
                      <CardDescription>Personalized cover letter for this application</CardDescription>
                    </div>
                    {hasCoverLetter && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedCoverLetter!, "Cover Letter")}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateCoverLetter}
                          disabled={isGeneratingCoverLetter}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Regenerate
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasCoverLetter ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {generatedCoverLetter}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        Generate a personalized cover letter
                      </p>
                      <Button onClick={handleGenerateCoverLetter} disabled={isGeneratingCoverLetter}>
                        {isGeneratingCoverLetter ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Cover Letter
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Actions & Status */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Primary CTA based on state */}
              {status === "NEW" && (
                <Button
                  className="w-full"
                  onClick={handleFullProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Process with AI
                </Button>
              )}

              {isReadyToApply && status !== "APPLIED" && (
                <>
                  <Button className="w-full" onClick={handleOneClickApply}>
                    <Rocket className="mr-2 h-4 w-4" />
                    Apply Now
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleMarkApplied}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Applied
                  </Button>
                </>
              )}

              {status === "APPLIED" && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleStatusChange("INTERVIEW")}
                  disabled={isPending}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Got Interview
                </Button>
              )}

              <Separator />

              {/* Secondary actions */}
              {job.source_url && (
                <Button className="w-full justify-start" variant="ghost" onClick={handleOpenJob}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original Posting
                </Button>
              )}

              {hasResume && (
                <Button
                  className="w-full justify-start"
                  variant="ghost"
                  onClick={() => copyToClipboard(generatedResume!, "Resume")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Resume
                </Button>
              )}

              {hasCoverLetter && (
                <Button
                  className="w-full justify-start"
                  variant="ghost"
                  onClick={() => copyToClipboard(generatedCoverLetter!, "Cover Letter")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Cover Letter
                </Button>
              )}

              <Separator />

              <Button
                className="w-full justify-start"
                variant="ghost"
                onClick={() => handleStatusChange("ARCHIVED")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Archive Job
              </Button>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Application Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {hasScore ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={hasScore ? "" : "text-muted-foreground"}>Job scored</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {hasResume ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={hasResume ? "" : "text-muted-foreground"}>Resume generated</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {hasCoverLetter ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={hasCoverLetter ? "" : "text-muted-foreground"}>Cover letter generated</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {status === "APPLIED" || status === "INTERVIEW" || status === "OFFER" ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={status === "APPLIED" ? "" : "text-muted-foreground"}>Application submitted</span>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span>{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
              {job.scored_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scored</span>
                  <span>{new Date(job.scored_at).toLocaleDateString()}</span>
                </div>
              )}
              {job.applied_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied</span>
                  <span>{new Date(job.applied_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
