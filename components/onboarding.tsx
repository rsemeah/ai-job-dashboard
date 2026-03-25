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
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { createJobFromUrl } from "@/lib/actions/jobs"
import type { Job } from "@/lib/types"

export function HeroSection() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to HireWire</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Review jobs, decide if they are worth applying to, and get tailored application materials.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <a href="#review-job">
            <Search className="mr-2 h-4 w-4" />
            Review a Job
          </a>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/manual-entry">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Job Manually
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function WorkflowSteps() {
  const steps = [
    { label: "Add Job", icon: PlusCircle },
    { label: "Review", icon: Search },
    { label: "Decide", icon: ThumbsUp },
    { label: "Prepare", icon: FileText },
    { label: "Apply", icon: ArrowRight },
    { label: "Track", icon: CheckCircle2 },
  ]

  return (
    <div className="flex items-center justify-center gap-1 py-4 overflow-x-auto">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <step.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}

export function HowItWorks() {
  const steps = [
    {
      icon: Link2,
      title: "Paste a job URL",
      description: "Drop in any public job posting link",
    },
    {
      icon: Search,
      title: "n8n processes the job",
      description: "Parses details, deduplicates, scores against your profile",
    },
    {
      icon: ThumbsUp,
      title: "See your fit score",
      description: "Get a clear score with strengths and gaps identified",
    },
    {
      icon: FileText,
      title: "Get tailored materials",
      description: "Resume and cover letter customized for this role",
    },
    {
      icon: CheckCircle2,
      title: "Apply and track",
      description: "One-click apply with status tracking",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">How HireWire Works</CardTitle>
        <CardDescription>Five simple steps from job posting to application</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-5">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-tight">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      toast.error("Please enter a valid URL")
      return
    }

    setStep("submitting")
    toast.info("Submitting URL to n8n workflow...")

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
      toast.warning("This job already exists", {
        description: "Linked to the existing record.",
      })
    } else {
      toast.success("Job submitted to n8n", {
        description: "Processing will happen in the background.",
      })
    }

    if (result.partialParse) {
      toast.warning("Job was partially parsed", {
        description: "Some details may need manual entry.",
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
      <Card id="review-job" className="border-green-500/50 bg-green-500/5">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-green-500/20 p-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Job Submitted</h3>
              <p className="text-muted-foreground max-w-md">
                Sent to n8n for parsing, scoring, and material generation.
              </p>
              {submissionMessage && (
                <p className="text-xs text-muted-foreground">{submissionMessage}</p>
              )}
              {isDuplicate && (
                <p className="text-sm text-amber-600 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Duplicate - linked to existing job
                </p>
              )}
              {isPartialParse && (
                <p className="text-sm text-amber-600 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Partial parse - some details may be missing
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{createdJob.company}</span> - {createdJob.title}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleViewJob}>
                <Briefcase className="mr-2 h-4 w-4" />
                View Job
              </Button>
              <Button variant="outline" asChild>
                <Link href="/jobs">
                  <ListChecks className="mr-2 h-4 w-4" />
                  All Jobs
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleReset}>
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
      <Card id="review-job" className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/20 p-4">
              <ExternalLink className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Failed to Add Job</h3>
              <p className="text-muted-foreground max-w-md">
                {error || "Something went wrong. Please try again."}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleReset}>Try Again</Button>
              <Button variant="outline" asChild>
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
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="rounded-full bg-primary/20 p-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Submitting to n8n</h3>
              <p className="text-sm text-muted-foreground">
                Sending URL to ingestion workflow...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default input state
  return (
    <Card id="review-job">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Review a Job
        </CardTitle>
        <CardDescription>
          Paste a job posting URL to analyze fit and generate application materials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://boards.greenhouse.io/company/jobs/123456"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              autoFocus={isFirstTime}
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Review Job
            </Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground mt-3">
          Paste any public job posting URL - we'll attempt to parse it automatically
        </p>
      </CardContent>
    </Card>
  )
}

export function OnboardingEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Briefcase className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No jobs reviewed yet</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          Start by pasting a job URL above to begin your job search journey.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <a href="#review-job">
              <Search className="mr-2 h-4 w-4" />
              Review a Job
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/manual-entry">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Manually
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
