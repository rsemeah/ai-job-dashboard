"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { usePremium } from "@/hooks/use-premium"
import { PLAN_LIMITS, type PlanType } from "@/lib/contracts/hirewire"
import { 
  Check, 
  X, 
  Zap, 
  Building2,
  Sparkles,
  FileText,
  Download,
  Library,
  Mic,
  HeadphonesIcon,
  LayoutTemplate,
  BarChart3,
  Bot,
  Loader2,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PricingTier {
  name: string
  description: string
  price: string
  period: string
  planType: PlanType
  popular?: boolean
  features: {
    label: string
    included: boolean
    limit?: string
  }[]
  cta: string
  ctaVariant: "default" | "outline" | "secondary"
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    description: "Get started with the essentials",
    price: "$0",
    period: "forever",
    planType: "free",
    features: [
      { label: "Jobs per month", included: true, limit: "5" },
      { label: "Document generations", included: true, limit: "3" },
      { label: "Exports per month", included: true, limit: "3" },
      { label: "Evidence library items", included: true, limit: "10" },
      { label: "Job analysis & scoring", included: true },
      { label: "Basic dashboard", included: true },
      { label: "Interview prep", included: false },
      { label: "AI Career Coach", included: false },
      { label: "Custom templates", included: false },
      { label: "Priority support", included: false },
    ],
    cta: "Current Plan",
    ctaVariant: "outline",
  },
  {
    name: "Pro",
    description: "For serious job seekers",
    price: "$19",
    period: "per month",
    planType: "pro",
    popular: true,
    features: [
      { label: "Jobs per month", included: true, limit: "Unlimited" },
      { label: "Document generations", included: true, limit: "Unlimited" },
      { label: "Exports per month", included: true, limit: "Unlimited" },
      { label: "Evidence library items", included: true, limit: "Unlimited" },
      { label: "Job analysis & scoring", included: true },
      { label: "Full analytics dashboard", included: true },
      { label: "Interview prep", included: true },
      { label: "AI Career Coach", included: true },
      { label: "Custom templates", included: true },
      { label: "Priority support", included: true },
    ],
    cta: "Upgrade to Pro",
    ctaVariant: "default",
  },
  {
    name: "Enterprise",
    description: "For teams and organizations",
    price: "Custom",
    period: "contact us",
    planType: "enterprise",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Team management", included: true },
      { label: "SSO & SAML", included: true },
      { label: "Custom integrations", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "SLA guarantee", included: true },
      { label: "Custom AI training", included: true },
      { label: "White-label options", included: true },
      { label: "API access", included: true },
      { label: "On-premise deployment", included: true },
    ],
    cta: "Contact Sales",
    ctaVariant: "secondary",
  },
]

const VALUE_PROPS = [
  {
    icon: FileText,
    title: "Evidence-Based Resumes",
    description: "Every bullet point grounded in your actual experience",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Tailoring",
    description: "Documents optimized for each specific role",
  },
  {
    icon: BarChart3,
    title: "Explainable Scoring",
    description: "Know exactly why you match or don't match",
  },
  {
    icon: Bot,
    title: "Career Coach",
    description: "24/7 AI guidance for your job search",
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { plan: currentPlan, isPro, isLoading } = usePremium()
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = async (planType: PlanType) => {
    if (planType === "enterprise") {
      // Open contact form or email
      window.location.href = "mailto:enterprise@hirewire.ai?subject=Enterprise%20Inquiry"
      return
    }

    if (planType === "pro") {
      setIsUpgrading(true)
      // TODO: Replace with actual Stripe checkout
      // For now, redirect to a placeholder
      try {
        const response = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "pro" }),
        })
        
        if (response.ok) {
          const { url } = await response.json()
          if (url) {
            window.location.href = url
            return
          }
        }
        
        // If no Stripe yet, show message
        router.push("/billing?upgrade=pending")
      } catch {
        router.push("/billing?upgrade=pending")
      } finally {
        setIsUpgrading(false)
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4 text-xs tracking-wider uppercase">
          Pricing
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-3 text-balance">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-balance">
          Start free, upgrade when you&apos;re ready. No hidden fees, no surprises.
          Cancel anytime.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {PRICING_TIERS.map((tier) => {
          const isCurrentPlan = currentPlan === tier.planType
          const canUpgrade = !isPro && tier.planType === "pro"
          
          return (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all",
                tier.popular && "border-primary shadow-md ring-1 ring-primary/10"
              )}
            >
              {tier.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                  Most Popular
                </Badge>
              )}
              
              <div className="mb-5">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
              </div>
              
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                <span className="text-muted-foreground text-sm ml-1">/{tier.period}</span>
              </div>
              
              <Separator className="mb-6" />
              
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                    )}
                    <span className={cn(!feature.included && "text-muted-foreground/60")}>
                      {feature.label}
                      {feature.limit && (
                        <span className="text-muted-foreground ml-1">({feature.limit})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button
                variant={tier.ctaVariant}
                className={cn(
                  "w-full",
                  tier.popular && tier.ctaVariant === "default" && "shadow-sm"
                )}
                disabled={isCurrentPlan || isLoading || isUpgrading}
                onClick={() => handleUpgrade(tier.planType)}
              >
                {isUpgrading && canUpgrade ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isCurrentPlan ? (
                  "Current Plan"
                ) : (
                  <>
                    {tier.cta}
                    {canUpgrade && <ArrowRight className="h-4 w-4 ml-2" />}
                  </>
                )}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Value Props */}
      <div className="border-t pt-12">
        <h2 className="text-center text-xl font-semibold mb-8">
          Why HireWire?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUE_PROPS.map((prop, idx) => (
            <div key={idx} className="text-center p-4">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-3">
                <prop.icon className="h-5 w-5" />
              </div>
              <h3 className="font-medium mb-1">{prop.title}</h3>
              <p className="text-sm text-muted-foreground">{prop.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="border-t pt-12 mt-12">
        <h2 className="text-center text-xl font-semibold mb-8">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div>
            <h3 className="font-medium mb-2">Can I cancel anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">What happens to my data if I downgrade?</h3>
            <p className="text-sm text-muted-foreground">
              Your data is always yours. If you downgrade, you&apos;ll still have access to everything you created, but some features will be limited.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Is there a free trial for Pro?</h3>
            <p className="text-sm text-muted-foreground">
              The Free plan lets you try core features. Pro features become available immediately after upgrading.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">How does billing work?</h3>
            <p className="text-sm text-muted-foreground">
              Pro is billed monthly. You can upgrade, downgrade, or cancel at any time from your billing settings.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      {!isPro && (
        <div className="border-t pt-12 mt-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Ready to supercharge your job search?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of job seekers landing interviews faster.
          </p>
          <Button 
            size="lg" 
            onClick={() => handleUpgrade("pro")}
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Get Pro Now
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
