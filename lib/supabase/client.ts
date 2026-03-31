import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase browser client for client-side operations.
 * Uses default @supabase/ssr configuration which handles:
 * - Session persistence via cookies
 * - Automatic token refresh
 * - Auth state management
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
