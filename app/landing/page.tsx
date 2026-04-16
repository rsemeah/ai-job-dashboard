import type { Metadata } from "next"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingStats } from "@/components/landing/landing-stats"
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works"
import { LandingWhy } from "@/components/landing/landing-why"
import { LandingPricing } from "@/components/landing/landing-pricing"
import { LandingCta } from "@/components/landing/landing-cta"
import { LandingFooter } from "@/components/landing/landing-footer"

export const metadata: Metadata = {
  title: "HireWire — Know Before You Apply",
  description:
    "HireWire scores your real fit against every job, generates evidence-grounded resumes and cover letters, and red-teams everything before you submit.",
  openGraph: {
    title: "HireWire — Know Before You Apply",
    description:
      "Score your fit. Generate tailored materials. Red-team before you send.",
    type: "website",
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingHowItWorks />
        <LandingWhy />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
