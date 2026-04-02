"use client"

import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { usePremium, useFeatureGate, useActionGate } from "@/hooks/use-premium"
import type { PremiumFeature } from "@/lib/contracts/hirewire"
import { Lock, Zap, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PremiumGateProps {
  feature: PremiumFeature
  children: ReactNode
  fallback?: ReactNode
  inline?: boolean
}

/**
 * Gate content behind a premium feature check.
 * Shows a locked state if the user doesn't have access.
 */
export function PremiumGate({ feature, children, fallback, inline = false }: PremiumGateProps) {
  const { isAvailable, isLoading } = useFeatureGate(feature)
  
  if (isLoading) {
    return <>{children}</>
  }
  
  if (isAvailable) {
    return <>{children}</>
  }
  
  if (fallback) {
    return <>{fallback}</>
  }
  
  if (inline) {
    return <InlineLockedState feature={feature} />
  }
  
  return <LockedState feature={feature} />
}

interface LockedStateProps {
  feature: PremiumFeature
  title?: string
  description?: string
}

const FEATURE_LABELS: Record<PremiumFeature, { title: string; description: string }> = {
  unlimited_jobs: {
    title: "Unlimited Job Tracking",
    description: "Track as many jobs as you want with Pro",
  },
  unlimited_generations: {
    title: "Unlimited Document Generation",
    description: "Generate tailored resumes and cover letters without limits",
  },
  unlimited_exports: {
    title: "Unlimited Exports",
    description: "Export your documents in any format",
  },
  interview_prep: {
    title: "Interview Prep",
    description: "Get AI-powered interview coaching and preparation",
  },
  custom_templates: {
    title: "Custom Templates",
    description: "Create and save your own resume templates",
  },
  priority_support: {
    title: "Priority Support",
    description: "Get faster responses from our support team",
  },
  advanced_analytics: {
    title: "Advanced Analytics",
    description: "Deep insights into your job search performance",
  },
  ai_coach: {
    title: "AI Career Coach",
    description: "24/7 AI-powered career guidance and advice",
  },
}

export function LockedState({ feature, title, description }: LockedStateProps) {
  const { openUpgradeModal } = usePremium()
  const labels = FEATURE_LABELS[feature]
  
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">{title || labels.title}</CardTitle>
        <CardDescription>{description || labels.description}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center pb-6 pt-2">
        <Button onClick={() => openUpgradeModal()}>
          <Zap className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
      </CardFooter>
    </Card>
  )
}

export function InlineLockedState({ feature }: { feature: PremiumFeature }) {
  const { openUpgradeModal } = usePremium()
  
  return (
    <button
      onClick={() => openUpgradeModal()}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <Lock className="h-3.5 w-3.5" />
      <span>Pro feature</span>
    </button>
  )
}

interface UsageLimitWarningProps {
  action: "add_job" | "generate" | "export" | "add_evidence"
  className?: string
}

/**
 * Shows a warning when approaching usage limits.
 * Automatically shows upgrade prompt when limit reached.
 */
export function UsageLimitWarning({ action, className }: UsageLimitWarningProps) {
  const { allowed, reason, isLoading } = useActionGate(action)
  const { usage, plan, openUpgradeModal } = usePremium()
  
  if (isLoading || plan !== "free") {
    return null
  }
  
  // Get current usage and limit based on action
  let used = 0
  let limit = 0
  let label = ""
  
  switch (action) {
    case "add_job":
      used = usage.jobs_used
      limit = usage.jobs_limit
      label = "jobs"
      break
    case "generate":
      used = usage.generations_used
      limit = usage.generations_limit
      label = "generations"
      break
    case "export":
      used = usage.exports_used
      limit = usage.exports_limit
      label = "exports"
      break
    case "add_evidence":
      used = usage.evidence_count
      limit = usage.evidence_limit
      label = "evidence items"
      break
  }
  
  const remaining = limit - used
  const percentUsed = (used / limit) * 100
  
  // Show warning when 80% used or limit reached
  if (percentUsed < 80) {
    return null
  }
  
  if (!allowed) {
    return (
      <div className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3",
        className
      )}>
        <div className="flex items-center gap-2 text-sm">
          <Lock className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">Limit reached</span>
          <span className="text-muted-foreground">&middot;</span>
          <span className="text-muted-foreground">{reason}</span>
        </div>
        <Button size="sm" onClick={() => openUpgradeModal(reason)}>
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          Upgrade
        </Button>
      </div>
    )
  }
  
  // Warning state
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3",
      className
    )}>
      <div className="flex items-center gap-2 text-sm">
        <Crown className="h-4 w-4 text-amber-600" />
        <span className="text-amber-700 font-medium">{remaining} {label} remaining</span>
        <span className="text-muted-foreground">&middot;</span>
        <span className="text-muted-foreground">Upgrade for unlimited</span>
      </div>
      <Button size="sm" variant="outline" onClick={() => openUpgradeModal()}>
        <Zap className="h-3.5 w-3.5 mr-1.5" />
        Upgrade
      </Button>
    </div>
  )
}

interface PremiumBadgeProps {
  className?: string
  size?: "sm" | "default"
}

/**
 * A badge to indicate premium content
 */
export function PremiumBadge({ className, size = "default" }: PremiumBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary font-medium",
      size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      className
    )}>
      <Crown className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      PRO
    </span>
  )
}
