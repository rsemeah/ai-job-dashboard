'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EvidenceRecord } from '@/lib/types'

export async function updateEvidence(
  id: string,
  data: Partial<EvidenceRecord>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('evidence_library')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/evidence')
  return { success: true }
}

export async function archiveEvidence(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('evidence_library')
    .update({ is_active: false, visibility_status: 'archived' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/evidence')
  return { success: true }
}

export interface NewEvidenceInput {
  source_type: EvidenceRecord['source_type']
  source_title: string
  company_name?: string
  role_name?: string
  date_range?: string
  responsibilities?: string[]
  tools_used?: string[]
  outcomes?: string[]
  confidence_level: 'high' | 'medium' | 'low'
}

export async function addEvidence(data: NewEvidenceInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase.from('evidence_library').insert({
    user_id: user.id,
    source_type: data.source_type,
    source_title: data.source_title,
    company_name: data.company_name || null,
    role_name: data.role_name || null,
    date_range: data.date_range || null,
    responsibilities: data.responsibilities ?? [],
    tools_used: data.tools_used ?? [],
    outcomes: data.outcomes ?? [],
    confidence_level: data.confidence_level,
    evidence_weight: 'medium',
    is_active: true,
    is_user_approved: true,
    visibility_status: 'active',
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/evidence')
  return { success: true }
}
