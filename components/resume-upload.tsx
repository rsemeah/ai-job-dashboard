"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Check, AlertCircle, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
interface SourceResume {
  id: string
  file_name: string
  parsed_text?: string
  created_at: string
  parsed_data: {
    full_name?: string
    work_experience?: Array<{ company: string; role: string }>
    skills?: string[]
    education?: Array<{ school: string; degree: string }>
  } | null
}

interface ResumeUploadProps {
  existingResumes?: SourceResume[]
  onUploadComplete?: (resume: SourceResume) => void
  compact?: boolean
}

export function ResumeUpload({ existingResumes = [], onUploadComplete, compact = false }: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [resumes, setResumes] = useState<SourceResume[]>(existingResumes)

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document")
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("replaceExisting", "true")

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(80)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setUploadProgress(100)

      if (data.inserted > 0) {
        toast.success(`Resume uploaded! ${data.inserted} evidence items created.`)
      } else {
        toast.success("Resume uploaded and parsed successfully.")
      }
      
      // Refresh resumes list
      const listResponse = await fetch("/api/resume/upload")
      const listData = await listResponse.json()
      if (listData.resumes) {
        setResumes(listData.resumes)
      }

      if (data.source_resume_id) {
        onUploadComplete?.({ id: data.source_resume_id, filename, created_at: new Date().toISOString(), parsed_data: null })
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload resume")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [onUploadComplete])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDelete = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/resume/upload?id=${resumeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete resume")
      }

      setResumes(prev => prev.filter(r => r.id !== resumeId))
      toast.success("Resume deleted")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete resume")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const primaryResume = resumes[0] ?? null

  if (compact) {
    return (
      <div className="space-y-3">
        {primaryResume ? (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{primaryResume.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {primaryResume.parsed_data?.work_experience?.length || 0} positions extracted
                </p>
              </div>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Button variant="outline" size="sm" disabled={isUploading} asChild>
                <span>{isUploading ? "Uploading..." : "Replace"}</span>
              </Button>
            </label>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <div
              className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Parsing resume...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload your resume (PDF or Word)</span>
                </>
              )}
            </div>
          </label>
        )}
        {isUploading && <Progress value={uploadProgress} className="h-1" />}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Source Resume
        </CardTitle>
        <CardDescription>
          Upload your existing resume to automatically populate your profile and improve tailored resume generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <label className="cursor-pointer block">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <div
            className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg transition-all ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Processing your resume...</p>
                  <p className="text-sm text-muted-foreground">Extracting and parsing content</p>
                </div>
                <Progress value={uploadProgress} className="w-full max-w-xs h-2" />
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Drop your resume here or click to browse</p>
                  <p className="text-sm text-muted-foreground">Supports PDF and Word documents (max 10MB)</p>
                </div>
              </>
            )}
          </div>
        </label>

        {/* Existing Resumes */}
        {resumes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Uploaded Resumes</h4>
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{resume.file_name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Uploaded {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                    {resume.parsed_data && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {resume.parsed_data.work_experience && resume.parsed_data.work_experience.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {resume.parsed_data.work_experience.length} positions
                          </Badge>
                        )}
                        {resume.parsed_data.skills && resume.parsed_data.skills.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {resume.parsed_data.skills.length} skills
                          </Badge>
                        )}
                        {resume.parsed_data.education && resume.parsed_data.education.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {resume.parsed_data.education.length} degrees
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(resume.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-muted-foreground">
            Your resume is securely stored and used to extract your work history, skills, and achievements. 
            This data improves the quality of tailored resumes generated for job applications.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
