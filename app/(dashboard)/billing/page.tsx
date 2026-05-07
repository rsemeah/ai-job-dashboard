"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { usePremium } from "@/hooks/use-premium"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Zap, Crown, ArrowRight, Loader2, AlertCircle } from "lucide-react"

const PRO_FEATURES = [
  "Unlimited job analyses",
  "Unlimited document generation",
  "AI red-team analysis on every role",
  "Evidence library (unlimited items)",
  "Cover letter & resume tailoring",
  "Interview prep with AI coaching",
  "Priority support",
]

const FREE_FEATURES = [
  "5 job analyses per month",
  "3 document generations per month",
  "10 evidence library items",
  "Basic job scoring",
]

export default function BillingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { plan, isPro, isLoading, refreshUsage } = usePremium()

  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<{
    subscription_status?: string
    current_period_end?: string
    stripe_subscription_id?: string
  } | null>(null)

  const upgraded = searchParams.get("upgraded") === "true"
  const canceled = searchParams.get("canceled") === "true"

  useEffect(() => {
    if (upgraded) refreshUsage()
  }, [upgraded, refreshUsage])

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("users")
        .select("subscription_status, current_period_end, stripe_subscription_id")
        .eq("id", user.id)
        .single()
      setUserData(data)
    }
    fetchUserData()
  }, [isPro])

  const handleUpgrade = async () => {
    setUpgrading(true)
    setError(null)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || "Failed to start checkout")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setUpgrading(false)
    }
  }

  const periodEnd = userData?.current_period_end
    ? new Date(userData.current_period_end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan and subscription.
        </p>
      </div>

      {/* Success banner */}
      {upgraded && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">You&apos;re now on HireWire Pro</p>
            <p className="text-sm text-green-700 mt-0.5">All Pro features are unlocked. Let&apos;s get to work.</p>
          </div>
        </div>
      )}

      {/* Canceled banner */}
      {canceled && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Checkout canceled</p>
            <p className="text-sm text-yellow-700 mt-0.5">No charges were made. Upgrade anytime below.</p>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Current Plan</p>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-semibold capitalize">
                {isLoading ? "..." : plan}
              </h2>
              {isPro && (
                <Badge className="bg-[#7B1212] text-white border-0 text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Pro
                </Badge>
              )}
            </div>
            {isPro && periodEnd && (
              <p className="text-sm text-muted-foreground mt-1">
                Renews {periodEnd}
              </p>
            )}
            {isPro && userData?.subscription_status === "past_due" && (
              <p className="text-sm text-red-600 mt-1 font-medium">
                Payment past due — please update your payment method
              </p>
            )}
          </div>
          {isPro && (
            <a
              href="https://billing.stripe.com/p/login/test_00g00000000000"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                Manage subscription
              </Button>
            </a>
          )}
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-3">
            {isPro ? "Everything included in your plan:" : "Free plan includes:"}
          </p>
          <ul className="space-y-2">
            {(isPro ? PRO_FEATURES : FREE_FEATURES).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade CTA — only shown on free plan */}
      {!isPro && !isLoading && (
        <div
          className="border border-border rounded-lg p-6 bg-card space-y-4 relative overflow-hidden"
          style={{ borderColor: "#7B1212" }}
        >
          {/* Subtle red tint top bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#7B1212]" />

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#7B1212]" />
                <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Unlimited analyses, AI coaching, and the full HireWire arsenal.
              </p>
            </div>
            <p className="text-2xl font-bold text-[#7B1212]">
              $19<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
          </div>

          <ul className="space-y-2">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            className="w-full bg-[#7B1212] hover:bg-[#6a0f0f] text-white"
            onClick={handleUpgrade}
            disabled={upgrading}
          >
            {upgrading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {upgrading ? "Starting checkout..." : "Upgrade to Pro"}
          </Button>
        </div>
      )}

      {/* Go to dashboard */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => router.push("/jobs")}>
          Back to jobs
        </Button>
      </div>
    </div>
  )
}
