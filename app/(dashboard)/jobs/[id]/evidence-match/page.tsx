"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
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
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Job, EvidenceRecord } from "@/lib/types"

// TRUST FIX: Renamed from "Match" to "KeywordMatch" to be honest about what this is
interface RequirementKeywordMatch {
  requirement: string
  type: "required" | "preferred"
  matchedEvidence: EvidenceRecord[]
  matchedKeywords: string[] // TRUST FIX: Show which keywords actually matched
  matchScore: number
  status: "keyword_match" | "weak_match" | "no_match" // TRUST FIX: Renamed from strong/partial/gap
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
      matches.push({
        requirement: req,
        type: "required",
        matchedEvidence: matched,
        matchedKeywords: keywords,
        matchScore: calculateMatchScore(matched),
        // TRUST FIX: Renamed statuses to be honest about what they mean
        status: matched.length > 0 
          ? (matched.some(e => e.confidence_level === "high") ? "keyword_match" : "weak_match") 
          : "no_match",
      })
    }
    
    // Process preferred qualifications
    const preferred = job.qualifications_preferred || []
    for (const pref of preferred) {
      const { matched, keywords } = findMatchingEvidenceWithKeywords(pref, evidence)
      matches.push({
        requirement: pref,
        type: "preferred",
        matchedEvidence: matched,
        matchedKeywords: keywords,
        matchScore: calculateMatchScore(matched),
        status: matched.length > 0 
          ? (matched.some(e => e.confidence_level === "high") ? "keyword_match" : "weak_match") 
          : "no_match",
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

  async function saveEvidenceMap() {
    if (!job) return
    
    setSaving(true)
    const supabase = createClient()
    
    // Get current user for security
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Please log in to save")
      setSaving(false)
      return
    }
    
    // Build evidence map
    const evidenceMap: Record<string, string[]> = {}
    requirementMatches.forEach(match => {
      evidenceMap[match.requirement] = match.matchedEvidence
        .filter(e => selectedEvidence.has(e.id))
        .map(e => e.id)
    })
    
    // Update job - filtered by user_id for security
    const { error } = await supabase
      .from("jobs")
      .update({ 
        evidence_map: evidenceMap,
        status: "analyzed"
      })
      .eq("id", jobId)
      .eq("user_id", user.id)
    
    if (error) {
      toast.error("Failed to save evidence map")
    } else {
      toast.success("Evidence map saved")
      router.push(`/jobs/${jobId}`)
    }
    
    setSaving(false)
  }

  // Calculate overall coverage
  const requiredMatches = requirementMatches.filter(m => m.type === "required")
  const requiredCovered = requiredMatches.filter(m => m.status !== "no_match").length
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
          <Button onClick={saveEvidenceMap} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Lock Evidence Map
          </Button>
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
            
            {/* TRUST FIX: Renamed status labels */}
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {/* TRUST FIX: Renamed from "Strong" */}
                <span>{requirementMatches.filter(m => m.status === "keyword_match").length} Keyword Matches</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                {/* TRUST FIX: Renamed from "Partial" */}
                <span>{requirementMatches.filter(m => m.status === "weak_match").length} Weak Matches</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                {/* TRUST FIX: Renamed from "Gap" */}
                <span>{requirementMatches.filter(m => m.status === "no_match").length} No Matches</span>
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
  // TRUST FIX: Renamed status config
  const statusConfig = {
    keyword_match: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      bg: "border-green-200 bg-green-50/50",
      label: "Keyword Match Found",
      labelColor: "text-green-700",
    },
    weak_match: {
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      bg: "border-yellow-200 bg-yellow-50/50",
      label: "Weak Match (Low Confidence)",
      labelColor: "text-yellow-700",
    },
    no_match: {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      bg: "border-red-200 bg-red-50/50",
      label: "No Keywords Matched",
      labelColor: "text-red-700",
    },
  }

  const config = statusConfig[match.status]

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
                {/* TRUST FIX: Show honest status label */}
                <p className={`text-xs mt-1 ${config.labelColor}`}>{config.label}</p>
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
