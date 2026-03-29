"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  FileText,
  Search,
  Calendar,
  Building2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ExternalLink,
  FileCheck,
  Loader2,
} from "lucide-react"
import { ExportButtons } from "@/components/export-buttons"
import { BackButton } from "@/components/back-button"
import type { GenerationStatus } from "@/lib/types"

type DocumentFilter = "all" | "ready" | "needs_review" | "failed" | "pending"
type SortOption = "newest" | "oldest" | "company" | "title"

interface DocumentJob {
  id: string
  title: string
  company: string
  generated_resume: string | null
  generated_cover_letter: string | null
  generation_status: GenerationStatus | null
  generation_timestamp: string | null
  generation_quality_score: number | null
  quality_passed: boolean | null
  created_at: string
}

const STATUS_CONFIGS: Record<GenerationStatus, {
  icon: typeof CheckCircle2
  label: string
  className: string
  badgeVariant: "default" | "secondary" | "destructive" | "outline"
}> = {
  ready: {
    icon: CheckCircle2,
    label: "Ready",
    className: "text-green-600",
    badgeVariant: "default",
  },
  needs_review: {
    icon: AlertTriangle,
    label: "Needs Review",
    className: "text-amber-600",
    badgeVariant: "secondary",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-red-600",
    badgeVariant: "destructive",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-muted-foreground",
    badgeVariant: "outline",
  },
  generating: {
    icon: Loader2,
    label: "Generating",
    className: "text-blue-600",
    badgeVariant: "outline",
  },
}

export default function DocumentsPage() {
  const [jobs, setJobs] = useState<DocumentJob[]>([])
  const [filteredJobs, setFilteredJobs] = useState<DocumentJob[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<DocumentFilter>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [candidateName, setCandidateName] = useState("Candidate")

  // Load jobs with generated documents
  useEffect(() => {
    async function loadDocuments() {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setJobs([])
          setFilteredJobs([])
          setLoading(false)
          return
        }
        
        // Load all jobs that have generation status or generated materials
        const { data: jobsData, error } = await supabase
          .from("jobs")
          .select(`
            id,
            title,
            company,
            generated_resume,
            generated_cover_letter,
            generation_status,
            generation_timestamp,
            generation_quality_score,
            quality_passed,
            created_at
          `)
          .eq("user_id", user.id)
          .or("generated_resume.not.is.null,generation_status.not.is.null")
          .order("generation_timestamp", { ascending: false, nullsFirst: false })
        
        if (error) throw error
        
        // Load candidate name
        const { data: profileData } = await supabase
          .from("user_profile")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle()
        
        if (profileData?.full_name) {
          setCandidateName(profileData.full_name)
        }
        
        setJobs(jobsData || [])
        setFilteredJobs(jobsData || [])
      } catch (error) {
        console.error("Error loading documents:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadDocuments()
  }, [])

  // Apply filters and search
  useEffect(() => {
    let result = [...jobs]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(job => 
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query)
      )
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(job => job.generation_status === statusFilter)
    }
    
    // Apply sorting
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => 
          new Date(b.generation_timestamp || b.created_at).getTime() - 
          new Date(a.generation_timestamp || a.created_at).getTime()
        )
        break
      case "oldest":
        result.sort((a, b) => 
          new Date(a.generation_timestamp || a.created_at).getTime() - 
          new Date(b.generation_timestamp || b.created_at).getTime()
        )
        break
      case "company":
        result.sort((a, b) => a.company.localeCompare(b.company))
        break
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
    }
    
    setFilteredJobs(result)
  }, [jobs, searchQuery, statusFilter, sortBy])

  // Stats
  const stats = {
    total: jobs.length,
    ready: jobs.filter(j => j.generation_status === "ready").length,
    needsReview: jobs.filter(j => j.generation_status === "needs_review").length,
    failed: jobs.filter(j => j.generation_status === "failed").length,
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Library
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Documents</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <BackButton fallbackHref="/" />
      
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          Library
        </p>
        <h1 className="text-3xl font-serif font-medium tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          All your generated resumes and cover letters in one place.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === "all" ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === "ready" ? "ring-2 ring-green-500" : "hover:bg-muted/50"}`}
          onClick={() => setStatusFilter("ready")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ready}</p>
                <p className="text-sm text-muted-foreground">Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === "needs_review" ? "ring-2 ring-amber-500" : "hover:bg-muted/50"}`}
          onClick={() => setStatusFilter("needs_review")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.needsReview}</p>
                <p className="text-sm text-muted-foreground">Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === "failed" ? "ring-2 ring-red-500" : "hover:bg-muted/50"}`}
          onClick={() => setStatusFilter("failed")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentFilter)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="company">By Company</SelectItem>
            <SelectItem value="title">By Title</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">No documents found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters"
                  : "Generate documents from job listings to see them here"}
              </p>
              {statusFilter !== "all" && (
                <Button variant="outline" onClick={() => setStatusFilter("all")}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const status = job.generation_status || "pending"
            const config = STATUS_CONFIGS[status]
            const StatusIcon = config.icon
            const hasResume = !!job.generated_resume
            const hasCoverLetter = !!job.generated_cover_letter
            
            return (
              <Card key={job.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Job Info */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        status === "ready" ? "bg-green-100" :
                        status === "needs_review" ? "bg-amber-100" :
                        status === "failed" ? "bg-red-100" :
                        status === "generating" ? "bg-blue-100" :
                        "bg-muted"
                      }`}>
                        <StatusIcon className={`h-5 w-5 ${config.className} ${status === "generating" ? "animate-spin" : ""}`} />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            href={`/jobs/${job.id}`}
                            className="font-medium hover:underline truncate"
                          >
                            {job.title}
                          </Link>
                          <Badge variant={config.badgeVariant} className="shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {job.company}
                          </span>
                          {job.generation_timestamp && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {job.generation_timestamp.split("T")[0]}
                            </span>
                          )}
                          {job.generation_quality_score !== null && (
                            <span className="flex items-center gap-1">
                              <FileCheck className="h-3 w-3" />
                              Quality: {job.generation_quality_score}%
                            </span>
                          )}
                        </div>
                        
                        {/* Document badges */}
                        <div className="flex items-center gap-2 mt-2">
                          {hasResume && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Resume
                            </Badge>
                          )}
                          {hasCoverLetter && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Cover Letter
                            </Badge>
                          )}
                          {!hasResume && !hasCoverLetter && (
                            <span className="text-xs text-muted-foreground italic">
                              No documents yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {status === "ready" && (hasResume || hasCoverLetter) && (
                        <ExportButtons
                          jobId={job.id}
                          hasResume={hasResume}
                          hasCoverLetter={hasCoverLetter}
                          resumeText={job.generated_resume || undefined}
                          coverLetterText={job.generated_cover_letter || undefined}
                          candidateName={candidateName}
                          company={job.company}
                          role={job.title}
                        />
                      )}

                      {status !== "ready" && (
                        <Badge variant="outline" className="text-xs">
                          Awaiting readiness
                        </Badge>
                      )}
                      
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
