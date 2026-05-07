'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addProfileLink, updateProfileLink, removeProfileLink, getProfileLinks } from '@/lib/actions/profile-links'

export interface SaveProfileInput {
  full_name: string
  location: string
  phone: string
  headline: string
  summary: string
  skills: string
  linkedin_url: string
  github_url: string
  website_url: string
}

export async function saveProfile(data: SaveProfileInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const skillsArray = data.skills
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const { error } = await supabase
    .from('user_profile')
    .upsert({
      user_id: user.id,
      full_name: data.full_name || null,
      location: data.location || null,
      phone: data.phone || null,
      headline: data.headline || null,
      summary: data.summary || null,
      skills: skillsArray,
    }, { onConflict: 'user_id' })

  if (error) return { success: false, error: error.message }

  // Upsert links for each type
  await upsertLink('linkedin', data.linkedin_url)
  await upsertLink('github', data.github_url)
  await upsertLink('website', data.website_url)

  revalidatePath('/profile')
  return { success: true }
}

async function upsertLink(linkType: 'linkedin' | 'github' | 'website', url: string) {
  const { links } = await getProfileLinks(linkType)
  const existing = links[0]

  if (url.trim()) {
    if (existing) {
      await updateProfileLink({ id: existing.id, url: url.trim() })
    } else {
      await addProfileLink({ link_type: linkType, url: url.trim(), is_primary: true })
    }
  } else if (existing) {
    await removeProfileLink(existing.id)
  }
}
