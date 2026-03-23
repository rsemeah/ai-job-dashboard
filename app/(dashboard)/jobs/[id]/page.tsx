import { getJobById } from "@/lib/actions/jobs"
import { JobDetail } from "@/components/job-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  console.log("[v0] JobDetailPage loading job with id:", id)
  const job = await getJobById(id)
  console.log("[v0] JobDetailPage got job:", job ? "found" : "not found")

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

  return <JobDetail job={job} />
}
