import { NextRequest, NextResponse } from "next/server"
import { generateText, generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { quickRiskCheck, sanitizeInput } from "@/lib/safety"

export const maxDuration = 60

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Schema for parsed resume data
const ResumeSchema = z.object({
  // Personal info
  name: z.string().nullable().describe("Full name"),
  email: z.string().nullable().describe("Email address"),
  phone: z.string().nullable().describe("Phone number"),
  location: z.string().nullable().describe("City, State or location"),
  linkedin: z.string().nullable().describe("LinkedIn URL if present"),
  
  // Professional summary
  headline: z.string().nullable().describe("Professional headline or title"),
  summary: z.string().nullable().describe("Professional summary or objective"),
  
  // Experience
  experience: z.array(z.object({
    company: z.string().describe("Company name"),
    title: z.string().describe("Job title"),
    location: z.string().nullable().describe("Job location"),
    startDate: z.string().nullable().describe("Start date"),
    endDate: z.string().nullable().describe("End date or 'Present'"),
    description: z.string().nullable().describe("Job description"),
    bullets: z.array(z.string()).describe("Achievement bullet points"),
  })).describe("Work experience entries"),
  
  // Education
  education: z.array(z.object({
    institution: z.string().describe("School or university name"),
    degree: z.string().nullable().describe("Degree type (BS, MS, MBA, etc.)"),
    field: z.string().nullable().describe("Field of study"),
    graduationDate: z.string().nullable().describe("Graduation date or expected"),
    gpa: z.string().nullable().describe("GPA if listed"),
  })).describe("Education entries"),
  
  // Skills
  skills: z.array(z.string()).describe("List of skills"),
  
  // Certifications
  certifications: z.array(z.object({
    name: z.string().describe("Certification name"),
    issuer: z.string().nullable().describe("Issuing organization"),
    date: z.string().nullable().describe("Date obtained"),
  })).describe("Certifications"),
  
  // Extracted evidence - key achievements with metrics
  extractedEvidence: z.array(z.object({
    title: z.string().describe("Brief title for the achievement"),
    description: z.string().describe("Full description with context"),
    category: z.enum(["achievement", "project", "metric", "skill", "certification"]),
    metrics: z.string().nullable().describe("Quantifiable results"),
    tags: z.array(z.string()).describe("Relevant keywords/tags"),
  })).describe("Key achievements and evidence extracted from the resume"),
})

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for GROQ API key
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Get the resume text from the request
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const text = formData.get("text") as string | null

    let resumeText = text

    // Safety check: scan for injection attempts in text content
    if (text) {
      const riskCheck = quickRiskCheck(text)
      if (riskCheck.isHighRisk) {
        return NextResponse.json(
          { error: "Content contains disallowed patterns" },
          { status: 400 }
        )
      }
      // Sanitize input to remove potential injection vectors
      resumeText = sanitizeInput(text)
    }

    // If a file was uploaded, extract text from it
    if (file) {
      const fileType = file.type
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (fileType === "text/plain") {
        // Plain text file
        resumeText = buffer.toString("utf-8")
      } else if (fileType === "application/pdf") {
        // For PDF, we'll send the raw text representation
        // In production, you'd use a proper PDF parser like pdf-parse
        // For now, we'll try to extract what we can
        resumeText = buffer.toString("utf-8")
        // Try to clean up any binary garbage
        resumeText = resumeText.replace(/[^\x20-\x7E\n\r\t]/g, " ")
      } else if (fileType.includes("word") || fileType.includes("document")) {
        // For DOCX, extract text content
        // In production, use mammoth or similar library
        resumeText = buffer.toString("utf-8")
        resumeText = resumeText.replace(/[^\x20-\x7E\n\r\t]/g, " ")
      } else {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload PDF, DOCX, or TXT." },
          { status: 400 }
        )
      }
      
      // Safety check: scan file content for injection attempts
      const fileRiskCheck = quickRiskCheck(resumeText || "")
      if (fileRiskCheck.isHighRisk) {
        return NextResponse.json(
          { error: "File contains disallowed content patterns" },
          { status: 400 }
        )
      }
      resumeText = sanitizeInput(resumeText || "")
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short or empty. Please paste your resume content." },
        { status: 400 }
      )
    }

    // Parse resume with AI
    const { object: parsedResume } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: ResumeSchema,
      prompt: `You are an expert resume parser. Extract structured information from the following resume text.

IMPORTANT:
- Extract all information you can find
- For experience bullets, focus on achievements with metrics when possible
- For extractedEvidence, identify 3-5 of the strongest achievements that would be valuable for job applications
- Use null for any fields you cannot determine
- Clean up formatting and standardize dates

Resume text:
${resumeText}

Parse this resume and return structured data.`,
    })

    // Return the parsed resume
    return NextResponse.json({
      success: true,
      data: parsedResume,
    })

  } catch (error) {
    console.error("[Parse Resume Error]", error)
    return NextResponse.json(
      { error: "Failed to parse resume. Please try again." },
      { status: 500 }
    )
  }
}
