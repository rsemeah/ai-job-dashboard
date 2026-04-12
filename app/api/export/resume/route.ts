import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  parseResumeToStructured,
  BulletProvenanceEntry,
} from "@/lib/document-types"
import {
  exportResumeToDocx,
  exportResumeToHtml,
} from "@/lib/export"
import { 
  generateDocumentFilename,
  type ExportExtension,
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

    // Load job with generated resume
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      )
    }

    if (!job.generated_resume) {
      return NextResponse.json(
        { success: false, error: "No resume generated for this job. Please generate materials first." },
        { status: 400 }
      )
    }

    // Load user profile and canonical links in parallel
    const [{ data: profile }, { data: profileLinks }] = await Promise.all([
      supabase.from("user_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_profile_links").select("link_type,url,is_primary").eq("user_id", user.id).order("is_primary", { ascending: false }),
    ])

    // Resolve primary link per type (profile_links canonical; fall back to user_profile flat fields)
    const links = profileLinks || []
    const primaryByType = (type: string) => links.find(l => l.link_type === type && l.is_primary)?.url || links.find(l => l.link_type === type)?.url
    const linkedinUrl = primaryByType("linkedin") || profile?.linkedin_url || undefined
    const githubUrl = primaryByType("github") || profile?.github_url || undefined
    const portfolioUrl = primaryByType("portfolio") || primaryByType("website") || profile?.website_url || undefined

    // Build provenance from stored data or empty
    const provenance: BulletProvenanceEntry[] = job.resume_provenance || []

    // Parse plain text to structured format
    const structuredResume = parseResumeToStructured(
      job.generated_resume,
      {
        full_name: profile?.full_name,
        email: profile?.email,
        phone: profile?.phone,
        location: profile?.location,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        education: profile?.education,
        skills: profile?.skills,
      },
      job_id,
      template_type as ResumeTemplateType,
      provenance
    )

    // Export based on format
    if (format === "docx") {
      const result = await exportResumeToDocx(structuredResume)
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      const filename = generateDocumentFilename({
        candidateName: profile?.full_name || "Candidate",
        role: job.title,
        company: job.company,
        documentType: "resume",
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
      const html = exportResumeToHtml(structuredResume)
      
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
        },
      })
    }

    if (format === "txt") {
      const txtFilename = generateDocumentFilename({
        candidateName: profile?.full_name || "Candidate",
        role: job.title,
        company: job.company,
        documentType: "resume",
        extension: "txt",
      })
      
      return new NextResponse(job.generated_resume, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${txtFilename}"`,
        },
      })
    }

    if (format === "json") {
      return NextResponse.json({
        success: true,
        resume: structuredResume,
      })
    }

    return NextResponse.json(
      { success: false, error: `Unsupported format: ${format}` },
      { status: 400 }
    )

  } catch (error) {
    console.error("Export resume error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    )
  }
}
