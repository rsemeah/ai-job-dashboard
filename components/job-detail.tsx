"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Job, JobStatus, STATUS_CONFIG, WORKFLOW_STEPS } from "@/lib/types"
import { updateJobStatus } from "@/lib/actions/jobs"
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
  CheckCircle2,
  Send,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Loader2,
  Copy,
  Mail,
  AlertCircle,
  Clock,
  MapPin,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"

// Canonical statuses from n8n model
const ALL_STATUSES: JobStatus[] = [
  "submitted",
  "fetching",
  "parsing",
  "parsed",
  "parsed_partial",
  "duplicate",
  "scoring",
  "scored",
  "below_threshold",
  "generating_documents",
  "manual_review_required",
  "ready",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "declined",
  "archived",
  "error",
]

// Workflow stages for progress indicator (groups related statuses)
const WORKFLOW_DISPLAY = [
  { statuses: ["submitted", "fetching", "parsing"], label: "Submitted" },
  { statuses: ["parsed", "parsed_partial"], label: "Parsed" },
  { statuses: ["scoring", "scored", "below_threshold"], label: "Scored" },
  { statuses: ["generating_documents", "ready", "manual_review_required"], label: "Ready" },
  { statuses: ["applied", "interviewing", "offered"], label: "Applied" },
]

// Helper to find which stage a status belongs to
function getStageIndex(status: JobStatus): number {
  const idx = WORKFLOW_DISPLAY.findIndex(stage => stage.statuses.includes(status))
  return idx >= 0 ? idx : 0
}

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  const router = useRouter()
  const [status, setStatus] = useState<JobStatus>(job.status)
  const [isPending, startTransition] = useTransition()

  // Computed states
  const hasResume = !!job.generated_resume
  const hasCoverLetter = !!job.generated_cover_letter
  const hasScore = job.score !== null
  const isReadyToApply = status === "ready" || (hasResume && hasCoverLetter && hasScore)
  const isProcessing = ["submitted", "fetching", "parsing", "scoring", "generating_documents"].includes(status)
  const hasError = status === "error"
  const needsReview = status === "manual_review_required" || status === "parsed_partial"
  const isBelowThreshold = status === "below_threshold"
  const isDuplicate = status === "duplicate"

  const handleStatusChange = (newStatus: JobStatus) => {
    setStatus(newStatus)
    startTransition(async () => {
      const result = await updateJobStatus(job.id, newStatus)
      if (result.success) {
        toast.success(`Status updated to ${newStatus}`)
      } else {
        toast.error(result.error || "Failed to update status")
        setStatus(job.status)
      }
    })
  }

  const handleMarkApplied = () => {
    handleStatusChange("applied")
  }

  const handleOpenJob = () => {
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
  }

  const handleApplyNow = () => {
    // Copy resume to clipboard and open job URL
    if (job.generated_resume) {
      navigator.clipboard.writeText(job.generated_resume)
      toast.success("Resume copied to clipboard!")
    }
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
    // Prompt to mark as applied
    setTimeout(() => {
      toast.info("Don't forget to mark as applied when done!", {
        action: {
          label: "Mark Applied",
          onClick: handleMarkApplied,
        },
      })
    }, 1000)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  // Get current step index for progress using the helper
  const progressIndex = getStageIndex(status)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
      </Button>

      {/* Workflow Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {WORKFLOW_DISPLAY.map((step, index) => {
              const isComplete = index < progressIndex
              const isCurrent = index === progressIndex
              const isPast = index <= progressIndex

              return (
                <div key={step.label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        isComplete
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-muted border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent && isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1 text-xs ${
                        isPast ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < WORKFLOW_DISPLAY.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        index < progressIndex ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {hasError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Processing Error</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {job.error_message || "An error occurred during processing."}
                </p>
                {job.error_step && (
                  <p className="text-xs text-muted-foreground mt-1">Failed at: {job.error_step}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Banner */}
      {isDuplicate && (
        <Card className="border-gray-500/50 bg-gray-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-600">Duplicate Job</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  This job appears to be a duplicate of an existing entry.
                </p>
                {job.duplicate_of_job_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    See original: {job.duplicate_of_job_id}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Review Required Banner */}
      {needsReview && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-600">Manual Review Required</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {status === "parsed_partial" 
                    ? "Some job details could not be extracted automatically."
                    : "This job requires manual review before proceeding."}
                </p>
                {job.parse_missing_fields && job.parse_missing_fields.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Missing: {job.parse_missing_fields.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Below Threshold Banner */}
      {isBelowThreshold && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-600">Below Apply Threshold</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  This job scored below your configured apply threshold. 
                  Review the scoring details to decide if you want to apply anyway.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to Apply Banner */}
      {isReadyToApply && status !== "applied" && !needsReview && !isBelowThreshold && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <h4 className="font-medium">Ready to Apply</h4>
                  <p className="text-sm text-muted-foreground">
                    All materials are ready. Click to apply!
                  </p>
                </div>
              </div>
              <Button onClick={handleApplyNow} className="bg-green-600 hover:bg-green-700">
                <Send className="mr-2 h-4 w-4" />
                Apply Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{job.company}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SourceBadge source={job.source} />
                  {!hasScore && <Badge variant="outline">Unscored</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                {job.location && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.salary_range && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>{job.salary_range}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FitBadge fit={job.fit} />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="description" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="cover">Cover Letter</TabsTrigger>
            </TabsList>

            <TabsContent value="description">
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {job.raw_description ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {job.raw_description}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No description available yet.</p>
                      <p className="text-sm">n8n will populate this after parsing.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scoring">
              <Card>
                <CardHeader>
                  <CardTitle>Scoring Analysis</CardTitle>
                  <CardDescription>AI-generated fit assessment from n8n</CardDescription>
                </CardHeader>
                <CardContent>
                  {hasScore ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold">
                            <ScoreBadge score={job.score} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">out of 100</p>
                        </div>
                        <div>
                          <FitBadge fit={job.fit} />
                          {job.scored_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Scored {new Date(job.scored_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {job.score_strengths && job.score_strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-green-600">Strengths</h4>
                          <ul className="space-y-1">
                            {job.score_strengths.map((s, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {job.score_gaps && job.score_gaps.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-amber-600">Gaps</h4>
                          <ul className="space-y-1">
                            {job.score_gaps.map((g, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Pending Score</p>
                      <p className="text-sm text-muted-foreground">
                        n8n workflow will score this job automatically.
                      </p>
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
                      <CardTitle>Tailored Resume</CardTitle>
                      <CardDescription>Generated by n8n workflow</CardDescription>
                    </div>
                    {hasResume && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(job.generated_resume!, "Resume")}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasResume ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                        {job.generated_resume}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No resume generated yet.</p>
                      <p className="text-sm text-muted-foreground">
                        n8n will generate this after scoring.
                      </p>
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
                      <CardTitle>Cover Letter</CardTitle>
                      <CardDescription>Personalized for this application</CardDescription>
                    </div>
                    {hasCoverLetter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(job.generated_cover_letter!, "Cover letter")}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasCoverLetter ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {job.generated_cover_letter}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No cover letter generated yet.</p>
                      <p className="text-sm text-muted-foreground">
                        n8n will generate this after scoring.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Score Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fit Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  <ScoreBadge score={job.score} />
                </div>
                <FitBadge fit={job.fit} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.source_url && (
                <Button className="w-full justify-start" variant="outline" onClick={handleOpenJob}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Original Posting
                </Button>
              )}

              <Separator />

              <Button
                className="w-full justify-start"
                variant={status === "applied" ? "secondary" : "default"}
                onClick={handleMarkApplied}
                disabled={status === "applied" || isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {status === "applied" ? "Already Applied" : "Mark Applied"}
              </Button>

              {isReadyToApply && status !== "applied" && (
                <Button
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                  onClick={handleApplyNow}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Apply Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
              {job.parsed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parsed</span>
                  <span>{new Date(job.parsed_at).toLocaleDateString()}</span>
                </div>
              )}
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
