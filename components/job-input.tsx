"use client"
// TruthSerum Job Analysis Flow - v3 - March 26 2026 07:45

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trackEvent } from "@/components/posthog-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Link2, 
  Search, 
  ThumbsUp, 
  FileText, 
  CheckCircle2,
  Loader2,
  PlusCircle,
  ArrowRight,
  ExternalLink,
  Briefcase,
  ListChecks,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  FileCheck,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { analyzeAndGenerateForJob } from "@/lib/actions/jobs"
import type { Job } from "@/lib/types"

export function HeroSection() {
  return (
    <div className="space-y-6 pb-2">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          Job Search Engine
        </p>
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight leading-[1.1]">
          Know before you apply.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
          HireWire scores every job against your profile, generates tailored materials, 
          and keeps your pipeline organized. No more guesswork.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-4 pt-2">
        <Button size="lg" className="h-12 px-6 text-base font-medium" asChild>
          <a href="#review-job">
            <Zap className="mr-2 h-4 w-4" />
            Review a Job
          </a>
        </Button>
        <Button variant="outline" size="lg" className="h-12 px-6 text-base font-medium" asChild>
          <Link href="/manual-entry">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Manually
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function WorkflowSteps() {
  const steps = [
    { label: "Submit", description: "Paste URL" },
    { label: "Analyze", description: "AI extracts details" },
    { label: "Score", description: "Match fit" },
    { label: "Generate", description: "Resume + Cover" },
    { label: "Apply", description: "One click" },
  ]

  return (
    <div className="py-8 border-y border-border">
      <div className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center text-center flex-1">
              <span className="text-xs font-medium tracking-wide uppercase text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-sm font-semibold mt-1">{step.label}</span>
              <span className="text-xs text-muted-foreground">{step.description}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-8 h-px bg-border flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function HowItWorks() {
  const steps = [
    {
      icon: Link2,
      number: "01",
      title: "Drop the link",
      description: "Paste any job URL. Greenhouse, Lever, LinkedIn - we handle the parsing.",
    },
    {
      icon: Target,
      number: "02", 
      title: "Get your score",
      description: "AI analyzes the role against your profile. Strengths highlighted, gaps identified.",
    },
    {
      icon: Sparkles,
      number: "03",
      title: "Materials, generated",
      description: "Resume and cover letter tailored to this specific role. Ready to submit.",
    },
    {
      icon: ArrowRight,
      number: "04",
      title: "Apply with confidence",
      description: "Copy, download, and track. Know exactly where you stand, always.",
    },
  ]

  return (
    <div className="py-12">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-2">
          The Process
        </p>
        <h2 className="text-2xl font-serif font-medium">Four steps to better applications</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={index} className="group">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary border border-border transition-colors group-hover:border-primary/20">
                  <step.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <span className="text-xs font-medium tracking-wider text-muted-foreground/60">
                  {step.number}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type ProcessingStep = "idle" | "analyzing" | "generating" | "complete" | "error"

interface AnalysisResult {
  job: Job
  analysis?: {
    title?: string
    company?: string
    location?: string | null
    employment_type?: string | null
    salary_text?: string | null
    responsibilities?: string[]
    qualifications_required?: string[]
    qualifications_preferred?: string[]
    keywords?: string[]
    ats_phrases?: string[]
    tech_stack?: string[]
    seniority_level?: string
  } | null
  generation?: {
    job_id: string
    evidence_map: {
      fit_score: number
      fit_rationale: string
      matched_skills: string[]
      matched_tools: string[]
      gaps: string[]
    }
    generated_resume: string
    generated_cover_letter: string
    quality_check: {
      passed: boolean
      issues: {
        invented_claims: string[]
        vague_bullets: string[]
        ai_filler: string[]
      }
      suggestions: string[]
    }
  } | null
  duplicate: boolean
}

interface JobUrlInputProps {
  onSubmitSuccess?: () => void
  isFirstTime?: boolean
}

export function JobUrlInput({ onSubmitSuccess, isFirstTime = false }: JobUrlInputProps) {
  const [url, setUrl] = useState("")
  const [step, setStep] = useState<ProcessingStep>("idle")
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isProcessing = step === "analyzing" || step === "generating"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!url.trim()) {
      toast.error("Please enter a job URL")
      return
    }

    try {
      new URL(url)
    } catch {
      toast.error("Please enter a valid URL")
      return
    }

    setStep("analyzing")
    toast.info("Analyzing job posting...")

    const response = await analyzeAndGenerateForJob(url)

    if (!response.success) {
      setStep("error")
      setError(response.error)
      toast.error("Failed to analyze job", { description: response.error })
      return
    }

    if (response.duplicate) {
      setResult({
        job: response.job,
        analysis: response.analysis,
        generation: null,
        duplicate: true,
      })
      setStep("complete")
      toast.warning("Already in your pipeline", {
        description: "Linked to existing record.",
      })
      return
    }

    // Show generating state briefly
    setStep("generating")
    toast.info("Generating tailored materials...")

    // Results already include generation from the combined call
    setResult({
      job: response.job,
      analysis: response.analysis,
      generation: response.generation,
      duplicate: false,
    })
    setStep("complete")

    if (response.generation) {
      toast.success("Analysis complete!", {
        description: `Fit score: ${response.generation.evidence_map.fit_score}%`,
      })
    } else {
      toast.success("Job analyzed!", {
        description: "Complete your profile to generate materials.",
      })
    }
    
    // Track funnel event: job_added
    if (result?.job) {
      trackEvent.jobAdded({
        job_id: result.job.id,
        company: result.job.company,
        role: result.job.title,
      })
    }
    
    onSubmitSuccess?.()
  }

  const handleViewJob = () => {
    if (result?.job) {
      router.push(`/jobs/${result.job.id}`)
    } else {
      router.push("/jobs")
    }
  }

  const handleReset = () => {
    setStep("idle")
    setUrl("")
    setResult(null)
    setError(null)
  }

  const handleCopy = async (content: string, type: string) => {
    await navigator.clipboard.writeText(content)
    toast.success(`${type} copied to clipboard`)
  }

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${filename}`)
  }

  // Success state with full results
  if (step === "complete" && result) {
    // Extract values with defensive defaults
    const job = result.job
    const analysis = result.analysis
    const generation = result.generation  
    const duplicate = result.duplicate

    // Safe title and company with multiple fallbacks
    const safeTitle = analysis?.title || job?.title || "Position"
    const safeCompany = analysis?.company || job?.company || "Company"

    // Defensive check - if analysis is missing, show basic info from job
    if (!analysis) {
      return (
        <Card id="review-job" className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">Job Added</h3>
              <p className="text-muted-foreground">
                {job?.title || "Job"} at {job?.company || "Company"}
              </p>
              <div className="flex gap-3">
                <Button onClick={handleViewJob}>View Details</Button>
                <Button variant="outline" onClick={handleReset}>Analyze Another</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card id="review-job" className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{safeTitle}</h3>
                  <p className="text-muted-foreground">{safeCompany}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analysis.location && (
                      <Badge variant="secondary">{analysis.location}</Badge>
                    )}
                    {analysis.employment_type && (
                      <Badge variant="secondary">{analysis.employment_type}</Badge>
                    )}
                    {analysis.salary_text && (
                      <Badge variant="secondary">{analysis.salary_text}</Badge>
                    )}
                    {duplicate && (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Duplicate
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {generation && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {generation.evidence_map.fit_score}%
                  </div>
                  <div className="text-sm text-muted-foreground">Fit Score</div>
                </div>
              )}
            </div>

            {/* Fit Analysis */}
            {generation && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                    Matched Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {generation.evidence_map.matched_skills.slice(0, 8).map((skill, i) => (
                      <Badge key={i} variant="outline" className="bg-primary/5">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Gaps to Address
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {generation.evidence_map.gaps.slice(0, 5).map((gap, i) => (
                      <Badge key={i} variant="outline" className="bg-amber-500/5 text-amber-700">
                        {gap}
                      </Badge>
                    ))}
                    {generation.evidence_map.gaps.length === 0 && (
                      <span className="text-sm text-muted-foreground">No significant gaps identified</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Generated Documents */}
            {generation && (
              <Tabs defaultValue="resume" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="resume" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resume
                  </TabsTrigger>
                  <TabsTrigger value="cover" className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Cover Letter
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="resume" className="mt-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-end gap-2 mb-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(generation.generated_resume, "Resume")}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(
                            generation.generated_resume,
                            `resume-${safeCompany.toLowerCase().replace(/\s+/g, "-")}.txt`
                          )}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <ScrollArea className="h-[400px] rounded-md border p-4">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {generation.generated_resume}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="cover" className="mt-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-end gap-2 mb-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(generation.generated_cover_letter, "Cover Letter")}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(
                            generation.generated_cover_letter,
                            `cover-letter-${safeCompany.toLowerCase().replace(/\s+/g, "-")}.txt`
                          )}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <ScrollArea className="h-[400px] rounded-md border p-4">
                        <pre className="text-sm whitespace-pre-wrap font-sans">
                          {generation.generated_cover_letter}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {/* Quality Warning */}
            {generation && !generation.quality_check.passed && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700">Quality review recommended</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Some sections may need manual review. Check for accuracy before submitting.
                  </p>
                </div>
              </div>
            )}

            {/* No generation message */}
            {!generation && !duplicate && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary border">
                <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Complete your profile to generate materials</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your experience and skills to the profile page to enable resume and cover letter generation.
                  </p>
                  <Button variant="link" className="px-0 mt-2" asChild>
                    <Link href="/profile">Go to Profile</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              <Button onClick={handleViewJob} className="h-11 px-5">
                <Briefcase className="mr-2 h-4 w-4" />
                View Full Details
              </Button>
              <Button variant="outline" className="h-11 px-5" asChild>
                <Link href="/jobs">
                  <ListChecks className="mr-2 h-4 w-4" />
                  All Jobs
                </Link>
              </Button>
              <Button variant="ghost" className="h-11 px-5" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Analyze Another
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (step === "error") {
    return (
      <Card id="review-job" className="border-destructive/30 bg-destructive/[0.02]">
        <CardContent className="py-10">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="rounded-full bg-destructive/10 p-4">
              <ExternalLink className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Couldn&apos;t Process</h3>
              <p className="text-muted-foreground max-w-md">
                {error || "Something went wrong. Try again or add manually."}
              </p>
            </div>
            <div className="flex gap-3 pt-3">
              <Button onClick={handleReset} className="h-11 px-5">Try Again</Button>
              <Button variant="outline" className="h-11 px-5" asChild>
                <Link href="/manual-entry">Add Manually</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Processing states
  if (isProcessing) {
    return (
      <Card id="review-job">
        <CardContent className="py-10">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="rounded-full bg-secondary p-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {step === "analyzing" ? "Analyzing Job Posting" : "Generating Materials"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step === "analyzing" 
                  ? "Extracting job details and requirements..."
                  : "Creating tailored resume and cover letter..."
                }
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${step === "analyzing" ? "bg-primary animate-pulse" : "bg-primary"}`} />
              <span>Analyze</span>
              <div className="h-px w-4 bg-border" />
              <div className={`h-2 w-2 rounded-full ${step === "generating" ? "bg-primary animate-pulse" : "bg-muted"}`} />
              <span>Generate</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default input state
  return (
    <Card id="review-job" className="overflow-hidden">
      <CardHeader className="pb-4 bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Add a Job</CardTitle>
            <CardDescription className="text-sm">
              Paste the URL. We analyze, score, and generate materials instantly.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://boards.greenhouse.io/company/jobs/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 h-12 text-base"
              autoFocus={isFirstTime}
            />
            <Button type="submit" size="lg" className="h-12 px-6">
              <Search className="mr-2 h-4 w-4" />
              Analyze
            </Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground mt-4">
          Works with Greenhouse, Lever, LinkedIn, and most public job boards. Results in seconds.
        </p>
      </CardContent>
    </Card>
  )
}

export function OnboardingEmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center rounded-full bg-secondary p-6 mb-6">
        <Briefcase className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-serif font-medium mb-3">Your pipeline is empty</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        Add your first job to see HireWire in action. Paste a URL above 
        or enter details manually.
      </p>
      <div className="flex justify-center gap-4">
        <Button size="lg" className="h-12 px-6" asChild>
          <a href="#review-job">
            <Search className="mr-2 h-4 w-4" />
            Review a Job
          </a>
        </Button>
        <Button variant="outline" size="lg" className="h-12 px-6" asChild>
          <Link href="/manual-entry">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Manually
          </Link>
        </Button>
      </div>
    </div>
  )
}
