import type { JobParser, ParsedJobContent } from "./index"
import { cleanHtml } from "./generic"

/**
 * Lever parser - handles jobs.lever.co URLs.
 * Extracts company and job ID from URL structure.
 */
export const leverParser: JobParser = {
  source: "LEVER",
  
  parse(html: string, url: string): ParsedJobContent {
    // Extract company and job ID from URL
    // Format: https://jobs.lever.co/{company}/{jobId}
    const urlMatch = url.match(/lever\.co\/([^/]+)\/([a-f0-9-]+)/)
    const companyHint = urlMatch?.[1]?.replace(/-/g, " ")
    const externalJobId = urlMatch?.[2]

    // Clean HTML - Lever pages are generally clean
    const text = cleanHtml(html)

    return {
      text,
      metadata: {
        source: "LEVER",
        externalJobId,
        companyHint,
      },
    }
  },
}
