import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObject } from "ai"
import { z } from "zod"
import { groq, MODELS } from "@/lib/adapters/groq"

// Schema for parsed resume data
const ParsedResumeSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  // Links - important for profile building
  linkedin_url: z.string().optional().describe("LinkedIn profile URL if present"),
  github_url: z.string().optional().describe("GitHub profile URL if present"),
  website_url: z.string().optional().describe("Personal website or portfolio URL if present"),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    start_date: z.string(),
    end_date: z.string().optional(),
    description: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    year: z.string().optional(),
  })),
  skills: z.array(z.string()),
  certifications: z.array(z.string()).optional(),
})

// Extract text from PDF using pdf-parse compatible approach
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid issues with pdf-parse in edge runtime
  const pdfParse = (await import("pdf-parse")).default
  const data = await pdfParse(buffer)
  return data.text
}

// Extract text from DOCX
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check with getSession() fallback for deprecated middleware environments
    // (e.g. v0 sandbox, Next.js proxy convention) where getUser() returns null
    let userId: string | undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: "File too large. Maximum size is 10MB."
      }, { status: 400 })
    }

    // Extract text content from the file
    const buffer = Buffer.from(await file.arrayBuffer())
    let rawText: string

    try {
      if (file.type === "application/pdf") {
        rawText = await extractTextFromPDF(buffer)
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword"
      ) {
        rawText = await extractTextFromDOCX(buffer)
      } else {
        // text/plain and other text types
        rawText = await file.text()
      }
    } catch (extractError) {
      console.error("Text extraction error:", extractError)
      return NextResponse.json({
        error: "Failed to extract text from file. Please ensure the file is not corrupted."
      }, { status: 400 })
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json({ 
        error: "Could not extract sufficient text from the file. Please try a different file." 
      }, { status: 400 })
    }

    // Parse the resume using AI
    let parsedData: z.infer<typeof ParsedResumeSchema>
    try {
      const { object } = await generateObject({
        model: groq(MODELS.VERSATILE),
        schema: ParsedResumeSchema,
        prompt: `Parse this resume and extract structured information. Be accurate and thorough - extract ALL work experience entries, skills, and education. If information is not present, use empty arrays or omit optional fields.

RESUME TEXT:
${rawText.slice(0, 15000)}

Extract:
1. Contact info (name, email, phone, location)
2. ALL LINKS - LinkedIn URL, GitHub URL, personal website/portfolio URL (look for URLs containing linkedin.com, github.com, or personal domains)
3. Professional summary if present
4. ALL work experience entries with company names, titles, dates, and bullet points - DO NOT SKIP ANY
5. ALL education entries with degree, school name, and graduation year
6. ALL skills mentioned (technical and soft skills)
7. Any certifications

IMPORTANT:
- Be precise with company names and job titles - copy them exactly as written
- For experience entries, extract the FULL description and ALL bullet points
- Look carefully for LinkedIn, GitHub, and personal website URLs in the header/contact section`,
      })
      parsedData = object
    } catch (parseError) {
      console.error("AI parsing error:", parseError)
      // Store with raw text only if AI parsing fails
      parsedData = {
        experience: [],
        education: [],
        skills: [],
      }
    }

    // Store in database using the actual source_resumes schema
    const { data: resume, error: dbError } = await supabase
      .from("source_resumes")
      .insert({
        user_id: userId,
        filename: file.name,
        content_text: rawText,
        parsed_data: parsedData,
      })
      .select("id")
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save resume" }, { status: 500 })
    }

    // Update profile with parsed data if profile fields are empty
    const { data: profile } = await supabase
      .from("user_profile")
      .select("full_name, location, summary, experience, skills, education, links, email, phone")
      .eq("user_id", userId)
      .single()

    if (profile) {
      const updates: Record<string, unknown> = {}
      
      // Only update if current value is empty/null
      if (!profile.full_name && parsedData.full_name) {
        updates.full_name = parsedData.full_name
      }
      if (!profile.location && parsedData.location) {
        updates.location = parsedData.location
      }
      if (!profile.summary && parsedData.summary) {
        updates.summary = parsedData.summary
      }
      if ((!profile.experience || profile.experience.length === 0) && parsedData.experience.length > 0) {
        updates.experience = parsedData.experience
      }
      if ((!profile.skills || profile.skills.length === 0) && parsedData.skills.length > 0) {
        updates.skills = parsedData.skills
      }
      if ((!profile.education || profile.education.length === 0) && parsedData.education.length > 0) {
        updates.education = parsedData.education
      }
      // Update email and phone if empty
      if (!profile.email && parsedData.email) {
        updates.email = parsedData.email
      }
      if (!profile.phone && parsedData.phone) {
        updates.phone = parsedData.phone
      }
      // Update links (LinkedIn, GitHub, website)
      const currentLinks = (profile.links as Record<string, string>) || {}
      const newLinks = { ...currentLinks }
      if (!currentLinks.linkedin && parsedData.linkedin_url) {
        newLinks.linkedin = parsedData.linkedin_url
      }
      if (!currentLinks.github && parsedData.github_url) {
        newLinks.github = parsedData.github_url
      }
      if (!currentLinks.website && parsedData.website_url) {
        newLinks.website = parsedData.website_url
      }
      if (Object.keys(newLinks).length > Object.keys(currentLinks).length) {
        updates.links = newLinks
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        await supabase
          .from("user_profile")
          .update(updates)
          .eq("user_id", userId)
      }
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        file_name: file.name,
        parsed_data: parsedData,
      },
      message: "Resume uploaded and parsed successfully",
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

// GET - Retrieve user's source resumes
export async function GET() {
  try {
    const supabase = await createClient()

    let userId: string | undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { userId = user.id } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: resumes, error } = await supabase
      .from("source_resumes")
      .select("id, filename, content_text, parsed_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 })
    }

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 })
  }
}

// DELETE - Remove a source resume
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    let userId: string | undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { userId = user.id } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const resumeId = searchParams.get("id")

    if (!resumeId) {
      return NextResponse.json({ error: "Resume ID required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("source_resumes")
      .delete()
      .eq("id", resumeId)
      .eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
