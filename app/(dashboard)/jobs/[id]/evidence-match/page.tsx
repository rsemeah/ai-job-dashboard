"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { trackEvent } from "@/components/posthog-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Link2,
  FileText,
  Target,
  Loader2,
  Shield,
  Sparkles,
  Info,
  Search,
  RefreshCw,
  FileCheck,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Job, EvidenceRecord } from "@/lib/types"
import { canCompleteMatching } from "@/lib/semantic-gates"
import { isEvidenceMappingComplete } from "@/lib/job-workflow"

// TRUST FIX: Renamed from "Match" to "KeywordMatch" to be honest about what this is
// UX FIDELITY: Using 5-tier confidence model for smarter, fairer qualification assessment
type MatchConfidence = 
  | "satisfied"               // Direct evidence with high confidence
  | "likely_satisfied"        // Strong keyword overlap  
  | "equivalent_experience"   // Transferable experience applies
  | "ambiguous"               // Needs review/clarification
  | "not_found"               // No evidence found

interface RequirementKeywordMatch {
  requirement: string
  type: "required" | "preferred"
  matchedEvidence: EvidenceRecord[]
  matchedKeywords: string[] // TRUST FIX: Show which keywords actually matched
  matchScore: number
  status: MatchConfidence // UX FIDELITY: 5-tier confidence model
  isEducation?: boolean   // UX FIDELITY: Flag for education requirements
  confidenceReason?: string // UX FIDELITY: Explain why this classification
}

export default function EvidenceMatchPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requirementMatches, setRequirementMatches] = useState<RequirementKeywordMatch[]>([])
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set())
  const [matchingMarkedComplete, setMatchingMarkedComplete] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Load job and evidence data
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Get current user for security filtering
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      
      // Fetch job with analysis data (qualifications are in job_analyses)
      const { data: jobData } = await supabase
        .from("jobs")
        .select(`
          *,
          job_analyses (
            qualifications_required,
            qualifications_preferred,
            keywords,
            ats_phrases,
            responsibilities
          )
        `)
        .eq("id", jobId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single()

      if (jobData) {
        // Merge job_analyses qualifications into job object for easier access
        const analysis = jobData.job_analyses?.[0]
        const mergedJob = {
          ...jobData,
          qualifications_required: analysis?.qualifications_required || [],
          qualifications_preferred: analysis?.qualifications_preferred || [],
          keywords: analysis?.keywords || [],
          ats_phrases: analysis?.ats_phrases || [],
          responsibilities: analysis?.responsibilities || [],
        }
        setJob(mergedJob as Job)
        // Check if matching was already marked complete
        setMatchingMarkedComplete(isEvidenceMappingComplete(mergedJob as Job))
      }
      
      // Fetch all evidence - filtered by user_id for security
      const { data: evidenceData } = await supabase
        .from("evidence_library")
        .select("*")
        .eq("is_active", true)
        .eq("user_id", user.id)
        .order("priority_rank", { ascending: true })
      
      if (evidenceData) {
        setEvidence(evidenceData as EvidenceRecord[])
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [jobId])

  // Match requirements to evidence when data loads
  useEffect(() => {
    if (!job || evidence.length === 0) return
    
    const matches: RequirementKeywordMatch[] = []
    
    // Process required qualifications
    const required = job.qualifications_required || []
    for (const req of required) {
      const { matched, keywords } = findMatchingEvidenceWithKeywords(req, evidence)
      const isEducation = isEducationRequirement(req)
      
      // UX FIDELITY: Use 5-tier confidence model
      let status: MatchConfidence
      let confidenceReason: string | undefined
      
      if (matched.length > 0) {
        if (matched.some(e => e.confidence_level === "high")) {
          status = "satisfied"
          confidenceReason = "Strong evidence directly supports this requirement"
        } else if (matched.some(e => e.confidence_level === "medium")) {
          status = "likely_satisfied"
          confidenceReason = "Good evidence found - verify manually"
        } else {
          status = "ambiguous"
          confidenceReason = "Some evidence found but may need clarification"
        }
      } else if (isEducation) {
        // Special handling for education - check if user might have equivalent
        status = "ambiguous"
        confidenceReason = "Education requirement - check profile for qualifying credentials"
      } else {
        status = "not_found"
        confidenceReason = "No matching evidence in library"
      }
      
      matches.push({
        requirement: req,
        type: "required",
        matchedEvidence: matched,
        matchedKeywords: keywords,
        matchScore: calculateMatchScore(matched),
        status,
        isEducation,
        confidenceReason,
      })
    }
    
    // Process preferred qualifications
    const preferred = job.qualifications_preferred || []
    for (const pref of preferred) {
      const { matched, keywords } = findMatchingEvidenceWithKeywords(pref, evidence)
      const isEducation = isEducationRequirement(pref)
      
      let status: MatchConfidence
      let confidenceReason: string | undefined
      
      if (matched.length > 0) {
        if (matched.some(e => e.confidence_level === "high")) {
          status = "satisfied"
          confidenceReason = "Strong evidence directly supports this"
        } else {
          status = "likely_satisfied"
          confidenceReason = "Evidence found - nice to have"
        }
      } else {
        status = isEducation ? "ambiguous" : "not_found"
        confidenceReason = isEducation 
          ? "Preferred education - may have equivalent" 
          : "No evidence but this is preferred, not required"
      }
      
      matches.push({
        requirement: pref,
        type: "preferred",
        matchedEvidence: matched,
        matchedKeywords: keywords,
        matchScore: calculateMatchScore(matched),
        status,
        isEducation,
        confidenceReason,
      })
    }
    
    setRequirementMatches(matches)
    
    // Pre-select high-confidence matches
    const preSelected = new Set<string>()
    matches.forEach(m => {
      m.matchedEvidence.forEach(e => {
        if (e.confidence_level === "high") {
          preSelected.add(e.id)
        }
      })
    })
    setSelectedEvidence(preSelected)
  }, [job, evidence])

  // UX FIDELITY: Detect education requirements for special handling
  function isEducationRequirement(requirement: string): boolean {
    const eduKeywords = [
      "degree", "bachelor", "master", "phd", "doctorate", "diploma",
      "certification", "certified", "accredited", "education",
      "b.s.", "b.a.", "m.s.", "m.a.", "mba", "bs", "ba", "ms", "ma",
    ]
    const reqLower = requirement.toLowerCase()
    return eduKeywords.some(kw => reqLower.includes(kw))
  }

  // TRUST FIX: Now returns which keywords actually matched
  function findMatchingEvidenceWithKeywords(
    requirement: string, 
    allEvidence: EvidenceRecord[]
  ): { matched: EvidenceRecord[], keywords: string[] } {
    const reqLower = requirement.toLowerCase()
    // TRUST FIX: Only use words > 4 chars and filter common words
    const stopWords = new Set(["with", "have", "that", "this", "from", "will", "been", "were", "they", "their", "about", "would", "could", "should", "which", "there", "where", "what", "when", "make", "like", "just", "over", "such", "into", "year", "some", "them", "than", "then", "only", "come", "made", "find", "work", "part", "take", "most", "know", "need", "want", "give", "more", "also", "able", "must"])
    const keywords = reqLower
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.has(w))
    
    const matchedKeywords: Set<string> = new Set()
    
    const matchedEvidence = allEvidence.filter(e => {
      let foundMatch = false
      
      // Check tools
      const tools = (e.tools_used || []).map(t => t.toLowerCase())
      for (const tool of tools) {
        for (const kw of keywords) {
          if (tool.includes(kw) || kw.includes(tool)) {
            matchedKeywords.add(kw)
            foundMatch = true
          }
        }
      }
      
      // Check skills/keywords
      const approved = (e.approved_keywords || []).map(k => k.toLowerCase())
      for (const a of approved) {
        for (const kw of keywords) {
          if (a.includes(kw) || kw.includes(a)) {
            matchedKeywords.add(kw)
            foundMatch = true
          }
        }
      }
      
      // Check responsibilities
      const resps = (e.responsibilities || []).join(" ").toLowerCase()
      for (const kw of keywords) {
        if (resps.includes(kw)) {
          matchedKeywords.add(kw)
          foundMatch = true
        }
      }
      
      // Check outcomes
      const outcomes = (e.outcomes || []).join(" ").toLowerCase()
      for (const kw of keywords) {
        if (outcomes.includes(kw)) {
          matchedKeywords.add(kw)
          foundMatch = true
        }
      }
      
      return foundMatch
    }).slice(0, 3) // Max 3 matches per requirement
    
    return { 
      matched: matchedEvidence, 
      keywords: Array.from(matchedKeywords) 
    }
  }

  function calculateMatchScore(matched: EvidenceRecord[]): number {
    if (matched.length === 0) return 0
    const weights = { high: 100, medium: 70, low: 40 }
    const total = matched.reduce((sum, e) => sum + weights[e.confidence_level], 0)
    return Math.min(100, Math.round(total / matched.length))
  }

  function toggleEvidence(evidenceId: string) {
    setSelectedEvidence(prev => {
      const next = new Set(prev)
      if (next.has(evidenceId)) {
        next.delete(evidenceId)
      } else {
        next.add(evidenceId)
      }
      return next
    })
  }

  async function saveEvidenceMap(markComplete: boolean = false) {
    if (!job) return
    
    // Check gate for marking complete
    if (markComplete) {
      const gateResult = canCompleteMatching(job, overlapPercent)
      if (!gateResult.allowed) {
        toast.error(gateResult.reason || "Cannot complete matching yet")
        return
      }
      if (gateResult.reason && gateResult.severity === "info") {
        // Show warning but proceed
        toast.info(gateResult.reason)
      }
    }
    
    setSaving(true)
    const supabase = createClient()
    
    // Get current user for security
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Please log in to save")
      setSaving(false)
      return
    }
    
    // Build evidence map with metadata
    const evidenceMap: Record<string, unknown> = {}
    requirementMatches.forEach(match => {
      evidenceMap[match.requirement] = match.matchedEvidence
        .filter(e => selectedEvidence.has(e.id))
        .map(e => e.id)
    })
    
    // Add completion flags if marking complete
    if (markComplete) {
      evidenceMap.matching_complete = true
      evidenceMap.completed_at = new Date().toISOString()
      evidenceMap.version = "1.0" // Schema version for forward compatibility
    }
    
    // Update job - filtered by user_id for security
    const { error } = await supabase
      .from("jobs")
      .update({ 
        evidence_map: evidenceMap,
        evidence_map_version: markComplete ? "1.0" : null, // Track schema version at job level
        status: markComplete ? "analyzed" : job.status
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
    
    if (error) {
      toast.error("Failed to save evidence map")
    } else {
      if (markComplete) {
        setMatchingMarkedComplete(true)
        toast.success("Evidence mapping complete! You can now generate your materials below.")
        
        // Track funnel event: evidence_match_completed
        const matchedCount = Object.values(evidenceMap).filter(v => Array.isArray(v) && v.length > 0).length
        trackEvent.evidenceMatchCompleted({
          job_id: jobId,
          requirements_matched: matchedCount,
          total_requirements: requirements.length,
        })
        
        // Don't redirect - let user generate from this page
        // Scroll to the generate section
        setTimeout(() => {
          document.querySelector('[data-generate-section]')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        toast.success("Evidence map saved (draft)")
      }
    }
    
    setSaving(false)
  }

  // Handle materials generation directly from evidence match page
  async function handleGenerateMaterials() {
    if (!matchingMarkedComplete) {
      toast.error("Please mark evidence matching as complete first")
      return
    }
    
    setIsGenerating(true)
    setGenerationError(null)
    
    try {
      const response = await fetch("/api/generate-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          job_id: jobId,
          selected_evidence_ids: Array.from(selectedEvidence)
        }),
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success("Materials generated successfully!")
        
        // Track funnel event: documents_generated
        trackEvent.documentsGenerated({
          job_id: jobId,
          resume_generated: !!data.generated_resume,
          cover_letter_generated: !!data.generated_cover_letter,
        })
        
        // Navigate to job detail to see results
        router.push(`/jobs/${jobId}`)
      } else {
        const errorMsg = data.user_message || data.error || "Generation failed"
        setGenerationError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error("Generation error:", error)
      setGenerationError("Failed to generate materials. Please try again.")
      toast.error("Failed to generate materials")
    } finally {
      setIsGenerating(false)
    }
  }

  // Calculate overall coverage
  const requiredMatches = requirementMatches.filter(m => m.type === "required")
  // UX FIDELITY: Count satisfied + likely + equivalent as "covered"
  const requiredCovered = requiredMatches.filter(m => 
    m.status === "satisfied" || m.status === "likely_satisfied" || m.status === "equivalent_experience"
  ).length
  const requiredTotal = requiredMatches.length
  const overlapPercent = requiredTotal > 0 ? Math.round((requiredCovered / requiredTotal) * 100) : 0

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

  // Show empty state if user has no evidence
  if (evidence.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Evidence Match Console</h1>
            <p className="text-muted-foreground">{job.role_title || job.title} at {job.company_name || job.company}</p>
          </div>
        </div>
        
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-amber-900 mb-2">No Evidence Found</h2>
            <p className="text-amber-700 mb-4">
              You need evidence items in your library to match against job requirements. 
              Evidence is automatically created when you upload your resume during onboarding.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/evidence">
                <Button variant="outline">
                  Manage Evidence Library
                </Button>
              </Link>
              <Link href="/onboarding">
                <Button>
                  Upload Resume
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
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
              <h1 className="text-2xl font-semibold">Evidence Match Console</h1>
              <p className="text-muted-foreground">{job.title} at {job.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {matchingMarkedComplete && (
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Matching Complete
              </Badge>
            )}
            <Button variant="outline" onClick={() => saveEvidenceMap(false)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Draft
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => saveEvidenceMap(true)} disabled={saving || matchingMarkedComplete}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                    {matchingMarkedComplete ? "Already Complete" : "Mark Complete & Continue"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Marks evidence matching as complete and proceeds to scoring. 
                    {overlapPercent < 30 && " Warning: Low coverage may affect your fit score."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* TRUST FIX: Honest explanation of what this page does */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">How matching works</p>
                <p className="text-blue-700 mt-1">
                  This page uses <strong>keyword matching</strong> to find evidence that might be relevant to each requirement. 
                  Keywords from the job requirement are compared against your evidence library. 
                  This is a starting point - <strong>you must verify each match is actually relevant</strong> before using it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Summary - TRUST FIX: Renamed from "Coverage" to "Keyword Overlap" */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              {/* TRUST FIX: Renamed from "Coverage" */}
              Keyword Overlap Summary
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This shows how many requirements have at least one keyword match with your evidence. 
                  A keyword match does NOT mean you meet the requirement - verify each match manually.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  {/* TRUST FIX: Changed label */}
                  <span className="text-sm text-muted-foreground">Requirements with keyword matches</span>
                  <span className="font-semibold">{requiredCovered}/{requiredTotal}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${overlapPercent >= 80 ? "bg-green-500" : overlapPercent >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${overlapPercent}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{overlapPercent}%</div>
                {/* TRUST FIX: Renamed from "Coverage" */}
                <div className="text-xs text-muted-foreground">Keyword Overlap</div>
              </div>
            </div>
            
            {/* UX FIDELITY: 5-tier confidence summary */}
            <div className="flex flex-wrap gap-3 mt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{requirementMatches.filter(m => m.status === "satisfied").length} Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span>{requirementMatches.filter(m => m.status === "likely_satisfied").length} Likely</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>{requirementMatches.filter(m => m.status === "equivalent_experience").length} Equivalent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{requirementMatches.filter(m => m.status === "ambiguous").length} Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span>{requirementMatches.filter(m => m.status === "not_found").length} Not Found</span>
              </div>
            </div>

            {/* TRUST FIX: Warning when data is sparse */}
            {requiredTotal < 3 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    <strong>Low data quality:</strong> Only {requiredTotal} requirement(s) were extracted from this job posting. 
                    The job may have more requirements not captured here.
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements List */}
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Required Qualifications
          </h2>
          
          {requirementMatches.filter(m => m.type === "required").length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>No required qualifications were extracted from this job posting.</p>
                <p className="text-sm mt-1">This may be due to the job source format or parsing limitations.</p>
              </CardContent>
            </Card>
          ) : (
            requirementMatches.filter(m => m.type === "required").map((match, idx) => (
              <RequirementCard 
                key={idx}
                match={match}
                selectedEvidence={selectedEvidence}
                onToggleEvidence={toggleEvidence}
              />
            ))
          )}
          
          <Separator className="my-4" />
          
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Preferred Qualifications
          </h2>
          
          {requirementMatches.filter(m => m.type === "preferred").length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>No preferred qualifications were extracted from this job posting.</p>
              </CardContent>
            </Card>
          ) : (
            requirementMatches.filter(m => m.type === "preferred").map((match, idx) => (
              <RequirementCard 
                key={idx}
                match={match}
                selectedEvidence={selectedEvidence}
                onToggleEvidence={toggleEvidence}
              />
            ))
          )}
          
          {/* Next Step: Generate Materials - Only show when matching is complete */}
          <Separator className="my-6" />
          
          <Card 
            data-generate-section
            className={matchingMarkedComplete ? "border-green-200 bg-green-50/50" : "border-dashed bg-muted/30"}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Next Step: Generate Materials
              </CardTitle>
              <CardDescription>
                {matchingMarkedComplete 
                  ? "Your evidence matching is complete. Generate your tailored resume and cover letter."
                  : "Complete evidence matching above to unlock generation."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {generationError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleGenerateMaterials}
                  disabled={!matchingMarkedComplete || isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Resume & Cover Letter
                    </>
                  )}
                </Button>
                {matchingMarkedComplete && (
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/jobs/${jobId}`)}
                  >
                    Choose Template First
                  </Button>
                )}
              </div>
              {!matchingMarkedComplete && (
                <p className="text-xs text-muted-foreground mt-3">
                  Click &quot;Complete & Continue&quot; above after reviewing your evidence matches.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}

function RequirementCard({ 
  match, 
  selectedEvidence, 
  onToggleEvidence 
}: { 
  match: RequirementKeywordMatch
  selectedEvidence: Set<string>
  onToggleEvidence: (id: string) => void
}) {
  // UX FIDELITY: 5-tier confidence model for smarter, fairer assessment
  const statusConfig: Record<MatchConfidence, { 
    icon: React.ReactNode
    bg: string
    label: string
    labelColor: string 
  }> = {
    satisfied: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      bg: "border-green-200 bg-green-50/50",
      label: "Confirmed",
      labelColor: "text-green-700",
    },
    likely_satisfied: {
      icon: <CheckCircle2 className="h-5 w-5 text-blue-500" />,
      bg: "border-blue-200 bg-blue-50/50",
      label: "Likely Match",
      labelColor: "text-blue-700",
    },
    equivalent_experience: {
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      bg: "border-purple-200 bg-purple-50/50",
      label: "Equivalent Experience",
      labelColor: "text-purple-700",
    },
    ambiguous: {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      bg: "border-amber-200 bg-amber-50/50",
      label: "Needs Review",
      labelColor: "text-amber-700",
    },
    not_found: {
      icon: <XCircle className="h-5 w-5 text-gray-400" />,
      bg: "border-gray-200 bg-gray-50/50",
      label: "Not Found",
      labelColor: "text-gray-600",
    },
  }

  const config = statusConfig[match.status] || statusConfig.not_found

  return (
    <Card className={`${config.bg} border`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {/* Requirement text */}
            <div className="flex items-start gap-3 mb-3">
              {config.icon}
              <div className="flex-1">
                <p className="font-medium">{match.requirement}</p>
                {/* UX FIDELITY: Show confidence label with reason */}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${config.labelColor}`}>{config.label}</span>
                  {match.isEducation && (
                    <Badge variant="outline" className="text-xs py-0 px-1.5 border-purple-300 text-purple-600">
                      Education
                    </Badge>
                  )}
                </div>
                {match.confidenceReason && (
                  <p className="text-xs text-muted-foreground mt-0.5">{match.confidenceReason}</p>
                )}
              </div>
            </div>
            
            {/* TRUST FIX: Show matched keywords so user can verify */}
            {match.matchedKeywords.length > 0 && (
              <div className="mb-3 p-2 bg-background rounded border border-dashed">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Search className="h-3 w-3" />
                  Keywords that triggered this match:
                </p>
                <div className="flex flex-wrap gap-1">
                  {match.matchedKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Matched evidence */}
            {match.matchedEvidence.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Evidence that matched (select to include):</p>
                {match.matchedEvidence.map((evidence) => (
                  <div key={evidence.id} className="p-3 bg-background rounded-lg border">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedEvidence.has(evidence.id)}
                        onCheckedChange={() => onToggleEvidence(evidence.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{evidence.project_name || evidence.source_title}</span>
                          <Badge variant="outline" className={`text-xs ${
                            evidence.confidence_level === "high" ? "border-green-200 bg-green-50 text-green-700" :
                            evidence.confidence_level === "medium" ? "border-amber-200 bg-amber-50 text-amber-700" :
                            "border-red-200 bg-red-50 text-red-700"
                          }`}>
                            {evidence.confidence_level} confidence
                          </Badge>
                        </div>
                        {evidence.company_name && (
                          <p className="text-xs text-muted-foreground">{evidence.company_name}{evidence.role_name ? ` - ${evidence.role_name}` : ""}</p>
                        )}
                        {evidence.outcomes && evidence.outcomes.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            <strong>Outcome:</strong> {evidence.outcomes[0]}
                          </p>
                        )}
                        {evidence.tools_used && evidence.tools_used.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {evidence.tools_used.slice(0, 4).map((tool, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">
                                {tool}
                              </Badge>
                            ))}
                            {evidence.tools_used.length > 4 && (
                              <span className="text-[10px] text-muted-foreground">+{evidence.tools_used.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      {evidence.source_url && (
                        <a 
                          href={evidence.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Link2 className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-background rounded-lg border border-dashed">
                <p className="text-xs text-muted-foreground">
                  No matching evidence found. Consider adding relevant experience to your evidence library, 
                  or this may be a genuine gap in your background.
                </p>
              </div>
            )}
          </div>
          
          {/* TRUST FIX: Renamed from "Match" score */}
          <div className="text-right">
            <div className="text-lg font-bold">{match.matchScore}%</div>
            <Tooltip>
              <TooltipTrigger>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Confidence
                  <Info className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Weighted average of matched evidence confidence levels. 
                  High confidence = 100, Medium = 70, Low = 40.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
