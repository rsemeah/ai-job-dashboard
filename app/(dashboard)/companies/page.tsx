"use client"

import Link from "next/link"
import { mockJobs } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Briefcase, ExternalLink } from "lucide-react"

export default function CompaniesPage() {
  // Group jobs by company
  const companiesData = mockJobs.reduce((acc, job) => {
    if (!acc[job.company]) {
      acc[job.company] = {
        name: job.company,
        jobs: [],
        totalJobs: 0,
        appliedJobs: 0,
        avgScore: 0,
      }
    }
    acc[job.company].jobs.push(job)
    acc[job.company].totalJobs++
    if (job.status === "APPLIED" || job.status === "INTERVIEW" || job.status === "OFFER") {
      acc[job.company].appliedJobs++
    }
    return acc
  }, {} as Record<string, { name: string; jobs: typeof mockJobs; totalJobs: number; appliedJobs: number; avgScore: number }>)

  // Calculate average scores
  Object.values(companiesData).forEach(company => {
    const scoredJobs = company.jobs.filter(j => j.score !== null)
    if (scoredJobs.length > 0) {
      company.avgScore = Math.round(
        scoredJobs.reduce((sum, j) => sum + (j.score || 0), 0) / scoredJobs.length
      )
    }
  })

  const companies = Object.values(companiesData).sort((a, b) => b.totalJobs - a.totalJobs)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground">
          Overview of companies you have applied to or are tracking
        </p>
      </div>

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
              {(mockJobs.length / companies.length).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
