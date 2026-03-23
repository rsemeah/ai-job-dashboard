import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getJobStats, getJobs } from "@/lib/actions/jobs"
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"
import { SystemStatus } from "@/components/system-status"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"

export default async function DashboardPage() {
  const [statsResult, jobsResult] = await Promise.all([getJobStats(), getJobs()])

  // Error state
  if (!statsResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your job application pipeline
          </p>
        </div>
        <ErrorState 
          title="Unable to load dashboard"
          message={statsResult.error || "The backend workflow or database configuration may still be in progress."}
        />
      </div>
    )
  }

  const stats = statsResult
  const jobs = jobsResult.success ? jobsResult.data : []

  const statCards = [
    {
      name: "Total Jobs",
      value: stats.total,
      icon: Briefcase,
      color: "text-foreground",
    },
    {
      name: "High Fit",
      value: stats.byFit["HIGH"] || 0,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      name: "Medium Fit",
      value: stats.byFit["MEDIUM"] || 0,
      icon: Minus,
      color: "text-amber-500",
    },
    {
      name: "Low Fit",
      value: stats.byFit["LOW"] || 0,
      icon: TrendingDown,
      color: "text-red-500",
    },
  ]

  // Empty state
  if (stats.total === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your job application pipeline
          </p>
        </div>

        <SystemStatus 
          lastJobCreated={stats.lastJobCreated} 
          hasWorkflowOutputs={stats.hasWorkflowOutputs} 
        />

        <EmptyState variant="jobs" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your job application pipeline
        </p>
      </div>

      {/* System Status */}
      <SystemStatus 
        lastJobCreated={stats.lastJobCreated} 
        hasWorkflowOutputs={stats.hasWorkflowOutputs} 
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts stats={stats} jobs={jobs} />
    </div>
  )
}
