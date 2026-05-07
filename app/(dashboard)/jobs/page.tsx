import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { JobInputForm } from "./JobInputForm"
import { humanizeJobStatus } from "@/lib/humanizer"

export const dynamic = "force-dynamic"


export default async function JobsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, role_title, company_name, status, generated_resume, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50)

  const jobList = jobs ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Paste a job URL to analyze fit and generate tailored documents.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-medium mb-4">Analyze a job</h2>
        <JobInputForm />
      </div>

      {jobList.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-medium">Your jobs</h2>
          </div>
          <ul className="divide-y divide-border">
            {jobList.map((job) => {
              const statusDisplay = humanizeJobStatus(job.status)
              const statusLabel = statusDisplay.label
              const statusColor = statusDisplay.color
              const hasDocs = !!job.generated_resume

              return (
                <li
                  key={job.id}
                  className="flex items-center justify-between px-6 py-4 gap-4"
                >
                  <Link
                    href={`/jobs/${job.id}`}
                    className="min-w-0 flex-1 hover:opacity-70 transition-opacity"
                  >
                    <p className="font-medium text-sm truncate">
                      {job.role_title ?? "Untitled role"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {job.company_name ?? "—"}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                    {hasDocs && (
                      <Link
                        href={`/jobs/${job.id}/documents`}
                        className="inline-flex items-center rounded bg-black px-3 py-1 text-xs text-white hover:bg-gray-800 transition-colors"
                      >
                        View documents
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
