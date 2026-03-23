import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DocumentsPage() {
  const supabase = await createClient()
  
  // Fetch jobs that have documents (score_strengths or score_gaps populated)
  const { data: jobsWithDocs, error } = await supabase
    .from("jobs")
    .select("id, title, company, score, score_strengths, score_gaps, raw_description")
    .not("score", "is", null)
    .order("score", { ascending: false })

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
          <p className="text-muted-foreground">
            Generated application materials for reviewed jobs
          </p>
        </div>
        <ErrorState 
          title="Unable to load documents"
          message={error.message}
        />
      </div>
    )
  }

  const jobs = jobsWithDocs || []
  const jobsWithMaterials = jobs.filter(j => 
    (j.score_strengths && j.score_strengths.length > 0) || 
    (j.score_gaps && j.score_gaps.length > 0)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
        <p className="text-muted-foreground">
          Generated application materials for reviewed jobs
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Scored Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsWithMaterials.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.length > 0 
                ? Math.round(jobs.reduce((sum, j) => sum + (j.score || 0), 0) / jobs.length)
                : "--"
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {jobs.length === 0 ? (
        <EmptyState variant="documents" />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription>{job.company}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono">{job.score}</div>
                    <p className="text-xs text-muted-foreground">Fit Score</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Strengths */}
                {job.score_strengths && job.score_strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {job.score_strengths.map((strength: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-emerald-500 mt-1">+</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gaps */}
                {job.score_gaps && job.score_gaps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                      Gaps to Address
                    </h4>
                    <ul className="space-y-1">
                      {job.score_gaps.map((gap: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-amber-500 mt-1">-</span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* No analysis yet */}
                {(!job.score_strengths || job.score_strengths.length === 0) && 
                 (!job.score_gaps || job.score_gaps.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">
                    Score available, detailed analysis pending.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
