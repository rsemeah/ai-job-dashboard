/**
 * Parser Registry - Source-specific job page parsing.
 * Minimal implementations for separation, not over-engineered.
 */

import type { JobSource } from "@/lib/schemas/job-intake"

export interface ParsedJobContent {
  /** Cleaned text content for LLM analysis */
  text: string
  /** Source-specific metadata extracted during parsing */
  metadata: {
    source: JobSource
    /** Structured job ID if extractable from URL/page */
    externalJobId?: string
    /** Company name if extractable before LLM */
    companyHint?: string
  }
}

export interface JobParser {
  /** Source this parser handles */
  source: JobSource
  /** Parse raw HTML into cleaned content */
  parse(html: string, url: string): ParsedJobContent
}

// Import source-specific parsers
import { greenhouseParser } from "./greenhouse"
import { leverParser } from "./lever"
import { linkedinParser } from "./linkedin"
import { workdayParser } from "./workday"
import { genericParser } from "./generic"

// Parser registry
const parsers: Map<JobSource, JobParser> = new Map([
  ["GREENHOUSE", greenhouseParser],
  ["LEVER", leverParser],
  ["LINKEDIN", linkedinParser],
  ["WORKDAY", workdayParser],
])

/**
 * Get the appropriate parser for a job source.
 * Falls back to generic parser for unknown sources.
 */
export function getParser(source: JobSource): JobParser {
  return parsers.get(source) || genericParser
}

/**
 * Detect job source from URL.
 */
export function detectSource(url: string): JobSource {
  const lowercase = url.toLowerCase()
  if (lowercase.includes("greenhouse.io")) return "GREENHOUSE"
  if (lowercase.includes("lever.co")) return "LEVER"
  if (lowercase.includes("linkedin.com")) return "LINKEDIN"
  if (lowercase.includes("indeed.com")) return "INDEED"
  if (lowercase.includes("workday.com") || lowercase.includes("myworkdayjobs.com")) return "WORKDAY"
  if (lowercase.includes("ashbyhq.com")) return "ASHBY"
  if (lowercase.includes("icims.com")) return "ICIMS"
  if (lowercase.includes("smartrecruiters.com")) return "SMARTRECRUITERS"
  return "OTHER"
}

/**
 * Parse job page content using source-appropriate parser.
 */
export function parseJobPage(html: string, url: string): ParsedJobContent {
  const source = detectSource(url)
  const parser = getParser(source)
  return parser.parse(html, url)
}
