'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { HireWireLogo } from '@/components/hirewire-logo'

export default function HomePage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <HireWireLogo size="sm" variant="dark" />
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('trust')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Why HireWire
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Know before you apply.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            HireWire helps you understand what the role really asks for—and whether your real experience matches. No templates. No guesses. Just clarity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Paste a Job <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-muted/30 border-y border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground mb-12 max-w-2xl">
            Three simple steps to move forward with more clarity.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                1
              </div>
              <h3 className="text-lg font-semibold">Start from the job</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Paste the job description. We read it the way a coach would—looking for what the role truly requires.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                2
              </div>
              <h3 className="text-lg font-semibold">Understand what's asked</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                See what the role expects. No hidden layers. No false signals. Just clarity about the real requirements.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                3
              </div>
              <h3 className="text-lg font-semibold">Build from real experience</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Use what you actually know. Answer from experience, not templates. Move forward with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Differentiation Section */}
      <section id="trust" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why HireWire</h2>
        <p className="text-muted-foreground mb-12 max-w-2xl">
          Built on a different philosophy.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
          {/* Trust Point 1 */}
          <div className="space-y-3">
            <h3 className="font-semibold">Job-first, not template-first</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We start from the job you want, not a generic form. Your answers come from real experience, not filling blanks.
            </p>
          </div>

          {/* Trust Point 2 */}
          <div className="space-y-3">
            <h3 className="font-semibold">Real experience, not guesswork</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We focus on what you actually know and have done. No AI filler. No false confidence. No fabrication.
            </p>
          </div>

          {/* Trust Point 3 */}
          <div className="space-y-3">
            <h3 className="font-semibold">Guided clarity over generic advice</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We help you see what matters for this role. Not every job is the same. Your approach shouldn't be either.
            </p>
          </div>

          {/* Trust Point 4 */}
          <div className="space-y-3">
            <h3 className="font-semibold">Serious and thoughtful</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Job searching is serious work. We approach it that way. No hype. No gimmicks. Just clear thinking.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-muted/30 border-t border-border py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Begin with a real job. See how clarity changes your approach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Paste a Job <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Already have an account? Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <HireWireLogo size="sm" variant="dark" />
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
