import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Building2, 
  Briefcase, 
  FileText, 
  Send, 
  ExternalLink, 
  ChevronRight, 
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { BackButton } from "@/components/back-button"
import { StatusBadge } from "@/components/status-badge"
import { normalizeCompanyName } from "@/lib/company-utils"
import { DeleteJobDialog } from "@/components/delete-job-dialog"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface CompanyDetailPageProps {
  params: Promise<{ slug: string }>
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function FitBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="outline" className="text-xs">Unscored</Badge>
  
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

function MaterialsIndicator({ hasResume, hasCoverLetter, status }: { 
  hasResume: boolean
  hasCoverLetter: boolean
  status?: string 
}) {
  if (status === "generating") {
    return (
      <span className="flex items-center gap-1 text-blue-600 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating
      </span>
    )
  }
  
  if (hasResume && hasCoverLetter) {
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    )
  }
  
  if (hasResume || hasCoverLetter) {
    return (
      <span className="flex items-center gap-1 text-amber-600 text-xs">
        <AlertCircle className="h-3 w-3" />
        Partial
      </span>
    )
  }
  
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs">
      <FileText className="h-3 w-3" />
      None
    </span>
  )
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { slug } = await params
  const normalizedSlug = decodeURIComponent(slug)
  
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/login")
  }
  
  // Fetch all jobs for this company (matching by normalized name)
  const { data: rawJobs, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_scores (
        overall_score,
        confidence_score
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
        <BackButton fallbackHref="/companies" />
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold">Unable to load company</h2>
            <p className="text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter jobs matching this company
  const companyJobs = (rawJobs || [])
    .filter(j => {
      const normalized = normalizeCompanyName(j.company_name || "")
      return normalized === normalizedSlug
    })
    .map(j => {
      const scores = (j.job_scores as Array<{overall_score?: number}>) || []
      const score = scores[0]?.overall_score ?? null
      return {
        ...j,
        title: j.role_title,
        company: j.company_name,
        score,
        has_resume: !!j.generated_resume,
        has_cover_letter: !!j.generated_cover_letter,
        resume_content: j.generated_resume as string | null,
        cover_letter_content: j.generated_cover_letter as string | null,
      }
    })

  if (companyJobs.length === 0) {
    notFound()
  }

  const companyName = companyJobs[0].company
  
  // Calculate stats
  const totalRoles = companyJobs.length
  const appliedRoles = companyJobs.filter(j => ["applied", "interviewing", "offered"].includes(j.status?.toLowerCase())).length
  const readyRoles = companyJobs.filter(j => j.status?.toLowerCase() === "ready").length
  const interviewingRoles = companyJobs.filter(j => j.status?.toLowerCase() === "interviewing").length
  const rolesWithMaterials = companyJobs.filter(j => j.has_resume || j.has_cover_letter).length
  
  const scoredJobs = companyJobs.filter(j => j.score !== null)
  const avgScore = scoredJobs.length > 0
    ? Math.round(scoredJobs.reduce((sum, j) => sum + (j.score || 0), 0) / scoredJobs.length)
    : null

  // Group by status
  const activeJobs = companyJobs.filter(j => 
    !["applied", "interviewing", "offered", "rejected", "archived"].includes(j.status?.toLowerCase())
  )
  const appliedJobs = companyJobs.filter(j => 
    ["applied", "interviewing", "offered"].includes(j.status?.toLowerCase())
  )
  const closedJobs = companyJobs.filter(j => 
    ["rejected", "archived"].includes(j.status?.toLowerCase())
  )

  return (
    <div className="space-y-8 max-w-6xl">
      <BackButton fallbackHref="/companies" />
      
      {/* Company Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Company Record
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">{companyName}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{totalRoles} role{totalRoles !== 1 ? "s" : ""} analyzed</span>
            {avgScore !== null && (
              <span className="flex items-center gap-1">
                Avg fit: <FitBadge score={avgScore} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{rolesWithMaterials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{appliedRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interviewing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{interviewingRoles}</div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="applied">
            Applied ({appliedJobs.length})
          </TabsTrigger>
          {closedJobs.length > 0 && (
            <TabsTrigger value="closed">
              Closed ({closedJobs.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="all">
            All ({companyJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active roles. All roles are either applied or closed.
              </CardContent>
            </Card>
          ) : (
            activeJobs.map(job => (
              <RoleCard key={job.id} job={job} />
            ))
          )}
        </TabsContent>

        <TabsContent value="applied" className="space-y-3">
          {appliedJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No applications yet at this company.
              </CardContent>
            </Card>
          ) : (
            appliedJobs.map(job => (
              <RoleCard key={job.id} job={job} />
            ))
          )}
        </TabsContent>

        {closedJobs.length > 0 && (
          <TabsContent value="closed" className="space-y-3">
            {closedJobs.map(job => (
              <RoleCard key={job.id} job={job} />
            ))}
          </TabsContent>
        )}

        <TabsContent value="all" className="space-y-3">
          {companyJobs.map(job => (
            <RoleCard key={job.id} job={job} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RoleCard({ job }: { job: {
  id: string
  title: string
  company: string
  status: string
  score: number | null
  created_at: string
  job_url?: string | null
  has_resume: boolean
  has_cover_letter: boolean
  generation_status?: string
} }) {
  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Role Info */}
          <Link href={`/jobs/${job.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{job.title}</h3>
              <FitBadge score={job.score} />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <StatusBadge status={job.status} />
              <MaterialsIndicator 
                hasResume={job.has_resume} 
                hasCoverLetter={job.has_cover_letter}
                status={job.generation_status}
              />
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(job.created_at)}
              </span>
            </div>
          </Link>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {job.job_url && (
              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">View original posting</span>
                </a>
              </Button>
            )}
            <Link href={`/jobs/${job.id}`}>
              <Button variant="ghost" size="sm">
                View
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteJobDialog
                jobId={job.id}
                jobTitle={job.title}
                company={job.company}
                variant="icon"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
