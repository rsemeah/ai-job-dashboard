'use client'

import { useState, useTransition } from 'react'
import { applyToJob } from '@/lib/actions/apply'

interface ApplyButtonProps {
  jobId: string
  currentStatus: string
}

export default function ApplyButton({ jobId, currentStatus }: ApplyButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [applied, setApplied] = useState(currentStatus === 'applied')
  const [error, setError] = useState<string | null>(null)

  if (!['ready', 'needs_review', 'applied'].includes(currentStatus) && !applied) return null

  if (applied) {
    return (
      <button
        disabled
        className="rounded-md px-4 py-2 text-sm font-medium bg-green-100 text-green-800 cursor-default"
      >
        Applied ✓
      </button>
    )
  }

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await applyToJob(jobId)
      if (result.success) {
        setApplied(true)
      } else {
        setError(result.error ?? 'Failed to mark as applied.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Marking as applied…' : 'Mark as Applied'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
