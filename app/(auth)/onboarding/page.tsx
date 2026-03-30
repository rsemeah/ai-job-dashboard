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
import { ScrollArea } from "@/components/ui/scroll-area"
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
  MessageSquare
} from "lucide-react"
import { HireWireLogo } from "@/components/hirewire-logo"
import { CoachChat } from "@/components/coach-chat"
import { toast } from "sonner"

type OnboardingStep = "welcome" | "profile" | "evidence" | "path"

interface ParsedResumeData {
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  headline: string | null
  summary: string | null
  skills: string[]
  extractedEvidence: Array<{
    title: string
    description: string
    category: string
    metrics: string | null
    tags: string[]
  }>
}

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [isLoading, setIsLoading] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedResume, setParsedResume] = useState<ParsedResumeData | null>(null)
  const [savedEvidenceCount, setSavedEvidenceCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Profile form state
  const [fullName, setFullName] = useState("")
  const [location, setLocation] = useState("")
  const [headline, setHeadline] = useState("")
  const [summary, setSummary] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  // Evidence builder state
  const [useAIBuilder, setUseAIBuilder] = useState(false)

  // Handle resume file upload - uses the new upload API that stores and parses
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
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse resume")
      }

      // Map from the new API format to our expected format
      const parsed = result.resume?.parsed_data
      if (parsed) {
        const data: ParsedResumeData = {
          name: parsed.full_name || null,
          email: parsed.email || null,
          phone: parsed.phone || null,
          location: parsed.location || null,
          headline: null,
          summary: parsed.summary || null,
          skills: parsed.skills || [],
          extractedEvidence: (parsed.experience || []).map((exp: { title: string; company: string; description?: string; bullets?: string[] }, i: number) => ({
            title: `${exp.title} at ${exp.company}`,
            description: exp.description || exp.bullets?.join(" ") || "",
            category: "achievement",
            metrics: null,
            tags: [],
          })),
        }

        // Pre-fill form fields
        if (data.name) setFullName(data.name)
        if (data.location) setLocation(data.location)
        if (data.headline) setHeadline(data.headline)
        if (data.summary) setSummary(data.summary)
        if (data.skills?.length) setSkills(data.skills.slice(0, 10))

        setParsedResume(data)
      }
      
      toast.success("Resume uploaded and parsed successfully!")
    } catch (err) {
      console.error("Resume parse error:", err)
      setError(err instanceof Error ? err.message : "Failed to parse resume")
      toast.error("Failed to parse resume")
    } finally {
      setIsParsingResume(false)
    }
  }

  // Handle paste resume text
  const handlePasteResume = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text || text.length < 50) {
        toast.error("Please copy your resume text first")
        return
      }

      setIsParsingResume(true)
      setError(null)

      const formData = new FormData()
      formData.append("text", text)

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse resume")
      }

      const data = result.data as ParsedResumeData

      // Pre-fill form fields
      if (data.name) setFullName(data.name)
      if (data.location) setLocation(data.location)
      if (data.headline) setHeadline(data.headline)
      if (data.summary) setSummary(data.summary)
      if (data.skills?.length) setSkills(data.skills.slice(0, 10))

      setParsedResume(data)
      toast.success("Resume parsed successfully!")
    } catch (err) {
      console.error("Resume parse error:", err)
      setError(err instanceof Error ? err.message : "Failed to parse resume")
    } finally {
      setIsParsingResume(false)
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
      // Save profile
      const { error: upsertError } = await supabase
        .from("user_profile")
        .upsert({
          user_id: user.id,
          full_name: fullName.trim(),
          email: user.email,
          location: location.trim() || null,
          headline: headline.trim() || null,
          summary: summary.trim() || null,
          skills: skills.length > 0 ? skills : null,
        }, {
          onConflict: "user_id"
        })

      if (upsertError) throw upsertError

      // If we have extracted evidence from resume, save it
      if (parsedResume?.extractedEvidence?.length) {
        const evidenceToSave = parsedResume.extractedEvidence.map((e, i) => ({
          user_id: user.id,
          title: e.title,
          description: e.description,
          category: e.category,
          metrics: e.metrics,
          tags: e.tags,
          is_active: true,
          priority_rank: i,
        }))

        const { error: evidenceError } = await supabase
          .from("evidence_library")
          .insert(evidenceToSave)

        if (!evidenceError) {
          setSavedEvidenceCount(evidenceToSave.length)
        }
      }

      setStep("evidence")
    } catch (err) {
      console.error("Error creating profile:", err)
      setError(err instanceof Error ? err.message : "Failed to save profile")
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

  // Progress calculation
  const getProgress = () => {
    switch (step) {
      case "welcome": return 0
      case "profile": return 33
      case "evidence": return 66
      case "path": return 100
      default: return 0
    }
  }

  // WELCOME STEP
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

  // PROFILE STEP
  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-xl border-0 shadow-none lg:border lg:shadow-lg">
          <CardHeader className="text-center">
            <Progress value={getProgress()} className="mb-4 h-2" />
            <CardTitle className="text-2xl font-serif">Build Your Profile</CardTitle>
            <CardDescription>
              Import from your resume or enter details manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resume Import Section */}
            <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-hirewire-red/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-hirewire-red" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Import from Resume</p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll extract your info and key achievements automatically
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleResumeUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsingResume}
                  >
                    {isParsingResume ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePasteResume}
                    disabled={isParsingResume}
                  >
                    Paste Text
                  </Button>
                </div>
                {parsedResume && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Resume imported - {parsedResume.extractedEvidence?.length || 0} achievements found
                  </div>
                )}
              </div>
            </div>

            {/* Manual Entry Form */}
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

  // EVIDENCE BUILDER STEP
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
                : "Your evidence library powers everything - resumes, cover letters, and interview prep."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Evidence Status */}
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

            {/* AI Builder Option */}
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
                        Have a conversation about your experience - I&apos;ll help extract and document your achievements
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
                  Skip for now - I&apos;ll add evidence later
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-[400px] rounded-lg border overflow-hidden">
                  <CoachChat compact />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setUseAIBuilder(false)}
                  >
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

  // PATH SELECTION STEP
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
          <CardDescription>
            What would you like to do first?
          </CardDescription>
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
