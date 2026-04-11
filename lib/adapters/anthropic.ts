import { createAnthropic } from "@ai-sdk/anthropic"

/**
 * Thin Anthropic adapter - centralized configuration.
 * Higher token limits than Groq, better for document generation.
 * 
 * Usage:
 *   import { anthropic, CLAUDE_MODELS } from "@/lib/adapters/anthropic"
 *   const { object } = await generateObject({
 *     model: anthropic(CLAUDE_MODELS.SONNET),
 *     schema: MySchema,
 *     prompt: "...",
 *   })
 */

// Pre-configured Anthropic instance
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Model constants for consistency
export const CLAUDE_MODELS = {
  /** Best balance of quality and speed - primary generation model */
  SONNET: "claude-sonnet-4-20250514",
  /** Highest quality, use for complex reasoning */
  OPUS: "claude-opus-4-20250514",
  /** Fastest, good for simple tasks */
  HAIKU: "claude-3-5-haiku-20241022",
} as const

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS]

/**
 * Check if Anthropic API key is configured.
 * Use this for early validation in routes.
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
