import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, FileText, Send, Inbox, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

type EmptyStateVariant = "jobs" | "documents" | "applications" | "ready" | "default"

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  message?: string
  className?: string
}

const variants: Record<EmptyStateVariant, { icon: typeof Search; title: string; message: string; showActions?: boolean }> = {
  jobs: {
    icon: Search,
    title: "No jobs reviewed yet",
    message: "Start by pasting a job URL on the Home page, or add a job manually to begin reviewing opportunities.",
    showActions: true,
  },
  documents: {
    icon: FileText,
    title: "No materials generated yet",
    message: "Once you review a job and it scores well, HireWire will generate tailored resumes and cover letters for you.",
  },
  applications: {
    icon: Send,
    title: "No applications tracked yet",
    message: "When you apply to a job, mark it as applied to track your progress here.",
  },
  ready: {
    icon: Search,
    title: "No jobs ready to apply",
    message: "Jobs that score well and have generated materials will appear here when they're ready for you to apply.",
    showActions: true,
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
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title || config.title}</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          {message || config.message}
        </p>
        {config.showActions && (
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/#review-job">
                <Search className="mr-2 h-4 w-4" />
                Review a Job
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/manual-entry">
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
