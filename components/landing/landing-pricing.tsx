import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"
import { BarbedWireLine } from "@/components/barbed-wire"

const FREE_FEATURES = [
  "5 jobs per month",
  "5 document generations",
  "Unlimited evidence library",
  "Job analysis & scoring",
  "Dashboard & pipeline tracking",
]

const PRO_FEATURES = [
  "Unlimited jobs",
  "Unlimited document generations",
  "Interview prep & coaching",
  "AI career coach",
  "Advanced analytics",
  "Priority support",
]

export function LandingPricing() {
  return (
    <section id="pricing" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* Section header */}
        <div className="mb-16 text-center">
          <p className="text-xs tracking-widest uppercase text-primary font-medium mb-3">
            Pricing
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-balance mb-4">
            Start free. Upgrade when ready.
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            No trial periods, no limits on what you can build in your evidence library. Core features are free forever.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free tier */}
          <div className="rounded-xl border border-border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-3">
                Free
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-serif text-5xl font-medium">$0</span>
                <span className="text-muted-foreground text-sm">/ forever</span>
              </div>
              <p className="text-sm text-muted-foreground">Get started with the essentials</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>

          {/* Pro tier */}
          <div className="rounded-xl border-2 border-primary bg-card p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full tracking-wide">
                Most popular
              </span>
            </div>

            <div className="mb-6">
              <p className="text-xs tracking-widest uppercase text-primary font-medium mb-3">
                Pro
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-serif text-5xl font-medium">$35</span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground">For serious job seekers</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="text-xs uppercase tracking-wider">Everything in Free, plus:</span>
              </li>
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button className="w-full hw-btn-primary gap-2" asChild>
              <Link href="/signup">
                Start with Pro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Cancel anytime. No lock-in, no hidden fees.
        </p>
      </div>

      <BarbedWireLine intensity="light" />
    </section>
  )
}
