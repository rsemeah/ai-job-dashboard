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
import { Eye, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ReadyQueuePage() {
  const result = await getJobs()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ready to Apply</h1>
          <p className="text-muted-foreground">
            Jobs that scored well and are ready for your application
          </p>
        </div>
        <ErrorState 
          title="Unable to load jobs"
          message={result.error}
        />
      </div>
    )
  }

  // Filter for jobs that are READY_TO_APPLY or HIGH fit with a score
  const readyJobs = result.data.filter(job => 
    job.status === "READY_TO_APPLY" || 
    (job.fit === "HIGH" && job.score !== null && job.score >= 70)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ready to Apply</h1>
        <p className="text-muted-foreground">
          Jobs that scored well and are ready for your application
        </p>
      </div>

      {readyJobs.length === 0 ? (
        <EmptyState variant="ready" />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Top Matches</CardTitle>
                <CardDescription>
                  These jobs are a good fit — review and apply when ready
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {readyJobs.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Fit</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readyJobs.map((job) => (
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
                      <FitBadge fit={job.fit} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="default" size="sm" asChild>
                        <Link href={`/jobs/${job.id}`}>
                          Review
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

      {readyJobs.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Click "Review" to see the full job details and your tailored application materials before applying.
        </p>
      )}
    </div>
  )
}
