"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePremium } from "@/hooks/use-premium"
import { PLAN_LIMITS } from "@/lib/contracts/hirewire"
import { 
  Check, 
  Zap, 
  Sparkles,
  FileText,
  Download,
  Library,
  Mic,
  Bot,
  Loader2,
  Crown,
} from "lucide-react"
import { cn } from "@/lib/utils"

const PRO_FEATURES = [
  { icon: FileText, label: "Unlimited job tracking" },
  { icon: Sparkles, label: "Unlimited document generations" },
  { icon: Download, label: "Unlimited exports" },
  { icon: Library, label: "Unlimited evidence library" },
  { icon: Mic, label: "Interview prep & coaching" },
  { icon: Bot, label: "AI Career Coach access" },
]

export function UpgradeModal() {
  const router = useRouter()
  const { showUpgradeModal, closeUpgradeModal, upgradeReason, isPro } = usePremium()
  const [isLoading, setIsLoading] = useState(false)

  // Don't render if already pro
  if (isPro) return null

  const handleUpgrade = async () => {
    setIsLoading(true)
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

      // If Stripe not configured yet, go to pricing page
      closeUpgradeModal()
      router.push("/pricing")
    } catch {
      closeUpgradeModal()
      router.push("/pricing")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewPricing = () => {
    closeUpgradeModal()
    router.push("/pricing")
  }

  return (
    <Dialog open={showUpgradeModal} onOpenChange={(open) => !open && closeUpgradeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-balance">
            {upgradeReason || "Unlock unlimited access to all HireWire features."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-2xl font-bold">$19</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Cancel anytime
              </Badge>
            </div>

            <ul className="space-y-2.5">
              {PRO_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span>{feature.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            className="w-full" 
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Now
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={handleViewPricing}
          >
            Compare all plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Standalone upgrade button for use throughout the app
export function UpgradeButton({ 
  className,
  variant = "default",
  size = "sm",
}: { 
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
}) {
  const { openUpgradeModal, isPro } = usePremium()
  
  if (isPro) return null
  
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={() => openUpgradeModal()}
    >
      <Zap className="h-3.5 w-3.5" />
      Upgrade
    </Button>
  )
}

// Compact upgrade badge for tight spaces
export function UpgradeBadge({ className }: { className?: string }) {
  const { openUpgradeModal, isPro } = usePremium()
  
  if (isPro) return null
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors",
        className
      )}
      onClick={() => openUpgradeModal()}
    >
      <Zap className="h-3 w-3 mr-1" />
      Pro
    </Badge>
  )
}
