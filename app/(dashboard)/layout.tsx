import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HireWireLogo } from '@/components/hirewire-logo'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/jobs" aria-label="HireWire home">
              <HireWireLogo size="sm" variant="dark" />
            </a>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/jobs" className="hover:text-foreground transition-colors">
                Jobs
              </a>
              <a href="/profile" className="hover:text-foreground transition-colors">
                Profile
              </a>
              <a href="/billing" className="hover:text-foreground transition-colors">
                Billing
              </a>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} HireWire</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
