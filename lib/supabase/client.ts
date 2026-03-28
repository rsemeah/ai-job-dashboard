import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

// Singleton pattern to prevent multiple client instances causing lock contention
let supabaseClient: SupabaseClient | null = null

export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }
  
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Disable lock to prevent "Lock was released" errors
        // This is safe for browser clients
        lock: {
          enabled: false,
        },
      },
    }
  )
  
  return supabaseClient
}
