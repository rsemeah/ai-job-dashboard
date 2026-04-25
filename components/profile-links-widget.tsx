"use client"

import { useTransition, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  addProfileLink,
  removeProfileLink,
  type ProfileLink,
  type LinkType,
} from "@/lib/actions/profile-links"

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  portfolio: "Portfolio",
  website: "Website",
  other: "Other",
}

export function ProfileLinksWidget({
  initialLinks,
}: {
  initialLinks: ProfileLink[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await removeProfileLink(id)
      if (!result.success) {
        setError(result.error ?? "Failed to remove link")
      } else {
        router.refresh()
      }
    })
  }

  function handleAdd(formData: FormData) {
    setError(null)
    const link_type = formData.get("link_type") as LinkType
    const url = (formData.get("url") as string | null)?.trim() ?? ""
    if (!url) return
    startTransition(async () => {
      const result = await addProfileLink({ link_type, url })
      if (!result.success) {
        setError(result.error ?? "Failed to add link")
      } else {
        formRef.current?.reset()
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-medium">Profile links</h2>
        {initialLinks.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {initialLinks.length} saved
          </span>
        )}
      </div>

      {initialLinks.length > 0 && (
        <ul className="divide-y divide-border">
          {initialLinks.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between px-6 py-3 gap-4"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {LINK_TYPE_LABELS[link.link_type] ?? link.link_type}
                </span>
                <a
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-primary hover:underline truncate mt-0.5"
                >
                  {link.url}
                </a>
              </div>
              <button
                onClick={() => handleDelete(link.id)}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={handleAdd}
        className="px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <select
          name="link_type"
          defaultValue="linkedin"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shrink-0"
        >
          {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="url"
          type="url"
          required
          placeholder="https://..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-0"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 shrink-0"
        >
          {isPending ? "Saving…" : "Add link"}
        </button>
      </form>

      {error && (
        <p className="px-6 pb-4 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
