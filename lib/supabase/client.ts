import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

/**
 * Creates a Supabase browser client for client-side operations.
 * Uses singleton pattern to prevent multiple client instances.
 * 
 * Configuration:
 * - Session persistence via cookies
 * - Automatic token refresh
 * - Auth state management
 */
export function createClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Polyfill navigator.locks if not available (fixes "this.lock is not a function" error)
  if (typeof window !== 'undefined' && !navigator.locks) {
    // @ts-expect-error - Creating a minimal locks polyfill
    navigator.locks = {
      request: async (_name: string, callback: () => Promise<unknown>) => {
        return callback()
      },
    }
  }
  
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return supabaseClient
}
