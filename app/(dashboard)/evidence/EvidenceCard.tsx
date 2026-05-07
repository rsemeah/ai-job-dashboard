'use client'

import { useState, useTransition } from 'react'
import { updateEvidence, archiveEvidence } from './actions'
import type { EvidenceRecord } from '@/lib/types'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  work_experience: 'Work Experience',
  project: 'Project',
  portfolio_entry: 'Portfolio Entry',
  shipped_product: 'Shipped Product',
  live_site: 'Live Site',
  achievement: 'Achievement',
  certification: 'Certification',
  publication: 'Publication',
  open_source: 'Open Source',
  education: 'Education',
  skill: 'Skill',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

export default function EvidenceCard({ item, onArchived }: { item: EvidenceRecord; onArchived: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [archiving, startArchiveTransition] = useTransition()
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    source_title: item.source_title ?? '',
    company_name: item.company_name ?? '',
    role_name: item.role_name ?? '',
    date_range: item.date_range ?? '',
    responsibilities: (item.responsibilities ?? []).join('\n'),
    tools_used: (item.tools_used ?? []).join(', '),
    outcomes: (item.outcomes ?? []).join('\n'),
    approved_achievement_bullets: (item.approved_achievement_bullets ?? []).join('\n'),
    confidence_level: item.confidence_level,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateEvidence(item.id, {
        source_title: fields.source_title,
        company_name: fields.company_name || null,
        role_name: fields.role_name || null,
        date_range: fields.date_range || null,
        responsibilities: fields.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
        tools_used: fields.tools_used.split(',').map(s => s.trim()).filter(Boolean),
        outcomes: fields.outcomes.split('\n').map(s => s.trim()).filter(Boolean),
        approved_achievement_bullets: fields.approved_achievement_bullets.split('\n').map(s => s.trim()).filter(Boolean),
        confidence_level: fields.confidence_level as 'high' | 'medium' | 'low',
      })
      if (result.success) {
        setEditing(false)
      } else {
        setError(result.error ?? 'Failed to save.')
      }
    })
  }

  function handleArchive() {
    startArchiveTransition(async () => {
      const result = await archiveEvidence(item.id)
      if (result.success) {
        onArchived(item.id)
      } else {
        setError(result.error ?? 'Failed to archive.')
      }
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-sm">{item.source_title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {SOURCE_TYPE_LABELS[item.source_type] ?? item.source_type}
                {item.company_name && ` · ${item.company_name}`}
                {item.date_range && ` · ${item.date_range}`}
              </p>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_COLORS[item.confidence_level] ?? 'bg-gray-100 text-gray-600'}`}>
              {item.confidence_level}
            </span>
          </div>
          {Array.isArray(item.responsibilities) && item.responsibilities.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground truncate">{r}</p>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
            {archiveConfirm ? (
              <span className="text-xs flex items-center gap-2">
                Archive this item?
                <button onClick={handleArchive} disabled={archiving} className="text-red-600 hover:underline font-medium">
                  {archiving ? 'Archiving…' : 'Yes, archive'}
                </button>
                <button onClick={() => setArchiveConfirm(false)} className="text-muted-foreground hover:underline">Cancel</button>
              </span>
            ) : (
              <button onClick={() => setArchiveConfirm(true)} className="text-xs text-muted-foreground hover:text-destructive">
                Archive
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <EditField label="Title" name="source_title" value={fields.source_title} onChange={handleChange} />
          <EditField label="Company" name="company_name" value={fields.company_name} onChange={handleChange} />
          <EditField label="Role" name="role_name" value={fields.role_name} onChange={handleChange} />
          <EditField label="Date range" name="date_range" value={fields.date_range} onChange={handleChange} placeholder="e.g. Jan 2022 – Mar 2024" />
          <EditTextarea label="Responsibilities (one per line)" name="responsibilities" value={fields.responsibilities} onChange={handleChange} />
          <EditField label="Tools used (comma-separated)" name="tools_used" value={fields.tools_used} onChange={handleChange} />
          <EditTextarea label="Outcomes (one per line)" name="outcomes" value={fields.outcomes} onChange={handleChange} />
          <EditTextarea label="Achievement bullets (one per line)" name="approved_achievement_bullets" value={fields.approved_achievement_bullets} onChange={handleChange} />
          <div>
            <label className="block text-xs font-medium mb-1">Confidence level</label>
            <select
              name="confidence_level"
              value={fields.confidence_level}
              onChange={handleChange}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={isPending} className="text-xs font-medium rounded bg-black text-white px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50">
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditField({ label, name, value, onChange, placeholder }: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

function EditTextarea({ label, name, value, onChange }: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}
