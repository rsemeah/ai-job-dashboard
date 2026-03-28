"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Briefcase, FileText, Target } from "lucide-react"
import Image from "next/image"

type OnboardingStep = "welcome" | "profile" | "path"

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Profile form state
  const [fullName, setFullName] = useState("")
  const [location, setLocation] = useState("")
  const [summary, setSummary] = useState("")

  const handleCreateProfile = async () => {
    if (!fullName.trim()) {
      setError("Please enter your name")
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError("Not authenticated")
      setIsLoading(false)
      return
    }

    try {
      const { error: upsertError } = await supabase
        .from("user_profile")
        .upsert({
          user_id: user.id,
          full_name: fullName.trim(),
          email: user.email,
          location: location.trim() || null,
          summary: summary.trim() || null,
        }, {
          onConflict: "user_id"
        })

      if (upsertError) throw upsertError
      setStep("path")
    } catch (err) {
      console.error("Error creating profile:", err)
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPath = (path: "job" | "evidence" | "explore") => {
    switch (path) {
      case "job":
        router.push("/manual-entry")
        break
      case "evidence":
        router.push("/profile")
        break
      case "explore":
        router.push("/")
        break
    }
    router.refresh()
  }

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center space-y-4">
            <Image
              src="/images/hirewire-logo.png"
              alt="HireWire"
              width={150}
              height={53}
              className="object-contain mx-auto"
              priority
              loading="eager"
            />
            <CardTitle className="text-3xl font-serif">Welcome to HireWire</CardTitle>
            <CardDescription className="text-base">
              Stop guessing about job fit. HireWire analyzes opportunities, generates
              tailored materials, and prepares you for interviews — all backed by your
              real experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Target className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">Know Before You Apply</div>
                  <div className="text-sm text-muted-foreground">
                    Get fit scores and gap analysis before investing time
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">Evidence-Backed Materials</div>
                  <div className="text-sm text-muted-foreground">
                    Resumes and cover letters built from your real achievements
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Briefcase className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">Interview Ready</div>
                  <div className="text-sm text-muted-foreground">
                    Stories and preparation matched to each role
                  </div>
                </div>
              </div>
            </div>
            <Button className="w-full h-11" onClick={() => setStep("profile")}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-serif">Tell us about yourself</CardTitle>
            <CardDescription>
              This helps us personalize your experience. You can add more details later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name *</Label>
                <Input
                  id="name"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Brief professional summary</Label>
                <Textarea
                  id="summary"
                  placeholder="e.g., Senior Product Manager with 8 years of experience in B2B SaaS..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("welcome")}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Path selection step
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">How would you like to start?</CardTitle>
          <CardDescription>
            Choose your first action. You can always do the others later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={() => handleSelectPath("job")}
            className="w-full p-4 rounded-lg border-2 border-transparent bg-muted/50 hover:border-primary hover:bg-muted transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Analyze a job posting</div>
                <div className="text-sm text-muted-foreground">
                  Paste a job description to get a fit score and tailored materials
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectPath("evidence")}
            className="w-full p-4 rounded-lg border-2 border-transparent bg-muted/50 hover:border-primary hover:bg-muted transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Build your evidence library</div>
                <div className="text-sm text-muted-foreground">
                  Add your experiences, projects, and achievements first
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectPath("explore")}
            className="w-full p-4 rounded-lg border-2 border-transparent bg-muted/50 hover:border-primary hover:bg-muted transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Explore the dashboard</div>
                <div className="text-sm text-muted-foreground">
                  Take a look around and decide where to begin
                </div>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
