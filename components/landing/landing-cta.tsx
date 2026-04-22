import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarbedWireLine } from "@/components/barbed-wire"
import { ArrowRight } from "lucide-react"

export function LandingCta() {
  return (
    <section className="relative overflow-hidden">
      <BarbedWireLine intensity="medium" />

      {/* Dark background block */}
      <div className="bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 text-center">
          <p className="text-xs tracking-widest uppercase text-primary font-medium mb-6">
            Ready to stop guessing?
          </p>

          <h2 className="font-serif text-5xl md:text-6xl font-medium tracking-tight text-balance max-w-2xl mx-auto mb-6 leading-[1.05]">
            Apply with evidence.<br />
            Not optimism.
          </h2>

          <p className="text-background/60 max-w-md mx-auto mb-10 leading-relaxed">
            Join job seekers who stopped spray-and-praying and started applying with real insight into their fit.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="hw-btn-primary gap-2 text-base px-10"
              asChild
            >
              <Link href="/signup">
                Start free today
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-background/20 text-background hover:bg-background/10 hover:text-background"
              asChild
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          <p className="text-xs text-background/40 mt-6">
            Free plan available. No credit card required.
          </p>
        </div>
      </div>
    </section>
  )
}
