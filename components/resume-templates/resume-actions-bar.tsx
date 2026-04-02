"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { 
  Copy, 
  Check, 
  Download, 
  FileText, 
  File, 
  Loader2,
  Palette,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { ChangeTemplateDrawer } from "./change-template-drawer"
import type { TemplateId } from "@/lib/resume-templates/types/ResumeProps"
import { generateDocumentFilename, type ExportExtension } from "@/lib/filename-utils"

interface ResumeActionsBarProps {
  jobId: string
  resumeText?: string
  currentTemplateId: TemplateId
  onChangeTemplate: (templateId: TemplateId) => void
  candidateName?: string
  company?: string
  role?: string
  targetIndustry?: string | null
  targetRole?: string | null
  seniorityLevel?: string | null
  className?: string
}

export function ResumeActionsBar({
  jobId,
  resumeText,
  currentTemplateId,
  onChangeTemplate,
  candidateName = "Candidate",
  company = "Company",
  role = "Role",
  targetIndustry,
  targetRole,
  seniorityLevel,
  className,
}: ResumeActionsBarProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  
  const handleCopy = useCallback(async () => {
    if (!resumeText) return
    
    try {
      await navigator.clipboard.writeText(resumeText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast.success("Resume copied to clipboard")
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }, [resumeText])
  
  const handleExport = useCallback(async (format: ExportExtension) => {
    const key = `resume-${format}`
    setIsExporting(key)
    
    try {
      const response = await fetch("/api/export/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          format,
          template_type: "technical_resume",
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Export failed")
      }
      
      const filename = generateDocumentFilename({
        candidateName,
        role,
        company,
        documentType: "resume",
        extension: format,
      })
      
      if (format === "docx" || format === "txt") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Downloaded ${filename}`)
      } else if (format === "html") {
        const html = await response.text()
        const blob = new Blob([html], { type: "text/html" })
        const url = window.URL.createObjectURL(blob)
        window.open(url, "_blank")
        toast.success("Preview opened in new tab")
      }
    } catch (error) {
      console.error("Export error:", error)
      toast.error(error instanceof Error ? error.message : "Export failed")
    } finally {
      setIsExporting(null)
    }
  }, [jobId, candidateName, role, company])

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Copy button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleCopy}
        disabled={!resumeText}
      >
        {isCopied ? (
          <>
            <Check className="h-4 w-4 text-emerald-500" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy
          </>
        )}
      </Button>
      
      {/* Export dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Download as
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleExport("docx")}
            disabled={isExporting === "resume-docx"}
          >
            <File className="h-4 w-4 mr-2 text-blue-500" />
            Word Document (.docx)
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport("txt")}
            disabled={isExporting === "resume-txt"}
          >
            <FileText className="h-4 w-4 mr-2 text-gray-500" />
            Plain Text (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport("html")}
            disabled={isExporting === "resume-html"}
          >
            <FileText className="h-4 w-4 mr-2 text-orange-500" />
            Preview (HTML)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Change template button */}
      <ChangeTemplateDrawer
        currentTemplateId={currentTemplateId}
        onChangeTemplate={onChangeTemplate}
        targetIndustry={targetIndustry}
        targetRole={targetRole}
        seniorityLevel={seniorityLevel}
        trigger={
          <Button variant="outline" size="sm" className="gap-2">
            <Palette className="h-4 w-4" />
            Change Template
          </Button>
        }
      />
    </div>
  )
}
