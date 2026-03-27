import Link from "next/link"
import { getJobs } from "@/lib/actions/jobs"
import { FitBadge, ScoreBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Rocket, CheckCircle, FileText, Mail, ArrowRight, ExternalLink } from "lucide-react"
import { ReadyJobActions } from "./ready-job-actions"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ReadyQueuePage() {
  const result = await getJobs()

  if (!result.success) {
    return (
      <div className="space-y-8 max-w-6xl">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Action Required
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Ready to Apply</h1>
          <p className="text-muted-foreground">
            High-fit jobs with tailored materials. Ready when you are.
          </p>
        </div>
        <ErrorState 
          title="Unable to load jobs"
          message={result.error}
        />
      </div>
    )
  }

  // Filter for jobs that are ready to apply (using UPPERCASE statuses to match DB)
  const readyJobs = result.data.filter(job => 
    (job.status === "READY" || 
     job.status === "MANUAL_REVIEW_REQUIRED" ||
     job.status === "SCORED" ||
     (job.fit === "HIGH" && job.score !== null && job.score >= 60)) &&
    job.status !== "APPLIED" &&
    job.status !== "ARCHIVED"
  ).sort((a, b) => (b.score || 0) - (a.score || 0))

  // Jobs with complete materials
  const completeJobs = readyJobs.filter(job => job.generated_resume && job.generated_cover_letter)
  const incompleteJobs = readyJobs.filter(job => !job.generated_resume || !job.generated_cover_letter)

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Action Required
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Ready to Apply</h1>
          <p className="text-muted-foreground">
            Jobs with materials ready - just click to apply
          </p>
        </div>
        {completeJobs.length > 0 && (
          <Badge variant="default" className="bg-emerald-500 text-lg px-4 py-1">
            <Rocket className="mr-2 h-4 w-4" />
            {completeJobs.length} Ready
          </Badge>
        )}
      </div>

      {readyJobs.length === 0 ? (
        <EmptyState variant="ready" />
      ) : (
        <>
          {/* Ready to Apply - Complete */}
          {completeJobs.length > 0 && (
            <Card className="border-emerald-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <div>
                      <CardTitle>Ready to Apply</CardTitle>
                      <CardDescription>
                        Resume and cover letter ready - click Apply to copy materials and open job
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Materials</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completeJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link
                            href={`/jobs/${job.id}`}
                            className="font-medium hover:underline"
                          >
                            {job.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{job.company}</TableCell>
                        <TableCell className="text-center">
                          <ScoreBadge score={job.score} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                              <FileText className="mr-1 h-3 w-3" />
                              Resume
                            </Badge>
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                              <Mail className="mr-1 h-3 w-3" />
                              Cover
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <ReadyJobActions job={job} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Needs Materials */}
          {incompleteJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Needs Materials</CardTitle>
                <CardDescription>
                  These jobs need resume/cover letter generated before applying
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Missing</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incompleteJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link
                            href={`/jobs/${job.id}`}
                            className="font-medium hover:underline"
                          >
                            {job.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{job.company}</TableCell>
                        <TableCell className="text-center">
                          <ScoreBadge score={job.score} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            {!job.generated_resume && (
                              <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                                <FileText className="mr-1 h-3 w-3" />
                                Resume
                              </Badge>
                            )}
                            {!job.generated_cover_letter && (
                              <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                                <Mail className="mr-1 h-3 w-3" />
                                Cover
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/jobs/${job.id}`}>
                              Generate
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {completeJobs.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-sm">
              <Rocket className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">How to Apply</p>
                <p className="text-muted-foreground">
                  Click "Apply" to copy your resume to clipboard and open the job posting. Paste your resume in the application form, then click "Mark Applied" to track it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
