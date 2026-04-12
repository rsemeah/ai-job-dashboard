import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  parseCoverLetterToStructured,
  ParagraphProvenanceEntry,
} from "@/lib/document-types"
import {
  exportCoverLetterToDocx,
  exportCoverLetterToHtml,
} from "@/lib/export"
import { 
  generateDocumentFilename,
} from "@/lib/filename-utils"
import type { ResumeTemplateType } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id, format = "docx", template_type = "technical_resume" } = body

    if (!job_id) {
      return NextResponse.json(
        { success: false, error: "job_id is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Load job with generated cover letter
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      )
    }

    if (!job.generated_cover_letter) {
      return NextResponse.json(
        { success: false, error: "No cover letter generated for this job. Please generate materials first." },
        { status: 400 }
      )
    }

    // Load user profile
    const { data: profile } = await supabase
      .from("user_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    const senderName = profile?.full_name || "Candidate"
    const senderPhone = profile?.phone || undefined
    const senderEmail = profile?.email || undefined

    // Build provenance from stored data or empty
    const provenance: ParagraphProvenanceEntry[] = job.cover_letter_provenance || []

    // Parse plain text to structured format
    const structuredCoverLetter = parseCoverLetterToStructured(
      job.generated_cover_letter,
      job.company,
      job_id,
      template_type as ResumeTemplateType,
      provenance
    )

    // Export based on format
    if (format === "docx") {
      const result = await exportCoverLetterToDocx(structuredCoverLetter, senderName, senderPhone, senderEmail)
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      const filename = generateDocumentFilename({
        candidateName: senderName,
        role: job.title,
        company: job.company,
        documentType: "cover_letter",
        extension: "docx",
      })

      return new NextResponse(result.data as Buffer, {
        headers: {
          "Content-Type": result.mimeType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    if (format === "html") {
      const html = exportCoverLetterToHtml(structuredCoverLetter, senderName, "ats", senderPhone, senderEmail)
      
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    }

    if (format === "txt") {
      const txtFilename = generateDocumentFilename({
        candidateName: senderName,
        role: job.title,
        company: job.company,
        documentType: "cover_letter",
        extension: "txt",
      })
      
      return new NextResponse(job.generated_cover_letter, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${txtFilename}"`,
        },
      })
    }

    if (format === "json") {
      return NextResponse.json({
        success: true,
        coverLetter: structuredCoverLetter,
      })
    }

    return NextResponse.json(
      { success: false, error: `Unsupported format: ${format}` },
      { status: 400 }
    )

  } catch (error) {
    console.error("Export cover letter error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    )
  }
}
