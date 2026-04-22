const STATS = [
  { value: "3 min", label: "avg. time to tailored resume" },
  { value: "5 layers", label: "of quality review per document" },
  { value: "100%", label: "grounded in your real experience" },
  { value: "0", label: "fabricated claims, ever" },
]

export function LandingStats() {
  return (
    <section className="border-b border-border bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-serif text-3xl md:text-4xl font-medium text-primary mb-1">
                {value}
              </p>
              <p className="text-xs text-background/60 leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
