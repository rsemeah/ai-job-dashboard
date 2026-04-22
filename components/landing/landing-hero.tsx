import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarbedWireLine } from "@/components/barbed-wire"
import { ArrowRight, CheckCircle2 } from "lucide-react"

const TRUST_POINTS = [
  "Score your real fit before applying",
  "AI-tailored resume & cover letter",
  "Red team quality review built in",
]

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Background texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" fill="none">
          {[0, 20, 40, 60, 80, 100].map((x) => (
            <line key={x} x1={x} y1="0" x2={x + 30} y2="100" stroke="#BD0A0A" strokeWidth="0.5" />
          ))}
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-36">
        <div className="max-w-3xl">
          <Badge
            variant="outline"
            className="mb-6 text-xs tracking-widest uppercase border-primary/30 text-primary bg-primary/5"
          >
            Now open to all job seekers
          </Badge>

          <h1 className="font-serif text-5xl md:text-7xl font-medium tracking-tight leading-[1.05] text-balance mb-6">
            Know before<br />
            <span className="text-primary">you apply.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10 text-balance">
            HireWire scores your real fit against every job, generates tailored materials from your actual experience, and red-teams everything before you hit send.
          </p>

          {/* Trust points */}
          <ul className="flex flex-col gap-2 mb-10">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="hw-btn-primary gap-2 text-base px-8" asChild>
              <Link href="/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Free forever. No credit card required.
          </p>
        </div>
      </div>

      {/* Barbed wire bottom border */}
      <BarbedWireLine intensity="medium" />
    </section>
  )
}
