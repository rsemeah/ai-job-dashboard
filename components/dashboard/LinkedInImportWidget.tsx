"use client"

import { useState, useRef } from "react"

type Tab = "pdf" | "text"

type Result = { count: number; label: string }

export function LinkedInImportWidget() {
  const [tab, setTab] = useState<Tab>("pdf")

  // PDF tab state
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Text tab state
  const [text, setText] = useState("")

  // Shared state
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  function resetFeedback() {
    setResult(null)
    setError(null)
  }

  function switchTab(t: Tab) {
    setTab(t)
    resetFeedback()
  }

  // ── PDF handlers ────────────────────────────────────────────────────────────

  function handleFileChange(f: File | null) {
    if (!f) return
    if (f.type !== "application/pdf") {
      setError("Only PDF files are supported. Save your LinkedIn profile as a PDF first.")
      return
    }
    setFile(f)
    resetFeedback()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFileChange(e.dataTransfer.files[0] ?? null)
  }

  async function handlePdfSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setIsLoading(true)
    resetFeedback()

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/resume/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? "Upload failed. Please try again.")
        return
      }

      const count = (data.inserted ?? 0) + (data.education_count ?? 0)
      setResult({ count, label: "items added to your evidence library" })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Text handlers ────────────────────────────────────────────────────────────

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    resetFeedback()

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

      setResult({ count: data.itemsExtracted, label: "items added to your evidence library" })
      setText("")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmitPdf = !!file && !isLoading
  const canSubmitText = text.trim().length >= 50 && !isLoading

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-medium">Import from LinkedIn</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sync your LinkedIn profile to populate your evidence library.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["pdf", "text"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-6 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-black text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pdf" ? "Upload PDF" : "Paste text"}
          </button>
        ))}
      </div>

      {/* PDF tab */}
      {tab === "pdf" && (
        <form onSubmit={handlePdfSubmit} className="px-6 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            On LinkedIn: go to your profile → More (•••) → Save to PDF → upload that file here.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 cursor-pointer transition-colors ${
              isDragging
                ? "border-black bg-muted/40"
                : "border-border hover:border-black/40 hover:bg-muted/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · Click to change
                </span>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">Drop your PDF here</span>
                <span className="text-xs text-muted-foreground">or click to browse</span>
              </>
            )}
          </div>

          <Feedback isLoading={isLoading} result={result} error={error} loadingText="Extracting your profile — this takes 15–20 seconds…" />

          <button
            type="submit"
            disabled={!canSubmitPdf}
            className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Extracting…" : "Extract & Import"}
          </button>
        </form>
      )}

      {/* Text tab */}
      {tab === "text" && (
        <form onSubmit={handleTextSubmit} className="px-6 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            On LinkedIn: go to your profile → More (•••) → Save to PDF → open the PDF → select all → copy → paste below.
          </p>

          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); resetFeedback() }}
            placeholder="Paste your LinkedIn profile text here..."
            rows={8}
            disabled={isLoading}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50 resize-none"
          />

          <Feedback isLoading={isLoading} result={result} error={error} loadingText="Analyzing your profile — this takes 15–20 seconds…" />

          <button
            type="submit"
            disabled={!canSubmitText}
            className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Extracting…" : "Extract & Import"}
          </button>
        </form>
      )}
    </div>
  )
}

function Feedback({ isLoading, result, error, loadingText }: {
  isLoading: boolean
  result: Result | null
  error: string | null
  loadingText: string
}) {
  if (!isLoading && !result && !error) return null
  return (
    <div className="text-sm">
      {isLoading && <span className="text-muted-foreground">{loadingText}</span>}
      {result && (
        <span className="text-green-600">
          ✓ {result.count} {result.label}
        </span>
      )}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  )
}
