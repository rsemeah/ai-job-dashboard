/**
 * HireWire Environment Configuration
 * 
 * This module validates required environment variables at startup
 * and provides typed access to configuration values.
 */

// Required environment variables
const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
] as const

type RequiredEnv = (typeof REQUIRED_ENV)[number]

export interface EnvConfig {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  
  // AI
  GROQ_API_KEY: string
  
  // Computed
  isGroqConfigured: boolean
}

/**
 * Validates environment variables and returns typed config
 */
export function validateEnv(): EnvConfig {
  const missing: string[] = []
  
  // Check required vars
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\n` +
      `Please add these to your .env.local file or Vercel environment variables.`
    )
  }
  
  const config: EnvConfig = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    GROQ_API_KEY: process.env.GROQ_API_KEY!,
    isGroqConfigured: Boolean(process.env.GROQ_API_KEY),
  }
  
  return config
}

/**
 * Get environment config (cached)
 */
let cachedConfig: EnvConfig | null = null

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv()
  }
  return cachedConfig
}
/**
 * Check if Groq AI is configured
 */
export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY)
}
