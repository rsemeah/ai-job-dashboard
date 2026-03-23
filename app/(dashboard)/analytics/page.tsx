import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { AnalyticsCharts } from "@/components/analytics-charts"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights into your job search performance
          </p>
        </div>
        <ErrorState 
          title="Unable to load analytics"
          message={error.message}
        />
      </div>
    )
  }

  const allJobs = jobs || []

  if (allJobs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights into your job search performance
          </p>
        </div>
        <EmptyState 
          variant="default"
          title="No analytics data yet"
          message="Analytics will appear here once you start reviewing jobs."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Detailed insights into your job search performance
        </p>
      </div>

      <AnalyticsCharts jobs={allJobs} />
    </div>
  )
}
