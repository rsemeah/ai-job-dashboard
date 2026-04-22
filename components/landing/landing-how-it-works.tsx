import { BarbedWireLine } from "@/components/barbed-wire"

const STEPS = [
  {
    number: "01",
    title: "Paste the job URL",
    description:
      "Drop in any job posting from LinkedIn, Greenhouse, Lever, or wherever. HireWire extracts the real requirements — not just the buzzwords.",
    tag: "Instant parsing",
  },
  {
    number: "02",
    title: "Get your honest fit score",
    description:
      "We match the role against your evidence library — actual projects, outcomes, and skills you've documented. The score shows exactly why you fit or don't.",
    tag: "Explainable scoring",
  },
  {
    number: "03",
    title: "Generate tailored materials",
    description:
      "Resume and cover letter written from your verified experience, not templates. Every bullet is traceable to something real you did.",
    tag: "Evidence-grounded",
  },
  {
    number: "04",
    title: "Red team review",
    description:
      "Before you see anything, an adversarial AI pass catches fabrications, weak claims, ATS misses, and generic filler. If it fails, it regenerates.",
    tag: "Quality guarantee",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* Section header */}
        <div className="mb-16">
          <p className="text-xs tracking-widest uppercase text-primary font-medium mb-3">
            How it works
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-balance max-w-xl">
            From job posting to ready-to-send, in minutes.
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {STEPS.map((step, idx) => (
            <div
              key={step.number}
              className="group grid md:grid-cols-[120px_1fr_200px] gap-6 items-start py-10 border-t border-border hover:bg-card/60 transition-colors px-2 -mx-2 rounded-sm"
            >
              {/* Step number */}
              <span className="font-mono text-5xl font-bold leading-none select-none transition-colors" style={{ color: "#7B1212" }}>
                {step.number}
              </span>

              {/* Content */}
              <div>
                <h3 className="font-serif text-2xl font-medium mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed max-w-lg">
                  {step.description}
                </p>
              </div>

              {/* Tag */}
              <div className="flex md:justify-end items-start pt-1">
                <span className="inline-block text-xs tracking-wider uppercase border border-border rounded px-2.5 py-1 text-muted-foreground bg-muted/40">
                  {step.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BarbedWireLine intensity="light" />
    </section>
  )
}
