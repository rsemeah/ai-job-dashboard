import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Building2, Briefcase, FileText, Send, ChevronRight, TrendingUp, Clock } from "lucide-react"
import { BackButton } from "@/components/back-button"
import { normalizeCompanyName, type CompanyWithStats } from "@/lib/company-utils"
import type { Job } from "@/lib/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function FitBadge({ score }: { score: number | null }) {
  if (score === null) return null
  
  let colorClass = "bg-muted text-muted-foreground"
  if (score >= 70) colorClass = "bg-green-100 text-green-700 border-green-200"
  else if (score >= 40) colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200"
  else colorClass = "bg-red-100 text-red-700 border-red-200"
  
  return (
    <Badge variant="outline" className={`${colorClass} text-xs font-mono`}>
      {score}
    </Badge>
  )
}

export default async function CompaniesPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/login")
  }
  
  // Fetch jobs with scores - use correct column names
  const { data: rawJobs, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_scores (
        overall_score
      ),
      generated_resume,
      generated_cover_letter
    `)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Organization
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Company Cabinet</h1>
          <p className="text-muted-foreground">
            Your analyzed opportunities organized by company.
          </p>
        </div>
        <ErrorState 
          title="Unable to load companies"
          message={error.message}
        />
      </div>
    )
  }

  // Transform jobs to UI-expected format with materials info
  const jobs = (rawJobs || []).map(j => {
    const scores = (j.job_scores as Array<{overall_score?: number}>) || []
    const score = scores[0]?.overall_score ?? null
    let fit: string | null = null
    if (score !== null) {
      if (score >= 70) fit = "HIGH"
      else if (score >= 40) fit = "MEDIUM"
      else fit = "LOW"
    }
    return {
      ...j,
      title: j.role_title,
      company: j.company_name,
      score,
      fit,
      has_resume: !!j.generated_resume,
      has_cover_letter: !!j.generated_cover_letter,
    }
  })
  
  // Filter out any invalid/placeholder jobs
  const allJobs = jobs.filter(job => {
    if (!job.title || !job.company) return false
    if (job.title.includes('PLACEHOLDER') || job.company.includes('PLACEHOLDER')) return false
    if (job.title === 'Job Review in Progress') return false
    if (job.title.trim() === '' || job.company.trim() === '') return false
    return true
  })

  // Group jobs by normalized company name
  const companiesMap = new Map<string, {
    name: string
    normalizedName: string
    jobs: typeof allJobs
    totalJobs: number
    appliedJobs: number
    readyJobs: number
    interviewingJobs: number
    avgScore: number | null
    latestActivity: string
    hasResume: boolean
    hasCoverLetter: boolean
  }>()

  for (const job of allJobs) {
    const normalizedName = normalizeCompanyName(job.company!)
    const existing = companiesMap.get(normalizedName) || {
      name: job.company!,
      normalizedName,
      jobs: [] as typeof allJobs,
      totalJobs: 0,
      appliedJobs: 0,
      readyJobs: 0,
      interviewingJobs: 0,
      avgScore: null,
      latestActivity: job.created_at,
      hasResume: false,
      hasCoverLetter: false,
    }
    
    existing.jobs.push(job)
    existing.totalJobs++
    
    const status = job.status?.toLowerCase()
    if (["applied", "interviewing", "offered"].includes(status)) {
      existing.appliedJobs++
    }
    if (status === "interviewing") {
      existing.interviewingJobs++
    }
    if (status === "ready") {
      existing.readyJobs++
    }
    
    if (job.has_resume) existing.hasResume = true
    if (job.has_cover_letter) existing.hasCoverLetter = true
    
    if (new Date(job.created_at) > new Date(existing.latestActivity)) {
      existing.latestActivity = job.created_at
    }
    
    companiesMap.set(normalizedName, existing)
  }

  // Calculate average scores
  for (const company of companiesMap.values()) {
    const scoredJobs = company.jobs.filter(j => j.score !== null)
    if (scoredJobs.length > 0) {
      company.avgScore = Math.round(
        scoredJobs.reduce((sum, j) => sum + (j.score || 0), 0) / scoredJobs.length
      )
    }
  }

  const companies = Array.from(companiesMap.values()).sort((a, b) => {
    // Sort by latest activity, most recent first
    return new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime()
  })
  
  // Calculate summary stats
  const totalCompanies = companies.length
  const companiesWithApplications = companies.filter(c => c.appliedJobs > 0).length
  const companiesWithReady = companies.filter(c => c.readyJobs > 0).length
  const companiesInterviewing = companies.filter(c => c.interviewingJobs > 0).length

  return (
    <div className="space-y-8 max-w-6xl">
      <BackButton fallbackHref="/" />
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          Organization
        </p>
        <h1 className="text-3xl font-serif font-medium tracking-tight">Company Cabinet</h1>
        <p className="text-muted-foreground">
          Your analyzed opportunities organized by company. Click a company to see all roles.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <p className="text-xs text-muted-foreground">{allJobs.length} total roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ready to Apply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{companiesWithReady}</div>
            <p className="text-xs text-muted-foreground">companies with materials</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{companiesWithApplications}</div>
            <p className="text-xs text-muted-foreground">companies with applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Interviewing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{companiesInterviewing}</div>
            <p className="text-xs text-muted-foreground">active interviews</p>
          </CardContent>
        </Card>
      </div>

      {companies.length === 0 ? (
        <EmptyState 
          variant="default" 
          title="No companies yet"
          message="Companies will appear here once you start analyzing jobs."
        />
      ) : (
        <div className="space-y-3">
          {companies.map((company) => (
            <Link
              key={company.normalizedName}
              href={`/companies/${encodeURIComponent(company.normalizedName)}`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Company Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    
                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{company.name}</h3>
                        <FitBadge score={company.avgScore} />
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {company.totalJobs} role{company.totalJobs !== 1 ? "s" : ""}
                        </span>
                        {company.appliedJobs > 0 && (
                          <span className="text-blue-600">{company.appliedJobs} applied</span>
                        )}
                        {company.readyJobs > 0 && (
                          <span className="text-emerald-600">{company.readyJobs} ready</span>
                        )}
                        {company.interviewingJobs > 0 && (
                          <Badge variant="outline" className="text-xs bg-pink-50 text-pink-600 border-pink-200">
                            Interviewing
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Materials and Activity */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="flex gap-1.5">
                        {company.hasResume && (
                          <Badge variant="secondary" className="text-xs">Resume</Badge>
                        )}
                        {company.hasCoverLetter && (
                          <Badge variant="secondary" className="text-xs">Cover</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(company.latestActivity)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                  
                  {/* Role Preview (first 3 roles) */}
                  {company.jobs.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                      {company.jobs.slice(0, 3).map((job) => (
                        <Badge key={job.id} variant="outline" className="text-xs font-normal">
                          {job.title}
                        </Badge>
                      ))}
                      {company.jobs.length > 3 && (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          +{company.jobs.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
