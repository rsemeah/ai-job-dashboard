"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Database,
  Workflow,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SystemStatusProps {
  lastJobCreated?: string | null
  hasWorkflowOutputs?: boolean
}

export function SystemStatus({ lastJobCreated, hasWorkflowOutputs = false }: SystemStatusProps) {
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("jobs").select("id").limit(1)
      setSupabaseConnected(!error)
    } catch {
      setSupabaseConnected(false)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  const formatLastSync = (dateString: string | null | undefined) => {
    if (!dateString) return "No data yet"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Supabase Connection */}
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Database</span>
              {supabaseConnected === null ? (
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Checking
                </Badge>
              ) : supabaseConnected ? (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              )}
            </div>

            {/* Workflow Status */}
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Workflows</span>
              {hasWorkflowOutputs ? (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Waiting
                </Badge>
              )}
            </div>

            {/* Last Sync */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Last job:</span>
              <span className="text-sm font-medium">{formatLastSync(lastJobCreated)}</span>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={checkConnection}
            disabled={isChecking}
            className="h-8"
          >
            <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
