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
import type { Job } from "@/lib/types"
import { BackButton } from "@/components/back-button"
import { listRunLedger } from "@/lib/logs/runLedger"
import { normalizeJobStatus } from "@/lib/job-lifecycle"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Event type configuration for display
const eventConfig: Record<string, { 
  label: string
  icon: typeof CheckCircle2
  color: string 
}> = {
  // ── Run Ledger step event types (canonical orchestration) ──────────────────
  intake_success: { label: "Job Received", icon: Download, color: "text-blue-500" },
  intake_started: { label: "Processing Started", icon: Clock, color: "text-blue-400" },
  intake_error: { label: "Intake Error", icon: XCircle, color: "text-red-500" },
  load_job_success: { label: "Job Loaded", icon: CheckCircle2, color: "text-green-500" },
  load_job_error: { label: "Job Not Found", icon: XCircle, color: "text-red-500" },
  analysis_started: { label: "Analyzing Job", icon: FileSearch, color: "text-purple-400" },
  analysis_success: { label: "Analysis Complete", icon: CheckCircle2, color: "text-green-500" },
  analysis_skipped: { label: "Analysis Skipped", icon: ArrowRight, color: "text-gray-400" },
  analysis_error: { label: "Analysis Failed", icon: XCircle, color: "text-red-500" },
  generate_documents_started: { label: "Generating Documents", icon: Sparkles, color: "text-indigo-400" },
  generate_documents_success: { label: "Documents Ready", icon: CheckCircle2, color: "text-emerald-500" },
  generate_documents_error: { label: "Generation Failed", icon: XCircle, color: "text-red-500" },
  generate_documents_skipped: { label: "Generation Skipped", icon: ArrowRight, color: "text-gray-400" },
  interview_prep_started: { label: "Generating Interview Prep", icon: Sparkles, color: "text-blue-400" },
  interview_prep_success: { label: "Interview Prep Ready", icon: CheckCircle2, color: "text-green-500" },
  interview_prep_error: { label: "Interview Prep Failed", icon: XCircle, color: "text-red-500" },
  interview_prep_skipped: { label: "Interview Prep Skipped", icon: ArrowRight, color: "text-gray-400" },
  // ── Legacy processing_events types (n8n era fallback) ─────────────────────
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

  // Try to fetch run ledger first, then processing_events.
  let hasEventsTable = false
  let events: Array<{
    id: string
    job_id: string
    event_type: string
    message?: string
    metadata?: Record<string, unknown>
    created_at: string
  }> = []

  const ledgerRows = await listRunLedger(supabase, user.id, 100)
  if (ledgerRows.length > 0) {
    hasEventsTable = true
    events = ledgerRows.map((row) => ({
      id: String(row.id || `${row.job_id || "job"}-${row.step_name || row.event_type || "event"}-${row.timestamp || row.created_at}`),
      job_id: String(row.job_id || ""),
      event_type: String(row.event_type || `${row.step_name || "step"}_${row.status || "success"}`),
      message: (row.summary_result as string) || (row.message as string) || (row.error_details as string) || undefined,
      metadata: (row.metadata as Record<string, unknown>) || undefined,
      created_at: String(row.timestamp || row.created_at || new Date().toISOString()),
    }))
  }

  if (!hasEventsTable) {
    const { data: eventsData, error: eventsError } = await supabase
      .from("processing_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (!eventsError && eventsData) {
      hasEventsTable = true
      events = eventsData
    }
  }

  // Always fetch recent jobs for fallback/enrichment - filtered by user
  // Use correct column names: role_title, company_name (not title, company)
  const { data: recentJobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      role_title,
      company_name,
      status,
      created_at,
      job_scores (
        overall_score
      )
    `)
    .eq("user_id", user.id)
    .is("deleted_at", null)
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

  // Transform jobs to include title/company for UI compatibility
  const jobs = (recentJobs || []).map(j => {
    const scores = (j.job_scores as Array<{overall_score?: number}>) || []
    const score = scores[0]?.overall_score ?? null
    let fit: string | null = null
    if (score !== null) {
      if (score >= 75) fit = "HIGH"
      else if (score >= 50) fit = "MEDIUM"
      else fit = "LOW"
    }
    return {
      ...j,
      title: j.role_title,
      company: j.company_name,
      score,
      fit,
    }
  })
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
                {events.filter(e => e.event_type.endsWith("_success") || e.event_type.includes("complete")).length}
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
                {events.filter(e => e.event_type.endsWith("_error") || e.event_type.includes("failed") || e.event_type === "error").length}
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

  // Show honest empty state instead of synthesizing fake events
  // This respects the TruthSerum principle - no fabricated activity logs
  const activities: Array<{
    id: string
    type: string
    title: string
    company?: string
    jobId?: string
    detail?: string
    timestamp: string
  }> = []

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
        <Card className="border-muted bg-muted/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Event Logging Not Configured</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Processing events will appear here as jobs are analyzed and documents are generated.
                  Events are logged in real-time during HireWire operations.
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
          variant="default"
          title="No processing events yet"
          message="Events appear here as jobs are analyzed and documents are generated. Add a job to get started."
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
