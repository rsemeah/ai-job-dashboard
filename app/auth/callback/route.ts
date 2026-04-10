import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// SECURITY: Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PREFIXES = [
  "/",           // Root and all app paths
  "/jobs",
  "/evidence",
  "/profile",
  "/settings",
  "/onboarding",
  "/dashboard",
]

function isValidRedirect(path: string): boolean {
  // Must be a relative path (no protocol, no //)
  if (!path.startsWith("/") || path.startsWith("//")) return false
  // Must not contain protocol-like patterns
  if (path.includes(":") || path.includes("\\")) return false
  // Must start with an allowed prefix
  return ALLOWED_REDIRECT_PREFIXES.some(prefix => 
    path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?")
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawRedirect = searchParams.get("redirect") || "/"
  // SECURITY: Validate redirect to prevent open redirect attacks
  const redirect = isValidRedirect(rawRedirect) ? rawRedirect : "/"
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Handle auth errors
  if (error) {
    console.error("Auth callback error:", error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error("Code exchange error:", exchangeError)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    // Check if user has completed onboarding
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check if user profile exists and onboarding is complete
      const { data: profile } = await supabase
        .from("user_profile")
        .select("id, full_name, onboarding_complete")
        .eq("user_id", user.id)
        .single()
      
      // If no profile or onboarding not complete, redirect to onboarding
      if (!profile || !profile.onboarding_complete) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }

    // Successful auth - redirect to intended destination
    return NextResponse.redirect(`${origin}${redirect}`)
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
