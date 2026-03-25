import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getJobStats, getJobs } from "@/lib/actions/jobs"
import { TrendingUp, ThumbsUp, Send, Clock, ArrowRight, AlertTriangle } from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"
import { ErrorState } from "@/components/error-state"
import { HeroSection, HowItWorks, JobUrlInput, OnboardingEmptyState, WorkflowSteps } from "@/components/onboarding"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const [statsResult, jobsResult] = await Promise.all([getJobStats(), getJobs()])

  if (!statsResult.success) {
    return (
      <div className="space-y-6">
        <HeroSection />
        <ErrorState 
          title="Unable to connect to your data"
          message={statsResult.error || "Check that Supabase is configured correctly in your project settings."}
        />
      </div>
    )
  }

  const stats = statsResult
  const jobs = jobsResult.success ? jobsResult.data : []
  const isFirstTime = stats.total === 0

  // Calculate stats using canonical statuses
  const readyToApply = (stats.byStatus["ready"] || 0)
  const applied = (stats.byStatus["applied"] || 0) + (stats.byStatus["interviewing"] || 0)
  const interviews = stats.byStatus["interviewing"] || 0
  const highFit = stats.byFit["HIGH"] || 0
  const needsReview = (stats.byStatus["manual_review_required"] || 0) + 
                      (stats.byStatus["parsed_partial"] || 0) +
                      (stats.byStatus["below_threshold"] || 0)
  const processing = (stats.byStatus["submitted"] || 0) + 
                     (stats.byStatus["fetching"] || 0) + 
                     (stats.byStatus["parsing"] || 0) + 
                     (stats.byStatus["scoring"] || 0) +
                     (stats.byStatus["generating_documents"] || 0)

  const statCards = [
    {
      name: "High Fit Jobs",
      value: highFit,
      icon: TrendingUp,
      description: "Worth pursuing",
      color: "text-emerald-500",
      href: "/jobs?fit=HIGH",
    },
    {
      name: "Ready to Apply",
      value: readyToApply,
      icon: ThumbsUp,
      description: "Materials ready",
      color: "text-green-500",
      href: "/ready-queue",
    },
    {
      name: "Applied",
      value: applied,
      icon: Send,
      description: interviews > 0 ? `${interviews} interviewing` : "Awaiting response",
      color: "text-blue-500",
      href: "/applications",
    },
    {
      name: "Needs Review",
      value: needsReview,
      icon: AlertTriangle,
      description: processing > 0 ? `${processing} processing` : "Manual input needed",
      color: needsReview > 0 ? "text-amber-500" : "text-muted-foreground",
      href: "/jobs?status=manual_review_required",
    },
  ]

  if (isFirstTime) {
    return (
      <div className="space-y-6">
        <HeroSection />
        <WorkflowSteps />
        <JobUrlInput isFirstTime={true} />
        <HowItWorks />
        <OnboardingEmptyState />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <HeroSection />
      <JobUrlInput isFirstTime={false} />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.name} href={stat.href} className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.value > 0 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {stats.total < 5 && <HowItWorks />}

      <DashboardCharts stats={stats} jobs={jobs} />
    </div>
  )
}
