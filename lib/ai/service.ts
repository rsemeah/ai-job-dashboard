/**
 * HireWire AI Service
 * Centralized AI configuration, error handling, and logging
 * 
 * Usage:
 * import { aiService, models } from "@/lib/ai/service"
 * const result = await aiService.generateText({ model: models.standard, ... })
 */

import { createGroq } from "@ai-sdk/groq"
import { generateText, streamText, generateObject } from "ai"
import type { z } from "zod"

// ============================================================================
// CONFIGURATION
// ============================================================================

// Groq client singleton
let groqClient: ReturnType<typeof createGroq> | null = null

function getGroqClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set")
    }
    groqClient = createGroq({ apiKey })
  }
  return groqClient
}

// Model configurations
export const models = {
  // Fast model for classification, simple tasks, quality checks
  fast: "llama-3.1-8b-instant",
  // Standard model for generation tasks
  standard: "llama-3.3-70b-versatile",
  // Alias for backward compatibility
  default: "llama-3.3-70b-versatile",
} as const

export type ModelType = keyof typeof models

// ============================================================================
// AI SERVICE
// ============================================================================

interface GenerateOptions<T extends z.ZodType> {
  model?: ModelType | string
  prompt?: string
  system?: string
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>
  schema?: T
  maxTokens?: number
  temperature?: number
}

interface GenerateResult<T> {
  output: T | null
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: string
}

/**
 * Generate text or structured output using Groq
 */
async function generate<T extends z.ZodType>(
  options: GenerateOptions<T>
): Promise<GenerateResult<z.infer<T>>> {
  const groq = getGroqClient()
  const modelName = typeof options.model === "string" && options.model in models
    ? models[options.model as ModelType]
    : options.model || models.standard

  const startTime = Date.now()
  
  try {
    // Use generateObject if schema is provided, otherwise generateText
    if (options.schema) {
      const result = await generateObject({
        model: groq(modelName),
        prompt: options.prompt,
        system: options.system,
        messages: options.messages,
        schema: options.schema,
      })

      const duration = Date.now() - startTime
      console.log(`[AI Service] Model: ${modelName}, Duration: ${duration}ms, Tokens: ${result.usage?.totalTokens || 0}`)

      return {
        output: result.object as z.infer<T>,
        text: JSON.stringify(result.object),
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
        },
        finishReason: result.finishReason || "unknown",
      }
    }

    const result = await generateText({
      model: groq(modelName),
      prompt: options.prompt,
      system: options.system,
      messages: options.messages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    })

    const duration = Date.now() - startTime
    console.log(`[AI Service] Model: ${modelName}, Duration: ${duration}ms, Tokens: ${result.usage?.totalTokens || 0}`)

    return {
      output: null,
      text: result.text,
      usage: {
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      },
      finishReason: result.finishReason || "unknown",
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[AI Service] Error after ${duration}ms:`, error)
    throw error
  }
}

/**
 * Stream text response using Groq
 */
function stream(options: Omit<GenerateOptions<never>, "schema">) {
  const groq = getGroqClient()
  const modelName = typeof options.model === "string" && options.model in models
    ? models[options.model as ModelType]
    : options.model || models.standard

  return streamText({
    model: groq(modelName),
    prompt: options.prompt,
    system: options.system,
    messages: options.messages,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  })
}

/**
 * Check if AI service is properly configured
 */
function isConfigured(): boolean {
  return !!process.env.GROQ_API_KEY
}

/**
 * Get the Groq client for advanced use cases (e.g., agents)
 */
function getClient() {
  return getGroqClient()
}

// ============================================================================
// EXPORTS
// ============================================================================

export const aiService = {
  generate,
  stream,
  isConfigured,
  getClient,
  models,
}

// Re-export commonly used items
export type { z as ZodType } from "zod"
