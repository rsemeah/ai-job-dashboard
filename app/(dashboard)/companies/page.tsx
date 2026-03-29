import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Briefcase } from "lucide-react"
import { BackButton } from "@/components/back-button"
import type { Job } from "@/lib/types"

export default async function CompaniesPage() {
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
    .order("company", { ascending: true })

  if (error) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Directory
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            All companies in your pipeline, organized and trackable.
          </p>
        </div>
        <ErrorState 
          title="Unable to load companies"
          message={error.message}
        />
      </div>
    )
  }

  // Filter out any invalid/placeholder jobs
  const allJobs = ((jobs || []) as Job[]).filter(job => {
    // Skip jobs with missing or placeholder data
    if (!job.title || !job.company) return false
    if (job.title.includes('PLACEHOLDER') || job.company.includes('PLACEHOLDER')) return false
    if (job.title === 'Job Review in Progress') return false
    if (job.title.trim() === '' || job.company.trim() === '') return false
    return true
  })

  // Group jobs by company
  const companiesMap = allJobs.reduce((acc, job) => {
    const company = job.company!
    if (!acc[company]) {
      acc[company] = {
        name: company,
        jobs: [],
        totalJobs: 0,
        appliedJobs: 0,
        avgScore: 0,
      }
    }
    acc[company].jobs.push(job)
    acc[company].totalJobs++
    const status = job.status?.toUpperCase()
    if (status === "APPLIED" || status === "INTERVIEWING" || status === "OFFERED") {
      acc[company].appliedJobs++
    }
    return acc
  }, {} as Record<string, { name: string; jobs: Job[]; totalJobs: number; appliedJobs: number; avgScore: number }>)

  // Calculate average scores
  Object.values(companiesMap).forEach(company => {
    const scoredJobs = company.jobs.filter(j => j.score !== null)
    if (scoredJobs.length > 0) {
      company.avgScore = Math.round(
        scoredJobs.reduce((sum, j) => sum + (j.score || 0), 0) / scoredJobs.length
      )
    }
  })

  const companies = Object.values(companiesMap).sort((a, b) => b.totalJobs - a.totalJobs)

  return (
    <div className="space-y-8 max-w-6xl">
      <BackButton fallbackHref="/" />
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          Directory
        </p>
        <h1 className="text-3xl font-serif font-medium tracking-tight">Companies</h1>
        <p className="text-muted-foreground">
          All companies in your pipeline, organized and trackable.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.filter(c => c.appliedJobs > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Jobs/Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.length > 0 ? (allJobs.length / companies.length).toFixed(1) : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {companies.length === 0 ? (
        <EmptyState 
          variant="default" 
          title="No companies yet"
          message="Companies will appear here once you start reviewing jobs."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.name} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>
                        {company.totalJobs} job{company.totalJobs !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                  {company.avgScore > 0 && (
                    <Badge variant="outline" className="font-mono">
                      {company.avgScore} avg
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Applications</span>
                    <span className="font-medium">{company.appliedJobs}</span>
                  </div>
                  <div className="space-y-2">
                    {company.jobs.slice(0, 3).map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{job.title}</span>
                      </Link>
                    ))}
                    {company.jobs.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{company.jobs.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
