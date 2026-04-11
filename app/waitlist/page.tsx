"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ArrowRight, Zap, Shield, Target, Loader2 } from "lucide-react"
import { toast } from "sonner"

const FEATURES = [
  {
    icon: Target,
    title: "Truthful Fit Scoring",
    description: "Know before you apply. Every score is grounded in your actual evidence — no wishful thinking.",
  },
  {
    icon: Zap,
    title: "Tailored Materials in Minutes",
    description: "Resume and cover letter generated from your real experience, matched to the job's exact requirements.",
  },
  {
    icon: Shield,
    title: "Red Team Quality Review",
    description: "AI adversarial review catches fabrications, weak claims, and ATS issues before you hit send.",
  },
]

export default function WaitlistPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "landing_page",
          utm_source: searchParams.get("utm_source"),
          utm_medium: searchParams.get("utm_medium"),
          utm_campaign: searchParams.get("utm_campaign"),
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Something went wrong")
      } else {
        setSubmitted(true)
        toast.success(data.already_registered ? "You're already on the list!" : "You're on the list!")
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-serif text-xl font-medium tracking-tight">HireWire</span>
        <Badge variant="outline" className="text-xs">Early Access</Badge>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl space-y-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            Now accepting early access
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-serif font-medium tracking-tight leading-tight">
            Know before you apply.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            HireWire scores your real fit against job requirements, generates
            tailored materials from your actual evidence, and red-teams everything
            before you submit.
          </p>

          {/* Waitlist form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" disabled={loading} className="gap-2 shrink-0">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Join Waitlist
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-6 py-4 max-w-md mx-auto">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">You&apos;re on the list. We&apos;ll be in touch.</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            No spam. Unsubscribe anytime.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-6 sm:grid-cols-3 max-w-3xl w-full mt-16 text-left">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="space-y-2 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <h3 className="font-medium text-sm">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HireWire. All rights reserved.
      </footer>
    </div>
  )
}
