"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { usePremium } from "@/hooks/use-premium"
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  FileText,
  Bot,
  Mic,
  Loader2,
  Zap,
} from "lucide-react"
import confetti from "canvas-confetti"

const PRO_FEATURES = [
  { icon: Sparkles, label: "Unlimited job tracking", description: "Add as many jobs as you want" },
  { icon: FileText, label: "Unlimited generations", description: "Generate resumes and cover letters without limits" },
  { icon: Mic, label: "Interview prep", description: "Get tailored interview coaching" },
  { icon: Bot, label: "AI Career Coach", description: "24/7 guidance for your job search" },
]

export default function StripeSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUsage, isPro } = usePremium()
  const [isVerifying, setIsVerifying] = useState(true)
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    // Fire confetti on mount
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Verify the subscription and refresh usage
    async function verifySubscription() {
      if (sessionId) {
        try {
          // Call verification endpoint
          await fetch("/api/stripe/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          })
        } catch (error) {
          console.error("Error verifying session:", error)
        }
      }
      
      // Refresh the premium state
      await refreshUsage()
      setIsVerifying(false)
    }

    verifySubscription()
  }, [sessionId, refreshUsage])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            {isVerifying ? (
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isVerifying ? "Activating your account..." : "Welcome to Pro!"}
          </CardTitle>
          <CardDescription className="text-base">
            {isVerifying 
              ? "Please wait while we set up your subscription"
              : "Your account has been upgraded successfully"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-4 text-left">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Your Pro benefits
            </h3>
            <ul className="space-y-3">
              {PRO_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <feature.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-3 pt-2">
          <Button 
            className="w-full" 
            size="lg"
            disabled={isVerifying}
            onClick={() => router.push("/")}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/jobs/new" className="hover:text-foreground transition-colors">
              Add a job
            </Link>
            <span>&middot;</span>
            <Link href="/billing" className="hover:text-foreground transition-colors">
              View billing
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
