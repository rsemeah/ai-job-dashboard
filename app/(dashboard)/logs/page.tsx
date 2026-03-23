import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollText, CheckCircle, XCircle, Clock } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LogsPage() {
  const supabase = await createClient()
  
  // Fetch recent jobs as a proxy for activity log
  // Only query columns that exist in the schema
  const { data: recentJobs, error } = await supabase
    .from("jobs")
    .select("id, title, company, status, fit, score, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">
            Recent activity and job status changes
          </p>
        </div>
        <ErrorState 
          title="Unable to load activity log"
          message={error.message}
        />
      </div>
    )
  }

  const jobs = recentJobs || []

  // Generate activity items from job data
  const activities = jobs.flatMap(job => {
    const items = []
    
    // Job created event
    if (job.created_at) {
      items.push({
        id: `${job.id}-created`,
        type: "created" as const,
        title: `Job added: ${job.title}`,
        company: job.company,
        timestamp: job.created_at,
        status: "success" as const,
      })
    }
    
    // Show scored jobs (score exists)
    if (job.score !== null && job.created_at) {
      items.push({
        id: `${job.id}-scored`,
        type: "scored" as const,
        title: `Scored: ${job.title}`,
        company: job.company,
        detail: `Score: ${job.score}, Fit: ${job.fit || "UNSCORED"}`,
        timestamp: job.created_at, // Use created_at as proxy
        status: "success" as const,
      })
    }
    
    // Show applied jobs
    if (job.status === "APPLIED" && job.created_at) {
      items.push({
        id: `${job.id}-applied`,
        type: "applied" as const,
        title: `Applied: ${job.title}`,
        company: job.company,
        timestamp: job.created_at, // Use created_at as proxy
        status: "success" as const,
      })
    }
    
    return items
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          Recent activity and job status changes
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jobs Scored
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {activities.filter(a => a.type === "scored").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {activities.filter(a => a.type === "applied").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {activities.length === 0 ? (
        <EmptyState 
          variant="default"
          title="No activity yet"
          message="Activity will appear here as you review and apply to jobs."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {activities.length} event{activities.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 25).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div className={`mt-0.5 p-1.5 rounded-full ${
                    activity.type === "scored" 
                      ? "bg-emerald-500/10" 
                      : activity.type === "applied"
                      ? "bg-blue-500/10"
                      : "bg-muted"
                  }`}>
                    {activity.type === "scored" ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : activity.type === "applied" ? (
                      <Clock className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ScrollText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.company}</p>
                    {activity.detail && (
                      <p className="text-sm text-muted-foreground mt-0.5">{activity.detail}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(activity.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
