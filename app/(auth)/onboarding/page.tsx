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
  FileText, 
  Target, 
  Upload, 
  Sparkles,
  CheckCircle2,
  X,
  ChevronRight,
  ArrowRight
} from "lucide-react"
import { HireWireLogo } from "@/components/hirewire-logo"
import { toast } from "sonner"

type OnboardingStep = "welcome" | "resume" | "profile" | "complete"

interface ParsedResumeData {
  full_name: string | null
  email: string | null
  phone: string | null
  location: string | null
  summary: string | null
  skills: string[]
  experience: Array<{
    title: string
    company: string
    description?: string
    bullets?: string[]
  }>
}

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [isLoading, setIsLoading] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedResume, setParsedResume] = useState<ParsedResumeData | null>(null)
  const [hasResume, setHasResume] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Profile form state
  const [fullName, setFullName] = useState("")
  const [location, setLocation] = useState("")
  const [headline, setHeadline] = useState("")
  const [summary, setSummary] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  // Handle resume file upload
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsingResume(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("replaceExisting", "true")

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse resume")
      }

      const parsed = result.resume?.parsed_data as ParsedResumeData | undefined
      if (parsed) {
        // Pre-fill form fields
        if (parsed.full_name) setFullName(parsed.full_name)
        if (parsed.location) setLocation(parsed.location)
        if (parsed.summary) setSummary(parsed.summary)
        if (parsed.skills?.length) setSkills(parsed.skills.slice(0, 10))
        
        setParsedResume(parsed)
        setHasResume(true)
      }
      
      toast.success("Resume uploaded successfully!")
      setStep("profile")
    } catch (err) {
      console.error("Resume parse error:", err)
      setError(err instanceof Error ? err.message : "Failed to parse resume")
      toast.error("Failed to parse resume")
    } finally {
      setIsParsingResume(false)
    }
  }

  // Save profile and complete onboarding
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
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from("user_profile")
        .select("id")
        .eq("user_id", user.id)
        .single()

      const profileData = {
        user_id: user.id,
        full_name: fullName.trim(),
        email: user.email,
        location: location.trim() || null,
        headline: headline.trim() || null,
        summary: summary.trim() || null,
        skills: skills.length > 0 ? skills : null,
      }

      let profileError
      if (existingProfile) {
        const { error } = await supabase
          .from("user_profile")
          .update(profileData)
          .eq("user_id", user.id)
        profileError = error
      } else {
        const { error } = await supabase
          .from("user_profile")
          .insert(profileData)
        profileError = error
      }
      
      if (profileError) throw profileError

      // Extract and save evidence from resume if available
      if (parsedResume?.experience?.length) {
        const evidenceToSave = parsedResume.experience.map((exp, i) => ({
          user_id: user.id,
          source_type: "resume",
          source_title: `${exp.title} at ${exp.company}`,
          role_name: exp.title || null,
          company_name: exp.company || null,
          date_range: exp.dates || null,
          responsibilities: exp.bullets || [],
          outcomes: [],
          proof_snippet: exp.description || exp.bullets?.join(" ") || null,
          is_active: true,
          priority_rank: i,
          confidence_level: "high",
          is_user_approved: false,
        }))

        await supabase.from("evidence_library").insert(evidenceToSave)
      }

      setStep("complete")
    } catch (err) {
      console.error("Error creating profile:", err)
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setIsLoading(false)
    }
  }

  // Complete onboarding and go to dashboard
  const handleGoToDashboard = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Mark onboarding as complete in user_profile
      await supabase
        .from("user_profile")
        .update({ onboarding_complete: true })
        .eq("user_id", user.id)
    }
    
    router.push("/")
    router.refresh()
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove))
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

  // Progress calculation - 3 steps: welcome (0), resume (33), profile (66), complete (100)
  const getProgress = () => {
    switch (step) {
      case "welcome": return 0
      case "resume": return 33
      case "profile": return 66
      case "complete": return 100
      default: return 0
    }
  }

  // STEP 1: WELCOME
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
                <Sparkles className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">AI Career Coach</div>
                  <div className="text-sm text-muted-foreground">
                    Personal guidance to strengthen your evidence before generation
                  </div>
                </div>
              </div>
            </div>
            <Button 
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90" 
              onClick={() => setStep("resume")}
            >
              Get Started
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // STEP 2: RESUME UPLOAD (optional)
  if (step === "resume") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center">
            <Progress value={getProgress()} className="mb-4 h-2" />
            <CardTitle className="text-2xl font-serif">Import Your Resume</CardTitle>
            <CardDescription>
              Upload your resume to pre-fill your profile and build your evidence library
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resume Upload Area */}
            <div className="p-6 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-lg">Drop your resume here</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOC, DOCX, or TXT (max 5MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleResumeUpload}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingResume}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isParsingResume ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing Resume...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </p>
            )}

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
              onClick={() => setStep("profile")}
              disabled={isParsingResume}
            >
              Skip - I&apos;ll enter details manually
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setStep("welcome")}
              disabled={isParsingResume}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // STEP 3: PROFILE BASICS
  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-xl border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center">
            <Progress value={getProgress()} className="mb-4 h-2" />
            <CardTitle className="text-2xl font-serif">
              {hasResume ? "Confirm Your Profile" : "Create Your Profile"}
            </CardTitle>
            <CardDescription>
              {hasResume 
                ? "We&apos;ve pre-filled your details from your resume. Make any changes below."
                : "Tell us a bit about yourself to get started"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasResume && (
              <div className="flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                Resume imported - {parsedResume?.experience?.length || 0} experiences found
              </div>
            )}

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
                  placeholder="Brief overview of your experience and what you're looking for..."
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
                        <button onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
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
                onClick={() => setStep("resume")}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
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

  // STEP 4: COMPLETE - GO TO DASHBOARD
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
          <CardDescription className="text-base">
            Your profile is ready. Now let&apos;s analyze a job and see how HireWire works.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h3 className="font-medium mb-2">What happens next?</h3>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                Paste a job URL or description to analyze
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                See your fit score and identify gaps
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                Chat with Coach to strengthen your evidence for that role
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">4.</span>
                Generate tailored resume and cover letter
              </li>
            </ol>
          </div>

          <Button
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleGoToDashboard}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
