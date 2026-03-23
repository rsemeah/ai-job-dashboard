import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Inbox, FileText, Send } from "lucide-react"
import { cn } from "@/lib/utils"

type EmptyStateVariant = "jobs" | "documents" | "applications" | "default"

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  message?: string
  className?: string
}

const variants: Record<EmptyStateVariant, { icon: typeof Sparkles; title: string; message: string }> = {
  jobs: {
    icon: Sparkles,
    title: "No jobs yet",
    message: "Jobs will appear here once your n8n workflow successfully scores and ingests them. Make sure your workflow is running and connected to this Supabase instance."
  },
  documents: {
    icon: FileText,
    title: "No documents generated",
    message: "Generated resumes, cover letters, and application answers will appear here after the AI workflow processes your jobs."
  },
  applications: {
    icon: Send,
    title: "No applications submitted",
    message: "Your submitted applications will be tracked here. Mark jobs as applied to see them in this view."
  },
  default: {
    icon: Inbox,
    title: "Nothing here yet",
    message: "Data will appear here once your backend workflows are running."
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
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title || config.title}</h3>
        <p className="text-muted-foreground max-w-md mb-4">
          {message || config.message}
        </p>
        {variant === "jobs" && (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Waiting for jobs from:</p>
            <div className="flex gap-2 justify-center">
              <span className="px-2 py-1 bg-muted rounded text-xs font-mono">Jobot</span>
              <span className="px-2 py-1 bg-muted rounded text-xs font-mono">ZipRecruiter</span>
              <span className="px-2 py-1 bg-muted rounded text-xs font-mono">Greenhouse</span>
              <span className="px-2 py-1 bg-muted rounded text-xs font-mono">Manual</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
