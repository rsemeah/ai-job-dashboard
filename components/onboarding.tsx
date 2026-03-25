"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { createJobFromUrl } from "@/lib/actions/jobs"
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
    { label: "Score", description: "AI analysis" },
    { label: "Generate", description: "Tailored docs" },
    { label: "Apply", description: "One click" },
    { label: "Track", description: "Full visibility" },
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
      description: "Paste any job URL. Greenhouse, Lever, LinkedIn—we handle the parsing.",
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
      description: "One-click submission tracking. Know exactly where you stand, always.",
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

type ProcessingStep = "idle" | "submitting" | "complete" | "error"

interface JobUrlInputProps {
  onSubmitSuccess?: () => void
  isFirstTime?: boolean
}

export function JobUrlInput({ onSubmitSuccess, isFirstTime = false }: JobUrlInputProps) {
  const [url, setUrl] = useState("")
  const [step, setStep] = useState<ProcessingStep>("idle")
  const [createdJob, setCreatedJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [isPartialParse, setIsPartialParse] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)
  const router = useRouter()

  const isProcessing = step === "submitting"

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

    setStep("submitting")
    toast.info("Processing...")

    const result = await createJobFromUrl(url)

    if (!result.success) {
      setStep("error")
      setError(result.error)
      toast.error("Failed to submit job", { description: result.error })
      return
    }

    setCreatedJob(result.job)
    setIsDuplicate(result.duplicate)
    setIsPartialParse(result.partialParse)
    setSubmissionMessage(result.message || null)
    setStep("complete")

    if (result.duplicate) {
      toast.warning("Already in your pipeline", {
        description: "Linked to existing record.",
      })
    } else {
      toast.success("Job added to pipeline", {
        description: "AI processing in background.",
      })
    }

    if (result.partialParse) {
      toast.warning("Partial data extracted", {
        description: "Some fields may need manual entry.",
      })
    }
    
    onSubmitSuccess?.()
  }

  const handleViewJob = () => {
    if (createdJob) {
      router.push(`/jobs/${createdJob.id}`)
    } else {
      router.push("/jobs")
    }
  }

  const handleReset = () => {
    setStep("idle")
    setUrl("")
    setCreatedJob(null)
    setError(null)
    setIsDuplicate(false)
    setIsPartialParse(false)
    setSubmissionMessage(null)
  }

  // Success state
  if (step === "complete" && createdJob) {
    return (
      <Card id="review-job" className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="py-10">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Added to Pipeline</h3>
              <p className="text-muted-foreground max-w-md">
                AI is analyzing fit and generating materials.
              </p>
              {isDuplicate && (
                <p className="text-sm text-amber-600 flex items-center justify-center gap-1.5 mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  Duplicate detected - linked to existing
                </p>
              )}
              {isPartialParse && (
                <p className="text-sm text-amber-600 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Partial parse - review recommended
                </p>
              )}
              <div className="pt-2 border-t border-border mt-4">
                <p className="text-sm font-medium">{createdJob.company}</p>
                <p className="text-sm text-muted-foreground">{createdJob.title}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-3">
              <Button onClick={handleViewJob} className="h-11 px-5">
                <Briefcase className="mr-2 h-4 w-4" />
                View Job
              </Button>
              <Button variant="outline" className="h-11 px-5" asChild>
                <Link href="/jobs">
                  <ListChecks className="mr-2 h-4 w-4" />
                  All Jobs
                </Link>
              </Button>
              <Button variant="ghost" className="h-11 px-5" onClick={handleReset}>
                Add Another
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
              <h3 className="text-xl font-semibold">Couldn't Process</h3>
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

  // Processing state
  if (isProcessing) {
    return (
      <Card id="review-job">
        <CardContent className="py-10">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="rounded-full bg-secondary p-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Processing</h3>
              <p className="text-sm text-muted-foreground">
                Sending to workflow engine...
              </p>
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
              Paste the URL. We handle the rest.
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
          Works with Greenhouse, Lever, LinkedIn, and most public job boards.
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
