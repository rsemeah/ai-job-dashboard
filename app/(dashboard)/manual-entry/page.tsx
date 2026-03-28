"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { PlusCircle, Loader2, ArrowLeft, Info, Link2 } from "lucide-react"
import { BackButton } from "@/components/back-button"
import { createClient } from "@/lib/supabase/client"

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

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast.error("Please log in to add jobs")
        setIsSubmitting(false)
        return
      }

      // Insert job into database
      const { data: job, error: insertError } = await supabase
        .from("jobs")
        .insert({
          title: formData.title.trim(),
          company: formData.company.trim(),
          source_url: formData.source_url.trim() || null,
          raw_description: formData.raw_description.trim(),
          location: formData.location.trim() || (formData.is_remote ? "Remote" : null),
          salary_range: formData.salary_range.trim() || null,
          source: "MANUAL",
          status: "NEW",
          fit: null,
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      toast.success("Job added to your review queue", {
        description: `"${formData.title}" at ${formData.company} will be analyzed shortly.`,
      })

      // Redirect to the new job or jobs list
      if (job?.id) {
        router.push(`/jobs/${job.id}`)
      } else {
        router.push("/jobs")
      }
    } catch (error) {
      console.error("Error adding job:", error)
      toast.error("Failed to add job", {
        description: error instanceof Error ? error.message : "Please try again"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleReset = () => {
    setFormData({
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
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add a Job Manually</h1>
          <p className="text-muted-foreground">
            Enter the job details to add it to your review queue
          </p>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Link2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="space-y-1 text-muted-foreground">
          <p>
            <strong>Have a job URL?</strong> You can paste it on the{" "}
            <Link href="/" className="text-primary hover:underline">Home page</Link>{" "}
            and HireWire will fetch the details automatically.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Job Details
              </CardTitle>
              <CardDescription>
                Fill in the job information. Required fields are marked with *
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
                  <Label htmlFor="source_url">Job URL (optional)</Label>
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
                    <Label htmlFor="location">Location (optional)</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g. San Francisco, CA"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary_range">Salary Range (optional)</Label>
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
                    rows={10}
                    className={errors.raw_description ? "border-destructive" : ""}
                  />
                  {errors.raw_description && (
                    <p className="text-sm text-destructive">{errors.raw_description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formData.raw_description.length} characters — include the full description for better scoring
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSubmitting}
                  >
                    Clear Form
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Job...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Job
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
                  <p className="text-sm font-medium">Job Added</p>
                  <p className="text-xs text-muted-foreground">
                    Added to your review queue
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">AI Review</p>
                  <p className="text-xs text-muted-foreground">
                    Analyzed for fit with your background
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Go / No-Go Decision</p>
                  <p className="text-xs text-muted-foreground">
                    Clear recommendation with reasoning
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium">Tailored Materials</p>
                  <p className="text-xs text-muted-foreground">
                    Resume and cover letter customized for this role
                  </p>
                </div>
              </div>
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
                  Paste the complete job description for accurate scoring
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Include the job URL to easily reference the original posting
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Salary info helps with offer comparison later
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
