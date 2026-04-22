import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="bg-foreground text-background border-t border-background/10">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-serif text-lg font-medium tracking-tight text-background/80">
          HireWire
        </p>

        <nav className="flex items-center gap-6 text-xs text-background/40">
          <Link href="/landing" className="hover:text-background/70 transition-colors">Home</Link>
          <a href="mailto:support@hirewire.ai" className="hover:text-background/70 transition-colors">Support</a>
          <Link href="/login" className="hover:text-background/70 transition-colors">Sign in</Link>
        </nav>

        <p className="text-xs text-background/30">
          &copy; {new Date().getFullYear()} HireWire. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
