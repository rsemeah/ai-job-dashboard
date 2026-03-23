"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import type { Job, JobStatus, JobFit, JobSource } from "@/lib/types"
import { StatusBadge, FitBadge, SourceBadge } from "@/components/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Search } from "lucide-react"

const ALL_STATUSES: JobStatus[] = [
  "NEW",
  "SCORED",
  "READY_TO_APPLY",
  "APPLIED",
  "REJECTED",
  "INTERVIEW",
  "OFFER",
  "ARCHIVED",
]

const ALL_FITS: JobFit[] = ["HIGH", "MEDIUM", "LOW", "UNSCORED"]

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface JobsTableProps {
  jobs: Job[]
}

export function JobsTable({ jobs }: JobsTableProps) {
  const [statusFilter, setStatusFilter] = useState<JobStatus | "ALL">("ALL")
  const [fitFilter, setFitFilter] = useState<JobFit | "ALL">("ALL")
  const [sourceFilter, setSourceFilter] = useState<JobSource | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Get unique sources from jobs
  const uniqueSources = useMemo(() => {
    const sources = new Set(jobs.map(job => job.source))
    return Array.from(sources)
  }, [jobs])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== "ALL" && job.status !== statusFilter) return false
      if (fitFilter !== "ALL" && job.fit !== fitFilter) return false
      if (sourceFilter !== "ALL" && job.source !== sourceFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!job.title.toLowerCase().includes(query) && 
            !job.company.toLowerCase().includes(query)) {
          return false
        }
      }
      return true
    })
  }, [jobs, statusFilter, fitFilter, sourceFilter, searchQuery])

  const hasFilters = statusFilter !== "ALL" || fitFilter !== "ALL" || sourceFilter !== "ALL" || searchQuery !== ""

  const clearFilters = () => {
    setStatusFilter("ALL")
    setFitFilter("ALL")
    setSourceFilter("ALL")
    setSearchQuery("")
  }

  return (
    <>
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px] pl-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Source
              </label>
              <Select
                value={sourceFilter}
                onValueChange={(value) => setSourceFilter(value as JobSource | "ALL")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  {uniqueSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Fit
              </label>
              <Select
                value={fitFilter}
                onValueChange={(value) => setFitFilter(value as JobFit | "ALL")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Fits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Fits</SelectItem>
                  {ALL_FITS.map((fit) => (
                    <SelectItem key={fit} value={fit}>
                      {fit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as JobStatus | "ALL")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {ALL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Fit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No jobs found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link 
                        href={`/jobs/${job.id}`}
                        className="font-medium hover:underline"
                      >
                        {job.title}
                      </Link>
                    </TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>
                      <SourceBadge source={job.source} />
                    </TableCell>
                    <TableCell className="text-center">
                      {job.score !== null ? (
                        <span className="font-mono font-medium">{job.score}</span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <FitBadge fit={job.fit || "UNSCORED"} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(job.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>
    </>
  )
}
