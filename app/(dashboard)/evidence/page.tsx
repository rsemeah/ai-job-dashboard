import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EvidenceList from './EvidenceList'
import type { EvidenceRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EvidencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: items } = await supabase
    .from('evidence_library')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('priority_rank', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evidence Library</h1>
        <p className="text-muted-foreground mt-1">
          Your work history and achievements that power document generation.
        </p>
      </div>

      <EvidenceList initialItems={(items ?? []) as EvidenceRecord[]} />
    </div>
  )
}
