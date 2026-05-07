'use client'

import { useState } from 'react'
import EvidenceCard from './EvidenceCard'
import AddEvidenceModal from './AddEvidenceModal'
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

export default function EvidenceList({ initialItems }: { initialItems: EvidenceRecord[] }) {
  const [items, setItems] = useState(initialItems)
  const [showModal, setShowModal] = useState(false)

  function handleArchived(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function handleAdded() {
    window.location.reload()
  }

  const grouped = items.reduce<Record<string, EvidenceRecord[]>>((acc, item) => {
    const key = item.source_type ?? 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Add evidence
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No evidence yet. Upload a resume from onboarding or add evidence manually.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, typeItems]) => (
            <div key={type}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {SOURCE_TYPE_LABELS[type] ?? type}
              </h3>
              <div className="space-y-3">
                {typeItems.map(item => (
                  <EvidenceCard key={item.id} item={item} onArchived={handleArchived} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddEvidenceModal onClose={() => setShowModal(false)} onAdded={handleAdded} />
      )}
    </>
  )
}
