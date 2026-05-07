import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">HireWire</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</a>
              <a href="/jobs" className="hover:text-foreground transition-colors">Jobs</a>
              <a href="/evidence" className="hover:text-foreground transition-colors">Evidence</a>
              <a href="/profile" className="hover:text-foreground transition-colors">Profile</a>
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
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
