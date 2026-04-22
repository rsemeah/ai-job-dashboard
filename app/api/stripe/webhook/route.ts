import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Use service role client for webhook — no user session available
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Stripe webhook handler — canonical fulfillment path.
 * 
 * Handles:
 * - checkout.session.completed: Initial subscription activation
 * - customer.subscription.updated: Plan changes, renewals
 * - customer.subscription.deleted: Cancellations
 * - invoice.payment_failed: Failed renewal payments
 */
export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle successful checkout — activate Pro subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  if (!userId) {
    console.error("No user_id in checkout session metadata")
    return
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id

  // Fetch subscription details for period end
  let currentPeriodEnd: string | null = null
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
  }

  // Update users table
  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({
      plan_type: "pro",
      subscription_status: "active",
      stripe_subscription_id: subscriptionId,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (userError) {
    console.error("Failed to update user:", userError)
    throw userError
  }

  // Upsert to subscriptions table
  await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_type: "pro",
      status: "active",
      stripe_subscription_id: subscriptionId,
      current_period_end: currentPeriodEnd,
    }, {
      onConflict: "user_id",
    })

  console.log(`Activated Pro for user ${userId}`)
}

/**
 * Handle subscription updates — renewals, plan changes
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id
  if (!userId) {
    // Try to find user by stripe_subscription_id
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .single()

    if (!user) {
      console.error("Could not find user for subscription:", subscription.id)
      return
    }

    await updateUserSubscription(user.id, subscription)
    return
  }

  await updateUserSubscription(userId, subscription)
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription) {
  const status = subscription.status === "active" || subscription.status === "trialing"
    ? "active"
    : subscription.status

  const planType = status === "active" ? "pro" : "free"
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  await supabaseAdmin
    .from("users")
    .update({
      plan_type: planType,
      subscription_status: status,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_type: planType,
      status: status,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd,
    }, {
      onConflict: "user_id",
    })

  console.log(`Updated subscription for user ${userId}: ${status}`)
}

/**
 * Handle subscription cancellation — downgrade to free
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id

  // Find user by subscription ID if no metadata
  let targetUserId = userId
  if (!targetUserId) {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .single()

    if (user) {
      targetUserId = user.id
    }
  }

  if (!targetUserId) {
    console.error("Could not find user for deleted subscription:", subscription.id)
    return
  }

  await supabaseAdmin
    .from("users")
    .update({
      plan_type: "free",
      subscription_status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId)

  await supabaseAdmin
    .from("subscriptions")
    .update({
      plan_type: "free",
      status: "canceled",
    })
    .eq("user_id", targetUserId)

  console.log(`Canceled subscription for user ${targetUserId}`)
}

/**
 * Handle failed payment — mark as past_due
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id

  if (!subscriptionId) return

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .single()

  if (!user) return

  await supabaseAdmin
    .from("users")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  console.log(`Marked subscription past_due for user ${user.id}`)
}
