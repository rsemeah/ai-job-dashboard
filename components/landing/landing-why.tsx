import { Target, Shield, BarChart3, BookOpen, Bot, Layers } from "lucide-react"

const FEATURES = [
  {
    icon: Target,
    title: "Truthful fit scoring",
    description:
      "Every score is calculated from evidence you've actually logged — not keyword overlap. You see exactly which strengths move the needle and which gaps you need to address.",
  },
  {
    icon: BookOpen,
    title: "Evidence library",
    description:
      "Build a permanent, searchable record of your real experience: projects, outcomes, achievements. Every generated document draws from this — nothing is invented.",
  },
  {
    icon: Shield,
    title: "Red team quality review",
    description:
      "An adversarial AI pass runs before you see any output. It checks for fabricated claims, vague bullets, ATS issues, and AI filler. Fail means regenerate.",
  },
  {
    icon: BarChart3,
    title: "Explainable scores",
    description:
      "Not just a number. You get a full breakdown: experience relevance, skills match, seniority alignment, ATS keyword coverage — and exactly what to do about each.",
  },
  {
    icon: Bot,
    title: "AI career coach",
    description:
      "A context-aware assistant that knows your evidence, your active jobs, and your application history. Ask it anything about your search.",
  },
  {
    icon: Layers,
    title: "Full pipeline tracking",
    description:
      "Track every application from research to offer. Know your apply rate, interview conversion, and where applications go quiet.",
  },
]

export function LandingWhy() {
  return (
    <section id="why-hirewire" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* Section header */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-xs tracking-widest uppercase text-primary font-medium mb-3">
              Why HireWire
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-balance max-w-lg">
              Built for people who take their search seriously.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xs leading-relaxed text-sm">
            Most tools help you apply faster. HireWire helps you apply smarter — with materials that actually reflect your real capability.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-background p-8 hover:bg-card transition-colors group"
            >
              <div className="mb-4 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary/8 border border-primary/12 text-primary group-hover:bg-primary/12 transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-medium mb-2 tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
