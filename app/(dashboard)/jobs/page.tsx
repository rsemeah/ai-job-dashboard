import { getJobs } from "@/lib/actions/jobs"
import { JobsTable } from "@/components/job-list"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function JobsPage() {
  const result = await getJobs()

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          Pipeline
        </p>
        <h1 className="text-3xl font-serif font-medium tracking-tight">All Jobs</h1>
        <p className="text-muted-foreground">
          Your complete job pipeline. Filter, sort, and track every opportunity.
        </p>
      </div>

      {!result.success ? (
        <ErrorState 
          title="Unable to load jobs"
          message={result.error}
        />
      ) : result.data.length === 0 ? (
        <EmptyState variant="jobs" />
      ) : (
        <JobsTable jobs={result.data} />
      )}
    </div>
  )
}
