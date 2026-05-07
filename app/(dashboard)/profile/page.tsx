import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfileLinks } from '@/lib/actions/profile-links'
import ProfileForm from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('full_name, location, phone, headline, summary, skills')
    .eq('user_id', user.id)
    .maybeSingle()

  const { links } = await getProfileLinks()

  const linkedinLink = links.find(l => l.link_type === 'linkedin')
  const githubLink = links.find(l => l.link_type === 'github')
  const websiteLink = links.find(l => l.link_type === 'website')

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Your work history and profile details power document generation.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <ProfileForm
          initialData={{
            full_name: profile?.full_name,
            location: profile?.location,
            phone: profile?.phone,
            headline: profile?.headline,
            summary: profile?.summary,
            skills: profile?.skills,
          }}
          initialLinks={{
            linkedin_url: linkedinLink?.url ?? '',
            github_url: githubLink?.url ?? '',
            website_url: websiteLink?.url ?? '',
          }}
        />
      </div>
    </div>
  )
}
