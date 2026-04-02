import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe, HIREWIRE_PRO_PRICE_ID } from "@/lib/stripe"

/**
 * Create a Stripe Checkout session for Pro upgrade
 * Uses Stripe-hosted checkout with subscription mode
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse request
    const { plan } = await request.json()
    
    if (plan !== "pro") {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      )
    }

    // Get or create user record to check for existing Stripe customer
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single()

    let customerId = userData?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || userData?.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
    }

    // Get base URL for redirect
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: HIREWIRE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "pro",
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error("Checkout error:", error)
    
    // Check for specific Stripe errors
    if (error instanceof Error) {
      if (error.message.includes("No such price")) {
        return NextResponse.json(
          { error: "Invalid price configuration. Please contact support." },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
