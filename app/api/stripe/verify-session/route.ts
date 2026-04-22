import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

/**
 * Verify a Stripe Checkout session and update user's subscription status.
 * Called by the billing success page after redirect from Stripe.
 * 
 * This is a backup fulfillment path — the webhook is the canonical source.
 * If the webhook already processed the session, this is a no-op.
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

    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      )
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })

    // Verify the session belongs to this user
    const sessionUserId = session.metadata?.user_id
    if (sessionUserId !== user.id) {
      return NextResponse.json(
        { error: "Session does not belong to this user" },
        { status: 403 }
      )
    }

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      return NextResponse.json({
        verified: false,
        message: "Payment not completed",
      })
    }

    // Extract subscription details
    const subscription = session.subscription as import("stripe").Stripe.Subscription | null
    const subscriptionId = typeof session.subscription === "string" 
      ? session.subscription 
      : subscription?.id

    const currentPeriodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    // Update user record with Pro status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        plan_type: "pro",
        subscription_status: "active",
        stripe_subscription_id: subscriptionId,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Failed to update user plan:", updateError)
      return NextResponse.json(
        { error: "Failed to update subscription status" },
        { status: 500 }
      )
    }

    // Also upsert to subscriptions table for history
    await supabase
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan_type: "pro",
        status: "active",
        stripe_subscription_id: subscriptionId,
        current_period_end: currentPeriodEnd,
      }, {
        onConflict: "user_id",
      })

    return NextResponse.json({
      verified: true,
      plan: "pro",
      message: "Subscription activated successfully",
    })

  } catch (error) {
    console.error("Verify session error:", error)
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    )
  }
}
