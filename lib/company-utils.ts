/**
 * Company normalization and matching utilities
 * Ensures consistent company grouping across analyzed jobs
 */

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Normalize a company name for matching purposes
 * - Lowercase
 * - Trim whitespace
 * - Remove common suffixes (Inc, LLC, Ltd, Corp, etc.)
 * - Normalize multiple spaces
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return ""
  
  return name
    .toLowerCase()
    .trim()
    // Remove common company suffixes
    .replace(/\s+(inc\.?|llc|ltd\.?|corp\.?|corporation|company|co\.?|incorporated|limited)$/i, "")
    // Normalize multiple spaces to single space
    .replace(/\s+/g, " ")
    // Remove trailing punctuation
    .replace(/[,.\-]+$/, "")
    .trim()
}

/**
 * Check if two company names are likely the same company
 */
export function isSameCompany(name1: string, name2: string): boolean {
  const normalized1 = normalizeCompanyName(name1)
  const normalized2 = normalizeCompanyName(name2)
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true
  
  // Check if one is a substring of the other (for abbreviations)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Only if the shorter one is at least 3 chars to avoid false positives
    const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2
    if (shorter.length >= 3) return true
  }
  
  return false
}

export interface Company {
  id: string
  user_id: string
  name: string
  normalized_name: string
  website?: string | null
  industry?: string | null
  size?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CompanyWithStats extends Company {
  job_count: number
  applied_count: number
  ready_count: number
  avg_score: number | null
  latest_activity: string
  has_resume: boolean
  has_cover_letter: boolean
}

/**
 * Find or create a company record for a user
 * If company with same normalized name exists, returns that
 * Otherwise creates a new company
 */
export async function findOrCreateCompany(
  supabase: SupabaseClient,
  userId: string,
  companyName: string,
  metadata?: {
    website?: string
    industry?: string
  }
): Promise<{ company: Company; created: boolean } | { error: string }> {
  const normalizedName = normalizeCompanyName(companyName)
  
  if (!normalizedName) {
    return { error: "Invalid company name" }
  }
  
  // First, try to find existing company
  const { data: existing, error: findError } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .eq("normalized_name", normalizedName)
    .maybeSingle()
  
  if (findError) {
    console.error("Error finding company:", findError)
    return { error: findError.message }
  }
  
  if (existing) {
    return { company: existing as Company, created: false }
  }
  
  // Create new company
  const { data: newCompany, error: createError } = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      name: companyName.trim(),
      normalized_name: normalizedName,
      website: metadata?.website,
      industry: metadata?.industry,
    })
    .select()
    .single()
  
  if (createError) {
    // Handle race condition - another request might have created it
    if (createError.code === "23505") { // Unique violation
      const { data: retry } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .eq("normalized_name", normalizedName)
        .single()
      
      if (retry) {
        return { company: retry as Company, created: false }
      }
    }
    
    console.error("Error creating company:", createError)
    return { error: createError.message }
  }
  
  return { company: newCompany as Company, created: true }
}

/**
 * Link a job to its company (create company if needed)
 */
export async function linkJobToCompany(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  companyName: string,
  metadata?: {
    industry?: string
  }
): Promise<{ company_id: string } | { error: string }> {
  const result = await findOrCreateCompany(supabase, userId, companyName, metadata)
  
  if ("error" in result) {
    return result
  }
  
  // Update job with company_id
  const { error: updateError } = await supabase
    .from("jobs")
    .update({ company_id: result.company.id })
    .eq("id", jobId)
    .eq("user_id", userId)
  
  if (updateError) {
    console.error("Error linking job to company:", updateError)
    return { error: updateError.message }
  }
  
  return { company_id: result.company.id }
}

/**
 * Get all companies for a user with aggregated stats
 */
export async function getCompaniesWithStats(
  supabase: SupabaseClient,
  userId: string
): Promise<CompanyWithStats[]> {
  // Get companies
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("name")
  
  if (companiesError || !companies) {
    console.error("Error fetching companies:", companiesError)
    return []
  }
  
  // Get jobs for stats aggregation
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      company_id,
      company_name,
      status,
      created_at,
      job_scores (overall_score),
      generated_documents (document_type)
    `)
    .eq("user_id", userId)
    .is("deleted_at", null)
  
  if (jobsError) {
    console.error("Error fetching jobs for stats:", jobsError)
    return companies.map(c => ({
      ...c,
      job_count: 0,
      applied_count: 0,
      ready_count: 0,
      avg_score: null,
      latest_activity: c.created_at,
      has_resume: false,
      has_cover_letter: false,
    }))
  }
  
  // Aggregate stats per company
  const statsMap = new Map<string, {
    job_count: number
    applied_count: number
    ready_count: number
    scores: number[]
    latest_activity: string
    has_resume: boolean
    has_cover_letter: boolean
  }>()
  
  for (const job of (jobs || [])) {
    const companyId = job.company_id
    if (!companyId) continue
    
    const stats = statsMap.get(companyId) || {
      job_count: 0,
      applied_count: 0,
      ready_count: 0,
      scores: [],
      latest_activity: job.created_at,
      has_resume: false,
      has_cover_letter: false,
    }
    
    stats.job_count++
    
    const status = job.status?.toLowerCase()
    if (["applied", "interviewing", "offered"].includes(status)) {
      stats.applied_count++
    }
    if (status === "ready") {
      stats.ready_count++
    }
    
    const scores = job.job_scores as Array<{ overall_score?: number }> | undefined
    if (scores?.[0]?.overall_score) {
      stats.scores.push(scores[0].overall_score)
    }
    
    if (new Date(job.created_at) > new Date(stats.latest_activity)) {
      stats.latest_activity = job.created_at
    }
    
    const docs = job.generated_documents as Array<{ document_type: string }> | undefined
    if (docs) {
      for (const doc of docs) {
        if (doc.document_type === "resume") stats.has_resume = true
        if (doc.document_type === "cover_letter") stats.has_cover_letter = true
      }
    }
    
    statsMap.set(companyId, stats)
  }
  
  // Also handle jobs without company_id (legacy) - group by normalized name
  const legacyJobs = (jobs || []).filter(j => !j.company_id && j.company_name)
  const legacyByCompany = new Map<string, typeof legacyJobs>()
  
  for (const job of legacyJobs) {
    const normalized = normalizeCompanyName(job.company_name || "")
    const existing = legacyByCompany.get(normalized) || []
    existing.push(job)
    legacyByCompany.set(normalized, existing)
  }
  
  // Match legacy jobs to companies by normalized name
  for (const company of companies) {
    const legacyJobsForCompany = legacyByCompany.get(company.normalized_name) || []
    if (legacyJobsForCompany.length > 0) {
      const stats = statsMap.get(company.id) || {
        job_count: 0,
        applied_count: 0,
        ready_count: 0,
        scores: [],
        latest_activity: company.created_at,
        has_resume: false,
        has_cover_letter: false,
      }
      
      for (const job of legacyJobsForCompany) {
        stats.job_count++
        const status = job.status?.toLowerCase()
        if (["applied", "interviewing", "offered"].includes(status)) {
          stats.applied_count++
        }
        if (status === "ready") {
          stats.ready_count++
        }
        
        const scores = job.job_scores as Array<{ overall_score?: number }> | undefined
        if (scores?.[0]?.overall_score) {
          stats.scores.push(scores[0].overall_score)
        }
        
        if (new Date(job.created_at) > new Date(stats.latest_activity)) {
          stats.latest_activity = job.created_at
        }
      }
      
      statsMap.set(company.id, stats)
    }
  }
  
  // Build final result
  return companies.map(company => {
    const stats = statsMap.get(company.id)
    return {
      ...company,
      job_count: stats?.job_count || 0,
      applied_count: stats?.applied_count || 0,
      ready_count: stats?.ready_count || 0,
      avg_score: stats?.scores.length 
        ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
        : null,
      latest_activity: stats?.latest_activity || company.created_at,
      has_resume: stats?.has_resume || false,
      has_cover_letter: stats?.has_cover_letter || false,
    }
  })
}

/**
 * Get jobs for a specific company
 */
export async function getJobsForCompany(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
) {
  // Get company first
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("user_id", userId)
    .single()
  
  if (companyError || !company) {
    return { company: null, jobs: [] }
  }
  
  // Get jobs linked to this company OR matching by normalized name
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      *,
      job_scores (
        overall_score,
        confidence_score
      ),
      generated_documents (
        document_type,
        content,
        created_at
      )
    `)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .or(`company_id.eq.${companyId},and(company_id.is.null,company_name.ilike.%${company.normalized_name}%)`)
    .order("created_at", { ascending: false })
  
  if (jobsError) {
    console.error("Error fetching jobs for company:", jobsError)
    return { company, jobs: [] }
  }
  
  return { company, jobs: jobs || [] }
}

/**
 * Backfill company_id for existing jobs
 * Run this once after creating the companies table
 */
export async function backfillCompanyIds(
  supabase: SupabaseClient,
  userId: string
): Promise<{ updated: number; errors: string[] }> {
  // Get all jobs without company_id
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, company_name")
    .eq("user_id", userId)
    .is("company_id", null)
    .not("company_name", "is", null)
  
  if (error) {
    return { updated: 0, errors: [error.message] }
  }
  
  let updated = 0
  const errors: string[] = []
  
  for (const job of (jobs || [])) {
    if (!job.company_name) continue
    
    const result = await linkJobToCompany(supabase, userId, job.id, job.company_name)
    if ("error" in result) {
      errors.push(`Job ${job.id}: ${result.error}`)
    } else {
      updated++
    }
  }
  
  return { updated, errors }
}
