// HireWire Dashboard - Premium Editorial Design
import { redirect } from "next/navigation"
import { getJobStats, getJobs } from "@/lib/actions/jobs"
import { ErrorState } from "@/components/error-state"
import { DashboardContent } from "@/components/dashboard-content"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const [statsResult, jobsResult] = await Promise.all([getJobStats(), getJobs()])

  // If not authenticated, redirect to login
  if (!statsResult.success && statsResult.error === "Not authenticated") {
    redirect("/login")
  }

  if (!statsResult.success) {
    return (
      <div className="p-6">
        <ErrorState 
          title="Unable to connect to your data"
          message={statsResult.error || "Check that Supabase is configured correctly."}
        />
      </div>
    )
  }

  const stats = statsResult
  const jobs = jobsResult.success ? jobsResult.data : []

  return <DashboardContent stats={stats} jobs={jobs} />
}
