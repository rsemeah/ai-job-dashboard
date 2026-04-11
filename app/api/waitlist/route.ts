import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json()
    
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Check if email already exists
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle()
    
    if (existing) {
      return NextResponse.json(
        { success: true, message: "You're already on the waitlist!" }
      )
    }
    
    // Insert new waitlist entry
    const { error } = await supabase
      .from("waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        source: source || "login_page",
      })
    
    if (error) {
      console.error("Waitlist insert error:", error)
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll be in touch soon.",
    })
  } catch (error) {
    console.error("Waitlist error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
