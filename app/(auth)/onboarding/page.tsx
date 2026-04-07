"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Briefcase,
  FileText,
  Target,
  Upload,
  Sparkles,
  CheckCircle2,
  X,
  ChevronRight,
  MessageSquare,
  SkipForward,
} from "lucide-react"
import { HireWireLogo } from "@/components/hirewire-logo"
import { CoachChat } from "@/components/coach-chat"
import { toast } from "sonner"

type OnboardingStep = "welcome" | "profile" | "resume" | "evidence" | "path"

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedEvidenceCount, setSavedEvidenceCount] = useState(0)
  const router = useRouter()

  // Profile form state
  const [fullName, setFullName] = useState("")
  const [location, setLocation] = useState("")
  const [headline, setHeadline] = useState("")
  const [summary, setSummary] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  // Resume upload state
  const [resumeText, setResumeText] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeResult, setResumeResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null)

  // Evidence builder state
  const [useAIBuilder, setUseAIBuilder] = useState(false)

  const getProgress = () => {
    switch (step) {
      case "welcome": return 0
      case "profile": return 25
      case "resume": return 50
      case "evidence": return 75
      case "path": return 100
      default: return 0
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove))
  }

  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const input = e.currentTarget
      const skill = input.value.trim()
      if (skill && !skills.includes(skill)) {
        setSkills([...skills, skill])
        input.value = ""
      }
    }
  }

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
        .upsert(
          {
            user_id: user.id,
            full_name: fullName.trim(),
            email: user.email,
            location: location.trim() || null,
            headline: headline.trim() || null,
            summary: summary.trim() || null,
            skills: skills.length > 0 ? skills : null,
          },
          { onConflict: "user_id" }
        )

      if (upsertError) throw upsertError
      setStep("resume")
    } catch (err) {
      console.error("Error creating profile:", err)
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResumeUpload = async () => {
    setIsLoading(true)
    setError(null)

    try {
      let body: BodyInit
      const headers: Record<string, string> = {}

      if (resumeFile) {
        const form = new FormData()
        form.append("file", resumeFile)
        body = form
        // Let browser set multipart content-type with boundary
      } else if (resumeText.trim()) {
        body = JSON.stringify({ text: resumeText.trim() })
        headers["Content-Type"] = "application/json"
      } else {
        setError("Paste your resume text or select a .txt file")
        setIsLoading(false)
        return
      }

      const res = await fetch("/api/resume/upload", { method: "POST", headers, body })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Upload failed")
        return
      }

      const result = {
        inserted: data.inserted ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
      }
      setResumeResult(result)
      setSavedEvidenceCount(result.inserted)
      toast.success(`Resume processed — ${result.inserted} evidence entries created`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPath = (path: "job" | "evidence" | "explore" | "coach") => {
    switch (path) {
      case "job":
        router.push("/jobs/new")
        break
      case "evidence":
        router.push("/profile")
        break
      case "coach":
        router.push("/coach")
        break
      case "explore":
        router.push("/")
        break
    }
    router.refresh()
  }

  // ── WELCOME ──────────────────────────────────────────────────────────────

  if (step === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <HireWireLogo variant="red" size="lg" />
            </div>
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
                <Target className="h-5 w-5 mt-0.5 text-hirewire-red" />
                <div>
                  <div className="font-medium">Know Before You Apply</div>
                  <div className="text-sm text-muted-foreground">
                    Get fit scores and gap analysis before investing time
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 mt-0.5 text-hirewire-red" />
                <div>
                  <div className="font-medium">Evidence-Backed Materials</div>
                  <div className="text-sm text-muted-foreground">
                    Resumes and cover letters built from your real achievements
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Sparkles className="h-5 w-5 mt-0.5 text-hirewire-red" />
                <div>
                  <div className="font-medium">AI Career Coach</div>
                  <div className="text-sm text-muted-foreground">
                    Personal guidance for strategy, prep, and document improvement
                  </div>
                </div>
              </div>
            </div>
            <Button
              className="w-full h-11 bg-hirewire-red hover:bg-hirewire-red/90"
              onClick={() => setStep("profile")}
            >
              Get Started
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── PROFILE ───────────────────────────────────────────────────────────────

  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-xl border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center">
            <Progress value={getProgress()} className="mb-4 h-2" />
            <CardTitle className="text-2xl font-serif">Build Your Profile</CardTitle>
            <CardDescription>
              Enter your details — or upload your resume on the next step to auto-populate your evidence library.
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
                <Label htmlFor="headline">Professional headline</Label>
                <Input
                  id="headline"
                  placeholder="Senior Product Manager | B2B SaaS | Growth"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
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
                <Label htmlFor="summary">Professional summary</Label>
                <Textarea
                  id="summary"
                  placeholder="Brief overview of your experience and what you&apos;re looking for..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Key skills</Label>
                <Input
                  id="skills"
                  placeholder="Type a skill and press Enter"
                  onKeyDown={addSkill}
                  disabled={isLoading}
                />
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <button onClick={() => removeSkill(skill)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
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
                className="flex-1 bg-hirewire-red hover:bg-hirewire-red/90"
                onClick={handleCreateProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── RESUME ────────────────────────────────────────────────────────────────

  if (step === "resume") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center">
            <Progress value={getProgress()} className="mb-4 h-2" />
            <CardTitle className="text-2xl font-serif">Add your resume</CardTitle>
            <CardDescription>
              Paste your resume text or upload a .txt file. HireWire will extract
              your experience, education, and skills into your evidence library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {resumeResult ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Resume processed</p>
                    <p className="text-sm text-green-700 mt-1">
                      {resumeResult.inserted} evidence{" "}
                      {resumeResult.inserted === 1 ? "entry" : "entries"} added
                      {resumeResult.updated > 0 ? `, ${resumeResult.updated} updated` : ""}
                      {resumeResult.skipped > 0 ? `, ${resumeResult.skipped} already existed` : ""}.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full h-11 bg-hirewire-red hover:bg-hirewire-red/90"
                  onClick={() => setStep("evidence")}
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resume-text">Paste resume text</Label>
                  <Textarea
                    id="resume-text"
                    placeholder="Paste the full text of your resume here..."
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value)
                      setResumeFile(null)
                    }}
                    disabled={isLoading}
                    rows={8}
                  />
                </div>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume-file">Upload .txt file</Label>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="resume-file"
                      className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      {resumeFile ? resumeFile.name : "Choose file"}
                    </label>
                    {resumeFile && (
                      <button
                        onClick={() => setResumeFile(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    )}
                    <input
                      id="resume-file"
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        setResumeFile(e.target.files?.[0] ?? null)
                        setResumeText("")
                      }}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF upload coming soon. For now, paste text or upload .txt.
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setStep("evidence")}
                    disabled={isLoading}
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip for now
                  </Button>
                  <Button
                    className="flex-1 bg-hirewire-red hover:bg-hirewire-red/90"
                    onClick={handleResumeUpload}
                    disabled={isLoading || (!resumeText.trim() && !resumeFile)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Resume
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── EVIDENCE ──────────────────────────────────────────────────────────────

  if (step === "evidence") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-2xl border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center">
            <Progress value={getProgress()} className="mb-4 h-2" />
            <CardTitle className="text-2xl font-serif">Build Your Evidence Library</CardTitle>
            <CardDescription>
              {savedEvidenceCount > 0
                ? `Great! We imported ${savedEvidenceCount} achievements from your resume.`
                : "Your evidence library powers everything — resumes, cover letters, and interview prep."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {savedEvidenceCount > 0 && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      {savedEvidenceCount} evidence items imported
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      You can add more evidence anytime from your profile
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!useAIBuilder ? (
              <div className="space-y-4">
                <button
                  onClick={() => setUseAIBuilder(true)}
                  className="w-full p-4 rounded-lg border-2 border-hirewire-red/20 bg-hirewire-red/5 hover:border-hirewire-red hover:bg-hirewire-red/10 transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-hirewire-red/10 flex items-center justify-center group-hover:bg-hirewire-red/20 transition-colors">
                      <MessageSquare className="h-5 w-5 text-hirewire-red" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        Build with AI Coach
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Have a conversation about your experience — I&apos;ll help extract and document your achievements
                      </div>
                    </div>
                    <Sparkles className="h-5 w-5 text-hirewire-red" />
                  </div>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("path")}
                >
                  Skip for now — I&apos;ll add evidence later
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-[400px] rounded-lg border overflow-hidden">
                  <CoachChat compact />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setUseAIBuilder(false)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-hirewire-red hover:bg-hirewire-red/90"
                    onClick={() => setStep("path")}
                  >
                    Continue to Dashboard
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── PATH SELECTION ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-lg">
        <CardHeader className="text-center">
          <Progress value={getProgress()} className="mb-4 h-2" />
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif">You&apos;re all set!</CardTitle>
          <CardDescription>What would you like to do first?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={() => handleSelectPath("job")}
            className="w-full p-4 rounded-lg border-2 border-transparent bg-muted/50 hover:border-hirewire-red hover:bg-muted transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-hirewire-red/10 flex items-center justify-center group-hover:bg-hirewire-red/20 transition-colors">
                <Target className="h-5 w-5 text-hirewire-red" />
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
            onClick={() => handleSelectPath("coach")}
            className="w-full p-4 rounded-lg border-2 border-transparent bg-muted/50 hover:border-hirewire-red hover:bg-muted transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-hirewire-red/10 flex items-center justify-center group-hover:bg-hirewire-red/20 transition-colors">
                <Sparkles className="h-5 w-5 text-hirewire-red" />
              </div>
              <div>
                <div className="font-medium">Chat with AI Coach</div>
                <div className="text-sm text-muted-foreground">
                  Get personalized career advice and job search strategy
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectPath("evidence")}
            className="w-full p-4 rounded-lg border-2 border-transparent bg-muted/50 hover:border-hirewire-red hover:bg-muted transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-hirewire-red/10 flex items-center justify-center group-hover:bg-hirewire-red/20 transition-colors">
                <FileText className="h-5 w-5 text-hirewire-red" />
              </div>
              <div>
                <div className="font-medium">Build more evidence</div>
                <div className="text-sm text-muted-foreground">
                  Add more experiences, projects, and achievements
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectPath("explore")}
            className="w-full p-4 rounded-lg border-2 border-transparent bg-muted/50 hover:border-hirewire-red hover:bg-muted transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-hirewire-red/10 flex items-center justify-center group-hover:bg-hirewire-red/20 transition-colors">
                <Briefcase className="h-5 w-5 text-hirewire-red" />
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
