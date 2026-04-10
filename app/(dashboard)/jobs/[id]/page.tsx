import { getJobById } from "@/lib/actions/jobs"
import { JobDetail } from "@/components/job-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { evaluateJobReadiness, type ReadinessResult } from "@/lib/readiness"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  
  // Get current user for readiness evaluation
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch job and readiness in parallel
  const [job, readiness] = await Promise.all([
    getJobById(id),
    user ? evaluateJobReadiness(id, user.id) : Promise.resolve(null),
  ])

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Job not found</h2>
        <p className="text-muted-foreground">This job may have been deleted or doesn&apos;t exist.</p>
        <Button variant="outline" asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>
    )
  }

  return <JobDetail job={job} readiness={readiness} />
}
