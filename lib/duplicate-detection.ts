/**
 * Duplicate job detection utilities
 * Handles various duplicate scenarios:
 * 1. Exact URL match
 * 2. Same company + same role title
 * 3. Same company + similar role (refreshed posting)
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeCompanyName } from "@/lib/company-utils"

export type DuplicateType = 
  | "exact_url"           // Same URL already exists
  | "exact_match"         // Same company + same role title
  | "similar_role"        // Same company + very similar role title
  | "refreshed_posting"   // Same company + same role, but potentially refreshed
  | "none"                // Not a duplicate

export interface DuplicateCheckResult {
  isDuplicate: boolean
  duplicateType: DuplicateType
  existingJobId?: string
  existingJob?: {
    id: string
    title: string
    company: string
    created_at: string
    status: string
    source_url: string | null
  }
  message?: string
}

/**
 * Normalize a role title for comparison
 */
export function normalizeRoleTitle(title: string): string {
  if (!title) return ""
  
  return title
    .toLowerCase()
    .trim()
    // Remove level indicators at the end
    .replace(/\s+(i|ii|iii|iv|v|1|2|3|4|5)$/i, "")
    // Remove common prefixes
    .replace(/^(sr\.?|jr\.?|senior|junior|lead|principal|staff|associate)\s+/i, "")
    // Normalize separators
    .replace(/[\/\-,]+/g, " ")
    // Normalize multiple spaces
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses a simple approach: ratio of matching words
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  const norm1 = normalizeRoleTitle(title1)
  const norm2 = normalizeRoleTitle(title2)
  
  if (norm1 === norm2) return 1.0
  
  const words1 = new Set(norm1.split(" ").filter(w => w.length > 2))
  const words2 = new Set(norm2.split(" ").filter(w => w.length > 2))
  
  if (words1.size === 0 || words2.size === 0) return 0
  
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

/**
 * Check for duplicate jobs
 * Returns the duplicate type and existing job if found
 */
export async function checkForDuplicate(
  supabase: SupabaseClient,
  userId: string,
  companyName: string,
  roleTitle: string,
  sourceUrl?: string
): Promise<DuplicateCheckResult> {
  const normalizedCompany = normalizeCompanyName(companyName)
  const normalizedTitle = normalizeRoleTitle(roleTitle)
  
  // First, check exact URL match (fastest)
  if (sourceUrl) {
    const { data: urlMatch } = await supabase
      .from("jobs")
      .select("id, role_title, company_name, created_at, status, job_url")
      .eq("user_id", userId)
      .eq("job_url", sourceUrl)
      .is("deleted_at", null)
      .maybeSingle()
    
    if (urlMatch) {
      return {
        isDuplicate: true,
        duplicateType: "exact_url",
        existingJobId: urlMatch.id,
        existingJob: {
          id: urlMatch.id,
          title: urlMatch.role_title || "Unknown",
          company: urlMatch.company_name || "Unknown",
          created_at: urlMatch.created_at,
          status: urlMatch.status,
          source_url: urlMatch.job_url,
        },
        message: `This exact job URL is already in your pipeline.`,
      }
    }
  }
  
  // Next, check for same company (using normalized name)
  // This requires fetching jobs and comparing normalized company names
  const { data: companyJobs } = await supabase
    .from("jobs")
    .select("id, role_title, company_name, created_at, status, job_url")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("company_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(100)
  
  if (!companyJobs || companyJobs.length === 0) {
    return { isDuplicate: false, duplicateType: "none" }
  }
  
  // Find jobs from the same company
  const sameCompanyJobs = companyJobs.filter(job => 
    normalizeCompanyName(job.company_name || "") === normalizedCompany
  )
  
  if (sameCompanyJobs.length === 0) {
    return { isDuplicate: false, duplicateType: "none" }
  }
  
  // Check for exact role match
  const exactRoleMatch = sameCompanyJobs.find(job => 
    normalizeRoleTitle(job.role_title || "") === normalizedTitle
  )
  
  if (exactRoleMatch) {
    // Determine if this is a refreshed posting or exact duplicate
    const daysSinceOriginal = Math.floor(
      (Date.now() - new Date(exactRoleMatch.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceOriginal > 30) {
      // Older than 30 days - likely a refreshed posting
      return {
        isDuplicate: true,
        duplicateType: "refreshed_posting",
        existingJobId: exactRoleMatch.id,
        existingJob: {
          id: exactRoleMatch.id,
          title: exactRoleMatch.role_title || "Unknown",
          company: exactRoleMatch.company_name || "Unknown",
          created_at: exactRoleMatch.created_at,
          status: exactRoleMatch.status,
          source_url: exactRoleMatch.job_url,
        },
        message: `You analyzed this same role ${daysSinceOriginal} days ago. This may be a refreshed posting.`,
      }
    }
    
    return {
      isDuplicate: true,
      duplicateType: "exact_match",
      existingJobId: exactRoleMatch.id,
      existingJob: {
        id: exactRoleMatch.id,
        title: exactRoleMatch.role_title || "Unknown",
        company: exactRoleMatch.company_name || "Unknown",
        created_at: exactRoleMatch.created_at,
        status: exactRoleMatch.status,
        source_url: exactRoleMatch.job_url,
      },
      message: `This exact role at ${companyName} is already in your pipeline.`,
    }
  }
  
  // Check for similar role titles (>70% similarity)
  for (const job of sameCompanyJobs) {
    const similarity = calculateTitleSimilarity(roleTitle, job.role_title || "")
    if (similarity >= 0.7) {
      return {
        isDuplicate: true,
        duplicateType: "similar_role",
        existingJobId: job.id,
        existingJob: {
          id: job.id,
          title: job.role_title || "Unknown",
          company: job.company_name || "Unknown",
          created_at: job.created_at,
          status: job.status,
          source_url: job.job_url,
        },
        message: `A similar role "${job.role_title}" at ${companyName} is already in your pipeline.`,
      }
    }
  }
  
  // Not a duplicate - but note we have other roles at this company
  return { 
    isDuplicate: false, 
    duplicateType: "none",
    message: sameCompanyJobs.length > 0 
      ? `You have ${sameCompanyJobs.length} other role(s) at ${companyName}.`
      : undefined,
  }
}

/**
 * UI-friendly duplicate response
 */
export interface DuplicateResponse {
  shouldBlock: boolean
  warningLevel: "error" | "warning" | "info" | "none"
  title: string
  message: string
  existingJobId?: string
  allowContinue: boolean
}

export function getDuplicateResponse(result: DuplicateCheckResult): DuplicateResponse {
  switch (result.duplicateType) {
    case "exact_url":
      return {
        shouldBlock: true,
        warningLevel: "error",
        title: "Duplicate URL",
        message: result.message || "This job URL already exists in your pipeline.",
        existingJobId: result.existingJobId,
        allowContinue: false,
      }
    
    case "exact_match":
      return {
        shouldBlock: true,
        warningLevel: "warning",
        title: "Duplicate Role",
        message: result.message || "This exact role is already in your pipeline.",
        existingJobId: result.existingJobId,
        allowContinue: true, // User can choose to add anyway
      }
    
    case "refreshed_posting":
      return {
        shouldBlock: false,
        warningLevel: "info",
        title: "Possible Refresh",
        message: result.message || "This may be a refreshed version of a role you analyzed earlier.",
        existingJobId: result.existingJobId,
        allowContinue: true,
      }
    
    case "similar_role":
      return {
        shouldBlock: false,
        warningLevel: "info",
        title: "Similar Role Exists",
        message: result.message || "A similar role at this company is already in your pipeline.",
        existingJobId: result.existingJobId,
        allowContinue: true,
      }
    
    default:
      return {
        shouldBlock: false,
        warningLevel: "none",
        title: "",
        message: "",
        allowContinue: true,
      }
  }
}
