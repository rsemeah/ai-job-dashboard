"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Sparkles,
  Target,
  Shield,
  FileText,
  ArrowRight,
  Loader2,
  Zap,
  Brain,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { trackEvent } from "@/components/posthog-provider"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      
      // Insert into waitlist table
      const { error } = await supabase
        .from("waitlist")
        .insert({ email })

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on the waitlist!")
        } else {
          throw error
        }
      } else {
        trackEvent.custom("waitlist_signup", { email_domain: email.split("@")[1] })
        toast.success("You're on the list! We'll be in touch soon.")
      }
      
      setIsSubmitted(true)
    } catch (error) {
      console.error("Waitlist error:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="font-semibold text-xl">HireWire</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Job Applications
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            Land More Interviews with{" "}
            <span className="text-primary">Evidence-Based</span> Applications
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
            HireWire analyzes job descriptions, matches your experience, and generates 
            tailored resumes that highlight your strongest qualifications. No more generic applications.
          </p>

          {/* Waitlist Form */}
          {!isSubmitted ? (
            <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
              />
              <Button type="submit" size="lg" className="h-12 px-8" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Join Waitlist
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg p-4 max-w-md mx-auto">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">You&apos;re on the list! Check your email.</span>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4">
            Already have access?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How HireWire Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A systematic approach to job applications that puts your best evidence forward
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-background border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">1. Analyze Requirements</h3>
                <p className="text-muted-foreground text-sm">
                  Paste any job URL and our AI extracts every requirement, skill, and qualification 
                  the hiring manager is looking for.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">2. Match Your Evidence</h3>
                <p className="text-muted-foreground text-sm">
                  Build a library of your achievements. HireWire matches your strongest 
                  evidence to each job requirement with a 5-tier confidence system.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">3. Generate Documents</h3>
                <p className="text-muted-foreground text-sm">
                  Get a tailored resume and cover letter that highlight exactly what each 
                  employer wants to see. Export to PDF, DOCX, or copy directly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Evidence-Based Applications Win</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                icon: <TrendingUp className="h-5 w-5 text-primary" />,
                title: "Higher Interview Rates",
                description: "Tailored applications that directly address job requirements get noticed. Generic resumes get filtered out.",
              },
              {
                icon: <Shield className="h-5 w-5 text-primary" />,
                title: "ATS-Optimized Output",
                description: "Every resume is optimized for Applicant Tracking Systems while remaining compelling for human readers.",
              },
              {
                icon: <Sparkles className="h-5 w-5 text-primary" />,
                title: "Red Team Quality Check",
                description: "Before you apply, HireWire identifies potential issues - generic language, missing keywords, weak claims - so you can fix them first.",
              },
              {
                icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
                title: "Full Traceability",
                description: "Every bullet point in your resume links back to real evidence from your career. No hallucinations, no exaggerations.",
              },
            ].map((benefit, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Job Search?</h2>
          <p className="text-primary-foreground/80 mb-8">
            Join thousands of job seekers who are landing more interviews with HireWire.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">HireWire</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for job seekers who refuse to send generic applications.
          </p>
        </div>
      </footer>
    </div>
  )
}
