"use client"

import Link from "next/link"
import { mockApplications, mockJobs } from "@/lib/mock-data"
import { StatusBadge } from "@/components/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Video, Phone, Building2, MonitorSmartphone } from "lucide-react"

function formatDate(dateString: string | null) {
  if (!dateString) return "--"
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "--"
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const interviewTypeIcons = {
  PHONE: Phone,
  VIDEO: Video,
  ONSITE: Building2,
  TECHNICAL: MonitorSmartphone,
}

export default function ApplicationsPage() {
  const applicationsWithJobs = mockApplications.map(app => {
    const job = mockJobs.find(j => j.id === app.job_id)
    return { ...app, job }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">
          Track submitted applications and interview schedules
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submitted Applications</CardTitle>
              <CardDescription>
                {applicationsWithJobs.length} application{applicationsWithJobs.length !== 1 ? "s" : ""} submitted
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Interview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicationsWithJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No applications submitted yet.
                  </TableCell>
                </TableRow>
              ) : (
                applicationsWithJobs.map((app) => {
                  const InterviewIcon = app.interview_type 
                    ? interviewTypeIcons[app.interview_type] 
                    : null

                  return (
                    <TableRow key={app.id}>
                      <TableCell>
                        <Link
                          href={`/jobs/${app.job_id}`}
                          className="font-medium hover:underline"
                        >
                          {app.job?.title || "Unknown Job"}
                        </Link>
                      </TableCell>
                      <TableCell>{app.job?.company || "Unknown"}</TableCell>
                      <TableCell>
                        {app.job && <StatusBadge status={app.job.status} />}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(app.submitted_at)}
                      </TableCell>
                      <TableCell>
                        {app.interview_date ? (
                          <div className="flex items-center gap-2">
                            {InterviewIcon && (
                              <InterviewIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {formatDateTime(app.interview_date)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {app.interview_type}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upcoming Interviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Interviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applicationsWithJobs
              .filter(app => app.interview_date)
              .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime())
              .map(app => {
                const InterviewIcon = app.interview_type 
                  ? interviewTypeIcons[app.interview_type] 
                  : Calendar

                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <InterviewIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{app.job?.title}</p>
                        <p className="text-sm text-muted-foreground">{app.job?.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatDateTime(app.interview_date)}</p>
                      <Badge variant="outline">{app.interview_type}</Badge>
                    </div>
                  </div>
                )
              })}
            {applicationsWithJobs.filter(app => app.interview_date).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No upcoming interviews scheduled.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
