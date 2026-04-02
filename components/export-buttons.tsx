"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Download,
  FileText,
  File,
  Copy,
  Check,
  Loader2,
  FileDown,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { generateDocumentFilename, type DocumentType, type ExportExtension } from "@/lib/filename-utils"
import { runExportAudit, type ExportAuditResult } from "@/lib/ats-validation"
import { ExportAuditDialog, ExportAuditIndicator } from "@/components/export-audit"

interface ExportButtonsProps {
  jobId: string
  hasResume: boolean
  hasCoverLetter: boolean
  resumeText?: string
  coverLetterText?: string
  candidateName?: string
  company?: string
  role?: string
}

export function ExportButtons({
  jobId,
  hasResume,
  hasCoverLetter,
  resumeText,
  coverLetterText,
  candidateName = "Candidate",
  company = "Company",
  role = "Role",
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [copiedResume, setCopiedResume] = useState(false)
  const [copiedCover, setCopiedCover] = useState(false)
  
  // Export audit state
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const [pendingExport, setPendingExport] = useState<{
    documentType: DocumentType
    format: ExportExtension
  } | null>(null)
  const [auditResult, setAuditResult] = useState<ExportAuditResult | null>(null)

  // Run audit before export
  const checkAndExport = async (
    documentType: DocumentType,
    format: ExportExtension
  ) => {
    const text = documentType === "resume" ? resumeText : coverLetterText
    if (!text) {
      handleExport(documentType, format)
      return
    }

    // Run the audit
    const result = runExportAudit(
      text,
      documentType === "resume" ? "resume" : "cover_letter",
      format,
      {
        candidateName,
      }
    )

    // If there are issues, show the dialog
    if (result.critical_count > 0 || result.warning_count > 0) {
      setAuditResult(result)
      setPendingExport({ documentType, format })
      setShowAuditDialog(true)
    } else {
      // No issues - proceed directly
      handleExport(documentType, format)
    }
  }

  const handleExport = async (
    documentType: DocumentType,
    format: ExportExtension
  ) => {
    const key = `${documentType}-${format}`
    setIsExporting(key)

    try {
      const endpoint = documentType === "resume" 
        ? "/api/export/resume" 
        : "/api/export/cover-letter"
      
      const response = await fetch(endpoint, {
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

      // Generate filename using the utility
      const filename = generateDocumentFilename({
        candidateName,
        role,
        company,
        documentType,
        extension: format,
      })

      // For DOCX, download the file
      if (format === "docx") {
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
      }

      // For TXT, download the file
      if (format === "txt") {
        const text = await response.text()
        const blob = new Blob([text], { type: "text/plain" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Downloaded ${filename}`)
      }

      // For HTML, open in new tab for preview
      if (format === "html") {
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
  }

  const handleCopy = async (type: "resume" | "cover") => {
    const text = type === "resume" ? resumeText : coverLetterText
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      if (type === "resume") {
        setCopiedResume(true)
        setTimeout(() => setCopiedResume(false), 2000)
      } else {
        setCopiedCover(true)
        setTimeout(() => setCopiedCover(false), 2000)
      }
      toast.success(`${type === "resume" ? "Resume" : "Cover letter"} copied to clipboard`)
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  if (!hasResume && !hasCoverLetter) {
    return null
  }

  return (
    <>
      {/* Export Audit Dialog */}
      {auditResult && (
        <ExportAuditDialog
          open={showAuditDialog}
          onOpenChange={setShowAuditDialog}
          auditResult={auditResult}
          onProceed={() => {
            setShowAuditDialog(false)
            if (pendingExport) {
              handleExport(pendingExport.documentType, pendingExport.format)
            }
          }}
          onCancel={() => {
            setShowAuditDialog(false)
            setPendingExport(null)
          }}
          documentType={auditResult.document_type}
          exportFormat={pendingExport?.format || "docx"}
        />
      )}
      
      <div className="flex items-center gap-2">
      {/* Resume Export */}
      {hasResume && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {isExporting?.startsWith("resume") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Resume
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <span className="font-medium">Export Resume</span>
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {generateDocumentFilename({
                    candidateName,
                    role,
                    company,
                    documentType: "resume",
                    extension: "docx",
                  }).replace(".docx", ".*")}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => checkAndExport("resume", "docx")}
              disabled={isExporting === "resume-docx"}
            >
              <File className="h-4 w-4 mr-2 text-blue-500" />
              Download DOCX
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => checkAndExport("resume", "txt")}
              disabled={isExporting === "resume-txt"}
            >
              <FileText className="h-4 w-4 mr-2 text-gray-500" />
              Download TXT
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => checkAndExport("resume", "html")}
              disabled={isExporting === "resume-html"}
            >
              <FileText className="h-4 w-4 mr-2 text-orange-500" />
              Preview HTML
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleCopy("resume")}>
              {copiedResume ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy to Clipboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Cover Letter Export */}
      {hasCoverLetter && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {isExporting?.startsWith("cover_letter") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Cover Letter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <span className="font-medium">Export Cover Letter</span>
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {generateDocumentFilename({
                    candidateName,
                    role,
                    company,
                    documentType: "cover_letter",
                    extension: "docx",
                  }).replace(".docx", ".*")}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => checkAndExport("cover_letter", "docx")}
              disabled={isExporting === "cover_letter-docx"}
            >
              <File className="h-4 w-4 mr-2 text-blue-500" />
              Download DOCX
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => checkAndExport("cover_letter", "txt")}
              disabled={isExporting === "cover_letter-txt"}
            >
              <FileText className="h-4 w-4 mr-2 text-gray-500" />
              Download TXT
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => checkAndExport("cover_letter", "html")}
              disabled={isExporting === "cover_letter-html"}
            >
              <FileText className="h-4 w-4 mr-2 text-orange-500" />
              Preview HTML
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleCopy("cover")}>
              {copiedCover ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy to Clipboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Quick Download All */}
      {hasResume && hasCoverLetter && (
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          onClick={async () => {
            await handleExport("resume", "docx")
            await handleExport("cover_letter", "docx")
          }}
          disabled={!!isExporting}
        >
          <Download className="h-4 w-4" />
          Download All
        </Button>
)}
      </div>
    </>
  )
}
