import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ScrollText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Download,
  FileSearch,
  Copy,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Briefcase
} from "lucide-react"
import Link from "next/link"
import type { ProcessingEventType, Job } from "@/lib/types"
import { BackButton } from "@/components/back-button"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Event type configuration for display
const eventConfig: Record<string, { 
  label: string
  icon: typeof CheckCircle2
  color: string 
}> = {
  intake_received: { label: "Job Received", icon: Download, color: "text-blue-500" },
  fetch_started: { label: "Fetching Page", icon: Clock, color: "text-blue-400" },
  fetch_complete: { label: "Page Fetched", icon: CheckCircle2, color: "text-green-500" },
  fetch_failed: { label: "Fetch Failed", icon: XCircle, color: "text-red-500" },
  parse_started: { label: "Parsing", icon: FileSearch, color: "text-purple-400" },
  parse_complete: { label: "Parsed", icon: CheckCircle2, color: "text-green-500" },
  parse_partial: { label: "Partial Parse", icon: AlertTriangle, color: "text-amber-500" },
  parse_failed: { label: "Parse Failed", icon: XCircle, color: "text-red-500" },
  duplicate_found: { label: "Duplicate", icon: Copy, color: "text-gray-500" },
  scoring_started: { label: "Scoring", icon: Clock, color: "text-purple-400" },
  scoring_complete: { label: "Scored", icon: CheckCircle2, color: "text-green-500" },
  scoring_failed: { label: "Scoring Failed", icon: XCircle, color: "text-red-500" },
  generation_started: { label: "Generating", icon: Sparkles, color: "text-indigo-400" },
  generation_complete: { label: "Generated", icon: CheckCircle2, color: "text-green-500" },
  generation_failed: { label: "Generation Failed", icon: XCircle, color: "text-red-500" },
  manual_review_required: { label: "Review Needed", icon: AlertTriangle, color: "text-amber-500" },
  status_changed: { label: "Status Changed", icon: ArrowRight, color: "text-blue-400" },
  error: { label: "Error", icon: AlertCircle, color: "text-red-500" },
  // Fallback activity types
  created: { label: "Job Added", icon: Briefcase, color: "text-blue-500" },
  scored: { label: "Scored", icon: CheckCircle2, color: "text-emerald-500" },
  applied: { label: "Applied", icon: ArrowRight, color: "text-blue-500" },
}

export default async function LogsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/login")
  }

  // Try to fetch processing_events if table exists
  let hasEventsTable = false
  let events: Array<{
    id: string
    job_id: string
    event_type: string
    message?: string
    metadata?: Record<string, unknown>
    created_at: string
  }> = []

  const { data: eventsData, error: eventsError } = await supabase
    .from("processing_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (!eventsError && eventsData) {
    hasEventsTable = true
    events = eventsData
  }

  // Always fetch recent jobs for fallback/enrichment - filtered by user
  const { data: recentJobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, company, status, fit, score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (jobsError && !hasEventsTable) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            History
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">
            Real-time processing events and job activity.
          </p>
        </div>
        <ErrorState 
          title="Unable to load activity log"
          message={jobsError.message}
        />
      </div>
    )
  }

  const jobs = recentJobs || []
  const jobsMap = new Map(jobs.map(j => [j.id, j]))

  // If we have processing_events, show them
  if (hasEventsTable && events.length > 0) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            History
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">
            Real-time processing events and job activity.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {events.filter(e => e.event_type.includes("complete")).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {events.filter(e => e.event_type.includes("failed") || e.event_type === "error").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Processing Events</CardTitle>
            <CardDescription>
              {events.length} event{events.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {events.map((event) => {
                  const config = eventConfig[event.event_type] || {
                    label: event.event_type,
                    icon: Clock,
                    color: "text-muted-foreground"
                  }
                  const Icon = config.icon
                  const job = jobsMap.get(event.job_id)
                  
                  return (
                    <div 
                      key={event.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{config.label}</span>
                          {job && (
                            <Link 
                              href={`/jobs/${event.job_id}`}
                              className="text-sm text-muted-foreground hover:underline truncate"
                            >
                              {job.title} @ {job.company}
                            </Link>
                          )}
                        </div>
                        {event.message && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {event.message}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback: Generate activity from job data
  const activities = jobs.flatMap(job => {
    const items = []
    
    if (job.created_at) {
      items.push({
        id: `${job.id}-created`,
        type: "created",
        title: `Job added: ${job.title}`,
        company: job.company,
        jobId: job.id,
        timestamp: job.created_at,
      })
    }
    
    if (job.score !== null && job.created_at) {
      items.push({
        id: `${job.id}-scored`,
        type: "scored",
        title: `Scored: ${job.title}`,
        company: job.company,
        jobId: job.id,
        detail: `Score: ${job.score}, Fit: ${job.fit || "Unscored"}`,
        timestamp: job.created_at,
      })
    }
    
    if (job.status === "applied" && job.created_at) {
      items.push({
        id: `${job.id}-applied`,
        type: "applied",
        title: `Applied: ${job.title}`,
        company: job.company,
        jobId: job.id,
        timestamp: job.created_at,
      })
    }
    
    return items
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="space-y-8 max-w-6xl">
      <BackButton fallbackHref="/" />
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          History
        </p>
        <h1 className="text-3xl font-serif font-medium tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          Real-time processing events and job activity.
        </p>
      </div>

      {!hasEventsTable && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-600">Limited Activity Data</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  The <code className="text-xs bg-muted px-1 py-0.5 rounded">processing_events</code> table 
                  is not available. Showing activity derived from jobs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          icon={ScrollText}
          title="No activity yet"
          description="Activity will appear here as you review and apply to jobs."
          action={{ label: "Add a Job", href: "/" }}
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
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {activities.slice(0, 50).map((activity) => {
                  const config = eventConfig[activity.type] || {
                    label: activity.type,
                    icon: Clock,
                    color: "text-muted-foreground"
                  }
                  const Icon = config.icon

                  return (
                    <Link 
                      key={activity.id}
                      href={`/jobs/${activity.jobId}`}
                      className="block"
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className={`mt-0.5 p-1.5 rounded-full bg-muted ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.company}</p>
                          {activity.detail && (
                            <p className="text-sm text-muted-foreground mt-0.5">{activity.detail}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
