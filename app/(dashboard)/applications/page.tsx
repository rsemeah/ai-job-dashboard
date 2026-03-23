import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
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
import { Calendar, Send } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

function formatDate(dateString: string | null) {
  if (!dateString) return "--"
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function ApplicationsPage() {
  const supabase = await createClient()
  
  // Fetch jobs that have been applied to
  const { data: appliedJobs, error } = await supabase
    .from("jobs")
    .select("*")
    .in("status", ["APPLIED", "INTERVIEW", "OFFER", "REJECTED"])
    .order("applied_at", { ascending: false, nullsFirst: false })

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">
            Track submitted applications and interview schedules
          </p>
        </div>
        <ErrorState 
          title="Unable to load applications"
          message={error.message}
        />
      </div>
    )
  }

  const applications = appliedJobs || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">
          Track submitted applications and interview schedules
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState variant="applications" />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Total Applied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applications.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Interviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-500">
                  {applications.filter(j => j.status === "INTERVIEW").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Offers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {applications.filter(j => j.status === "OFFER").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Submitted Applications</CardTitle>
              <CardDescription>
                {applications.length} application{applications.length !== 1 ? "s" : ""} submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((job) => (
                    <TableRow key={job.id}>
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
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(job.applied_at)}
                      </TableCell>
                      <TableCell>
                        {job.score !== null ? (
                          <span className="font-mono">{job.score}</span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Interviews Section */}
          {applications.filter(j => j.status === "INTERVIEW").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Interview Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications
                    .filter(job => job.status === "INTERVIEW")
                    .map(job => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                            <Calendar className="h-5 w-5 text-pink-500" />
                          </div>
                          <div>
                            <p className="font-medium">{job.title}</p>
                            <p className="text-sm text-muted-foreground">{job.company}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-transparent">
                          Interview
                        </Badge>
                      </Link>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
