"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  FileText,
  Download,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExportAuditResult, AuditItem, AuditCategory } from "@/lib/ats-validation"

interface ExportAuditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  auditResult: ExportAuditResult
  onProceed: () => void
  onCancel: () => void
  documentType: "resume" | "cover_letter"
  exportFormat: string
}

export function ExportAuditDialog({
  open,
  onOpenChange,
  auditResult,
  onProceed,
  onCancel,
  documentType,
  exportFormat,
}: ExportAuditDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<AuditCategory>>(
    new Set(["safety", "content"])
  )

  const {
    can_export,
    requires_override,
    overall_score,
    content_issues,
    formatting_issues,
    ats_issues,
    safety_issues,
    critical_count,
    warning_count,
    summary_message,
  } = auditResult

  const hasIssues = critical_count > 0 || warning_count > 0
  const needsAcknowledgment = requires_override && !acknowledged

  const toggleCategory = (category: AuditCategory) => {
    const next = new Set(expandedCategories)
    if (next.has(category)) {
      next.delete(category)
    } else {
      next.add(category)
    }
    setExpandedCategories(next)
  }

  // Group issues by category for display
  const categories: { key: AuditCategory; label: string; icon: typeof Shield; items: AuditItem[] }[] = [
    { key: "safety", label: "Content Safety", icon: Shield, items: safety_issues },
    { key: "content", label: "Content Quality", icon: FileText, items: content_issues },
    { key: "ats", label: "ATS Compatibility", icon: CheckCircle2, items: ats_issues },
    { key: "formatting", label: "Formatting", icon: Info, items: formatting_issues },
  ].filter(c => c.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Export Audit
          </DialogTitle>
          <DialogDescription>
            Review before exporting your {documentType === "resume" ? "resume" : "cover letter"} as {exportFormat.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        {/* Score indicator */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="relative">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(overall_score / 100) * 176} 176`}
                className={cn(
                  overall_score >= 80 ? "text-green-500" :
                  overall_score >= 60 ? "text-amber-500" : "text-destructive"
                )}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
              {overall_score}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium">{summary_message}</p>
            <div className="flex gap-3 mt-2 text-sm">
              {critical_count > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {critical_count} critical
                </span>
              )}
              {warning_count > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {warning_count} warning{warning_count !== 1 ? "s" : ""}
                </span>
              )}
              {critical_count === 0 && warning_count === 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  All checks passed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Issue list */}
        {hasIssues && (
          <ScrollArea className="max-h-64">
            <div className="space-y-3">
              {categories.map(({ key, label, icon: Icon, items }) => (
                <div key={key} className="border rounded-lg">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50"
                    onClick={() => toggleCategory(key)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    {expandedCategories.has(key) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  
                  {expandedCategories.has(key) && (
                    <div className="border-t px-3 pb-3">
                      {items.map((item) => (
                        <AuditItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Override acknowledgment */}
        {requires_override && (
          <>
            <Separator />
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <label htmlFor="acknowledge" className="text-sm leading-tight cursor-pointer">
                I understand there are issues with this document but want to export anyway
              </label>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          {can_export ? (
            <Button
              onClick={onProceed}
              disabled={needsAcknowledgment}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {requires_override ? "Export Anyway" : "Export"}
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <XCircle className="h-4 w-4" />
              Cannot Export
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AuditItemRow({ item }: { item: AuditItem }) {
  const severityConfig = {
    critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
  }

  const config = severityConfig[item.severity]
  const Icon = config.icon

  return (
    <div className="py-2 first:pt-3">
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
          {item.suggested_fix && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Suggestion: {item.suggested_fix}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Simplified inline audit indicator for the export button
interface ExportAuditIndicatorProps {
  score: number
  criticalCount: number
  warningCount: number
  className?: string
}

export function ExportAuditIndicator({
  score,
  criticalCount,
  warningCount,
  className,
}: ExportAuditIndicatorProps) {
  if (criticalCount === 0 && warningCount === 0) {
    return (
      <span className={cn("flex items-center gap-1 text-green-600 text-xs", className)}>
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    )
  }

  if (criticalCount > 0) {
    return (
      <span className={cn("flex items-center gap-1 text-destructive text-xs", className)}>
        <XCircle className="h-3 w-3" />
        {criticalCount} issue{criticalCount !== 1 ? "s" : ""}
      </span>
    )
  }

  return (
    <span className={cn("flex items-center gap-1 text-amber-600 text-xs", className)}>
      <AlertTriangle className="h-3 w-3" />
      {warningCount} warning{warningCount !== 1 ? "s" : ""}
    </span>
  )
}
