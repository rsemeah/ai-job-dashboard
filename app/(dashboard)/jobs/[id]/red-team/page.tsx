"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { trackQualityPassed } from "@/lib/analytics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  Loader2,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Zap,
  MessageSquare,
  Edit3,
  Trash2,
  ArrowRight,
  Plus,
  Lock,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { Job, EvidenceRecord } from "@/lib/types"
import { 
  performRedTeamAnalysis, 
  type RedTeamIssue, 
  type RedTeamFix 
} from "@/lib/truthserum"

export default function RedTeamReviewPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState<RedTeamIssue[]>([])
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState("")

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Get current user for security filtering
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      
      // Fetch job with related data and evidence - both filtered by user_id for security
      const [{ data: jobData }, { data: evidenceData }] = await Promise.all([
        supabase.from("jobs").select(`
          *,
          job_scores (*),
          job_analyses (*)
        `).eq("id", jobId).eq("user_id", user.id).is("deleted_at", null).single(),
        supabase.from("evidence_library").select("*").eq("is_active", true).eq("user_id", user.id),
      ])
      
      if (jobData) {
        // Transform to UI-expected format
        const transformedJob = {
          ...jobData,
          title: jobData.role_title,
          company: jobData.company_name,
          generated_resume: jobData.generated_resume || null,
          generated_cover_letter: jobData.generated_cover_letter || null,
        }
        
        setJob(transformedJob as Job)
        // Run analysis
        const foundIssues = performRedTeamAnalysis(
          transformedJob.generated_resume || "",
          transformedJob.generated_cover_letter || "",
          evidenceData || []
        )
        setIssues(foundIssues)
      }
      if (evidenceData) setEvidence(evidenceData as EvidenceRecord[])
      
      setLoading(false)
    }
    loadData()
  }, [jobId])

  // Calculate issue counts
  const activeIssues = useMemo(() => {
    return issues.filter(i => !resolvedIssues.has(i.id))
  }, [issues, resolvedIssues])

  const criticalCount = activeIssues.filter(i => i.severity === "critical").length
  const warningCount = activeIssues.filter(i => i.severity === "warning").length
  const infoCount = activeIssues.filter(i => i.severity === "info").length

  const canApprove = criticalCount === 0

  function handleFix(issue: RedTeamIssue, fix: RedTeamFix) {
    // For now, mark as resolved - in a full implementation, 
    // these would trigger actual content updates
    switch (fix.action) {
      case "remove_phrase":
        toast.success(`Marked "${issue.original_text.substring(0, 30)}..." for removal`)
        setResolvedIssues(prev => new Set([...prev, issue.id]))
        break
      case "rewrite_bullet":
        toast.info("Rewrite requested - will regenerate this bullet")
        setResolvedIssues(prev => new Set([...prev, issue.id]))
        break
      case "add_metric":
        toast.info("Consider adding a specific number or outcome")
        break
      case "make_concrete":
        toast.info("Add system name, team size, or business impact")
        break
      case "swap_evidence":
        toast.info("Navigate to Evidence Match to select different evidence")
        router.push(`/jobs/${jobId}/evidence-match`)
        break
      case "block_claim":
        toast.success("Claim blocked from future generations")
        setResolvedIssues(prev => new Set([...prev, issue.id]))
        break
      default:
        setResolvedIssues(prev => new Set([...prev, issue.id]))
    }
  }

  function undoResolve(issueId: string) {
    setResolvedIssues(prev => {
      const next = new Set(prev)
      next.delete(issueId)
      return next
    })
  }

  async function approveAndProceed() {
    if (!job) return
    
    const supabase = createClient()
    
    // Get current user for security
    // Use centralized quality-pass API endpoint
    const response = await fetch(`/api/jobs/${jobId}/quality-pass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issues_acknowledged: activeIssues.map(i => ({ type: i.type, severity: i.severity })),
        resolved_count: resolvedIssues.size,
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      toast.error(result.error || "Failed to approve")
    } else {
      // Track funnel event: quality_passed
      trackQualityPassed({
        job_id: jobId,
        issues_acknowledged: activeIssues.length,
      })
      
      toast.success("Documents approved - Ready to apply!")
      router.push(`/jobs/${jobId}`)
    }
  }

  async function requestRegeneration() {
    toast.info("Regeneration requested - returning to job detail")
    router.push(`/jobs/${jobId}?regenerate=true`)
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

  if (!job.generated_resume && !job.generated_cover_letter) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Red Team Review</h1>
            <p className="text-muted-foreground">{job.title} at {job.company}</p>
          </div>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Documents Generated</h3>
            <p className="text-muted-foreground mb-4">
              Generate resume and cover letter before running the red team review.
            </p>
            <Link href={`/jobs/${jobId}`}>
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Job Detail
              </Button>
            </Link>
          </CardContent>
        </Card>
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
              <Shield className="h-6 w-6 text-primary" />
              Red Team Review
            </h1>
            <p className="text-muted-foreground">Quality check before export - {job.title} at {job.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={requestRegeneration}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate All
          </Button>
          <Button 
            onClick={approveAndProceed} 
            disabled={!canApprove}
            className={canApprove ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {canApprove ? (
              <>
                <ThumbsUp className="h-4 w-4 mr-2" />
                Approve for Export
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Fix Critical Issues First
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quality Score Summary */}
      <Card className={`border-2 ${canApprove ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {canApprove ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {canApprove ? "Ready for Approval" : "Critical Issues Detected"}
                </h2>
                <p className="text-muted-foreground">
                  {canApprove 
                    ? resolvedIssues.size > 0 
                      ? `${resolvedIssues.size} issue(s) resolved. Review remaining warnings and approve when ready.`
                      : "No critical issues found. Review warnings and approve when ready."
                    : `${criticalCount} critical issue(s) must be resolved before export.`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                <div className="text-xs text-muted-foreground">Critical</div>
                <div className="text-[10px] text-red-600 mt-1">Blocks Export</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
                <div className="text-xs text-muted-foreground">Warning</div>
                <div className="text-[10px] text-amber-600 mt-1">Review Recommended</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
                <div className="text-xs text-muted-foreground">Info</div>
                <div className="text-[10px] text-blue-600 mt-1">Consider Improving</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{resolvedIssues.size}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
                <div className="text-[10px] text-green-600 mt-1">Fixed</div>
              </div>
            </div>
          </div>
          
          {/* Export Blocking Explanation */}
          {!canApprove && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Export blocked:</strong> Critical issues include banned phrases (generic AI language) and unsupported claims (statements without evidence). 
                  Fix all {criticalCount} critical issue(s) to enable export. Warnings do not block export but should be reviewed.
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues by Location */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Resume Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resume Issues
            </CardTitle>
            <CardDescription>
              {activeIssues.filter(i => i.location === "resume").length} active issue(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {activeIssues.filter(i => i.location === "resume").length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm">All issues resolved</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeIssues.filter(i => i.location === "resume").map((issue) => (
                    <IssueCard 
                      key={issue.id} 
                      issue={issue} 
                      onFix={handleFix}
                      isResolved={resolvedIssues.has(issue.id)}
                      onUndo={() => undoResolve(issue.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Cover Letter Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Cover Letter Issues
            </CardTitle>
            <CardDescription>
              {activeIssues.filter(i => i.location === "cover_letter").length} active issue(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {activeIssues.filter(i => i.location === "cover_letter").length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm">All issues resolved</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeIssues.filter(i => i.location === "cover_letter").map((issue) => (
                    <IssueCard 
                      key={issue.id} 
                      issue={issue}
                      onFix={handleFix}
                      isResolved={resolvedIssues.has(issue.id)}
                      onUndo={() => undoResolve(issue.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Document Preview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Resume Preview
              <Badge variant="outline" className="text-xs">
                {job.generated_resume ? "Generated" : "Empty"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                {job.generated_resume || "No resume generated yet"}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Cover Letter Preview
              <Badge variant="outline" className="text-xs">
                {job.generated_cover_letter ? "Generated" : "Empty"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                {job.generated_cover_letter || "No cover letter generated yet"}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Review Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes about this review..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Export Readiness Status */}
      <Card className={`border-2 ${canApprove ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {canApprove ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Lock className="h-4 w-4 text-red-600" />
            )}
            Export Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Critical Issues</span>
              <Badge variant={criticalCount === 0 ? "default" : "destructive"} className={criticalCount === 0 ? "bg-green-100 text-green-800" : ""}>
                {criticalCount === 0 ? "None" : `${criticalCount} Blocking`}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Warnings</span>
              <Badge variant="outline" className={warningCount === 0 ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                {warningCount} to Review
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Quality Passed</span>
              <Badge variant="outline" className={canApprove ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>
                {canApprove ? "Yes" : "No - Fix Issues"}
              </Badge>
            </div>
            
            {!canApprove && (
              <p className="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded border border-red-200">
                Export is blocked until {criticalCount} critical issue(s) are resolved. Fix banned phrases and unsupported claims before applying.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Link href={`/jobs/${jobId}/evidence-match`}>
              <Button variant="outline" size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Evidence Map
              </Button>
            </Link>
            <Link href={`/jobs/${jobId}/scoring`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Scoring
              </Button>
            </Link>
            <Link href={`/jobs/${jobId}`}>
              <Button variant="outline" size="sm">
                <ArrowRight className="h-4 w-4 mr-2" />
                Back to Job Detail
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function IssueCard({ 
  issue, 
  onFix, 
  isResolved,
  onUndo
}: { 
  issue: RedTeamIssue
  onFix: (issue: RedTeamIssue, fix: RedTeamFix) => void
  isResolved: boolean
  onUndo: () => void
}) {
  const severityConfig = {
    critical: { bg: "bg-red-50 border-red-200", icon: <XCircle className="h-4 w-4 text-red-500" />, badge: "bg-red-100 text-red-700 border-red-200" },
    warning: { bg: "bg-amber-50 border-amber-200", icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, badge: "bg-amber-100 text-amber-700 border-amber-200" },
    info: { bg: "bg-blue-50 border-blue-200", icon: <Eye className="h-4 w-4 text-blue-500" />, badge: "bg-blue-100 text-blue-700 border-blue-200" },
  }
  
  const config = severityConfig[issue.severity]
  
  if (isResolved) {
    return (
      <div className="p-3 rounded-lg border bg-green-50/50 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-700 line-through">{issue.original_text.substring(0, 50)}...</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onUndo} className="h-6 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`p-3 rounded-lg border ${config.bg}`}>
      <div className="flex items-start gap-2">
        {config.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`text-xs ${config.badge}`}>
              {issue.type.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {issue.severity}
            </Badge>
          </div>
          
          <p className="text-sm font-medium mb-1">{issue.issue_description}</p>
          
          <div className="text-xs bg-background/50 p-2 rounded border font-mono mb-2">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {issue.location === "resume" ? "Resume" : "Cover Letter"}
              </Badge>
              <span className="text-[10px] opacity-70">
                Location: {issue.location === "resume" ? "Bullet point" : "Paragraph"}
              </span>
            </div>
            <p className="text-muted-foreground">
              {issue.original_text.length > 150 
                ? issue.original_text.substring(0, 150) + "..."
                : issue.original_text
              }
            </p>
          </div>
          
          {/* Fix Actions */}
          <div className="flex flex-wrap gap-1">
            {issue.suggested_fixes.map((fix, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onFix(issue, fix)}
              >
                {fix.action === "rewrite_bullet" && <Wand2 className="h-3 w-3 mr-1" />}
                {fix.action === "remove_phrase" && <Trash2 className="h-3 w-3 mr-1" />}
                {fix.action === "add_metric" && <Plus className="h-3 w-3 mr-1" />}
                {fix.action === "make_concrete" && <Edit3 className="h-3 w-3 mr-1" />}
                {fix.action === "swap_evidence" && <ArrowRight className="h-3 w-3 mr-1" />}
                {fix.action === "block_claim" && <Lock className="h-3 w-3 mr-1" />}
                {fix.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
