import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { AnalyticsCharts } from "@/components/analytics-charts"
import { AnalyticsPremiumWrapper } from "@/components/analytics-premium-wrapper"
import { BackButton } from "@/components/back-button"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/login")
  }
  
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Insights
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your job search performance.
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
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Insights
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your job search performance.
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
    <AnalyticsPremiumWrapper>
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Insights
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your job search performance.
          </p>
        </div>

        <AnalyticsCharts jobs={allJobs} />
      </div>
    </AnalyticsPremiumWrapper>
  )
}
