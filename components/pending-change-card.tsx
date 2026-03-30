"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, Loader2 } from "lucide-react"

/**
 * Pending Profile Change Review Card
 * 
 * Displays a proposed profile change with old/new values
 * and approve/reject actions.
 */

interface ProposedChange {
  old_value: unknown
  new_value: unknown
}

interface PendingChange {
  id: string
  summary: string
  source: string
  proposed_changes: Record<string, ProposedChange>
  created_at: string
}

interface PendingChangeCardProps {
  change: PendingChange
  onAction: (changeId: string, action: "approve" | "reject") => Promise<void>
}

export function PendingChangeCard({ change, onAction }: PendingChangeCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [actionTaken, setActionTaken] = useState<"approve" | "reject" | null>(null)

  const handleAction = async (action: "approve" | "reject") => {
    setIsLoading(true)
    try {
      await onAction(change.id, action)
      setActionTaken(action)
    } finally {
      setIsLoading(false)
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "(empty)"
    if (typeof value === "object") return JSON.stringify(value, null, 2)
    return String(value)
  }

  const formatFieldName = (field: string): string => {
    return field
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  if (actionTaken) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4 text-center text-muted-foreground">
          {actionTaken === "approve" ? "Changes applied" : "Changes rejected"}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{change.summary}</CardTitle>
            <CardDescription className="mt-1">
              Suggested by {change.source}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            Pending
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {Object.entries(change.proposed_changes).map(([field, values]) => (
          <div key={field} className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">
              {formatFieldName(field)}
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex gap-2">
                <span className="w-12 shrink-0 text-muted-foreground">Old:</span>
                <span className="font-mono text-xs break-all">
                  {formatValue(values.old_value)}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-12 shrink-0 text-muted-foreground">New:</span>
                <span className="font-mono text-xs break-all text-foreground">
                  {formatValue(values.new_value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          onClick={() => handleAction("approve")}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Apply Changes
        </Button>
        <Button
          variant="outline"
          onClick={() => handleAction("reject")}
          disabled={isLoading}
          className="flex-1"
        >
          <X className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </CardFooter>
    </Card>
  )
}
