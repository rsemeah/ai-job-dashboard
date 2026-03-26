"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Job, JobStatus, JobFit, RoleFamily } from "@/lib/types"
import { STATUS_CONFIG, FIT_CONFIG, ROLE_FAMILIES } from "@/lib/types"
import { updateJobStatus } from "@/lib/actions/jobs"
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
} from "lucide-react"
import { toast } from "sonner"

// Available status transitions
const STATUS_OPTIONS: JobStatus[] = [
  "NEW",
  "REVIEWING",
  "SCORED",
  "READY",
  "APPLIED",
  "INTERVIEWING",
  "OFFERED",
  "REJECTED",
  "DECLINED",
  "ARCHIVED",
  "NEEDS_REVIEW",
]

interface JobDetailProps {
  job: Job
}

// Fit badge component with proper styling
function FitBadge({ fit, score }: { fit: JobFit; score: number | null }) {
  if (!fit) return <Badge variant="outline" className="text-xs">Unscored</Badge>
  
  const config = FIT_CONFIG[fit]
  const colorClasses = {
    HIGH: "bg-green-100 text-green-800 border-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    LOW: "bg-red-100 text-red-800 border-red-200",
  }
  
  return (
    <Badge className={`${colorClasses[fit]} border`}>
      {config.label} {score ? `(${score})` : ""}
    </Badge>
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

export function JobDetail({ job }: JobDetailProps) {
  const router = useRouter()
  const [status, setStatus] = useState<JobStatus>(job.status)
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)

  // Computed states
  const hasResume = !!job.generated_resume
  const hasCoverLetter = !!job.generated_cover_letter
  const hasScore = job.score !== null
  const isReadyToApply = status === "READY" || (hasResume && hasCoverLetter && hasScore)
  const hasError = status === "ERROR"
  const needsReview = status === "NEEDS_REVIEW"

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

  const handleGenerateMaterials = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Materials generated successfully")
        router.refresh()
      } else {
        toast.error(data.error || "Failed to generate materials")
      }
    } catch {
      toast.error("Failed to generate materials")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyNow = () => {
    if (job.generated_resume) {
      navigator.clipboard.writeText(job.generated_resume)
      toast.success("Resume copied to clipboard!")
    }
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
    setTimeout(() => {
      toast.info("Mark as applied when done", {
        action: {
          label: "Mark Applied",
          onClick: () => handleStatusChange("APPLIED"),
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
                <FitBadge fit={job.fit} score={job.score} />
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
              <span>{new Date(job.created_at).toLocaleDateString()}</span>
            </div>
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

          <Separator className="my-4" />

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {!hasResume || !hasCoverLetter ? (
              <Button 
                onClick={handleGenerateMaterials} 
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate Materials
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleApplyNow} className="bg-primary hover:bg-primary/90">
                <Send className="mr-2 h-4 w-4" />
                Apply Now
              </Button>
            )}
            <Button variant="outline" onClick={() => handleStatusChange("ARCHIVED")}>
              <Save className="mr-2 h-4 w-4" />
              Save for Later
            </Button>
            {hasResume && (
              <Button variant="outline" onClick={handleGenerateMaterials} disabled={isGenerating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            )}
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
                  <p className="text-sm text-muted-foreground">No responsibilities extracted</p>
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
                  <p className="text-sm text-muted-foreground">No requirements extracted</p>
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
                    <p className="text-sm text-muted-foreground">No keywords extracted</p>
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
                  <Button onClick={handleGenerateMaterials} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate Materials"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resume Tab */}
        <TabsContent value="resume">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Tailored Resume</CardTitle>
                  <CardDescription>ATS-optimized for this specific role</CardDescription>
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
                <ScrollArea className="h-[500px] pr-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                    {job.generated_resume}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No resume generated yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click below to generate a tailored resume
                  </p>
                  <Button onClick={handleGenerateMaterials} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate Resume"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
                <ScrollArea className="h-[500px] pr-4">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {job.generated_cover_letter}
                  </div>
                </ScrollArea>
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
    </div>
  )
}
