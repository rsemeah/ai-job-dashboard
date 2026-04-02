import type { JobParser, ParsedJobContent } from "./index"
import { cleanHtml } from "./generic"

/**
 * Greenhouse parser - handles jobs.greenhouse.io URLs.
 * Extracts job ID and company from URL structure.
 */
export const greenhouseParser: JobParser = {
  source: "GREENHOUSE",
  
  parse(html: string, url: string): ParsedJobContent {
    // Extract job ID and company from URL
    // Format: https://boards.greenhouse.io/{company}/jobs/{jobId}
    const urlMatch = url.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/)
    const companyHint = urlMatch?.[1]?.replace(/-/g, " ")
    const externalJobId = urlMatch?.[2]

    // Clean HTML - Greenhouse has relatively clean structure
    const text = cleanHtml(html)

    return {
      text,
      metadata: {
        source: "GREENHOUSE",
        externalJobId,
        companyHint,
      },
    }
  },
}
