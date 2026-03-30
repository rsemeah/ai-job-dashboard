"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import type { Job } from "@/lib/types"
import type { InterviewPrep, BehavioralStory, BestAngle, InterviewQuestion, GapHandlingItem, ObjectionHandlingItem, ResumeDefenseItem } from "@/lib/interview-prep-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Target,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  FileText,
  Zap,
  Download,
  Star,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Shield,
  Users,
  Briefcase,
  Trophy,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface InterviewPrepClientProps {
  job: Job
  initialInterviewPrep: InterviewPrep | null
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(label ? `${label} copied` : "Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2 text-muted-foreground hover:text-foreground"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

function StoryCard({ story, onRate }: { story: BehavioralStory; onRate?: (id: string, rating: "strong" | "weak" | "needs_proof") => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {story.themes.map((theme) => (
                <Badge key={theme} variant="secondary" className="text-xs capitalize">
                  {theme}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-sm font-medium leading-snug">{story.situation}</CardTitle>
          </div>
          <div className="flex gap-1">
            {onRate && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onRate(story.id, "strong")}
                  title="Mark as strong"
                >
                  <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onRate(story.id, "weak")}
                  title="Mark as weak"
                >
                  <ThumbsDown className="h-3.5 w-3.5 text-amber-600" />
                </Button>
              </>
            )}
            <CopyButton text={story.full_version} label="Story" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-medium text-foreground">Quick version:</span> {story.short_version}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground">
              {expanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
              {expanded ? "Hide full STAR" : "Show full STAR"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 text-sm border-l-2 border-muted pl-3">
            <div><span className="font-medium text-blue-600">S:</span> {story.situation}</div>
            <div><span className="font-medium text-green-600">T:</span> {story.task}</div>
            <div><span className="font-medium text-amber-600">A:</span> {story.action}</div>
            <div><span className="font-medium text-purple-600">R:</span> {story.result}</div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

function AngleCard({ angle }: { angle: BestAngle }) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <Badge variant="outline" className="text-xs">{angle.requirement_mapped}</Badge>
          <CopyButton text={angle.concise_way_to_say_it} label="Angle" />
        </div>
        <p className="text-sm font-medium mb-2">{angle.what_you_did}</p>
        <p className="text-xs text-muted-foreground mb-2">
          <span className="font-medium">Why it matters:</span> {angle.why_it_matters}
        </p>
        <div className="bg-muted/50 rounded-md p-2 text-xs">
          <span className="font-medium">Say it like:</span> &ldquo;{angle.concise_way_to_say_it}&rdquo;
        </div>
      </CardContent>
    </Card>
  )
}

function QuestionCard({ question }: { question: InterviewQuestion }) {
  const [expanded, setExpanded] = useState(false)

  const confidenceColor = {
    high: "text-green-600 bg-green-50",
    medium: "text-amber-600 bg-amber-50",
    low: "text-red-600 bg-red-50",
  }

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <p className="text-sm font-medium flex-1">{question.question}</p>
          <Badge variant="secondary" className={`text-xs ${confidenceColor[question.confidence]}`}>
            {question.confidence}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          <span className="font-medium">Why they ask:</span> {question.why_asking}
        </p>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground p-0 h-auto">
              {expanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
              {expanded ? "Hide answer" : "Show answer outline"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 text-sm">
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs font-medium mb-1">Answer outline:</p>
              <p className="text-xs">{question.answer_outline}</p>
            </div>
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs font-medium mb-1">Best evidence:</p>
              <p className="text-xs">{question.best_evidence}</p>
            </div>
            {question.red_flags.length > 0 && (
              <div className="bg-red-50 rounded-md p-2 border border-red-100">
                <p className="text-xs font-medium text-red-700 mb-1">Avoid saying:</p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {question.red_flags.map((flag, i) => (
                    <li key={i}>- {flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

function GapCard({ gap }: { gap: GapHandlingItem }) {
  return (
    <Card className="border-border/50 border-amber-200 bg-amber-50/30">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium">{gap.gap}</p>
        </div>
        <div className="space-y-2 text-xs">
          <div className="bg-white/60 rounded-md p-2">
            <span className="font-medium text-green-700">Honest framing:</span>{" "}
            {gap.honest_framing}
          </div>
          <div className="bg-white/60 rounded-md p-2">
            <span className="font-medium text-blue-700">Redirect to:</span>{" "}
            {gap.redirect_to}
          </div>
          <div className="bg-green-50 rounded-md p-2 border border-green-100">
            <span className="font-medium text-green-700">Say:</span>{" "}
            &ldquo;{gap.what_to_say}&rdquo;
          </div>
          <div className="bg-red-50 rounded-md p-2 border border-red-100">
            <span className="font-medium text-red-700">Do NOT say:</span>{" "}
            {gap.what_not_to_say}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ObjectionCard({ objection }: { objection: ObjectionHandlingItem }) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2 mb-2">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium">{objection.objection}</p>
        </div>
        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground">
            <span className="font-medium">Why they might think this:</span> {objection.why_they_think_that}
          </p>
          <div className="bg-green-50 rounded-md p-2 border border-green-100">
            <span className="font-medium text-green-700">Response:</span>{" "}
            {objection.best_response}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DefenseCard({ item }: { item: ResumeDefenseItem }) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4">
        <p className="text-sm font-medium mb-2">&ldquo;{item.claim}&rdquo;</p>
        <div className="space-y-2 text-xs">
          <div className="bg-muted/50 rounded-md p-2">
            <span className="font-medium">What it means:</span> {item.meaning}
          </div>
          <div className="bg-blue-50 rounded-md p-2 border border-blue-100">
            <span className="font-medium text-blue-700">Evidence:</span> {item.evidence_support}
          </div>
          <div className="bg-green-50 rounded-md p-2 border border-green-100">
            <span className="font-medium text-green-700">How to explain:</span> {item.how_to_explain}
          </div>
          {item.what_not_to_overstate && (
            <div className="bg-amber-50 rounded-md p-2 border border-amber-100">
              <span className="font-medium text-amber-700">Don&apos;t overstate:</span> {item.what_not_to_overstate}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function InterviewPrepClient({ job, initialInterviewPrep }: InterviewPrepClientProps) {
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(initialInterviewPrep)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState("snapshot")

  const handleGenerate = async () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/generate-interview-prep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: job.id }),
        })

        const data = await response.json()

        if (data.success) {
          setInterviewPrep(data.interview_prep)
          toast.success("Interview prep generated successfully")
        } else {
          toast.error(data.error || "Failed to generate interview prep")
        }
      } catch (error) {
        toast.error("Failed to generate interview prep")
        console.error(error)
      }
    })
  }

  const handleExportQuickSheet = () => {
    if (!interviewPrep?.quick_sheet) return

    const qs = interviewPrep.quick_sheet
    const content = `
INTERVIEW QUICK SHEET
${job.title} at ${job.company}
Generated: ${new Date().toLocaleDateString()}

═══════════════════════════════════════════════════════════

TOP 5 TALKING POINTS
${qs.top_5_talking_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

TOP 3 STORIES TO TELL
${qs.top_3_stories.map((s, i) => `${i + 1}. ${s}`).join("\n")}

TOP RISKS TO WATCH
${qs.top_risks.map((r, i) => `${i + 1}. ${r}`).join("\n")}

QUESTIONS TO ASK THEM
${qs.top_questions_to_ask.map((q, i) => `${i + 1}. ${q}`).join("\n")}

30-SECOND CLOSE
${qs.thirty_second_close}
`.trim()

    navigator.clipboard.writeText(content)
    toast.success("Quick sheet copied to clipboard")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href={`/jobs/${job.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Job
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Interview Prep
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {job.title} at {job.company}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {interviewPrep && (
                <Button variant="outline" size="sm" onClick={handleExportQuickSheet}>
                  <Download className="h-4 w-4 mr-1" />
                  Export Quick Sheet
                </Button>
              )}
              <Button 
                onClick={handleGenerate} 
                disabled={isPending}
                size="sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : interviewPrep ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Generate Prep
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {!interviewPrep ? (
          <Card className="max-w-xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Generate Interview Prep</CardTitle>
              <CardDescription>
                Create comprehensive, evidence-based interview preparation tailored to this specific role.
                Includes behavioral stories, likely questions, gap handling, and a quick reference sheet.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={handleGenerate} disabled={isPending} size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Interview Prep...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Interview Prep
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                This typically takes 30-60 seconds
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="snapshot" className="text-xs">
                <Target className="h-3.5 w-3.5 mr-1" />
                Snapshot
              </TabsTrigger>
              <TabsTrigger value="angles" className="text-xs">
                <Trophy className="h-3.5 w-3.5 mr-1" />
                Best Angles
              </TabsTrigger>
              <TabsTrigger value="answers" className="text-xs">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Core Answers
              </TabsTrigger>
              <TabsTrigger value="stories" className="text-xs">
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                Stories
              </TabsTrigger>
              <TabsTrigger value="questions" className="text-xs">
                <HelpCircle className="h-3.5 w-3.5 mr-1" />
                Questions
              </TabsTrigger>
              <TabsTrigger value="gaps" className="text-xs">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Gaps
              </TabsTrigger>
              <TabsTrigger value="defense" className="text-xs">
                <Shield className="h-3.5 w-3.5 mr-1" />
                Defense
              </TabsTrigger>
              <TabsTrigger value="quicksheet" className="text-xs">
                <FileText className="h-3.5 w-3.5 mr-1" />
                Quick Sheet
              </TabsTrigger>
            </TabsList>

            {/* Snapshot Tab */}
            <TabsContent value="snapshot" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Why This Role Fits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{interviewPrep.interview_snapshot.why_role_fits}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Lead Story
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{interviewPrep.interview_snapshot.lead_story}</p>
                    <CopyButton text={interviewPrep.interview_snapshot.lead_story} label="Lead story" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Top Credibility Reasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {interviewPrep.interview_snapshot.top_credibility_reasons.map((reason, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-600 font-medium">{i + 1}.</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 bg-amber-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Top Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {interviewPrep.interview_snapshot.top_risks.map((risk, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-amber-600 font-medium">{i + 1}.</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Company Alignment */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Company Alignment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Key themes and language from the job posting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">What They Care About</p>
                      <div className="flex flex-wrap gap-1.5">
                        {interviewPrep.company_alignment.what_they_care_about.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Language to Mirror</p>
                      <div className="flex flex-wrap gap-1.5">
                        {interviewPrep.company_alignment.language_to_mirror.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Best Angles Tab */}
            <TabsContent value="angles" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {interviewPrep.best_angles.map((angle) => (
                  <AngleCard key={angle.id} angle={angle} />
                ))}
              </div>
            </TabsContent>

            {/* Core Answers Tab */}
            <TabsContent value="answers" className="space-y-6">
              {/* Tell Me About Yourself */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tell Me About Yourself</CardTitle>
                  <CardDescription>Three versions tailored to this role</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["short", "medium", "long"].map((version) => {
                    const key = `${version}_version` as keyof typeof interviewPrep.tell_me_about_yourself
                    const text = interviewPrep.tell_me_about_yourself[key] as string
                    const label = version === "short" ? "30 sec" : version === "medium" ? "60 sec" : "90 sec"
                    return (
                      <div key={version} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">{label}</Badge>
                          <CopyButton text={text} label={`${label} version`} />
                        </div>
                        <p className="text-sm">{text}</p>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Why This Role */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why This Role?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm">{interviewPrep.why_this_role.answer}</p>
                    <div className="flex justify-end mt-2">
                      <CopyButton text={interviewPrep.why_this_role.answer} label="Answer" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Past work tie-in</p>
                      <p className="text-sm">{interviewPrep.why_this_role.what_you_have_done_tie_in}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Company needs tie-in</p>
                      <p className="text-sm">{interviewPrep.why_this_role.what_company_needs_tie_in}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stories Tab */}
            <TabsContent value="stories" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {interviewPrep.behavioral_stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions" className="space-y-6">
              <Tabs defaultValue="recruiter">
                <TabsList className="mb-4">
                  <TabsTrigger value="recruiter">Recruiter</TabsTrigger>
                  <TabsTrigger value="hiring_manager">Hiring Manager</TabsTrigger>
                  <TabsTrigger value="panel">Panel</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="executive">Executive</TabsTrigger>
                </TabsList>

                {(["recruiter", "hiring_manager", "panel", "technical", "executive"] as const).map((type) => (
                  <TabsContent key={type} value={type} className="space-y-3">
                    {interviewPrep.likely_questions[type]?.map((q, i) => (
                      <QuestionCard key={`${type}-${i}`} question={{ ...q, id: `${type}-${i}` }} />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>

              {/* Questions to Ask */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Questions to Ask Them
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(interviewPrep.questions_to_ask).map(([category, questions]) => (
                      <div key={category} className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground capitalize">{category.replace("_", " ")}</p>
                        <ul className="space-y-1.5">
                          {questions.map((q, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-muted-foreground">-</span>
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gaps Tab */}
            <TabsContent value="gaps" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {interviewPrep.gap_handling.map((gap) => (
                  <GapCard key={gap.id} gap={gap} />
                ))}
              </div>

              {/* Objection Handling */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Objection Handling
                  </CardTitle>
                  <CardDescription>How to handle likely concerns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {interviewPrep.objection_handling.map((obj) => (
                      <ObjectionCard key={obj.id} objection={obj} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Defense Tab */}
            <TabsContent value="defense" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {interviewPrep.resume_defense.map((item) => (
                  <DefenseCard key={item.id} item={item} />
                ))}
              </div>
            </TabsContent>

            {/* Quick Sheet Tab */}
            <TabsContent value="quicksheet">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Quick Interview Sheet
                      </CardTitle>
                      <CardDescription>Day-of reference card</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportQuickSheet}>
                      <Download className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Top 5 Talking Points</h4>
                    <ol className="space-y-1.5">
                      {interviewPrep.quick_sheet.top_5_talking_points.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="font-medium text-primary">{i + 1}.</span>
                          {point}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Top 3 Stories</h4>
                    <ol className="space-y-1.5">
                      {interviewPrep.quick_sheet.top_3_stories.map((story, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="font-medium text-primary">{i + 1}.</span>
                          {story}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2 text-amber-600">Top Risks</h4>
                    <ol className="space-y-1.5">
                      {interviewPrep.quick_sheet.top_risks.map((risk, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Questions to Ask</h4>
                    <ol className="space-y-1.5">
                      {interviewPrep.quick_sheet.top_questions_to_ask.map((q, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="font-medium text-primary">{i + 1}.</span>
                          {q}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Separator />

                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">30-Second Close</h4>
                    <p className="text-sm">{interviewPrep.quick_sheet.thirty_second_close}</p>
                    <div className="flex justify-end mt-2">
                      <CopyButton text={interviewPrep.quick_sheet.thirty_second_close} label="Close" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
