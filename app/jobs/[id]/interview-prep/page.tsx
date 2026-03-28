import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/server"
import { InterviewPrepClient } from "./interview-prep-client"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getJobWithInterviewPrep(jobId: string) {
  const supabase = createAdminClient()
  
  const [jobResult, prepResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(`*, job_analyses (*)`)
      .eq("id", jobId)
      .single(),
    supabase
      .from("interview_prep")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle(),
  ])

  if (jobResult.error || !jobResult.data) {
    return null
  }

  return {
    job: jobResult.data,
    interviewPrep: prepResult.data,
  }
}

export default async function InterviewPrepPage({ params }: PageProps) {
  const { id } = await params
  const data = await getJobWithInterviewPrep(id)

  if (!data) {
    notFound()
  }

  return (
    <InterviewPrepClient 
      job={data.job} 
      initialInterviewPrep={data.interviewPrep} 
    />
  )
}
