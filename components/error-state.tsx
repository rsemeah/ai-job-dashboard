"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Database, Settings, Key } from "lucide-react"
import { useRouter } from "next/navigation"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  showRetry?: boolean
}

export function ErrorState({ 
  title = "Unable to load data", 
  message = "Check that Supabase and Groq API are properly configured.",
  onRetry,
  showRetry = true
}: ErrorStateProps) {
  const router = useRouter()

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      router.refresh()
    }
  }

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
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Check Supabase connection</span>
            </div>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span>Check GROQ_API_KEY is set</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground max-w-sm">
            Open Settings (top right) to verify Supabase is connected and environment variables are configured.
          </p>
          
          {showRetry && (
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
