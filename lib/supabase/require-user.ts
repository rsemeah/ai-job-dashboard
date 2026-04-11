/**
 * lib/supabase/require-user.ts
 *
 * Central tenant isolation switch for all server-side Supabase access.
 *
 * USAGE (API routes and server components):
 *
 *   import { requireUser } from "@/lib/supabase/require-user"
 *
 *   const { supabase, userId } = await requireUser()
 *   // supabase is an authenticated server client
 *   // userId is the verified auth.uid() — never null after this call
 *
 * If the user is not authenticated, requireUser() returns a NextResponse 401
 * which the caller should return immediately:
 *
 *   const authResult = await requireUser()
 *   if (!authResult.ok) return authResult.response   // NextResponse 401
 *   const { supabase, userId } = authResult
 *
 * WHY THIS EXISTS:
 * Each API route previously duplicated the same 5-line auth check. A single
 * missed check silently exposes data to unauthenticated callers. This utility
 * makes "forgot to check auth" a compile-time-visible omission rather than a
 * silent gap. RLS is the final fallback; this is the application-layer gate.
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── Result types ─────────────────────────────────────────────────────────────

interface AuthSuccess {
  ok: true
  supabase: SupabaseClient
  userId: string
}

interface AuthFailure {
  ok: false
  response: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

// ── Core utility ─────────────────────────────────────────────────────────────

/**
 * Verify the current request is authenticated and return a scoped client.
 *
 * Returns { ok: true, supabase, userId } on success.
 * Returns { ok: false, response } (a 401 NextResponse) on failure —
 * the caller should `return authResult.response` immediately.
 *
 * Uses getUser() (server-side token verification) — never getSession()
 * which can return stale session data.
 */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    }
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
  }
}

/**
 * Verify the current user has an active plan_type of "pro" or "enterprise".
 *
 * Returns { ok: true, supabase, userId, planType } on success.
 * Returns { ok: false, response } (401 or 403 NextResponse) on failure.
 *
 * Use this for routes that are gated to paid plans (interview prep, etc).
 */
export async function requirePaidUser(): Promise<
  | (AuthSuccess & { planType: string })
  | AuthFailure
> {
  const authResult = await requireUser()
  if (!authResult.ok) return authResult

  const { supabase, userId } = authResult

  const { data: userRow } = await supabase
    .from("users")
    .select("plan_type")
    .eq("id", userId)
    .maybeSingle()

  if (!userRow || !["pro", "enterprise"].includes(userRow.plan_type)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "This feature requires a Pro plan.",
          upgrade_required: true,
        },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    supabase,
    userId,
    planType: userRow.plan_type as string,
  }
}
