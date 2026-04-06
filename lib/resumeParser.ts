/**
 * resumeParser
 *
 * Extracts structured data from raw resume text using Groq.
 * Returns a ParsedResume that mapResumeToEvidence can consume.
 *
 * Kept as a separate helper so the upload route stays thin
 * and this logic can be reused by future parse endpoints.
 */

import { createGroq } from "@ai-sdk/groq"
import { generateObject } from "ai"
import { z } from "zod"
import type { ParsedResume } from "./mapResumeToEvidence"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

// ── Zod schemas for structured extraction ─────────────────────────────────

const WorkExperienceSchema = z.object({
  role: z.string().describe("Job title / role name"),
  company: z.string().describe("Employer name"),
  date_range: z.string().optional().describe("e.g. Jan 2020 – Mar 2023"),
  location: z.string().optional(),
  responsibilities: z.array(z.string()).optional().describe("Key responsibilities or bullet points"),
  tools_used: z.array(z.string()).optional().describe("Technologies, tools, frameworks mentioned"),
  outcomes: z.array(z.string()).optional().describe("Measurable results or achievements"),
})

const EducationSchema = z.object({
  degree: z.string().describe("Degree name e.g. BSc Computer Science"),
  school: z.string().describe("Institution name"),
  field: z.string().optional().describe("Field of study if separate from degree name"),
  date_range: z.string().optional().describe("e.g. 2015 – 2019"),
  honors: z.string().optional().describe("Honors, GPA, distinctions"),
})

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
})

const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  outcomes: z.array(z.string()).optional(),
  url: z.string().optional(),
})

const ParsedResumeSchema = z.object({
  work_experience: z.array(WorkExperienceSchema).describe("All work history entries"),
  education: z.array(EducationSchema).describe("All education entries"),
  skills: z.array(z.string()).describe("Soft and hard skills listed in skills section"),
  tools: z.array(z.string()).describe("Technical tools, languages, frameworks, platforms"),
  domains: z.array(z.string()).describe("Industry domains, subject areas"),
  certifications: z.array(CertificationSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
})

/**
 * Parse raw resume text into a structured ParsedResume object.
 * Throws if Groq is not configured or extraction fails.
 */
export async function parseResumeText(resumeText: string): Promise<ParsedResume> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured")
  }

  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: ParsedResumeSchema,
    prompt: `Extract all structured information from the following resume text.
Be thorough and accurate. Do not invent information not present in the text.
Return empty arrays for sections that are not present.

RESUME TEXT:
${resumeText}`,
  })

  return object as ParsedResume
}
