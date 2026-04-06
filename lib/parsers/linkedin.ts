import type { JobParser, ParsedJobContent } from "./index"
import type { JobSource } from "@/lib/schemas/job-intake"
import { cleanHtml } from "./generic"

/**
 * LinkedIn-specific parser.
 * LinkedIn pages are JS-heavy, but we can extract structured data from:
 * 1. JSON-LD schema.org markup
 * 2. Meta tags
 * 3. Specific HTML patterns
 */
export const linkedinParser: JobParser = {
  source: "LINKEDIN" as JobSource,
  
  parse(html: string, url: string): ParsedJobContent {
    // Try to extract JSON-LD structured data first
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    let structuredData: Record<string, unknown> | null = null
    
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1])
        // Handle array of schemas or single schema
        structuredData = Array.isArray(parsed) 
          ? parsed.find((p: Record<string, unknown>) => p["@type"] === "JobPosting") 
          : (parsed["@type"] === "JobPosting" ? parsed : null)
      } catch {
        // JSON-LD parsing failed, continue with HTML extraction
      }
    }
    
    // Extract from meta tags
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    const companyMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i)
    
    // Try to extract from HTML title
    const htmlTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    
    // LinkedIn-specific patterns for job content
    // Look for common job description containers
    const descriptionPatterns = [
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*class="[^"]*jobs-description[^"]*"[^>]*>([\s\S]*?)<\/article>/i,
    ]
    
    let jobDescription = ""
    for (const pattern of descriptionPatterns) {
      const match = html.match(pattern)
      if (match && match[1].length > jobDescription.length) {
        jobDescription = cleanHtml(match[1])
      }
    }
    
    // Build extracted content for LLM
    const parts: string[] = []
    
    // Add structured data if available
    if (structuredData) {
      const sd = structuredData as {
        title?: string
        hiringOrganization?: { name?: string }
        jobLocation?: { address?: { addressLocality?: string; addressRegion?: string } }
        description?: string
        qualifications?: string
        employmentType?: string
        baseSalary?: { value?: { minValue?: number; maxValue?: number }; currency?: string }
      }
      if (sd.title) parts.push(`Job Title: ${sd.title}`)
      if (sd.hiringOrganization?.name) parts.push(`Company: ${sd.hiringOrganization.name}`)
      if (sd.jobLocation?.address) {
        const loc = sd.jobLocation.address
        parts.push(`Location: ${loc.addressLocality || ""} ${loc.addressRegion || ""}`.trim())
      }
      if (sd.employmentType) parts.push(`Employment Type: ${sd.employmentType}`)
      if (sd.baseSalary) {
        const sal = sd.baseSalary
        if (sal.value) {
          parts.push(`Salary: ${sal.currency || ""} ${sal.value.minValue || ""} - ${sal.value.maxValue || ""}`.trim())
        }
      }
      if (sd.description) parts.push(`Description: ${cleanHtml(String(sd.description))}`)
      if (sd.qualifications) parts.push(`Qualifications: ${cleanHtml(String(sd.qualifications))}`)
    }
    
    // Add meta tag content
    if (titleMatch?.[1]) parts.push(`Title (from meta): ${decodeHtmlEntities(titleMatch[1])}`)
    if (descMatch?.[1]) parts.push(`Summary: ${decodeHtmlEntities(descMatch[1])}`)
    
    // Add extracted job description
    if (jobDescription && jobDescription.length > 100) {
      parts.push(`Job Description:\n${jobDescription}`)
    }
    
    // If we got meaningful structured content, use it
    if (parts.length > 0 && parts.join("\n").length > 200) {
      return {
        text: parts.join("\n\n").slice(0, 15000),
        metadata: {
          source: "LINKEDIN",
          externalJobId: extractLinkedInJobId(url),
          companyHint: structuredData?.hiringOrganization?.name as string | undefined,
        },
      }
    }
    
    // Fallback: Clean the whole HTML (LinkedIn often blocks scrapers)
    // Add a note to the LLM about potentially incomplete data
    const fallbackText = cleanHtml(html)
    const hasContent = fallbackText.length > 500 && !fallbackText.includes("Sign in") && !fallbackText.includes("Join now")
    
    if (!hasContent) {
      // LinkedIn is blocking us - return a helpful message for the LLM
      return {
        text: `LinkedIn Job Page - Content could not be fully extracted due to authentication requirements.
URL: ${url}
Job ID: ${extractLinkedInJobId(url) || "unknown"}
${htmlTitleMatch?.[1] ? `Page Title: ${htmlTitleMatch[1]}` : ""}

Note: LinkedIn requires authentication to view full job details. The analysis may be limited.
Available content: ${fallbackText.slice(0, 2000)}`,
        metadata: {
          source: "LINKEDIN",
          externalJobId: extractLinkedInJobId(url),
        },
      }
    }
    
    return {
      text: fallbackText,
      metadata: {
        source: "LINKEDIN",
        externalJobId: extractLinkedInJobId(url),
      },
    }
  },
}

function extractLinkedInJobId(url: string): string | undefined {
  // LinkedIn job URLs: linkedin.com/jobs/view/1234567890
  const match = url.match(/jobs\/view\/(\d+)/)
  return match?.[1]
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}
