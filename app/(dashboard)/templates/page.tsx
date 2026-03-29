"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  Plus,
  X,
  Save,
  Shield,
  Sliders,
  FileText,
  MessageSquare,
  Scale,
  Zap,
  RefreshCw,
  GraduationCap,
  Code2,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  Eye,
  LayoutGrid,
} from "lucide-react"
import { toast } from "sonner"
import { BANNED_PHRASES, ResumeTemplateType } from "@/lib/types"
import { RESUME_TEMPLATES, getSectionOrder } from "@/lib/resume-templates"
import Link from "next/link"
import { BackButton } from "@/components/back-button"

const TEMPLATE_ICONS: Record<ResumeTemplateType, React.ReactNode> = {
  professional_cv: <GraduationCap className="h-6 w-6" />,
  technical_resume: <Code2 className="h-6 w-6" />,
  non_technical_resume: <Briefcase className="h-6 w-6" />,
}

const TEMPLATE_PREVIEWS: Record<ResumeTemplateType, string[]> = {
  professional_cv: [
    "JOHN DOE, Ph.D.",
    "San Francisco, CA | john@example.com",
    "",
    "PROFESSIONAL SUMMARY",
    "Distinguished researcher with 15+ years...",
    "",
    "EXPERIENCE",
    "Senior Research Scientist | Google | 2018-Present",
    "• Led team of 8 researchers on language models",
    "• Published 12 papers in top-tier venues",
    "",
    "EDUCATION",
    "Ph.D. Computer Science | Stanford | 2012",
    "",
    "PUBLICATIONS",
    "• Attention Mechanisms (NeurIPS 2022)",
  ],
  technical_resume: [
    "JANE SMITH",
    "Seattle, WA | github.com/janesmith",
    "",
    "SUMMARY",
    "Full-stack engineer with 7 years...",
    "",
    "TECHNICAL SKILLS",
    "Languages: Python, TypeScript, Go",
    "Cloud: AWS, GCP, Kubernetes",
    "",
    "PROJECTS",
    "Analytics Platform | Python, Kafka",
    "• Processed 10M+ events/day",
    "",
    "EXPERIENCE",
    "Senior Engineer | Stripe | 2020-Present",
  ],
  non_technical_resume: [
    "ALEX JOHNSON",
    "New York, NY | alex@example.com",
    "",
    "PROFESSIONAL SUMMARY",
    "Strategic business leader with 10+ years...",
    "",
    "EXPERIENCE",
    "Director of BD | Salesforce | 2019-Present",
    "• Grew accounts from $5M to $25M ARR",
    "• Led team of 12 account executives",
    "",
    "KEY ACHIEVEMENTS",
    "• Presidents Club Winner 2022, 2023",
    "",
    "CORE COMPETENCIES",
    "Strategic Planning | Team Leadership",
  ],
}

const STORAGE_KEY = "hw_template_settings"

const DEFAULT_SCORING_WEIGHTS = {
  skillsMatch: 30,
  experienceRelevance: 25,
  seniorityAlignment: 20,
  atsKeywords: 15,
  evidenceQuality: 10,
}

const DEFAULT_RESUME_RULES = {
  maxBullets: 5,
  requireMetrics: true,
  requireActionVerbs: true,
  maxPages: 2,
}

const DEFAULT_COVER_LETTER_RULES = {
  maxParagraphs: 4,
  requireCompanyMention: true,
  requireRoleMention: true,
  personalToneLevel: "professional",
}

export default function TemplatesPage() {
  // Template gallery state
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateType>("technical_resume")
  
  // Banned phrases state
  const [customBannedPhrases, setCustomBannedPhrases] = useState<string[]>([])
  const [newPhrase, setNewPhrase] = useState("")
  
  // Scoring weights
  const [scoringWeights, setScoringWeights] = useState(DEFAULT_SCORING_WEIGHTS)
  
  // Resume rules
  const [resumeRules, setResumeRules] = useState(DEFAULT_RESUME_RULES)
  
  // Cover letter rules
  const [coverLetterRules, setCoverLetterRules] = useState(DEFAULT_COVER_LETTER_RULES)

  // Load persisted settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate)
      if (parsed.customBannedPhrases) setCustomBannedPhrases(parsed.customBannedPhrases)
      if (parsed.scoringWeights) setScoringWeights(parsed.scoringWeights)
      if (parsed.resumeRules) setResumeRules(parsed.resumeRules)
      if (parsed.coverLetterRules) setCoverLetterRules(parsed.coverLetterRules)
    } catch {
      // Ignore parse errors — defaults remain
    }
  }, [])

  function addBannedPhrase() {
    if (!newPhrase.trim()) return
    if (customBannedPhrases.includes(newPhrase.trim().toLowerCase())) {
      toast.error("Phrase already exists")
      return
    }
    setCustomBannedPhrases([...customBannedPhrases, newPhrase.trim().toLowerCase()])
    setNewPhrase("")
    toast.success("Phrase added to banned list")
  }

  function removeBannedPhrase(phrase: string) {
    setCustomBannedPhrases(customBannedPhrases.filter(p => p !== phrase))
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedTemplate,
        customBannedPhrases,
        scoringWeights,
        resumeRules,
        coverLetterRules,
      }))
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    }
  }

  function resetToDefaults() {
    setCustomBannedPhrases([])
    setScoringWeights(DEFAULT_SCORING_WEIGHTS)
    setResumeRules(DEFAULT_RESUME_RULES)
    setCoverLetterRules(DEFAULT_COVER_LETTER_RULES)
    localStorage.removeItem(STORAGE_KEY)
    toast.info("Settings reset to defaults")
  }

  const totalWeight = Object.values(scoringWeights).reduce((a, b) => a + b, 0)

  return (
    <div className="p-6 space-y-6">
      <BackButton fallbackHref="/" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            Templates and Prompt Rules
          </h1>
          <p className="text-muted-foreground">Configure generation behavior, banned phrases, and scoring weights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Defaults
          </Button>
          <Button onClick={saveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="gallery" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Banned Phrases
          </TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="resume" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resume
          </TabsTrigger>
          <TabsTrigger value="cover" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Cover Letter
          </TabsTrigger>
        </TabsList>

        {/* Template Gallery Tab */}
        <TabsContent value="gallery" className="space-y-6">
          {/* Template Cards */}
          <div className="grid gap-6 lg:grid-cols-3">
            {Object.values(RESUME_TEMPLATES).map((template) => {
              const isSelected = selectedTemplate === template.id
              
              return (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-xl bg-muted">
                        {TEMPLATE_ICONS[template.id]}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                          <Zap className="h-3 w-3 mr-1" />
                          ATS Safe
                        </Badge>
                        {template.multiPage && (
                          <Badge variant="outline" className="text-xs">
                            Multi-page
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-xl mt-4">{template.name}</CardTitle>
                    <CardDescription className="text-sm">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Best for:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {template.bestFor.slice(0, 4).map((role) => (
                          <Badge key={role} variant="outline" className="text-xs font-normal">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Selected Template Preview */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {TEMPLATE_ICONS[selectedTemplate]}
                  <div>
                    <CardTitle>{RESUME_TEMPLATES[selectedTemplate].name} Preview</CardTitle>
                    <CardDescription>
                      See how your resume will look with this template
                    </CardDescription>
                  </div>
                </div>
                <Link href="/profile">
                  <Button size="sm" className="gap-2">
                    Use This Template
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
                {/* Preview */}
                <div className="p-6">
                  <div className="bg-white border rounded-lg shadow-sm p-6 font-mono text-xs leading-relaxed">
                    {TEMPLATE_PREVIEWS[selectedTemplate].map((line, i) => (
                      <div key={i} className={line === "" ? "h-3" : ""}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Template Details */}
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Section Order</h3>
                    <ol className="space-y-2">
                      {getSectionOrder(selectedTemplate).slice(0, 8).map((section, index) => (
                        <li key={section} className="flex items-center gap-3 text-sm">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="capitalize">{section.replace(/_/g, " ")}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-3">ATS Features</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Standard section headings
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Single-column layout
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        No tables or graphics
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Keyword-optimized bullets
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banned Phrases Tab */}
        <TabsContent value="banned" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Banned Phrases
              </CardTitle>
              <CardDescription>
                These phrases will be flagged during Red Team Review. AI-generated content should never include these.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new phrase */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a phrase to ban..."
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBannedPhrase()}
                />
                <Button onClick={addBannedPhrase}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              
              <Separator />
              
              {/* System banned phrases */}
              <div>
                <h4 className="text-sm font-medium mb-3">System Banned Phrases ({BANNED_PHRASES.length})</h4>
                <ScrollArea className="h-[200px]">
                  <div className="flex flex-wrap gap-2">
                    {BANNED_PHRASES.map((phrase, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {phrase}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <Separator />
              
              {/* Custom banned phrases */}
              <div>
                <h4 className="text-sm font-medium mb-3">Custom Banned Phrases ({customBannedPhrases.length})</h4>
                {customBannedPhrases.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No custom phrases added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customBannedPhrases.map((phrase, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1">
                        {phrase}
                        <button onClick={() => removeBannedPhrase(phrase)} className="ml-1 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Weights Tab */}
        <TabsContent value="scoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-500" />
                Scoring Weights
              </CardTitle>
              <CardDescription>
                Adjust how different factors contribute to the overall fit score. Total must equal 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(scoringWeights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                    <span className="font-mono text-sm">{value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={value}
                    onChange={(e) => setScoringWeights({
                      ...scoringWeights,
                      [key]: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
              ))}
              
              <Separator />
              
              <div className={`flex items-center justify-between p-3 rounded-lg ${totalWeight === 100 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                <span className="font-medium">Total Weight</span>
                <span className="font-bold">{totalWeight}%</span>
              </div>
              {totalWeight !== 100 && (
                <p className="text-sm text-red-500">Weights must total 100%. Current total: {totalWeight}%</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resume Rules Tab */}
        <TabsContent value="resume" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Resume Generation Rules
              </CardTitle>
              <CardDescription>
                Configure how resumes are generated and validated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Max Bullets per Role</Label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={resumeRules.maxBullets}
                    onChange={(e) => setResumeRules({
                      ...resumeRules,
                      maxBullets: parseInt(e.target.value)
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Pages</Label>
                  <Input
                    type="number"
                    min="1"
                    max="3"
                    value={resumeRules.maxPages}
                    onChange={(e) => setResumeRules({
                      ...resumeRules,
                      maxPages: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Metrics in Bullets</Label>
                    <p className="text-xs text-muted-foreground">Flag bullets that lack quantifiable metrics</p>
                  </div>
                  <Switch
                    checked={resumeRules.requireMetrics}
                    onCheckedChange={(checked) => setResumeRules({
                      ...resumeRules,
                      requireMetrics: checked
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Strong Action Verbs</Label>
                    <p className="text-xs text-muted-foreground">Flag bullets starting with weak verbs</p>
                  </div>
                  <Switch
                    checked={resumeRules.requireActionVerbs}
                    onCheckedChange={(checked) => setResumeRules({
                      ...resumeRules,
                      requireActionVerbs: checked
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cover Letter Rules Tab */}
        <TabsContent value="cover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Cover Letter Generation Rules
              </CardTitle>
              <CardDescription>
                Configure how cover letters are generated and validated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Max Paragraphs</Label>
                <Input
                  type="number"
                  min="3"
                  max="6"
                  value={coverLetterRules.maxParagraphs}
                  onChange={(e) => setCoverLetterRules({
                    ...coverLetterRules,
                    maxParagraphs: parseInt(e.target.value)
                  })}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Company Mention</Label>
                    <p className="text-xs text-muted-foreground">Must reference the specific company by name</p>
                  </div>
                  <Switch
                    checked={coverLetterRules.requireCompanyMention}
                    onCheckedChange={(checked) => setCoverLetterRules({
                      ...coverLetterRules,
                      requireCompanyMention: checked
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Role Mention</Label>
                    <p className="text-xs text-muted-foreground">Must reference the specific role title</p>
                  </div>
                  <Switch
                    checked={coverLetterRules.requireRoleMention}
                    onCheckedChange={(checked) => setCoverLetterRules({
                      ...coverLetterRules,
                      requireRoleMention: checked
                    })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Tone Level</Label>
                <div className="flex gap-2">
                  {["casual", "professional", "formal"].map((tone) => (
                    <Button
                      key={tone}
                      variant={coverLetterRules.personalToneLevel === tone ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCoverLetterRules({
                        ...coverLetterRules,
                        personalToneLevel: tone
                      })}
                      className="capitalize"
                    >
                      {tone}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
