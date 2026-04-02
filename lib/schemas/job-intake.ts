import { z } from "zod"

/**
 * Input validation schemas for job intake endpoints.
 * These validate request bodies at API boundaries.
 * LLM response schemas remain inline in route handlers.
 */

// POST /api/analyze request body
export const AnalyzeJobInputSchema = z.object({
  job_url: z
    .string()
    .url("Invalid URL format")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url)
          return ["http:", "https:"].includes(parsed.protocol)
        } catch {
          return false
        }
      },
      { message: "URL must use http or https" }
    ),
})

export type AnalyzeJobInput = z.infer<typeof AnalyzeJobInputSchema>

// POST /api/generate-documents request body
export const GenerateDocumentsInputSchema = z.object({
  job_id: z.string().uuid("Invalid job ID format"),
  force_regenerate: z.boolean().optional().default(false),
})

export type GenerateDocumentsInput = z.infer<typeof GenerateDocumentsInputSchema>

// POST /api/generate-interview-prep request body
export const GenerateInterviewPrepInputSchema = z.object({
  job_id: z.string().uuid("Invalid job ID format"),
})

export type GenerateInterviewPrepInput = z.infer<typeof GenerateInterviewPrepInputSchema>

// Shared job source enum
export const JobSourceSchema = z.enum([
  "GREENHOUSE",
  "LEVER",
  "LINKEDIN",
  "INDEED",
  "WORKDAY",
  "ASHBY",
  "ICIMS",
  "SMARTRECRUITERS",
  "OTHER",
])

export type JobSource = z.infer<typeof JobSourceSchema>
