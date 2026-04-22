"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HireWireLogo } from "@/components/hirewire-logo"

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/landing" className="w-32 shrink-0">
          <HireWireLogo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#why-hirewire" className="hover:text-foreground transition-colors">Why HireWire</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" className="hw-btn-primary" asChild>
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
