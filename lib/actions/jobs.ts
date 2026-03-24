"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Job, JobStatus } from "@/lib/types"

export type JobsResult = 
  | { success: true; data: Job[] }
  | { success: false; error: string }

export type CreateJobResult = 
  | { success: true; job: Job }
  | { success: false; error: string }

// Create a new job from a URL submission
// Uses admin client to bypass RLS since this is a server-side operation
export async function createJobFromUrl(url: string): Promise<CreateJobResult> {
  try {
    const supabase = createAdminClient()
    
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
    
    // Create the job record - only use columns that exist in the schema
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title: titleGuess,
        company: companyGuess,
        source,
        status: "NEW",
        fit: null,
        score: null,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
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
    const supabase = createAdminClient()
    
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
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) {
    return null
  }
  
  return data
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<{ success: boolean; error?: string }> {
  // Use admin client to bypass RLS for status updates
  const supabase = createAdminClient()
  
  // Only update the status column (other columns may not exist in schema)
  const { error } = await supabase
    .from("jobs")
    .update({ status })
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
    const supabase = createAdminClient()
    
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
