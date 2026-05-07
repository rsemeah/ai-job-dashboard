import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import MatchCompleteButton from './MatchCompleteButton'

export const dynamic = 'force-dynamic'

export default async function EvidenceMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, role_title, company_name, evidence_map')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (jobError || !job) notFound()

  const [{ data: analysis }, { data: evidenceItems }] = await Promise.all([
    supabase
      .from('job_analyses')
      .select('qualifications_required, qualifications_preferred, matched_skills, known_gaps')
      .eq('job_id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('evidence_library')
      .select('id, source_type, source_title, company_name, date_range, confidence_level, responsibilities')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_rank', { ascending: false }),
  ])

  const evidenceMap = job.evidence_map as Record<string, unknown> | null
  const matchingComplete = evidenceMap?.matching_complete === true

  const qualificationsRequired: string[] = Array.isArray(analysis?.qualifications_required)
    ? analysis.qualifications_required
    : []

  const evidenceList = evidenceItems ?? []

  const sourceTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      work_experience: 'Work Experience',
      project: 'Project',
      portfolio_entry: 'Portfolio Entry',
      shipped_product: 'Shipped Product',
      achievement: 'Achievement',
      certification: 'Certification',
      education: 'Education',
      skill: 'Skill',
    }
    return map[type] ?? type
  }

  // Group evidence by source_type
  const grouped = evidenceList.reduce<Record<string, typeof evidenceList>>((acc, item) => {
    const key = item.source_type ?? 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (matchingComplete) {
    return (
      <div className="max-w-3xl space-y-6">
        <Breadcrumb jobId={id} roleTitle={job.role_title} />
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="font-medium text-green-800">Matching complete</p>
          <p className="text-sm text-green-700 mt-1">Evidence has been matched for this job.</p>
          <Link
            href={`/jobs/${id}`}
            className="mt-4 inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Back to job — generate documents →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <Breadcrumb jobId={id} roleTitle={job.role_title} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evidence Match</h1>
        <p className="text-muted-foreground mt-1">
          {job.role_title ?? 'Untitled role'} at {job.company_name ?? '—'}
        </p>
      </div>

      {qualificationsRequired.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-medium mb-4">Required qualifications</h2>
          <ul className="space-y-2">
            {qualificationsRequired.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-muted-foreground shrink-0">·</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidenceList.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-base font-medium">Your evidence library</h2>
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {sourceTypeLabel(type)}
              </h3>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                    <p className="font-medium text-sm">{item.source_title}</p>
                    {(item.company_name || item.date_range) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[item.company_name, item.date_range].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {Array.isArray(item.responsibilities) && item.responsibilities.slice(0, 2).map((r: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground mt-1 truncate">{r}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            No evidence in your library yet.{' '}
            <Link href="/evidence" className="text-primary hover:underline">Add evidence →</Link>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-medium mb-2">Ready to generate?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Once you&apos;ve reviewed your evidence against the job requirements, mark matching complete to proceed.
        </p>
        <MatchCompleteButton jobId={id} />
      </div>
    </div>
  )
}

function Breadcrumb({ jobId, roleTitle }: { jobId: string; roleTitle: string | null }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
      <span>/</span>
      <Link href={`/jobs/${jobId}`} className="hover:text-foreground transition-colors truncate">
        {roleTitle ?? 'Untitled role'}
      </Link>
      <span>/</span>
      <span className="text-foreground">Evidence Match</span>
    </div>
  )
}
