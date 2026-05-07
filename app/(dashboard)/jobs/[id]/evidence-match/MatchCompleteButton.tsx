'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markMatchingComplete } from './actions'

export default function MatchCompleteButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await markMatchingComplete(jobId)
      if (result.success) {
        router.push(`/jobs/${jobId}`)
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Mark Evidence Matched — Continue to Generate'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
