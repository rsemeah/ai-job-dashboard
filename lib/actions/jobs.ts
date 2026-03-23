"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Job, JobStatus } from "@/lib/types"

export async function getJobs(): Promise<Job[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("score", { ascending: false, nullsFirst: false })
  
  if (error) {
    console.error("Error fetching jobs:", error)
    return []
  }
  
  return data || []
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

export async function getJobStats() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("jobs")
    .select("status, fit, source, score")
  
  if (error) {
    console.error("Error fetching job stats:", error)
    return {
      total: 0,
      byStatus: {} as Record<string, number>,
      byFit: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
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
  
  return {
    total: jobs.length,
    byStatus,
    byFit,
    bySource,
  }
}
