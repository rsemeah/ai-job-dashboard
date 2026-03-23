import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getJobStats, getJobs } from "@/lib/actions/jobs"
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"

export default async function DashboardPage() {
  const [stats, jobs] = await Promise.all([getJobStats(), getJobs()])

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

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Jobs will appear here once n8n successfully scores them. Make sure your workflow is running and connected to this Supabase instance.
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>Waiting for jobs from:</p>
              <div className="flex gap-2 justify-center">
                <span className="px-2 py-1 bg-muted rounded text-xs">Jobot</span>
                <span className="px-2 py-1 bg-muted rounded text-xs">ZipRecruiter</span>
                <span className="px-2 py-1 bg-muted rounded text-xs">Greenhouse</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
