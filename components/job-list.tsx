"use client"
// TruthSerum Jobs List - v4 - March 26 2026 07:50 (Card Layout, NO Table Components)

import { useState, useMemo } from "react"
import Link from "next/link"
import type { Job, JobStatus, JobFit, RoleFamily, GenerationStatus } from "@/lib/types"
import { STATUS_CONFIG, FIT_CONFIG, STATUS_GROUPS, ROLE_FAMILIES, INDUSTRIES } from "@/lib/types"
import { normalizeJobStatus } from "@/lib/job-lifecycle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Loader2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react"

// Status groupings for the view
const STATUS_GROUP_CONFIG = {
  active: { label: "Active", statuses: ["draft", "queued", "analyzing", "analyzed", "generating", "ready"], color: "blue" },
  applied: { label: "Applied", statuses: ["applied", "interviewing", "offered"], color: "green" },
  attention: { label: "Needs Attention", statuses: ["needs_review", "error"], color: "amber" },
  closed: { label: "Closed", statuses: ["rejected", "archived"], color: "gray" },
} as const

type StatusGroup = keyof typeof STATUS_GROUP_CONFIG

function formatDate(dateString: string) {
  // Parse the date and format in UTC to avoid hydration mismatch
  const date = new Date(dateString)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  // Use UTC methods consistently
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  return `${month} ${day}`
}

// Check if a job has malformed/placeholder data
function isMalformedJob(job: Job): boolean {
  const placeholderPatterns = [
    /^placeholder/i,
    /^test/i,
    /^unknown$/i,
    /^n\/a$/i,
    /^\[.*\]$/,
  ]
  
  const titleMalformed = !job.title || placeholderPatterns.some(p => p.test(job.title))
  const companyMalformed = !job.company || placeholderPatterns.some(p => p.test(job.company))
  
  return titleMalformed || companyMalformed
}

// Fit badge component
function FitBadge({ fit, score }: { fit: JobFit; score: number | null }) {
  if (!fit) return null
  
  const colorClasses = {
    HIGH: "bg-green-100 text-green-800 border-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LOW: "bg-red-100 text-red-800 border-red-200",
  }
  
  return (
    <Badge variant="outline" className={`${colorClasses[fit]} text-xs`}>
      {score || fit}
    </Badge>
  )
}

// Status badge
function StatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status]
  if (!config) return <Badge variant="outline">{status}</Badge>
  
  return (
    <Badge variant="outline" className="text-xs">
      {config.label}
    </Badge>
  )
}

// Materials ready indicator with generation status
function MaterialsIndicator({ job }: { job: Job }) {
  const status = job.generation_status
  const hasResume = !!job.generated_resume
  const hasCoverLetter = !!job.generated_cover_letter
  
  // Show generation status if available
  if (status === "generating") {
    return (
      <span className="flex items-center gap-1 text-blue-600 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating
      </span>
    )
  }
  
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-red-600 text-xs">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    )
  }
  
  if (status === "needs_review") {
    return (
      <span className="flex items-center gap-1 text-amber-600 text-xs">
        <AlertTriangle className="h-3 w-3" />
        Review
      </span>
    )
  }
  
  if (status === "ready" || (hasResume && hasCoverLetter)) {
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
  
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <Clock className="h-3 w-3" />
        Pending
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

// Job row component
function JobRow({ job, viewMode }: { job: Job; viewMode: "list" | "card" }) {
  if (viewMode === "card") {
    return (
      <Link href={`/jobs/${job.id}`}>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">{job.company}</p>
                <h3 className="font-medium truncate">{job.title}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <FitBadge fit={job.fit} score={job.score} />
                  {job.role_family && (
                    <Badge variant="secondary" className="text-xs">{job.role_family}</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={job.status} />
                <MaterialsIndicator job={job} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>{job.location || "Remote"}</span>
              <span suppressHydrationWarning>{formatDate(job.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link 
      href={`/jobs/${job.id}`}
      className="flex items-center gap-4 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{job.title}</span>
          <FitBadge fit={job.fit} score={job.score} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{job.company}</span>
          {job.location && (
            <>
              <span>-</span>
              <span>{job.location}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <MaterialsIndicator job={job} />
        <StatusBadge status={job.status} />
        <span className="text-xs text-muted-foreground w-16 text-right" suppressHydrationWarning>
          {formatDate(job.created_at)}
        </span>
      </div>
    </Link>
  )
}

// Status group section
function StatusGroupSection({ 
  group, 
  jobs, 
  viewMode,
  defaultOpen = true 
}: { 
  group: StatusGroup
  jobs: Job[]
  viewMode: "list" | "card"
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const config = STATUS_GROUP_CONFIG[group]
  
  if (jobs.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <h3 className="font-semibold">{config.label}</h3>
        <Badge variant="secondary" className="text-xs">{jobs.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {viewMode === "card" ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-2">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} viewMode={viewMode} />
            ))}
          </div>
        ) : (
          <div className="space-y-1 mt-1">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} viewMode={viewMode} />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface JobsTableProps {
  jobs: Job[]
}

export function JobsTable({ jobs }: JobsTableProps) {
  const [fitFilter, setFitFilter] = useState<JobFit | "ALL">("ALL")
  const [roleFamilyFilter, setRoleFamilyFilter] = useState<string>("ALL")
  const [industryFilter, setIndustryFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [hideMalformed, setHideMalformed] = useState(true)
  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "fit" | "company">("newest")

  // Get unique values for filters
  const uniqueRoleFamilies = useMemo(() => {
    const families = new Set(jobs.map(job => job.role_family).filter(Boolean))
    return Array.from(families) as string[]
  }, [jobs])

  const uniqueIndustries = useMemo(() => {
    const industries = new Set(jobs.map(job => job.industry_guess).filter(Boolean))
    return Array.from(industries) as string[]
  }, [jobs])

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let result = jobs.filter((job) => {
      // Hide malformed records
      if (hideMalformed && isMalformedJob(job)) return false
      
      if (fitFilter !== "ALL" && job.fit !== fitFilter) return false
      if (roleFamilyFilter !== "ALL" && job.role_family !== roleFamilyFilter) return false
      if (industryFilter !== "ALL" && job.industry_guess !== industryFilter) return false
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!job.title.toLowerCase().includes(query) && 
            !job.company.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })

    // Sort
    switch (sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "fit":
        result.sort((a, b) => (b.score || 0) - (a.score || 0))
        break
      case "company":
        result.sort((a, b) => a.company.localeCompare(b.company))
        break
      default: // newest
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return result
  }, [jobs, fitFilter, roleFamilyFilter, industryFilter, searchQuery, hideMalformed, sortBy])

  // Group jobs by status
  const groupedJobs = useMemo(() => {
    const groups: Record<StatusGroup, Job[]> = {
      active: [],
      applied: [],
      attention: [],
      closed: [],
    }

    filteredJobs.forEach((job) => {
      const status = normalizeJobStatus(job.status)
      if (STATUS_GROUP_CONFIG.active.statuses.includes(status as any)) {
        groups.active.push(job)
      } else if (STATUS_GROUP_CONFIG.applied.statuses.includes(status as any)) {
        groups.applied.push(job)
      } else if (STATUS_GROUP_CONFIG.attention.statuses.includes(status as any)) {
        groups.attention.push(job)
      } else if (STATUS_GROUP_CONFIG.closed.statuses.includes(status as any)) {
        groups.closed.push(job)
      } else {
        groups.active.push(job) // Default to active
      }
    })

    return groups
  }, [filteredJobs])

  // Count malformed
  const malformedCount = useMemo(() => jobs.filter(isMalformedJob).length, [jobs])

  const hasFilters = fitFilter !== "ALL" || roleFamilyFilter !== "ALL" || industryFilter !== "ALL" || searchQuery !== ""

  const clearFilters = () => {
    setFitFilter("ALL")
    setRoleFamilyFilter("ALL")
    setIndustryFilter("ALL")
    setSearchQuery("")
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {filteredJobs.length} jobs {hasFilters && `(filtered from ${jobs.length})`}
        </span>
        {malformedCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setHideMalformed(!hideMalformed)}
            className="text-xs"
          >
            {hideMalformed ? `Show ${malformedCount} hidden` : `Hide ${malformedCount} malformed`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[180px] pl-9 h-9"
                />
              </div>
            </div>

            {/* Fit filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Fit</label>
              <Select value={fitFilter || "ALL"} onValueChange={(v) => setFitFilter(v === "ALL" ? "ALL" : v as JobFit)}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="All Fits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Fits</SelectItem>
                  <SelectItem value="HIGH">High Fit</SelectItem>
                  <SelectItem value="MEDIUM">Medium Fit</SelectItem>
                  <SelectItem value="LOW">Low Fit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Family filter */}
            {uniqueRoleFamilies.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role Family</label>
                <Select value={roleFamilyFilter} onValueChange={setRoleFamilyFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    {uniqueRoleFamilies.map((rf) => (
                      <SelectItem key={rf} value={rf}>{rf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Industry filter */}
            {uniqueIndustries.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Industry</label>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Industries</SelectItem>
                    {uniqueIndustries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sort</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="fit">Best Fit</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View mode toggle */}
            <div className="flex gap-1 ml-auto">
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === "card" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grouped job lists */}
      <div className="space-y-4">
        <StatusGroupSection 
          group="active" 
          jobs={groupedJobs.active} 
          viewMode={viewMode}
          defaultOpen={true}
        />
        <StatusGroupSection 
          group="applied" 
          jobs={groupedJobs.applied} 
          viewMode={viewMode}
          defaultOpen={true}
        />
        <StatusGroupSection 
          group="attention" 
          jobs={groupedJobs.attention} 
          viewMode={viewMode}
          defaultOpen={true}
        />
        <StatusGroupSection 
          group="closed" 
          jobs={groupedJobs.closed} 
          viewMode={viewMode}
          defaultOpen={false}
        />
      </div>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No jobs found matching the current filters.</p>
            {hasFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
