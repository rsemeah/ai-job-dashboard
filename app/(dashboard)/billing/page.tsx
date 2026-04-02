"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePremium } from "@/hooks/use-premium"
import { PLAN_LIMITS } from "@/lib/contracts/hirewire"
import { 
  CreditCard, 
  Zap, 
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  RefreshCw,
  FileText,
  Download,
  Briefcase,
  Library,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { plan, isPro, usage, isLoading, refreshUsage } = usePremium()
  const [isManaging, setIsManaging] = useState(false)
  
  const upgraded = searchParams.get("upgraded") === "true"
  const canceled = searchParams.get("canceled") === "true"
  const upgradePending = searchParams.get("upgrade") === "pending"

  useEffect(() => {
    if (upgraded) {
      refreshUsage()
    }
  }, [upgraded, refreshUsage])

  const handleManageBilling = async () => {
    setIsManaging(true)
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      })

      if (response.ok) {
        const { url } = await response.json()
        if (url) {
          window.location.href = url
          return
        }
      }
      
      // If portal not available, show message
      alert("Billing portal is being set up. Please check back later.")
    } catch {
      alert("Unable to open billing portal. Please try again.")
    } finally {
      setIsManaging(false)
    }
  }

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  const limits = PLAN_LIMITS[plan]
  
  // Calculate usage percentages
  const jobsPercent = limits.jobs_per_month === -1 
    ? 0 
    : Math.min((usage.jobs_used / limits.jobs_per_month) * 100, 100)
  const generationsPercent = limits.generations_per_month === -1 
    ? 0 
    : Math.min((usage.generations_used / limits.generations_per_month) * 100, 100)
  const exportsPercent = limits.exports_per_month === -1 
    ? 0 
    : Math.min((usage.exports_used / limits.exports_per_month) * 100, 100)
  const evidencePercent = limits.evidence_items === -1 
    ? 0 
    : Math.min((usage.evidence_count / limits.evidence_items) * 100, 100)

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and usage
        </p>
      </div>

      {/* Status Alerts */}
      {upgraded && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Welcome to Pro! Your account has been upgraded successfully.
          </AlertDescription>
        </Alert>
      )}

      {canceled && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your upgrade was canceled. You can upgrade anytime from this page.
          </AlertDescription>
        </Alert>
      )}

      {upgradePending && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Payment processing is being set up. Check back soon to complete your upgrade.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  <Badge variant={isPro ? "default" : "secondary"}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isPro 
                    ? "You have full access to all HireWire features" 
                    : "Upgrade to unlock unlimited access"
                  }
                </CardDescription>
              </div>
              {/* Manage Billing button hidden until Stripe portal is connected */}
            </div>
          </CardHeader>
          
          {isPro ? (
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pro Plan - $19/month</p>
                  <p className="text-sm text-muted-foreground">
                    Full access to all HireWire features.
                  </p>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-dashed">
                <div className="flex-1">
                  <p className="font-medium">Free Plan</p>
                  <p className="text-sm text-muted-foreground">
                    Limited to {limits.jobs_per_month} jobs, {limits.generations_per_month} generations per month
                  </p>
                </div>
                <Button onClick={handleUpgrade}>
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Monthly Usage
            </CardTitle>
            <CardDescription>
              {isPro 
                ? "Unlimited usage with your Pro plan" 
                : "Usage resets at the start of each month"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Jobs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>Jobs</span>
                </div>
                <span className="text-muted-foreground">
                  {usage.jobs_used} / {limits.jobs_per_month === -1 ? "Unlimited" : limits.jobs_per_month}
                </span>
              </div>
              {limits.jobs_per_month !== -1 && (
                <Progress 
                  value={jobsPercent} 
                  className={cn("h-2", jobsPercent >= 90 && "bg-destructive/20")}
                />
              )}
              {limits.jobs_per_month === -1 && (
                <div className="h-2 rounded-full bg-primary/20" />
              )}
            </div>

            {/* Generations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Document Generations</span>
                </div>
                <span className="text-muted-foreground">
                  {usage.generations_used} / {limits.generations_per_month === -1 ? "Unlimited" : limits.generations_per_month}
                </span>
              </div>
              {limits.generations_per_month !== -1 && (
                <Progress 
                  value={generationsPercent} 
                  className={cn("h-2", generationsPercent >= 90 && "bg-destructive/20")}
                />
              )}
              {limits.generations_per_month === -1 && (
                <div className="h-2 rounded-full bg-primary/20" />
              )}
            </div>

            {/* Exports */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>Exports</span>
                </div>
                <span className="text-muted-foreground">
                  {usage.exports_used} / {limits.exports_per_month === -1 ? "Unlimited" : limits.exports_per_month}
                </span>
              </div>
              {limits.exports_per_month !== -1 && (
                <Progress 
                  value={exportsPercent} 
                  className={cn("h-2", exportsPercent >= 90 && "bg-destructive/20")}
                />
              )}
              {limits.exports_per_month === -1 && (
                <div className="h-2 rounded-full bg-primary/20" />
              )}
            </div>

            {/* Evidence Library */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-muted-foreground" />
                  <span>Evidence Library</span>
                </div>
                <span className="text-muted-foreground">
                  {usage.evidence_count} / {limits.evidence_items === -1 ? "Unlimited" : limits.evidence_items}
                </span>
              </div>
              {limits.evidence_items !== -1 && (
                <Progress 
                  value={evidencePercent} 
                  className={cn("h-2", evidencePercent >= 90 && "bg-destructive/20")}
                />
              )}
              {limits.evidence_items === -1 && (
                <div className="h-2 rounded-full bg-primary/20" />
              )}
            </div>
          </CardContent>
          
          {!isPro && (
            <CardFooter className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Running low on usage?{" "}
                <button 
                  className="text-primary hover:underline font-medium"
                  onClick={handleUpgrade}
                >
                  Upgrade to Pro
                </button>
                {" "}for unlimited access.
              </p>
            </CardFooter>
          )}
        </Card>

        {/* Billing History - Hidden until Stripe is fully connected */}
        {/* Will be enabled once Stripe portal returns valid URLs */}
      </div>
    </div>
  )
}
