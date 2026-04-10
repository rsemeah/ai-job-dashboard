import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { InterviewPrepClient } from "./interview-prep-client"
import { evaluateJobReadiness } from "@/lib/readiness"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowLeft, FileText, Lock } from "lucide-react"

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
  
  // Fetch data and readiness in parallel
  const [data, readiness] = await Promise.all([
    getJobWithInterviewPrep(id, user.id),
    evaluateJobReadiness(id, user.id),
  ])

  if (!data) {
    notFound()
  }

  // Gate check: require generated materials for interview prep
  if (!readiness?.can_interview_prep) {
    const blockers = readiness?.reasons_not_ready || ["Materials not generated"]
    const job = data.job
    
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href={`/jobs/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Interview Prep</h1>
            <p className="text-muted-foreground">{job.role_title} at {job.company_name}</p>
          </div>
        </div>
        
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Lock className="h-5 w-5" />
              Interview Prep Not Available Yet
            </CardTitle>
            <CardDescription className="text-amber-700">
              Complete the following steps to unlock interview preparation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              {blockers.map((blocker, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {blocker}
                </li>
              ))}
            </ul>
            
            <div className="flex gap-3">
              {!readiness?.has_resume && (
                <Button asChild>
                  <Link href={`/jobs/${id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Materials
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href={`/jobs/${id}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Job Detail
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <InterviewPrepClient 
      job={data.job} 
      initialInterviewPrep={data.interviewPrep} 
    />
  )
}
