import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, FileText, Send, Inbox, PlusCircle, Building2, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

type EmptyStateVariant = "jobs" | "documents" | "applications" | "ready" | "companies" | "analytics" | "default"

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  message?: string
  className?: string
}

const variants: Record<EmptyStateVariant, { 
  icon: typeof Search
  title: string
  message: string
  hint?: string
  showActions?: boolean 
}> = {
  jobs: {
    icon: Search,
    title: "No jobs reviewed yet",
    message: "Start by pasting a job URL on the Home page to begin reviewing opportunities.",
    hint: "Tip: HireWire analyzes job postings to score your fit and generate tailored materials.",
    showActions: true,
  },
  documents: {
    icon: FileText,
    title: "No materials generated yet",
    message: "Once you review a job and it scores well, HireWire will generate tailored resumes and cover letters.",
    hint: "Materials are generated automatically for high-scoring jobs.",
  },
  applications: {
    icon: Send,
    title: "No applications tracked yet",
    message: "When you apply to a job, mark it as applied to track your progress.",
    hint: "Use the status dropdown on any job to mark it as applied.",
  },
  ready: {
    icon: Search,
    title: "No jobs ready to apply",
    message: "Jobs that score well and have generated materials will appear here when ready.",
    hint: "High-fit jobs with complete materials are moved here automatically.",
    showActions: true,
  },
  companies: {
    icon: Building2,
    title: "No companies yet",
    message: "Companies will appear here once you start reviewing jobs.",
    hint: "Track all your target companies in one place.",
  },
  analytics: {
    icon: BarChart3,
    title: "No analytics data yet",
    message: "Analytics will populate as you review more jobs and track applications.",
    hint: "Review at least 5 jobs to see meaningful insights.",
  },
  default: {
    icon: Inbox,
    title: "Nothing here yet",
    message: "Start reviewing jobs to see data here.",
  }
}

export function EmptyState({ 
  variant = "default", 
  title,
  message,
  className 
}: EmptyStateProps) {
  const config = variants[variant]
  const Icon = config.icon
  
  return (
    <Card className={cn("border-dashed border-muted-foreground/20", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted/50 p-5 mb-5">
          <Icon className="h-8 w-8 text-muted-foreground/70" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          {title || config.title}
        </h3>
        
        <p className="text-sm text-muted-foreground max-w-md mb-2">
          {message || config.message}
        </p>
        
        {config.hint && (
          <p className="text-xs text-muted-foreground/70 max-w-sm mb-6">
            {config.hint}
          </p>
        )}
        
        {config.showActions && (
          <div className="flex gap-3 mt-4">
            <Button asChild size="sm">
              <Link href="/#review-job">
                <Search className="mr-2 h-4 w-4" />
                Review a Job
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/jobs/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Manually
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
