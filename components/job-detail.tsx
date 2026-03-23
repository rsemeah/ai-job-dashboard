"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import type { Job, JobStatus } from "@/lib/types"
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
  CheckCircle,
  Send,
  XCircle,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Loader2,
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

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  const [status, setStatus] = useState<JobStatus>(job.status)
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (newStatus: JobStatus) => {
    setStatus(newStatus)
    startTransition(async () => {
      const result = await updateJobStatus(job.id, newStatus)
      if (result.success) {
        toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`)
      } else {
        toast.error(result.error || "Failed to update status")
        setStatus(job.status) // Revert on error
      }
    })
  }

  const handleMarkApplied = () => {
    handleStatusChange("APPLIED")
  }

  const handleOpenJob = () => {
    if (job.source_url) {
      window.open(job.source_url, "_blank")
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
      </Button>

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
                  <FitBadge fit={job.fit || "UNSCORED"} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="text-lg"><ScoreBadge score={job.score} /></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(job.created_at).toLocaleDateString()}
                </div>
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
                <StatusBadge status={status} />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="description" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
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
                        No description available for this job.
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scoring">
              <Card>
                <CardHeader>
                  <CardTitle>Scoring Analysis</CardTitle>
                  <CardDescription>
                    AI-generated fit assessment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    {job.score !== null ? (
                      <>
                        <div className="text-4xl font-bold">{job.score}</div>
                        <div>
                          <p className="font-medium">Fit Score</p>
                          <p className="text-sm text-muted-foreground">out of 100</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="text-4xl font-bold opacity-30">--</div>
                        <div>
                          <p className="font-medium">Pending Score</p>
                          <p className="text-sm">Awaiting workflow processing</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {job.score !== null && (
                    <>
                      {job.score_reasoning && (
                        <div>
                          <h4 className="font-medium mb-2">Reasoning</h4>
                          <p className="text-sm text-muted-foreground">
                            {typeof job.score_reasoning === "object" 
                              ? (job.score_reasoning as Record<string, unknown>).overall as string || JSON.stringify(job.score_reasoning)
                              : String(job.score_reasoning)}
                          </p>
                        </div>
                      )}

                      {job.score_strengths && job.score_strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Strengths
                          </h4>
                          <ul className="space-y-2">
                            {job.score_strengths.map((strength, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {job.score_gaps && job.score_gaps.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-amber-500" />
                            Gaps
                          </h4>
                          <ul className="space-y-2">
                            {job.score_gaps.map((gap, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <XCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {job.keywords_extracted && job.keywords_extracted.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.keywords_extracted.map((keyword, idx) => (
                              <Badge key={idx} variant="secondary">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.source_url && (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleOpenJob}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Job Link
                </Button>
              )}

              <Separator />

              <Button
                className="w-full justify-start"
                variant="default"
                onClick={handleMarkApplied}
                disabled={status === "APPLIED" || isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Mark Applied
              </Button>

              <Button
                className="w-full justify-start"
                variant="secondary"
                disabled
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Resume
                <Badge variant="outline" className="ml-auto text-xs">
                  Coming Soon
                </Badge>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
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
