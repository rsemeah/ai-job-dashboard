import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

// Run polyfill immediately on module load (before any createClient calls)
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
  try {
    // Test if navigator.locks.request works properly
    if (!navigator.locks || typeof navigator.locks.request !== 'function') {
      throw new Error('navigator.locks not available')
    }
  } catch {
    // Create a minimal polyfill that just executes the callback
    Object.defineProperty(navigator, 'locks', {
      value: {
        request: async <T>(_name: string, callback: () => Promise<T>): Promise<T> => {
          return callback()
        },
      },
      writable: true,
      configurable: true,
    })
  }
}

/**
 * Creates a Supabase browser client for client-side operations.
 * Uses singleton pattern to prevent multiple client instances.
 */
export function createClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }
  
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return supabaseClient
}
