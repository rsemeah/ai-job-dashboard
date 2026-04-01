"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  type PlanType, 
  type UsageState, 
  type PremiumFeature,
  PLAN_LIMITS,
  isPremiumFeature,
  canPerformAction 
} from "@/lib/contracts/hirewire"

interface PremiumContextValue {
  // Plan state
  plan: PlanType
  isPro: boolean
  isEnterprise: boolean
  isLoading: boolean
  
  // Usage state
  usage: UsageState
  
  // Feature checks
  hasFeature: (feature: PremiumFeature) => boolean
  canDo: (action: "add_job" | "generate" | "export" | "add_evidence") => { allowed: boolean; reason?: string }
  
  // Upgrade modal
  showUpgradeModal: boolean
  openUpgradeModal: (reason?: string) => void
  closeUpgradeModal: () => void
  upgradeReason: string | null
  
  // Refresh
  refreshUsage: () => Promise<void>
}

const PremiumContext = createContext<PremiumContextValue | null>(null)

const DEFAULT_USAGE: UsageState = {
  jobs_used: 0,
  jobs_limit: PLAN_LIMITS.free.jobs_per_month,
  generations_used: 0,
  generations_limit: PLAN_LIMITS.free.generations_per_month,
  exports_used: 0,
  exports_limit: PLAN_LIMITS.free.exports_per_month,
  evidence_count: 0,
  evidence_limit: PLAN_LIMITS.free.evidence_items,
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanType>("free")
  const [usage, setUsage] = useState<UsageState>(DEFAULT_USAGE)
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null)

  const refreshUsage = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setPlan("free")
        setUsage(DEFAULT_USAGE)
        return
      }

      // Check user's plan from profiles table (using existing is_premium field)
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium, premium_since")
        .eq("id", user.id)
        .single()
      
      const userPlan: PlanType = profile?.is_premium ? "pro" : "free"
      setPlan(userPlan)
      
      const limits = PLAN_LIMITS[userPlan]
      
      // Get current month's start date
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      // Count jobs this month
      const { count: jobsCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart)
      
      // Count generations this month (from generated_documents or jobs with generated content)
      const { count: generationsCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("generated_resume", "is", null)
        .gte("generation_timestamp", monthStart)
      
      // Count evidence items
      const { count: evidenceCount } = await supabase
        .from("evidence_library")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true)
      
      setUsage({
        jobs_used: jobsCount || 0,
        jobs_limit: limits.jobs_per_month,
        generations_used: generationsCount || 0,
        generations_limit: limits.generations_per_month,
        exports_used: 0, // Would need export tracking
        exports_limit: limits.exports_per_month,
        evidence_count: evidenceCount || 0,
        evidence_limit: limits.evidence_items,
      })
    } catch (error) {
      console.error("Error fetching premium state:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  const hasFeature = useCallback((feature: PremiumFeature) => {
    return isPremiumFeature(feature, plan)
  }, [plan])

  const canDo = useCallback((action: "add_job" | "generate" | "export" | "add_evidence") => {
    return canPerformAction(action, usage, plan)
  }, [usage, plan])

  const openUpgradeModal = useCallback((reason?: string) => {
    setUpgradeReason(reason || null)
    setShowUpgradeModal(true)
  }, [])

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false)
    setUpgradeReason(null)
  }, [])

  const value: PremiumContextValue = {
    plan,
    isPro: plan === "pro" || plan === "enterprise",
    isEnterprise: plan === "enterprise",
    isLoading,
    usage,
    hasFeature,
    canDo,
    showUpgradeModal,
    openUpgradeModal,
    closeUpgradeModal,
    upgradeReason,
    refreshUsage,
  }

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  )
}

export function usePremium() {
  const context = useContext(PremiumContext)
  if (!context) {
    throw new Error("usePremium must be used within a PremiumProvider")
  }
  return context
}

// Convenience hook for checking specific features
export function useFeatureGate(feature: PremiumFeature) {
  const { hasFeature, openUpgradeModal, isLoading } = usePremium()
  
  const isAvailable = hasFeature(feature)
  
  const requireFeature = useCallback(() => {
    if (!isAvailable) {
      openUpgradeModal(`Upgrade to Pro to unlock ${feature.replace(/_/g, " ")}`)
      return false
    }
    return true
  }, [isAvailable, openUpgradeModal, feature])
  
  return { isAvailable, requireFeature, isLoading }
}

// Convenience hook for checking action limits
export function useActionGate(action: "add_job" | "generate" | "export" | "add_evidence") {
  const { canDo, openUpgradeModal, isLoading } = usePremium()
  
  const check = canDo(action)
  
  const requireAction = useCallback(() => {
    if (!check.allowed) {
      openUpgradeModal(check.reason)
      return false
    }
    return true
  }, [check, openUpgradeModal])
  
  return { 
    allowed: check.allowed, 
    reason: check.reason, 
    requireAction, 
    isLoading 
  }
}
