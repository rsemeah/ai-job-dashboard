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
  ListChecks
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
      description: "Drop in a link from Greenhouse, Lever, or any job posting",
    },
    {
      icon: Search,
      title: "HireWire reviews the role",
      description: "AI analyzes the job against your background and preferences",
    },
    {
      icon: ThumbsUp,
      title: "See a go or no-go decision",
      description: "Get a clear fit score with strengths and gaps identified",
    },
    {
      icon: FileText,
      title: "View tailored application materials",
      description: "Resume highlights and cover letter customized for this role",
    },
    {
      icon: CheckCircle2,
      title: "Track your application status",
      description: "Monitor progress from review to interview to offer",
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

type ProcessingStep = "idle" | "submitting" | "fetching" | "reviewing" | "preparing" | "complete" | "error"

interface JobUrlInputProps {
  onSubmitSuccess?: () => void
  isFirstTime?: boolean
}

export function JobUrlInput({ onSubmitSuccess, isFirstTime = false }: JobUrlInputProps) {
  const [url, setUrl] = useState("")
  const [step, setStep] = useState<ProcessingStep>("idle")
  const [createdJob, setCreatedJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isProcessing = step !== "idle" && step !== "complete" && step !== "error"

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
    toast.info("Starting job review...")

    // Step 1: Create the job record
    setStep("fetching")
    const result = await createJobFromUrl(url)
    
    if (!result.success) {
      setStep("error")
      setError(result.error)
      toast.error("Failed to submit job", { description: result.error })
      return
    }

    setCreatedJob(result.job)
    
    // Step 2: Full-auto AI processing
    setStep("reviewing")
    
    try {
      const processResponse = await fetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: result.job.id }),
      })
      
      if (processResponse.ok) {
        const processResult = await processResponse.json()
        
        // Step 3: Processing complete
        setStep("preparing")
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 4: Complete with details
        setStep("complete")
        
        if (processResult.score >= 60) {
          toast.success("Job is ready to apply!", {
            description: `Score: ${processResult.score}/100 (${processResult.fit} fit). Resume generated.`,
          })
        } else {
          toast.success("Job analyzed!", {
            description: `Score: ${processResult.score}/100. Review details to decide.`,
          })
        }
      } else {
        // Processing failed but job was created
        setStep("complete")
        toast.info("Job added - processing will continue in background", {
          description: "View the job to see details.",
        })
      }
    } catch (processError) {
      // Processing failed but job was created
      console.error("Process error:", processError)
      setStep("complete")
      toast.info("Job added", {
        description: "Manual review may be needed.",
      })
    }
    
    onSubmitSuccess?.()
  }

  const handleViewReview = () => {
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
  }

  // Success state - show after job is created
  if (step === "complete" && createdJob) {
    return (
      <Card id="review-job" className="border-green-500/50 bg-green-500/5">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-green-500/20 p-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Job Added Successfully</h3>
              <p className="text-muted-foreground max-w-md">
                Your job is now in the system. The AI will analyze it and update the score once processing is complete.
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{createdJob.company}</span> - {createdJob.title}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleViewReview}>
                <Briefcase className="mr-2 h-4 w-4" />
                View Job
              </Button>
              <Button variant="outline" asChild>
                <Link href="/jobs">
                  <ListChecks className="mr-2 h-4 w-4" />
                  View All Jobs
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
                {error || "Something went wrong while adding this job. Please try again."}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleReset}>
                Try Again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/manual-entry">
                  Add Manually
                </Link>
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
            <div className="relative">
              <div className="rounded-full bg-primary/20 p-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-4 w-full max-w-sm">
              <h3 className="text-lg font-semibold">Adding Job to HireWire</h3>
              <ProcessingSteps currentStep={step} />
              <p className="text-xs text-muted-foreground">
                This usually takes a few seconds
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
          Supports Greenhouse, Lever, Workday, and most job board URLs
        </p>
      </CardContent>
    </Card>
  )
}

function ProcessingSteps({ currentStep }: { currentStep: ProcessingStep }) {
  const steps = [
    { key: "fetching", label: "Creating job record" },
    { key: "reviewing", label: "AI analyzing fit & generating materials" },
    { key: "preparing", label: "Finalizing resume & cover letter" },
  ]

  const currentIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        const isPending = index > currentIndex

        return (
          <div 
            key={step.key}
            className={`flex items-center gap-3 text-sm transition-opacity ${
              isPending ? "opacity-40" : "opacity-100"
            }`}
          >
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
              isComplete ? "bg-green-500 text-white" :
              isCurrent ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>
            <span className={isCurrent ? "font-medium" : ""}>{step.label}</span>
          </div>
        )
      })}
    </div>
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
