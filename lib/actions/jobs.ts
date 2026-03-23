"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Job, JobStatus } from "@/lib/types"

export type JobsResult = 
  | { success: true; data: Job[] }
  | { success: false; error: string }

export type CreateJobResult = 
  | { success: true; job: Job }
  | { success: false; error: string }

// Create a new job from a URL submission
export async function createJobFromUrl(url: string): Promise<CreateJobResult> {
  try {
    const supabase = await createClient()
    
    // Extract domain/company name from URL as a fallback
    let companyGuess = "Unknown Company"
    let titleGuess = "Job Review in Progress"
    
    try {
      const parsedUrl = new URL(url)
      const host = parsedUrl.hostname.replace("www.", "")
      // Try to extract company from common job board patterns
      if (host.includes("greenhouse.io")) {
        const pathParts = parsedUrl.pathname.split("/")
        companyGuess = pathParts[1] ? pathParts[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : companyGuess
      } else if (host.includes("lever.co")) {
        const pathParts = parsedUrl.pathname.split("/")
        companyGuess = pathParts[1] ? pathParts[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : companyGuess
      } else {
        companyGuess = host.split(".")[0].replace(/\b\w/g, c => c.toUpperCase())
      }
    } catch {
      // URL parsing failed, use defaults
    }
    
    // Determine source from URL
    let source = "MANUAL"
    if (url.includes("greenhouse.io")) source = "GREENHOUSE"
    else if (url.includes("lever.co")) source = "LEVER"
    else if (url.includes("workday.com")) source = "WORKDAY"
    else if (url.includes("ziprecruiter.com")) source = "ZIPRECRUITER"
    else if (url.includes("jobot.com")) source = "JOBOT"
    
    // Create the job record with REVIEWING status
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title: titleGuess,
        company: companyGuess,
        source,
        source_url: url,
        raw_description: "Fetching job details...",
        status: "NEW",
        fit: "UNSCORED",
        score: null,
        is_remote: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating job:", error)
      return { success: false, error: error.message }
    }
    
    // Log the activity
    await supabase.from("workflow_logs").insert({
      job_id: data.id,
      workflow_name: "JOB_INTAKE",
      step_name: "URL_SUBMITTED",
      status: "SUCCESS",
      input_snapshot: { url },
      created_at: new Date().toISOString(),
    }).catch(() => {
      // Ignore if workflow_logs table doesn't exist
    })
    
    // Revalidate all relevant paths
    revalidatePath("/")
    revalidatePath("/jobs")
    revalidatePath("/ready-queue")
    revalidatePath("/logs")
    
    return { success: true, job: data }
  } catch (err) {
    console.error("Error creating job:", err)
    return { success: false, error: "Failed to create job record" }
  }
}

export async function getJobs(): Promise<JobsResult> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("score", { ascending: false, nullsFirst: false })
    
    if (error) {
      console.error("Error fetching jobs:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data || [] }
  } catch (err) {
    console.error("Connection error:", err)
    return { success: false, error: "Unable to connect to database" }
  }
}

export async function getJobById(id: string): Promise<Job | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) {
    console.error("Error fetching job:", error)
    return null
  }
  
  return data
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const updateData: Partial<Job> = { status }
  
  // Add applied_at timestamp when marking as applied
  if (status === "APPLIED") {
    updateData.applied_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", id)
  
  if (error) {
    console.error("Error updating job status:", error)
    return { success: false, error: error.message }
  }
  
  revalidatePath("/jobs")
  revalidatePath(`/jobs/${id}`)
  revalidatePath("/")
  
  return { success: true }
}

export type StatsResult = {
  success: boolean
  error?: string
  total: number
  byStatus: Record<string, number>
  byFit: Record<string, number>
  bySource: Record<string, number>
  lastJobCreated?: string | null
  hasWorkflowOutputs: boolean
}

export async function getJobStats(): Promise<StatsResult> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("jobs")
      .select("status, fit, source, score, created_at")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching job stats:", error)
      return {
        success: false,
        error: error.message,
        total: 0,
        byStatus: {},
        byFit: {},
        bySource: {},
        hasWorkflowOutputs: false,
      }
    }
    
    const jobs = data || []
    
    const byStatus = jobs.reduce((acc, job) => {
      const status = job.status || "NEW"
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const byFit = jobs.reduce((acc, job) => {
      const fit = job.fit || "UNSCORED"
      acc[fit] = (acc[fit] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const bySource = jobs.reduce((acc, job) => {
      const source = job.source || "UNKNOWN"
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Check if any jobs have been scored (workflow outputs present)
    const hasWorkflowOutputs = jobs.some(job => job.score !== null)
    
    return {
      success: true,
      total: jobs.length,
      byStatus,
      byFit,
      bySource,
      lastJobCreated: jobs[0]?.created_at || null,
      hasWorkflowOutputs,
    }
  } catch (err) {
    console.error("Connection error:", err)
    return {
      success: false,
      error: "Unable to connect to database",
      total: 0,
      byStatus: {},
      byFit: {},
      bySource: {},
      hasWorkflowOutputs: false,
    }
  }
}
