import type { JobParser, ParsedJobContent } from "./index"
import type { JobSource } from "@/lib/schemas/job-intake"
import { cleanHtml } from "./generic"

/**
 * Workday parser - handles myworkdayjobs.com URLs.
 * Workday sites are heavily JS-rendered and often return minimal HTML.
 * This parser extracts what it can from meta tags and provides helpful context.
 */
export const workdayParser: JobParser = {
  source: "WORKDAY" as JobSource,
  
  parse(html: string, url: string): ParsedJobContent {
    // Try to extract metadata from head tags (often present even without JS)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const metaDescription = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    
    // Extract job ID from URL
    const jobIdMatch = url.match(/[_-]([A-Z0-9]+)(?:\?|$)/i)
    const externalJobId = jobIdMatch?.[1]
    
    // Extract company hint from URL subdomain
    const companyMatch = url.match(/https?:\/\/([^.]+)\./i)
    const companyHint = companyMatch?.[1]?.replace(/wd\d+$/, '')?.replace(/[-_]/g, ' ') || undefined
    
    // Build content from available sources
    const parts: string[] = []
    
    // Add title
    const title = ogTitle?.[1] || titleMatch?.[1]?.replace(/\s*[-|].*$/, '') || ''
    if (title) {
      parts.push(`Job Title: ${title}`)
    }
    
    // Add company hint
    if (companyHint) {
      parts.push(`Company: ${companyHint}`)
    }
    
    // Add description
    const description = ogDescription?.[1] || metaDescription?.[1] || ''
    if (description) {
      parts.push(`Description: ${description}`)
    }
    
    // Clean and add any body content we can get
    const bodyContent = cleanHtml(html)
    if (bodyContent.length > 50) {
      parts.push(`Page Content: ${bodyContent}`)
    }
    
    // If we got very little content, add a note for the LLM
    const text = parts.join('\n\n')
    const finalText = text.length < 100 
      ? `[LIMITED CONTENT - Workday site requires JavaScript]\nURL: ${url}\n\n${text}\n\nNote: This Workday job page returned limited content. Extract what you can from the available text. Use null for any fields you cannot determine.`
      : text
    
    return {
      text: finalText,
      metadata: {
        source: "WORKDAY" as JobSource,
        externalJobId,
        companyHint,
      },
    }
  },
}
