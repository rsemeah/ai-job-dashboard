import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, FileText, Send, Inbox, PlusCircle, Building2, BarChart3, User, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

type EmptyStateVariant = "jobs" | "documents" | "applications" | "ready" | "companies" | "analytics" | "evidence" | "default"

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  message?: string
  className?: string
}

type VariantConfig = { 
  icon: typeof Search
  title: string
  message: string
  hint?: string
  actions?: Array<{
    label: string
    href: string
    icon?: typeof Search
    variant?: "default" | "outline"
  }>
}

const variants: Record<EmptyStateVariant, VariantConfig> = {
  jobs: {
    icon: Search,
    title: "No jobs yet",
    message: "Paste a job URL above to get started.",
    hint: "HireWire will analyze the posting and score your fit.",
    actions: [
      { label: "Add a Job", href: "/#job-input", icon: PlusCircle, variant: "default" },
    ],
  },
  evidence: {
    icon: FileText,
    title: "No evidence yet",
    message: "Upload your resume in Profile to auto-populate, or add items manually.",
    actions: [
      { label: "Go to Profile", href: "/profile", icon: User, variant: "default" },
      { label: "Add Manually", href: "/evidence", icon: PlusCircle, variant: "outline" },
    ],
  },
  documents: {
    icon: FileText,
    title: "No documents generated yet",
    message: "Analyze a job and generate your resume to see it here.",
    actions: [
      { label: "View Jobs", href: "/jobs", icon: Search, variant: "default" },
    ],
  },
  applications: {
    icon: Send,
    title: "Nothing applied yet",
    message: "Jobs you mark as applied will appear here.",
    actions: [
      { label: "View Ready Queue", href: "/ready-queue", icon: ListChecks, variant: "default" },
    ],
  },
  ready: {
    icon: ListChecks,
    title: "No jobs ready to apply",
    message: "Jobs with generated materials and quality approval will appear here.",
    actions: [
      { label: "View Jobs", href: "/jobs", icon: Search, variant: "default" },
    ],
  },
  companies: {
    icon: Building2,
    title: "No companies tracked yet",
    message: "They appear automatically when you add a job.",
    actions: [
      { label: "Add a Job", href: "/jobs", icon: PlusCircle, variant: "default" },
    ],
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
        
        {config.actions && config.actions.length > 0 && (
          <div className="flex gap-3 mt-4">
            {config.actions.map((action, idx) => {
              const ActionIcon = action.icon
              return (
                <Button 
                  key={idx} 
                  asChild 
                  size="sm" 
                  variant={action.variant || "default"}
                >
                  <Link href={action.href}>
                    {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                    {action.label}
                  </Link>
                </Button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
