"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Wand2,
  Settings2,
  RotateCcw,
  Save,
  CheckCircle,
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
import {
  type ScoringWeights,
  DEFAULT_WEIGHTS,
  getWeightsForRole,
  getRoleProfileDescription,
  normalizeWeights,
  calculateWeightedScore,
  getAvailableRoles,
  inferRoleFromJobTitle,
} from "@/lib/scoring-weights"
import { BackButton } from "@/components/back-button"

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
  
  // Scoring weights state
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS)
  const [selectedRole, setSelectedRole] = useState<string>("Other")
  const [isManualMode, setIsManualMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [scoreSaved, setScoreSaved] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      
      // Fetch job with related data from normalized tables
      const [{ data: jobData }, { data: evidenceData }] = await Promise.all([
        supabase.from("jobs").select(`
          *,
          job_scores (*),
          job_analyses (*)
        `).eq("id", jobId).eq("user_id", user.id).single(),
        supabase.from("evidence_library").select("*").eq("is_active", true).eq("user_id", user.id),
      ])
      
      if (jobData) {
        // Transform to UI-expected format
        const analyses = (jobData.job_analyses as Array<Record<string, unknown>>) || []
        const scores = (jobData.job_scores as Array<Record<string, unknown>>) || []
        const analysis = analyses[0] || {}
        const scoreData = scores[0] || {}
        
        const transformedJob = {
          ...jobData,
          title: jobData.role_title || analysis.title,
          company: jobData.company_name || analysis.company,
          score: scoreData.overall_score || null,
          role_family: analysis.role_family || null,
          job_analyses: analyses,
          job_scores: scores,
        }
        
        setJob(transformedJob as Job)
        
        // Auto-detect role from job title
        const inferredRole = inferRoleFromJobTitle(transformedJob.title as string) || transformedJob.role_family || "Other"
        setSelectedRole(inferredRole)
        setWeights(getWeightsForRole(inferredRole))
      }
      if (evidenceData) setEvidence(evidenceData as EvidenceRecord[])
      
      setLoading(false)
    }
    loadData()
  }, [jobId, router])

  // Handle auto-calculate from role
  const handleAutoCalculate = () => {
    const roleWeights = getWeightsForRole(selectedRole)
    setWeights(roleWeights)
    setIsManualMode(false)
    toast.success(`Weights calculated for ${selectedRole}`)
  }

  // Handle role change
  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    if (!isManualMode) {
      const roleWeights = getWeightsForRole(role)
      setWeights(roleWeights)
    }
  }

  // Handle individual weight change
  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    setIsManualMode(true)
    const newWeights = { ...weights, [key]: value }
    // Normalize to keep sum at 100
    setWeights(normalizeWeights(newWeights))
  }

  // Reset to defaults
  const handleResetWeights = () => {
    setWeights(DEFAULT_WEIGHTS)
    setIsManualMode(false)
    setSelectedRole("Other")
  }

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

  // Calculate weighted overall score using custom weights
  const weightedOverallScore = useMemo(() => {
    if (!scoreBreakdown) return 0
    
    // Map TruthSerum scores to our weight dimensions
    const scores = {
      experience_relevance: scoreBreakdown.role_alignment_score,
      evidence_quality: scoreBreakdown.truth_score,
      skills_match: scoreBreakdown.tool_match_score,
      seniority_alignment: Math.max(0, 100 - scoreBreakdown.genericity_penalty * 3),
      ats_keywords: scoreBreakdown.ats_score,
    }
    
    return calculateWeightedScore(scores, weights)
  }, [scoreBreakdown, weights])

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
        weight: `${weights.ats_keywords}%`,
        color: "green"
      },
      {
        category: "Evidence Quality",
        score: scoreBreakdown.truth_score,
        maxScore: 100,
        reasoning: scoreBreakdown.truth_reasoning,
        icon: <Shield className="h-5 w-5 text-blue-500" />,
        weight: `${weights.evidence_quality}%`,
        color: "blue"
      },
      {
        category: "Experience Relevance",
        score: scoreBreakdown.role_alignment_score,
        maxScore: 100,
        reasoning: scoreBreakdown.role_alignment_reasoning,
        icon: <Briefcase className="h-5 w-5 text-purple-500" />,
        weight: `${weights.experience_relevance}%`,
        color: "purple"
      },
      {
        category: "Recruiter Clarity",
        score: scoreBreakdown.recruiter_clarity_score,
        maxScore: 100,
        reasoning: scoreBreakdown.recruiter_clarity_reasoning,
        icon: <Eye className="h-5 w-5 text-cyan-500" />,
        weight: `${weights.seniority_alignment}%`,
        color: "cyan"
      },
      {
        category: "Skills Match",
        score: scoreBreakdown.tool_match_score,
        maxScore: 100,
        reasoning: scoreBreakdown.tool_match_reasoning,
        icon: <Wrench className="h-5 w-5 text-orange-500" />,
        weight: `${weights.skills_match}%`,
        color: "orange"
      },
      {
        category: "Metric Density",
        score: scoreBreakdown.metric_density_score,
        maxScore: 100,
        reasoning: scoreBreakdown.metric_density_reasoning,
        icon: <BarChart3 className="h-5 w-5 text-indigo-500" />,
        weight: "bonus",
        color: "indigo"
      },
    ]
  }, [scoreBreakdown, weights])

  function determineFit(score: number): "HIGH" | "MEDIUM" | "LOW" {
    if (score >= 70) return "HIGH"
    if (score >= 45) return "MEDIUM"
    return "LOW"
  }

  // Save score to database without making apply/skip decision
  async function saveScore() {
    if (!job || !scoreBreakdown) return
    
    setIsSaving(true)
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Please log in to continue")
      setIsSaving(false)
      return
    }
    
    const fit = determineFit(weightedOverallScore)
    
    // Build score reasoning object
    const scoreReasoning = {
      weights_used: weights,
      selected_role: selectedRole,
      is_manual_mode: isManualMode,
      breakdown: {
        ats_score: scoreBreakdown.ats_score,
        ats_reasoning: scoreBreakdown.ats_reasoning,
        truth_score: scoreBreakdown.truth_score,
        truth_reasoning: scoreBreakdown.truth_reasoning,
        role_alignment_score: scoreBreakdown.role_alignment_score,
        role_alignment_reasoning: scoreBreakdown.role_alignment_reasoning,
        tool_match_score: scoreBreakdown.tool_match_score,
        tool_match_reasoning: scoreBreakdown.tool_match_reasoning,
        recruiter_clarity_score: scoreBreakdown.recruiter_clarity_score,
        recruiter_clarity_reasoning: scoreBreakdown.recruiter_clarity_reasoning,
        metric_density_score: scoreBreakdown.metric_density_score,
        metric_density_reasoning: scoreBreakdown.metric_density_reasoning,
        genericity_penalty: scoreBreakdown.genericity_penalty,
        genericity_reasoning: scoreBreakdown.genericity_reasoning,
      },
      score_explanation: `Weighted score of ${weightedOverallScore}/100 based on ${selectedRole} role weights. ${fit === "HIGH" ? "Strong match" : fit === "MEDIUM" ? "Moderate match with some gaps" : "Significant gaps identified"}.`,
    }
    
    // Extract gaps and strengths from scoreBreakdown
    const scoreGaps: string[] = []
    const scoreStrengths: string[] = []
    
    if (scoreBreakdown.ats_score < 60) scoreGaps.push(`ATS keywords: ${scoreBreakdown.ats_reasoning}`)
    else scoreStrengths.push(`ATS keywords: ${scoreBreakdown.ats_reasoning}`)
    
    if (scoreBreakdown.truth_score < 60) scoreGaps.push(`Evidence quality: ${scoreBreakdown.truth_reasoning}`)
    else scoreStrengths.push(`Evidence quality: ${scoreBreakdown.truth_reasoning}`)
    
    if (scoreBreakdown.role_alignment_score < 60) scoreGaps.push(`Role alignment: ${scoreBreakdown.role_alignment_reasoning}`)
    else scoreStrengths.push(`Role alignment: ${scoreBreakdown.role_alignment_reasoning}`)
    
    if (scoreBreakdown.tool_match_score < 60) scoreGaps.push(`Skills match: ${scoreBreakdown.tool_match_reasoning}`)
    else scoreStrengths.push(`Skills match: ${scoreBreakdown.tool_match_reasoning}`)
    
    const { error } = await supabase
      .from("jobs")
      .update({
        score: weightedOverallScore,
        fit: fit,
        score_reasoning: scoreReasoning,
        score_gaps: scoreGaps,
        score_strengths: scoreStrengths,
        scored_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
    
    setIsSaving(false)
    
    if (error) {
      toast.error("Failed to save score")
    } else {
      setScoreSaved(true)
      toast.success("Score saved to job record")
    }
  }

  async function makeDecision(choice: "apply" | "skip") {
    if (!job || !scoreBreakdown) return
    
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Please log in to continue")
      return
    }
    
    const newStatus = choice === "apply" ? "ready" : "archived"
    const fit = determineFit(weightedOverallScore)
    
    // Build complete score data
    const scoreReasoning = {
      weights_used: weights,
      selected_role: selectedRole,
      is_manual_mode: isManualMode,
      breakdown: {
        ats_score: scoreBreakdown.ats_score,
        truth_score: scoreBreakdown.truth_score,
        role_alignment_score: scoreBreakdown.role_alignment_score,
        tool_match_score: scoreBreakdown.tool_match_score,
        recruiter_clarity_score: scoreBreakdown.recruiter_clarity_score,
        metric_density_score: scoreBreakdown.metric_density_score,
        genericity_penalty: scoreBreakdown.genericity_penalty,
      },
      score_explanation: `Weighted score of ${weightedOverallScore}/100 based on ${selectedRole} role weights.`,
    }
    
    // Extract gaps and strengths
    const scoreGaps: string[] = []
    const scoreStrengths: string[] = []
    
    if (scoreBreakdown.ats_score < 60) scoreGaps.push(`ATS keywords: ${scoreBreakdown.ats_reasoning}`)
    else scoreStrengths.push(`ATS keywords: ${scoreBreakdown.ats_reasoning}`)
    
    if (scoreBreakdown.truth_score < 60) scoreGaps.push(`Evidence quality: ${scoreBreakdown.truth_reasoning}`)
    else scoreStrengths.push(`Evidence quality: ${scoreBreakdown.truth_reasoning}`)
    
    if (scoreBreakdown.role_alignment_score < 60) scoreGaps.push(`Role alignment: ${scoreBreakdown.role_alignment_reasoning}`)
    else scoreStrengths.push(`Role alignment: ${scoreBreakdown.role_alignment_reasoning}`)
    
    if (scoreBreakdown.tool_match_score < 60) scoreGaps.push(`Skills match: ${scoreBreakdown.tool_match_reasoning}`)
    else scoreStrengths.push(`Skills match: ${scoreBreakdown.tool_match_reasoning}`)
    
    const { error } = await supabase
      .from("jobs")
      .update({ 
        status: newStatus,
        score: weightedOverallScore,
        fit: fit,
        score_reasoning: scoreReasoning,
        score_gaps: scoreGaps,
        score_strengths: scoreStrengths,
        scored_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
    
    if (error) {
      toast.error("Failed to update status")
    } else {
      setDecision(choice)
      toast.success(choice === "apply" ? "Marked as Ready to Apply!" : "Job archived")
      setTimeout(() => router.push("/jobs"), 1500)
    }
  }

  const overallScore = weightedOverallScore || job?.score || 0
  const fit = determineFit(overallScore)

  // Navigate to next step in the workflow
  const handleProceedToEvidenceMatch = () => {
    router.push(`/jobs/${jobId}/evidence-match`)
  }

  const handleProceedToRedTeam = () => {
    router.push(`/jobs/${jobId}/red-team`)
  }

  const handleProceedToInterviewPrep = () => {
    router.push(`/jobs/${jobId}/interview-prep`)
  }

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

  const weightsSum = weights.experience_relevance + weights.evidence_quality + weights.skills_match + weights.seniority_alignment + weights.ats_keywords

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton fallbackHref={`/jobs/${jobId}`} />
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Scoring Center
            </h1>
            <p className="text-muted-foreground">{job.title} at {job.company}</p>
          </div>
        </div>
      </div>

      {/* Role-Based Weight Calculator */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Calculate Automatically Based on Role
            </CardTitle>
            <div className="flex items-center gap-2">
              {isManualMode && (
                <Badge variant="outline" className="text-xs">Manual Mode</Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetWeights}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          <CardDescription>
            Select a role to automatically apply optimized scoring weights, or adjust manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Target Role</label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {getAvailableRoles().map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-6">
              <Button onClick={handleAutoCalculate} className="gap-2">
                <Wand2 className="h-4 w-4" />
                Apply Role Weights
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {getRoleProfileDescription(selectedRole)}
          </p>

          {/* Weight Sliders */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Weight Configuration
              </span>
              <Badge variant={weightsSum === 100 ? "default" : "destructive"} className="text-xs">
                Total: {weightsSum}%
              </Badge>
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-500" />
                    Experience Relevance
                  </span>
                  <span className="font-medium">{weights.experience_relevance}%</span>
                </div>
                <Slider
                  value={[weights.experience_relevance]}
                  onValueChange={([v]) => handleWeightChange("experience_relevance", v)}
                  max={60}
                  min={10}
                  step={1}
                  className="[&>span]:bg-purple-500"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Evidence Quality
                  </span>
                  <span className="font-medium">{weights.evidence_quality}%</span>
                </div>
                <Slider
                  value={[weights.evidence_quality]}
                  onValueChange={([v]) => handleWeightChange("evidence_quality", v)}
                  max={40}
                  min={10}
                  step={1}
                  className="[&>span]:bg-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    Skills Match
                  </span>
                  <span className="font-medium">{weights.skills_match}%</span>
                </div>
                <Slider
                  value={[weights.skills_match]}
                  onValueChange={([v]) => handleWeightChange("skills_match", v)}
                  max={40}
                  min={5}
                  step={1}
                  className="[&>span]:bg-orange-500"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-cyan-500" />
                    Seniority Alignment
                  </span>
                  <span className="font-medium">{weights.seniority_alignment}%</span>
                </div>
                <Slider
                  value={[weights.seniority_alignment]}
                  onValueChange={([v]) => handleWeightChange("seniority_alignment", v)}
                  max={25}
                  min={5}
                  step={1}
                  className="[&>span]:bg-cyan-500"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    ATS Keywords
                  </span>
                  <span className="font-medium">{weights.ats_keywords}%</span>
                </div>
                <Slider
                  value={[weights.ats_keywords]}
                  onValueChange={([v]) => handleWeightChange("ats_keywords", v)}
                  max={20}
                  min={3}
                  step={1}
                  className="[&>span]:bg-green-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Save Score Button - persists without decision */}
              <Button 
                size="lg" 
                variant="default"
                onClick={saveScore}
                disabled={isSaving || !scoreBreakdown}
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : scoreSaved ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                {isSaving ? "Saving..." : scoreSaved ? "Score Saved" : "Save Score"}
              </Button>
              
              <Separator />
              
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
