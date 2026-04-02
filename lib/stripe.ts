import "server-only"

import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
  typescript: true,
})

// HireWire Pro subscription price ID
export const HIREWIRE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "price_1THcItD8NguWaPm7NyeP7qid"
