import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getJobStats, getJobs } from "@/lib/actions/jobs"
import { TrendingUp, ThumbsUp, Send, Clock, ArrowRight } from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"
import { ErrorState } from "@/components/error-state"
import { HeroSection, HowItWorks, JobUrlInput, OnboardingEmptyState, WorkflowSteps } from "@/components/onboarding"
import Link from "next/link"

// Force dynamic rendering to always show fresh data
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const [statsResult, jobsResult] = await Promise.all([getJobStats(), getJobs()])

  // Error state
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

  // Calculate useful stats
  const readyToApply = stats.byStatus["READY_TO_APPLY"] || 0
  const applied = stats.byStatus["APPLIED"] || 0
  const interviews = stats.byStatus["INTERVIEW"] || 0
  const highFit = stats.byFit["HIGH"] || 0

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
      color: "text-blue-500",
      href: "/ready-queue",
    },
    {
      name: "Applied",
      value: applied,
      icon: Send,
      description: "Awaiting response",
      color: "text-amber-500",
      href: "/applications",
    },
    {
      name: "Interviews",
      value: interviews,
      icon: Clock,
      description: "In progress",
      color: "text-purple-500",
      href: "/applications?filter=interview",
    },
  ]

  // Empty state - first time user
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
      {/* Hero with actions */}
      <HeroSection />
      
      {/* Quick job URL input */}
      <JobUrlInput isFirstTime={false} />

      {/* Stats Cards - show progress through the pipeline */}
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

      {/* How it works - collapsed for returning users */}
      {stats.total < 5 && <HowItWorks />}

      {/* Charts */}
      <DashboardCharts stats={stats} jobs={jobs} />
    </div>
  )
}
