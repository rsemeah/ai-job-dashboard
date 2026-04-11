/**
 * Anthropic/Claude adapter for AI SDK 6
 * 
 * Uses Vercel AI Gateway - just pass model strings directly.
 * Higher token limits than Groq, better for document generation.
 * 
 * Usage:
 *   import { CLAUDE_MODELS } from "@/lib/adapters/anthropic"
 *   const result = await generateText({
 *     model: CLAUDE_MODELS.SONNET,
 *     output: Output.object({ schema: MySchema }),
 *     prompt: "...",
 *   })
 */

// Model constants - AI Gateway format (provider/model)
// AI Gateway supports Anthropic zero-config
export const CLAUDE_MODELS = {
  /** Best balance of quality and speed - primary generation model */
  SONNET: "anthropic/claude-sonnet-4-20250514",
  /** Highest quality, use for complex reasoning */
  OPUS: "anthropic/claude-opus-4-20250514",
  /** Fastest, good for simple tasks */
  HAIKU: "anthropic/claude-3-5-haiku-20241022",
} as const

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS]

/**
 * Check if Anthropic is available.
 * With AI Gateway, Anthropic is available zero-config.
 */
export function isAnthropicConfigured(): boolean {
  // AI Gateway handles Anthropic zero-config
  return true
}
