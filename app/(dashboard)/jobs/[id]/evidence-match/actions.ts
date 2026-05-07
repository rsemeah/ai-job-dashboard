'use server'

import { createClient } from '@/lib/supabase/server'

export async function markMatchingComplete(jobId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('evidence_map')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !job) return { success: false, error: 'Job not found' }

  const currentMap = (job.evidence_map as Record<string, unknown>) ?? {}
  const newMap = {
    ...currentMap,
    matching_complete: true,
    matched_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('jobs')
    .update({ evidence_map: newMap })
    .eq('id', jobId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
