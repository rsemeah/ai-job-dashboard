import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { humanizeJobStatus, humanizeApplicationMethod, relativeTime } from '@/lib/humanizer'

export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: applications } = await supabase
    .from('applications')
    .select(`
      id, applied_at, method, notes, status,
      jobs (id, role_title, company_name, job_url, status)
    `)
    .eq('user_id', user.id)
    .order('applied_at', { ascending: false })

  const appList = applications ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="text-muted-foreground mt-1">Jobs you&apos;ve applied to.</p>
      </div>

      {appList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No applications tracked yet.{' '}
            <Link href="/ready-queue" className="text-primary hover:underline">Mark a job as applied</Link>
            {' '}from the documents page.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {appList.map(app => {
            const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs
            const jobStatus = job?.status as string | null
            const statusDisplay = humanizeJobStatus(jobStatus)

            return (
              <div key={app.id} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0 flex-1">
                  {job ? (
                    <Link href={`/jobs/${job.id}`} className="font-medium text-sm hover:underline">
                      {job.role_title ?? 'Untitled role'}
                    </Link>
                  ) : (
                    <p className="font-medium text-sm">Untitled role</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {job?.company_name ?? '—'}
                    <span className="ml-2 text-xs">{relativeTime(app.applied_at)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {app.method && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                      {humanizeApplicationMethod(app.method)}
                    </span>
                  )}
                  {jobStatus && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
