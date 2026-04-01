import type { JobParser, ParsedJobContent, JobSource } from "./index"

/**
 * Generic parser - fallback for unknown job sources.
 * Basic HTML cleaning without source-specific extraction.
 */
export const genericParser: JobParser = {
  source: "OTHER",
  
  parse(html: string, _url: string): ParsedJobContent {
    return {
      text: cleanHtml(html),
      metadata: {
        source: "OTHER" as JobSource,
      },
    }
  },
}

/**
 * Clean HTML to plain text for LLM processing.
 * Shared by all parsers.
 */
export function cleanHtml(html: string): string {
  return html
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove navigation elements
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    // Strip all HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim()
    // Limit content size for LLM
    .slice(0, 15000)
}
