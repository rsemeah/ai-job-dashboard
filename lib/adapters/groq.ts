import { createGroq } from "@ai-sdk/groq"

/**
 * Thin Groq adapter - centralized configuration.
 * Does NOT wrap generateText/generateObject - use AI SDK directly.
 * 
 * Usage:
 *   import { groq, MODELS } from "@/lib/adapters/groq"
 *   const { object } = await generateObject({
 *     model: groq(MODELS.VERSATILE),
 *     schema: MySchema,
 *     prompt: "...",
 *   })
 */

// Pre-configured Groq instance
export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Model constants for consistency
export const MODELS = {
  /** Best for complex reasoning, structured extraction */
  VERSATILE: "llama-3.3-70b-versatile",
  /** Faster, good for simpler tasks */
  FAST: "llama-3.1-8b-instant",
  /** Mixed use, balanced */
  SPECDEC: "llama-3.3-70b-specdec",
} as const

export type GroqModel = (typeof MODELS)[keyof typeof MODELS]

/**
 * Check if Groq API key is configured.
 * Use this for early validation in routes.
 */
export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY
}
