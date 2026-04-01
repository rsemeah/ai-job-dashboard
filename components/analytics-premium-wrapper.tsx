"use client"

import { type ReactNode } from "react"
import { usePremium } from "@/hooks/use-premium"
import { LockedState } from "@/components/premium-gate"
import { BackButton } from "@/components/back-button"
import { Loader2 } from "lucide-react"

interface AnalyticsPremiumWrapperProps {
  children: ReactNode
}

export function AnalyticsPremiumWrapper({ children }: AnalyticsPremiumWrapperProps) {
  const { isPro, isLoading } = usePremium()
  
  if (isLoading) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Insights
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your job search performance.
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }
  
  if (!isPro) {
    return (
      <div className="space-y-8 max-w-6xl">
        <BackButton fallbackHref="/" />
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
            Insights
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your job search performance.
          </p>
        </div>
        <div className="max-w-lg">
          <LockedState 
            feature="advanced_analytics"
            title="Advanced Analytics"
            description="Track your application success rate, see which companies respond fastest, and optimize your job search strategy with Pro."
          />
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
