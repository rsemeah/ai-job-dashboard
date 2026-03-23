import { getJobById } from "@/lib/actions/jobs"
import { JobDetail } from "@/components/job-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  const job = await getJobById(id)

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Job not found</h2>
        <p className="text-muted-foreground">This job may have been deleted or doesn&apos;t exist.</p>
        <Button variant="outline" asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>
    )
  }

  return <JobDetail job={job} />
  const { documents, application, logs, ...job } = jobData

  const resumeDoc = documents.find(d => d.doc_type === "RESUME")
  const coverLetterDoc = documents.find(d => d.doc_type === "COVER_LETTER")
  const answersDoc = documents.find(d => d.doc_type === "APPLICATION_ANSWERS")

  const handleStatusChange = (newStatus: JobStatus) => {
    setStatus(newStatus)
    toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`)
  }

  const handleApprove = () => {
    setStatus("READY_TO_APPLY")
    toast.success("Job approved and moved to Ready Queue")
  }

  const handleMarkApplied = () => {
    setStatus("APPLIED")
    toast.success("Job marked as applied")
  }

  const handleReject = () => {
    setStatus("REJECTED")
    toast.success("Job rejected")
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
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
                  <FitBadge fit={job.fit} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                {job.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                    {job.is_remote && <Badge variant="secondary">Remote</Badge>}
                  </div>
                )}
                {job.salary_range && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    {job.salary_range}
                  </div>
                )}
                {job.score !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-mono font-bold text-lg">{job.score}</span>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Select value={status} onValueChange={(v) => handleStatusChange(v as JobStatus)}>
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
                </div>
                <StatusBadge status={status} />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="description" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
              <TabsTrigger value="answers">Answers</TabsTrigger>
            </TabsList>

            <TabsContent value="description">
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {job.raw_description}
                    </div>
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
                  {job.score_reasoning ? (
                    <>
                      <div>
                        <h4 className="font-medium mb-2">Reasoning</h4>
                        <ul className="space-y-1">
                          {job.score_reasoning.map((line, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {job.score_strengths && job.score_strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <CheckCheck className="h-4 w-4 text-emerald-500" />
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
                            <AlertCircle className="h-4 w-4 text-amber-500" />
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

                      {job.keywords_extracted && (
                        <div>
                          <h4 className="font-medium mb-2">Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {[
                              ...(job.keywords_extracted.skills ?? []),
                              ...(job.keywords_extracted.tools ?? []),
                              ...(job.keywords_extracted.responsibilities ?? []),
                            ].map((keyword, idx) => (
                              <Badge key={idx} variant="secondary">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      This job has not been scored yet.
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
                      {resumeDoc && (
                        <CardDescription>
                          Model: {resumeDoc.model_used} | Version: {resumeDoc.prompt_version}
                        </CardDescription>
                      )}
                    </div>
                    {resumeDoc && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(resumeDoc.content, "Resume")}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {resumeDoc ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                        {resumeDoc.content}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No resume generated for this job yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cover-letter">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Generated Cover Letter</CardTitle>
                      {coverLetterDoc && (
                        <CardDescription>
                          Model: {coverLetterDoc.model_used} | Version: {coverLetterDoc.prompt_version}
                        </CardDescription>
                      )}
                    </div>
                    {coverLetterDoc && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(coverLetterDoc.content, "Cover Letter")}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {coverLetterDoc ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {coverLetterDoc.content}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No cover letter generated for this job yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="answers">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Application Answers</CardTitle>
                      {answersDoc && (
                        <CardDescription>
                          Model: {answersDoc.model_used} | Version: {answersDoc.prompt_version}
                        </CardDescription>
                      )}
                    </div>
                    {answersDoc && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(answersDoc.content, "Answers")}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {answersDoc ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {answersDoc.content}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No application answers generated for this job yet.
                    </div>
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
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={handleOpenJob}
                disabled={!job.source_url}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Job Link
              </Button>

              <Separator />

              <Button
                className="w-full justify-start"
                variant="default"
                onClick={handleApprove}
                disabled={status === "READY_TO_APPLY" || status === "APPLIED"}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>

              <Button
                className="w-full justify-start"
                variant="secondary"
                onClick={handleMarkApplied}
                disabled={status === "APPLIED"}
              >
                <Send className="mr-2 h-4 w-4" />
                Mark Applied
              </Button>

              <Button
                className="w-full justify-start"
                variant="destructive"
                onClick={handleReject}
                disabled={status === "REJECTED"}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Resume</span>
                {resumeDoc ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                    Generated
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pending
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Cover Letter</span>
                {coverLetterDoc ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                    Generated
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pending
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Answers</span>
                {answersDoc ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                    Generated
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pending
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
