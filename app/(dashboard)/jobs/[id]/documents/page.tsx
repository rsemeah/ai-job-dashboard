import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import DocumentsEditor from './DocumentsEditor'
import ApplyButton from './ApplyButton'
import { fullDateTime } from '@/lib/humanizer'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job, error } = await supabase
    .from('jobs')
    .select(
      `id, role_title, company_name, job_url, status,
       generated_resume, generated_cover_letter,
       edited_resume, edited_cover_letter, last_edited_at,
       generation_timestamp, quality_passed`
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error || !job) notFound()

  const hasDocs = !!(job.generated_resume || job.generated_cover_letter)

  if (!hasDocs) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Documents not ready</h1>
        <p className="mt-2 text-gray-600">
          Generation hasn&apos;t completed for this job yet.
          <br />
          Current status: <code className="rounded bg-gray-100 px-1">{job.status}</code>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold">
          {job.role_title}
          <span className="ml-2 text-gray-500">@ {job.company_name}</span>
        </h1>
        <div className="mt-1 text-sm text-gray-500">
          {job.generation_timestamp && (
            <span>Generated {fullDateTime(job.generation_timestamp)}</span>
          )}
          {job.last_edited_at && (
            <span className="ml-3">
              · Last edited {fullDateTime(job.last_edited_at)}
            </span>
          )}
        </div>
      </div>
      <DocumentsEditor job={job} />
      {hasDocs && (
        <div className="mt-6">
          <ApplyButton jobId={job.id} currentStatus={job.status} />
        </div>
      )}
    </div>
  )
}
