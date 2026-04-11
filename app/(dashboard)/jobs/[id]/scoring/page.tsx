import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getJob } from "@/lib/actions/jobs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BackButton } from "@/components/back-button"
import { ArrowRight, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500"
  const label = score >= 75 ? "Strong Fit" : score >= 50 ? "Moderate Fit" : "Weak Fit"

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-6xl font-mono font-bold ${color}`}>{score}</div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </div>
  )
}

function DimensionRow({
  label,
  score,
}: {
  label: string
  score: number | null | undefined
}) {
  if (score === null || score === undefined) return null
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"
  const Icon = score >= 70 ? TrendingUp : score >= 40 ? Minus : TrendingDown

  return (
    <div className="flex items-center gap-4">
      <div className="w-40 text-sm text-muted-foreground shrink-0">{label}</div>
      <Progress value={score} className={`h-2 flex-1 [&>div]:${color}`} />
      <div className="flex items-center gap-1.5 w-16 justify-end">
        <Icon className={`h-3.5 w-3.5 ${score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-500"}`} />
        <span className="text-sm font-mono font-medium">{score}</span>
      </div>
    </div>
  )
}

export default async function ScoringPage({ params }: Props) {
  const { id: jobId } = await params

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect("/login")

  const job = await getJob(jobId)
  if (!job) redirect("/jobs")

  const scores = (job.job_scores as Array<{
    overall_score?: number
    confidence_score?: number
    skills_match?: number
    experience_relevance?: number
    evidence_quality?: number
    seniority_alignment?: number
    ats_keywords?: number
  }>) || []

  const scoreRow = scores[0]
  const overallScore = scoreRow?.overall_score ?? job.score
  const gaps: string[] = (job.score_gaps as string[]) || []
  const strengths: string[] = (job.score_strengths as string[]) || []

  if (!overallScore && overallScore !== 0) {
    return (
      <div className="space-y-8 max-w-3xl">
        <BackButton fallbackHref={`/jobs/${jobId}`} />
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-medium tracking-tight">Fit Score</h1>
          <p className="text-muted-foreground">This job hasn&apos;t been scored yet.</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Score will be calculated automatically after analysis completes.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fitLabel = overallScore >= 75 ? "Strong Fit" : overallScore >= 50 ? "Moderate Fit" : "Weak Fit"
  const fitVariant = overallScore >= 75 ? "default" : overallScore >= 50 ? "secondary" : "destructive"

  const hasDimensions = scoreRow && (
    scoreRow.skills_match !== undefined ||
    scoreRow.experience_relevance !== undefined ||
    scoreRow.seniority_alignment !== undefined ||
    scoreRow.ats_keywords !== undefined
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <BackButton fallbackHref={`/jobs/${jobId}`} />

      <div className="space-y-1">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          Fit Analysis
        </p>
        <h1 className="text-3xl font-serif font-medium tracking-tight">
          {job.title}
        </h1>
        <p className="text-muted-foreground">{job.company}</p>
      </div>

      {/* Score card */}
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={overallScore} />
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Badge variant={fitVariant}>{fitLabel}</Badge>
                {scoreRow?.confidence_score && (
                  <span className="text-xs text-muted-foreground">
                    {scoreRow.confidence_score}% confidence
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Score calculated based on your evidence library, skills match, and alignment with this role&apos;s requirements. Scores above 75 indicate strong candidacy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension breakdown */}
      {hasDimensions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Breakdown</CardTitle>
            <CardDescription>How each dimension contributed to your overall score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DimensionRow label="Skills Match" score={scoreRow?.skills_match} />
            <DimensionRow label="Experience Relevance" score={scoreRow?.experience_relevance} />
            <DimensionRow label="Seniority Alignment" score={scoreRow?.seniority_alignment} />
            <DimensionRow label="ATS Keywords" score={scoreRow?.ats_keywords} />
            <DimensionRow label="Evidence Quality" score={scoreRow?.evidence_quality} />
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Gaps */}
      {gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Gaps to Address
            </CardTitle>
            <CardDescription>
              Areas where your profile doesn&apos;t fully match the job requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {gaps.map((g, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next action */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/jobs/${jobId}`}>
            Back to Job
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
