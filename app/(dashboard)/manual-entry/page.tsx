"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { PlusCircle, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface FormData {
  title: string
  company: string
  source_url: string
  raw_description: string
  location: string
  salary_range: string
  is_remote: boolean
}

interface FormErrors {
  title?: string
  company?: string
  source_url?: string
  raw_description?: string
}
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { PlusCircle, Info } from "lucide-react"
import { toast } from "sonner"

const manualEntrySchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  company: z.string().min(1, "Company name is required"),
  source_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  raw_description: z.string().min(20, "Job description must be at least 20 characters"),
  location: z.string().optional(),
  salary_range: z.string().optional(),
  is_remote: z.boolean().default(false),
})

type ManualEntryFormValues = z.infer<typeof manualEntrySchema>

export default function ManualEntryPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: "",
    company: "",
    source_url: "",
    raw_description: "",
    location: "",
    salary_range: "",
    is_remote: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = "Job title is required"
    }
    if (!formData.company.trim()) {
      newErrors.company = "Company name is required"
    }
    if (!formData.raw_description.trim()) {
      newErrors.raw_description = "Job description is required"
    }
    if (formData.source_url && !isValidUrl(formData.source_url)) {
      newErrors.source_url = "Please enter a valid URL"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    toast.success("Job created successfully", {
      description: `${formData.title} at ${formData.company} has been added to the pipeline.`,
    })

    setIsSubmitting(false)
    router.push("/jobs")
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleReset = () => {
    setFormData({

  const form = useForm<ManualEntryFormValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      title: "",
      company: "",
      source_url: "",
      raw_description: "",
      location: "",
      salary_range: "",
      is_remote: false,
    })
    setErrors({})
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manual Job Entry</h1>
          <p className="text-muted-foreground">
            Add a job manually to the pipeline for scoring and document generation.
    },
  })

  const onSubmit = async (values: ManualEntryFormValues) => {
    setIsSubmitting(true)
    try {
      // In production this would INSERT into the jobs table via Supabase.
      // For now the form validates and toasts — wire to:
      //   supabase.from('jobs').insert({ ...values, source: 'MANUAL', status: 'NEW', fit: 'UNSCORED' })
      console.log("Manual job entry:", {
        ...values,
        source: "MANUAL",
        status: "NEW",
        fit: "UNSCORED",
        score: null,
        score_reasoning: null,
        score_strengths: null,
        score_gaps: null,
        keywords_extracted: null,
        scored_at: null,
        applied_at: null,
      })

      toast.success(`"${values.title}" at ${values.company} added to the pipeline`, {
        description: "Job is queued as NEW and will be scored in the next workflow run.",
      })

      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manual Entry</h1>
        <p className="text-muted-foreground">
          Add a job listing manually — bypasses intake workflows and inserts directly as NEW.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="space-y-1 text-muted-foreground">
          <p>
            Manual jobs skip the n8n intake workflow. They are inserted with{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">source = MANUAL</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">status = NEW</code>, and{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">fit = UNSCORED</code>.
          </p>
          <p>
            The scoring workflow (02_job_scoring.json) will pick them up on its next 6-hour cycle.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                New Job Entry
              </CardTitle>
              <CardDescription>
                Fill in the job details below. Required fields are marked with an asterisk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Job Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g. Senior Software Engineer"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={errors.title ? "border-destructive" : ""}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">
                      Company <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      placeholder="e.g. Acme Corp"
                      value={formData.company}
                      onChange={handleInputChange}
                      className={errors.company ? "border-destructive" : ""}
                    />
                    {errors.company && (
                      <p className="text-sm text-destructive">{errors.company}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source_url">Source URL</Label>
                  <Input
                    id="source_url"
                    name="source_url"
                    type="url"
                    placeholder="https://example.com/jobs/12345"
                    value={formData.source_url}
                    onChange={handleInputChange}
                    className={errors.source_url ? "border-destructive" : ""}
                  />
                  {errors.source_url && (
                    <p className="text-sm text-destructive">{errors.source_url}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g. San Francisco, CA"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary_range">Salary Range</Label>
                    <Input
                      id="salary_range"
                      name="salary_range"
                      placeholder="e.g. $150,000 - $200,000"
                      value={formData.salary_range}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="is_remote"
                    checked={formData.is_remote}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_remote: checked }))
                    }
                  />
                  <Label htmlFor="is_remote" className="cursor-pointer">
                    Remote Position
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="raw_description">
                    Job Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="raw_description"
                    name="raw_description"
                    placeholder="Paste the full job description here..."
                    value={formData.raw_description}
                    onChange={handleInputChange}
                    rows={12}
                    className={errors.raw_description ? "border-destructive" : ""}
                  />
                  {errors.raw_description && (
                    <p className="text-sm text-destructive">{errors.raw_description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formData.raw_description.length} characters
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSubmitting}
                  >
                    Reset Form
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Job...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Job
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What Happens Next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Job Created</p>
                  <p className="text-xs text-muted-foreground">
                    Added to pipeline with NEW status
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">AI Scoring</p>
                  <p className="text-xs text-muted-foreground">
                    Analyzed for fit and compatibility
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Document Generation</p>
                  <p className="text-xs text-muted-foreground">
                    Resume and cover letter tailored
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium">Ready Queue</p>
                  <p className="text-xs text-muted-foreground">
                    Appears in queue if score meets threshold
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Source</span>
                <Badge variant="secondary">MANUAL</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline">NEW</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Manually entered jobs are tagged with MANUAL source for tracking purposes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Include the full job description for better scoring accuracy
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Add the source URL to easily reference the original posting
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Salary information helps with offer comparison later
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Core Info */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Basic information about the role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior AI Product Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://company.com/careers/job-id"
                        type="url"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Link to the original posting for reference.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location & Salary */}
          <Card>
            <CardHeader>
              <CardTitle>Location & Compensation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. San Francisco, CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary_range"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary Range</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. $140,000 – $165,000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_remote"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base cursor-pointer">Remote Position</FormLabel>
                      <FormDescription>
                        Toggle on if this role is fully or primarily remote.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Raw Description */}
          <Card>
            <CardHeader>
              <CardTitle>
                Job Description <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription>
                Paste the full raw job description. This is the grounding source for scoring and document generation — do not summarize or edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="raw_description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the complete job description here..."
                        className="min-h-[300px] font-mono text-sm resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Stored verbatim in <code className="text-xs bg-muted px-1 py-0.5 rounded">raw_description</code>. Never modified after insert.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Will be inserted as
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">source: MANUAL</Badge>
                <Badge variant="secondary">status: NEW</Badge>
                <Badge variant="secondary">fit: UNSCORED</Badge>
                <Badge variant="outline" className="text-muted-foreground">score: null</Badge>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add Job"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/jobs")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
