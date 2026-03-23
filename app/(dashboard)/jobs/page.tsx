import { getJobs } from "@/lib/actions/jobs"
import { JobsTable } from "@/components/jobs-table"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export default async function JobsPage() {
  const jobs = await getJobs()

  // Empty state
  if (jobs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Browse and filter all job listings
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
            <p className="text-muted-foreground max-w-md">
              Jobs will appear here once n8n successfully scores them. The workflow pulls jobs from various sources, scores them for fit, and stores them here.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground">
          Browse and filter all job listings
        </p>
      </div>

      <JobsTable jobs={jobs} />
    </div>
  )
}
