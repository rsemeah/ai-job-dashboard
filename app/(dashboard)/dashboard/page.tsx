import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getProfileLinks } from '@/lib/actions/profile-links'
import { ProfileLinksWidget } from '@/components/profile-links-widget'
import { LinkedInImportWidget } from '@/components/dashboard/LinkedInImportWidget'
import { humanizeJobStatus } from '@/lib/humanizer'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check onboarding status — onboarding_complete lives on user_profile
  const { data: profile } = await supabase
    .from('user_profile')
    .select('full_name, onboarding_complete')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile && profile.onboarding_complete === false) {
    redirect('/onboarding')
  }

  // Load recent jobs for the job list
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, role_title, company_name, status, generated_resume, generation_timestamp, created_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const { links: profileLinks } = await getProfileLinks()

  const jobList = jobs ?? []
  const generatedCount = jobList.filter(j => j.generated_resume).length
  const appliedCount = jobList.filter(j => j.status === 'applied').length

  const displayName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s where your job search stands.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total jobs tracked</p>
          <p className="text-3xl font-semibold mt-1">{jobList.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Documents generated</p>
          <p className="text-3xl font-semibold mt-1">{generatedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Applications sent</p>
          <p className="text-3xl font-semibold mt-1">{appliedCount}</p>
        </div>
      </div>

      <ProfileLinksWidget initialLinks={profileLinks} />

      <LinkedInImportWidget />

      {jobList.length > 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-medium">Your jobs</h2>
            <a href="/jobs" className="text-sm text-primary hover:underline">
              Add job →
            </a>
          </div>
          <ul className="divide-y divide-border">
            {jobList.map(job => {
              const hasDocs = !!job.generated_resume
              const statusDisplay = humanizeJobStatus(job.status)
              const statusLabel = statusDisplay.label
              const statusColor = statusDisplay.color

              return (
                <li key={job.id} className="flex items-center justify-between px-6 py-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {job.role_title ?? 'Untitled role'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {job.company_name ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                    {hasDocs && (
                      <Link
                        href={`/jobs/${job.id}/documents`}
                        className="inline-flex items-center rounded bg-black px-3 py-1 text-xs text-white hover:bg-gray-800 transition-colors"
                      >
                        View documents
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-medium mb-4">Get started</h2>
          <div className="space-y-3">
            <a
              href="/jobs"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-sm">Browse &amp; add jobs</p>
                <p className="text-sm text-muted-foreground">Paste a job URL to analyze fit and generate documents</p>
              </div>
              <span className="text-muted-foreground">→</span>
            </a>
            <a
              href="/profile"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-sm">Complete your profile</p>
                <p className="text-sm text-muted-foreground">Add work history and evidence to power document generation</p>
              </div>
              <span className="text-muted-foreground">→</span>
            </a>
            <a
              href="/evidence"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-sm">Manage your evidence</p>
                <p className="text-sm text-muted-foreground">View, edit, and add evidence items that power document generation</p>
              </div>
              <span className="text-muted-foreground">→</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
