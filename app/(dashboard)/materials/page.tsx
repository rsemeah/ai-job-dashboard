"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Download,
  Search,
  MoreHorizontal,
  Eye,
  ExternalLink,
  Calendar,
  Building2,
  Briefcase,
  File,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { generateDocumentFilename } from "@/lib/filename-utils"
import Link from "next/link"
import { BackButton } from "@/components/back-button"

interface JobWithMaterials {
  id: string
  title: string
  company: string
  source_url: string
  generated_resume: string | null
  generated_cover_letter: string | null
  generation_timestamp: string | null
  quality_passed: boolean | null
  score: number | null
  fit: string | null
  status: string
  created_at: string
}

export default function MaterialsPage() {
  const [jobs, setJobs] = useState<JobWithMaterials[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [candidateName, setCandidateName] = useState("Candidate")

  useEffect(() => {
    loadMaterials()
    loadProfile()
  }, [])

  async function loadMaterials() {
    const supabase = createBrowserClient()
    
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company, source_url, generated_resume, generated_cover_letter, generation_timestamp, quality_passed, score, fit, status, created_at")
      .or("generated_resume.neq.null,generated_cover_letter.neq.null")
      .order("generation_timestamp", { ascending: false, nullsFirst: false })
    
    if (error) {
      console.error("Error loading materials:", error)
      toast.error("Failed to load materials")
    } else {
      setJobs(data || [])
    }
    
    setLoading(false)
  }

  async function loadProfile() {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from("user_profile")
      .select("full_name")
      .limit(1)
      .maybeSingle()
    
    if (data?.full_name) {
      setCandidateName(data.full_name)
    }
  }

  async function handleDownload(job: JobWithMaterials, type: "resume" | "cover_letter", format: "docx" | "txt") {
    try {
      const endpoint = type === "resume" ? "/api/export/resume" : "/api/export/cover-letter"
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          format,
        }),
      })

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const filename = generateDocumentFilename({
        candidateName,
        role: job.title,
        company: job.company,
        documentType: type,
        extension: format,
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Downloaded ${filename}`)
    } catch (error) {
      toast.error("Download failed")
    }
  }

  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase()
    return (
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query)
    )
  })

  const stats = {
    total: jobs.length,
    withResume: jobs.filter(j => j.generated_resume).length,
    withCoverLetter: jobs.filter(j => j.generated_cover_letter).length,
    passed: jobs.filter(j => j.quality_passed).length,
  }

  return (
    <div className="container py-8 space-y-8">
      <BackButton fallbackHref="/" />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generated Materials</h1>
        <p className="text-muted-foreground mt-1">
          View and download your tailored resumes and cover letters
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <File className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withResume}</p>
                <p className="text-sm text-muted-foreground">Resumes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <FileText className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withCoverLetter}</p>
                <p className="text-sm text-muted-foreground">Cover Letters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.passed}</p>
                <p className="text-sm text-muted-foreground">Quality Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Materials Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                {searchQuery 
                  ? "No materials match your search" 
                  : "No generated materials yet"
                }
              </p>
              {!searchQuery && (
                <Link href="/jobs">
                  <Button variant="outline" className="mt-4">
                    Browse Jobs
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{job.title}</p>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            {job.company}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.generated_resume && (
                          <Badge variant="secondary" className="gap-1">
                            <File className="h-3 w-3" />
                            Resume
                          </Badge>
                        )}
                        {job.generated_cover_letter && (
                          <Badge variant="secondary" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Cover
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.quality_passed === true ? (
                        <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Passed
                        </Badge>
                      ) : job.quality_passed === false ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Issues
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {job.generation_timestamp 
                          ? formatDistanceToNow(new Date(job.generation_timestamp), { addSuffix: true })
                          : "—"
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <Link href={`/jobs/${job.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Job
                            </DropdownMenuItem>
                          </Link>
                          {job.source_url && (
                            <DropdownMenuItem onClick={() => window.open(job.source_url, "_blank")}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Original Posting
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {job.generated_resume && (
                            <>
                              <DropdownMenuItem onClick={() => handleDownload(job, "resume", "docx")}>
                                <Download className="h-4 w-4 mr-2" />
                                Resume (DOCX)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(job, "resume", "txt")}>
                                <Download className="h-4 w-4 mr-2" />
                                Resume (TXT)
                              </DropdownMenuItem>
                            </>
                          )}
                          {job.generated_cover_letter && (
                            <>
                              <DropdownMenuItem onClick={() => handleDownload(job, "cover_letter", "docx")}>
                                <Download className="h-4 w-4 mr-2" />
                                Cover Letter (DOCX)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(job, "cover_letter", "txt")}>
                                <Download className="h-4 w-4 mr-2" />
                                Cover Letter (TXT)
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Filename Convention Info */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Filename Convention</CardTitle>
          <CardDescription>
            All downloaded files follow a consistent naming pattern for easy organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="p-2 rounded bg-background">
              <span className="text-muted-foreground">Resume:</span>{" "}
              <span className="text-primary">{candidateName.replace(/\s/g, "_")}_[Role]_[Company]_Resume.docx</span>
            </div>
            <div className="p-2 rounded bg-background">
              <span className="text-muted-foreground">Cover Letter:</span>{" "}
              <span className="text-primary">{candidateName.replace(/\s/g, "_")}_[Role]_[Company]_CoverLetter.docx</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
