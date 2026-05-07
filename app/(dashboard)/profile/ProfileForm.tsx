'use client'

import { useState, useTransition } from 'react'
import { saveProfile } from './actions'

interface ProfileFormProps {
  initialData: {
    full_name?: string | null
    location?: string | null
    phone?: string | null
    headline?: string | null
    summary?: string | null
    skills?: string[] | null
  }
  initialLinks: {
    linkedin_url: string
    github_url: string
    website_url: string
  }
}

export default function ProfileForm({ initialData, initialLinks }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [fields, setFields] = useState({
    full_name: initialData.full_name ?? '',
    location: initialData.location ?? '',
    phone: initialData.phone ?? '',
    headline: initialData.headline ?? '',
    summary: initialData.summary ?? '',
    skills: (initialData.skills ?? []).join(', '),
    linkedin_url: initialLinks.linkedin_url,
    github_url: initialLinks.github_url,
    website_url: initialLinks.website_url,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await saveProfile(fields)
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile saved.' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to save profile.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" name="full_name" value={fields.full_name} onChange={handleChange} />
        <Field label="Location" name="location" value={fields.location} onChange={handleChange} />
        <Field label="Phone" name="phone" value={fields.phone} onChange={handleChange} />
        <Field label="Headline / title" name="headline" value={fields.headline} onChange={handleChange} placeholder="e.g. Senior Product Manager" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="summary">Summary</label>
        <textarea
          id="summary"
          name="summary"
          value={fields.summary}
          onChange={handleChange}
          rows={5}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Brief professional summary…"
        />
      </div>

      <Field
        label="Skills (comma-separated)"
        name="skills"
        value={fields.skills}
        onChange={handleChange}
        placeholder="Python, SQL, Product Strategy, Figma"
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-medium">Links</h3>
        <Field label="LinkedIn URL" name="linkedin_url" value={fields.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/yourname" />
        <Field label="GitHub URL" name="github_url" value={fields.github_url} onChange={handleChange} placeholder="https://github.com/yourname" />
        <Field label="Website URL" name="website_url" value={fields.website_url} onChange={handleChange} placeholder="https://yoursite.com" />
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}
