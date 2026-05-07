'use client'

import { useState, useTransition } from 'react'
import { addEvidence, type NewEvidenceInput } from './actions'
import type { EvidenceRecord } from '@/lib/types'

const SOURCE_TYPE_OPTIONS: Array<{ value: EvidenceRecord['source_type']; label: string }> = [
  { value: 'work_experience', label: 'Work Experience' },
  { value: 'project', label: 'Project' },
  { value: 'portfolio_entry', label: 'Portfolio Entry' },
  { value: 'shipped_product', label: 'Shipped Product' },
  { value: 'live_site', label: 'Live Site' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'certification', label: 'Certification' },
  { value: 'publication', label: 'Publication' },
  { value: 'open_source', label: 'Open Source' },
  { value: 'education', label: 'Education' },
  { value: 'skill', label: 'Skill' },
]

export default function AddEvidenceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    source_type: 'work_experience' as EvidenceRecord['source_type'],
    source_title: '',
    company_name: '',
    role_name: '',
    date_range: '',
    responsibilities: '',
    tools_used: '',
    outcomes: '',
    confidence_level: 'medium' as 'high' | 'medium' | 'low',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fields.source_title.trim()) {
      setError('Title is required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const input: NewEvidenceInput = {
        source_type: fields.source_type,
        source_title: fields.source_title.trim(),
        company_name: fields.company_name.trim() || undefined,
        role_name: fields.role_name.trim() || undefined,
        date_range: fields.date_range.trim() || undefined,
        responsibilities: fields.responsibilities.split('\n').map(s => s.trim()).filter(Boolean),
        tools_used: fields.tools_used.split(',').map(s => s.trim()).filter(Boolean),
        outcomes: fields.outcomes.split('\n').map(s => s.trim()).filter(Boolean),
        confidence_level: fields.confidence_level,
      }
      const result = await addEvidence(input)
      if (result.success) {
        onAdded()
        onClose()
      } else {
        setError(result.error ?? 'Failed to add evidence.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Add evidence</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <select name="source_type" value={fields.source_type} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              {SOURCE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <ModalField label="Title *" name="source_title" value={fields.source_title} onChange={handleChange} placeholder="e.g. Senior Engineer at Acme Corp" />
          <ModalField label="Company" name="company_name" value={fields.company_name} onChange={handleChange} />
          <ModalField label="Role" name="role_name" value={fields.role_name} onChange={handleChange} />
          <ModalField label="Date range" name="date_range" value={fields.date_range} onChange={handleChange} placeholder="Jan 2022 – Mar 2024" />
          <ModalTextarea label="Responsibilities (one per line)" name="responsibilities" value={fields.responsibilities} onChange={handleChange} />
          <ModalField label="Tools used (comma-separated)" name="tools_used" value={fields.tools_used} onChange={handleChange} />
          <ModalTextarea label="Outcomes (one per line)" name="outcomes" value={fields.outcomes} onChange={handleChange} />
          <div>
            <label className="block text-sm font-medium mb-1.5">Confidence level</label>
            <select name="confidence_level" value={fields.confidence_level} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={isPending} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
              {isPending ? 'Adding…' : 'Add evidence'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:underline">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalField({ label, name, value, onChange, placeholder }: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input name={name} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
    </div>
  )
}

function ModalTextarea({ label, name, value, onChange }: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <textarea name={name} value={value} onChange={onChange} rows={3}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
    </div>
  )
}
