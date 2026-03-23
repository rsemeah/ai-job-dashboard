import { getJobs } from "@/lib/actions/jobs"
import { JobsTable } from "@/components/jobs-table"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"

export default async function JobsPage() {
  const result = await getJobs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground">
          Browse and manage your job opportunities
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
