import { createBrowserClient } from '@supabase/ssr'

// Create a fresh client each time to avoid stale singleton issues
// The @supabase/ssr package handles session persistence automatically
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
