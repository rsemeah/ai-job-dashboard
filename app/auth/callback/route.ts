import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirect = searchParams.get("redirect") || "/"
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
