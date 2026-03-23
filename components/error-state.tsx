"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Database, Workflow } from "lucide-react"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  showRetry?: boolean
}

export function ErrorState({ 
  title = "Unable to load data", 
  message = "The backend workflow or database configuration may still be in progress.",
  onRetry,
  showRetry = true
}: ErrorStateProps) {
  return (
    <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-amber-500/10 p-4 mb-4">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          {message}
        </p>
        
        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Check Supabase connection</span>
            </div>
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              <span>Check n8n workflow status</span>
            </div>
          </div>
          
          {showRetry && onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
