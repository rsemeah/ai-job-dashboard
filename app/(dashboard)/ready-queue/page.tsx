import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplyButton from '@/app/(dashboard)/jobs/[id]/documents/ApplyButton'
import { humanizeJobStatus, humanizeFit } from '@/lib/humanizer'

export const dynamic = 'force-dynamic'

export default async function ReadyQueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, role_title, company_name, status, fit, score, scored_at, created_at')
    .eq('user_id', user.id)
    .in('status', ['ready', 'needs_review'])
    .is('deleted_at', null)
    .order('scored_at', { ascending: false })
    .order('created_at', { ascending: false })

  const jobList = jobs ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ready to Apply</h1>
        <p className="text-muted-foreground mt-1">
          Jobs with generated documents, waiting for your review before applying.
        </p>
      </div>

      {jobList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No jobs are ready yet.{' '}
            <Link href="/jobs" className="text-primary hover:underline">Analyze a job</Link>
            {' '}and generate documents to see it here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {jobList.map(job => {
            const statusDisplay = humanizeJobStatus(job.status)
            const fitDisplay = job.fit ? humanizeFit(job.fit) : null

            return (
              <div key={job.id} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${job.id}/documents`} className="font-medium text-sm hover:underline">
                    {job.role_title ?? 'Untitled role'}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">{job.company_name ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                  {fitDisplay && job.fit && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${fitDisplay.color}`}>
                      {fitDisplay.label}
                    </span>
                  )}
                  {job.score !== null && job.score !== undefined && (
                    <span className="text-xs text-muted-foreground">{Math.round(Number(job.score))}/100</span>
                  )}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusDisplay.color}`}>
                    {statusDisplay.label}
                  </span>
                  <Link
                    href={`/jobs/${job.id}/documents`}
                    className="inline-flex items-center rounded bg-black px-3 py-1 text-xs text-white hover:bg-gray-800 transition-colors"
                  >
                    View docs
                  </Link>
                  <ApplyButton jobId={job.id} currentStatus={job.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
