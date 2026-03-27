"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Target,
  Loader2,
  TrendingUp,
  TrendingDown,
  Award,
  Briefcase,
  GraduationCap,
  Wrench,
  Building2,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Info,
  Eye,
  Shield,
  FileText,
  BarChart3,
  Minus,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Job, EvidenceRecord } from "@/lib/types"
import { FIT_CONFIG } from "@/lib/types"
import { 
  calculateScoreBreakdown, 
  determineGenerationStrategy,
  type ScoreBreakdown as TruthSerumScoreBreakdown 
} from "@/lib/truthserum"

interface ScoreCategory {
  category: string
  score: number
  maxScore: number
  reasoning: string
  icon: React.ReactNode
  weight: string
  color: string
}

export default function ScoringCenterPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [decision, setDecision] = useState<"apply" | "skip" | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      const [{ data: jobData }, { data: evidenceData }] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", jobId).single(),
        supabase.from("evidence_library").select("*").eq("is_active", true),
      ])
      
      if (jobData) setJob(jobData as Job)
      if (evidenceData) setEvidence(evidenceData as EvidenceRecord[])
      
      setLoading(false)
    }
    loadData()
  }, [jobId])

  // Calculate scores using grounded metrics
  const scoreBreakdown = useMemo(() => {
    if (!job || evidence.length === 0) return null
    
    // Get selected evidence IDs from evidence_map if available
    const selectedIds = job.evidence_map && typeof job.evidence_map === 'object' && 'selected_evidence_ids' in job.evidence_map
      ? (job.evidence_map.selected_evidence_ids as string[])
      : evidence.map(e => e.id)
    
    return calculateScoreBreakdown(
      job,
      evidence,
      selectedIds,
      job.generated_resume || undefined,
      job.generated_cover_letter || undefined
    )
  }, [job, evidence])

  // Determine generation strategy
  const strategy = useMemo(() => {
    if (!job || !scoreBreakdown) return null
    
    const evidenceQuality = evidence.filter(e => e.confidence_level === "high").length / (evidence.length || 1) * 100
    const requirementCoverage = scoreBreakdown.role_alignment_score
    
    return determineGenerationStrategy(job, requirementCoverage, evidenceQuality)
  }, [job, scoreBreakdown, evidence])

  // Transform into display format
  const scoreCategories: ScoreCategory[] = useMemo(() => {
    if (!scoreBreakdown) return []
    
    return [
      {
        category: "ATS Keywords",
        score: scoreBreakdown.ats_score,
        maxScore: 100,
        reasoning: scoreBreakdown.ats_reasoning,
        icon: <Target className="h-5 w-5 text-green-500" />,
        weight: "15%",
        color: "green"
      },
      {
        category: "Truth Score",
        score: scoreBreakdown.truth_score,
        maxScore: 100,
        reasoning: scoreBreakdown.truth_reasoning,
        icon: <Shield className="h-5 w-5 text-blue-500" />,
        weight: "20%",
        color: "blue"
      },
      {
        category: "Role Alignment",
        score: scoreBreakdown.role_alignment_score,
        maxScore: 100,
        reasoning: scoreBreakdown.role_alignment_reasoning,
        icon: <Briefcase className="h-5 w-5 text-purple-500" />,
        weight: "25%",
        color: "purple"
      },
      {
        category: "Recruiter Clarity",
        score: scoreBreakdown.recruiter_clarity_score,
        maxScore: 100,
        reasoning: scoreBreakdown.recruiter_clarity_reasoning,
        icon: <Eye className="h-5 w-5 text-cyan-500" />,
        weight: "15%",
        color: "cyan"
      },
      {
        category: "Tool Match",
        score: scoreBreakdown.tool_match_score,
        maxScore: 100,
        reasoning: scoreBreakdown.tool_match_reasoning,
        icon: <Wrench className="h-5 w-5 text-orange-500" />,
        weight: "10%",
        color: "orange"
      },
      {
        category: "Metric Density",
        score: scoreBreakdown.metric_density_score,
        maxScore: 100,
        reasoning: scoreBreakdown.metric_density_reasoning,
        icon: <BarChart3 className="h-5 w-5 text-indigo-500" />,
        weight: "15%",
        color: "indigo"
      },
    ]
  }, [scoreBreakdown])

  function determineFit(score: number): "HIGH" | "MEDIUM" | "LOW" {
    if (score >= 70) return "HIGH"
    if (score >= 45) return "MEDIUM"
    return "LOW"
  }

  async function makeDecision(choice: "apply" | "skip") {
    if (!job || !scoreBreakdown) return
    
    const supabase = createClient()
    const newStatus = choice === "apply" ? "READY" : "ARCHIVED"
    
    const { error } = await supabase
      .from("jobs")
      .update({ 
        status: newStatus,
        score: scoreBreakdown.overall_score,
        fit: determineFit(scoreBreakdown.overall_score),
      })
      .eq("id", jobId)
    
    if (error) {
      toast.error("Failed to update status")
    } else {
      setDecision(choice)
      toast.success(choice === "apply" ? "Marked as Ready to Apply!" : "Job archived")
      setTimeout(() => router.push("/jobs"), 1500)
    }
  }

  const overallScore = scoreBreakdown?.overall_score || job?.score || 0
  const fit = determineFit(overallScore)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Final Scoring Center
            </h1>
            <p className="text-muted-foreground">{job.title} at {job.company}</p>
          </div>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card className={`border-2 ${
        fit === "HIGH" ? "border-green-200 bg-green-50/50" :
        fit === "MEDIUM" ? "border-yellow-200 bg-yellow-50/50" :
        "border-red-200 bg-red-50/50"
      }`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold ${
                fit === "HIGH" ? "bg-green-100 text-green-700" :
                fit === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>
                {overallScore}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{FIT_CONFIG[fit].label}</h2>
                <p className="text-muted-foreground">{FIT_CONFIG[fit].description}</p>
                <div className="flex items-center gap-4 mt-2">
                  {job.role_family && <Badge variant="outline">{job.role_family}</Badge>}
                  {job.seniority_level && <Badge variant="outline">{job.seniority_level}</Badge>}
                  {job.industry_guess && <Badge variant="outline">{job.industry_guess}</Badge>}
                </div>
              </div>
            </div>
            
            {/* Decision Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => makeDecision("apply")}
                disabled={decision !== null || (strategy?.strategy === "do_not_generate")}
              >
                <ThumbsUp className="h-5 w-5 mr-2" />
                Worth Pursuing
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => makeDecision("skip")}
                disabled={decision !== null}
              >
                <ThumbsDown className="h-5 w-5 mr-2" />
                Skip This One
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Explanation */}
      {strategy && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Generation Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Badge 
                variant="outline" 
                className={`text-sm px-3 py-1 ${
                  strategy.strategy === "direct_match" ? "border-green-500 text-green-700 bg-green-50" :
                  strategy.strategy === "adjacent_transition" ? "border-blue-500 text-blue-700 bg-blue-50" :
                  strategy.strategy === "stretch_honest" ? "border-amber-500 text-amber-700 bg-amber-50" :
                  "border-red-500 text-red-700 bg-red-50"
                }`}
              >
                {strategy.strategy === "direct_match" ? "Direct Match" :
                 strategy.strategy === "adjacent_transition" ? "Adjacent Transition" :
                 strategy.strategy === "stretch_honest" ? "Stretch (Honest)" :
                 "Do Not Generate"}
              </Badge>
              <p className="text-sm text-muted-foreground flex-1">{strategy.reasoning}</p>
            </div>
            
            {strategy.strategy === "do_not_generate" && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <strong>Not Recommended:</strong> This role has too many gaps to generate truthful materials.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Genericity Penalty Warning */}
      {scoreBreakdown && scoreBreakdown.genericity_penalty > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Minus className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Genericity Penalty: -{scoreBreakdown.genericity_penalty} points</h4>
                <p className="text-sm text-amber-700 mt-1">{scoreBreakdown.genericity_reasoning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Breakdown */}
      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Score Breakdown</h2>
        
        {scoreCategories.map((item, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {item.icon}
                  <div>
                    <h3 className="font-medium">{item.category}</h3>
                    <p className="text-xs text-muted-foreground">{item.weight} of total score</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    item.score >= 70 ? "text-green-600" :
                    item.score >= 45 ? "text-yellow-600" :
                    "text-red-600"
                  }`}>{item.score}</div>
                  <div className="text-xs text-muted-foreground">/ {item.maxScore}</div>
                </div>
              </div>
              
              <Progress 
                value={item.score} 
                className={`h-2 mb-3 ${
                  item.score >= 70 ? "[&>div]:bg-green-500" :
                  item.score >= 45 ? "[&>div]:bg-yellow-500" :
                  "[&>div]:bg-red-500"
                }`} 
              />
              
              {/* Reasoning explanation with reason codes */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Eye className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span><strong>Why:</strong> {item.reasoning}</span>
                </p>
                {item.score < 70 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 border-amber-200 text-amber-700">
                      REASON CODE
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {item.score < 40 ? "TRUE_GAP: Missing evidence" :
                       item.score < 60 ? "EVIDENCE_GAP: Have experience but missing proof" :
                       "TERMINOLOGY_GAP: Experience doesn't use same keywords"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href={`/jobs/${jobId}/evidence-match`}>
              <Button variant="outline" className="w-full justify-between">
                Review Evidence Map
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/jobs/${jobId}/red-team`}>
              <Button variant="outline" className="w-full justify-between">
                Red Team Review
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/jobs/${jobId}`}>
              <Button variant="outline" className="w-full justify-between">
                View Full Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
