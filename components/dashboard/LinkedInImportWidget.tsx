"use client"

import { useState } from "react"

export function LinkedInImportWidget() {
  const [text, setText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/linkedin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error ?? "Import failed. Please try again.")
        return
      }

      setResult({ count: data.itemsExtracted })
      setText("")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-medium">Import from LinkedIn</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Go to your LinkedIn profile → More → Save to PDF → copy the text, then paste it here.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setResult(null)
            setError(null)
          }}
          placeholder="Paste your LinkedIn profile text here..."
          rows={8}
          disabled={isLoading}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50 resize-none"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isLoading || text.trim().length < 50}
            className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Extracting…" : "Extract & Import"}
          </button>
          {isLoading && (
            <span className="text-sm text-muted-foreground">
              Analyzing your profile — this takes 15–20 seconds…
            </span>
          )}
          {result && (
            <span className="text-sm text-green-600">
              ✓ {result.count} item{result.count !== 1 ? "s" : ""} added to your evidence library
            </span>
          )}
          {error && (
            <span className="text-sm text-red-500">{error}</span>
          )}
        </div>
      </form>
    </div>
  )
}
