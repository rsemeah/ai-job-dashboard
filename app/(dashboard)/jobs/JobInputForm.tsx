"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function JobInputForm() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      new URL(url)
    } catch {
      setError("Please enter a valid URL (e.g. https://jobs.lever.co/...)")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_url: url }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          setError(data.error || "AI service is busy. Please wait 30 seconds and try again.")
        } else {
          setError(data.error || "Analysis failed — please try again.")
        }
        return
      }

      router.push(`/jobs/${data.job_id}`)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a job posting URL (Greenhouse, Lever, Workday, Indeed…)"
          required
          disabled={isLoading}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50 min-w-0"
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0"
        >
          {isLoading ? "Analyzing…" : "Analyze job"}
        </button>
      </div>
      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Fetching and analyzing the job listing — this takes 15–30 seconds…
        </p>
      )}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </form>
  )
}
