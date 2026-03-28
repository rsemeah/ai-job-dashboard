import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { InterviewPrepClient } from "./interview-prep-client"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getJobWithInterviewPrep(jobId: string, userId: string) {
  const supabase = await createClient()
  
  const [jobResult, prepResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(`*, job_analyses (*)`)
      .eq("id", jobId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("interview_prep")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", userId)
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
  
  // Get current user
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/login")
  }
  
  const data = await getJobWithInterviewPrep(id, user.id)

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
