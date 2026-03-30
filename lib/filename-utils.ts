/**
 * HireWire Filename Utilities
 * 
 * Centralized filename generation for resumes and cover letters.
 * Ensures consistent naming convention across all exports.
 * 
 * Convention:
 * - Resume: {CandidateName}_{Role}_{Company}_Resume.{ext}
 * - Cover Letter: {CandidateName}_{Role}_{Company}_CoverLetter.{ext}
 * 
 * Examples:
 * - Alex Chen_Senior Product Manager_OpenAI_Resume.pdf
 * - Alex Chen_AI Technical Product Manager_Stripe_CoverLetter.docx
 */

export type DocumentType = "resume" | "cover_letter"
export type ExportExtension = "pdf" | "docx" | "txt" | "html"

export interface FilenameParams {
  candidateName: string
  role?: string
  company?: string
  documentType: DocumentType
  extension: ExportExtension
}

/**
 * Sanitizes a string for use in filenames.
 * - Replaces illegal characters
 * - Replaces multiple spaces with single space
 * - Trims whitespace
 * - Preserves readable capitalization
 * - Optionally preserves spaces (for names) or converts to underscores (for roles/companies)
 */
function sanitizeForFilename(input: string, preserveSpaces: boolean = false): string {
  if (!input || typeof input !== "string") return ""
  
  let result = input
    // Replace illegal filename characters: / \ : * ? " < > | with space
    .replace(/[/\\:*?"<>|]/g, " ")
    // Replace other common special characters
    .replace(/[,;()[\]{}#@!$%^&+=~`]/g, " ")
    // Replace newlines and tabs
    .replace(/[\n\r\t]/g, " ")
    // Replace multiple spaces with single space
    .replace(/\s+/g, " ")
    // Trim leading/trailing whitespace
    .trim()
  
  if (!preserveSpaces) {
    result = result
      // Replace remaining spaces with underscore for filename
      .replace(/\s/g, "_")
      // Remove multiple underscores
      .replace(/_+/g, "_")
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, "")
  }
  
  return result
}

/**
 * Formats candidate name for filename.
 * Keeps readable capitalization and preserves spaces.
 * Example: "Alex Chen" stays as "Alex Chen"
 */
function formatCandidateName(name: string): string {
  const sanitized = sanitizeForFilename(name, true) // Preserve spaces in name
  if (!sanitized) return "Candidate"
  return sanitized
}

/**
 * Formats role/title for filename.
 * Returns fallback if empty.
 */
function formatRole(role: string | undefined): string {
  if (!role || !role.trim()) return "General"
  const sanitized = sanitizeForFilename(role)
  // Truncate very long titles
  if (sanitized.length > 50) {
    return sanitized.slice(0, 50).replace(/_+$/, "")
  }
  return sanitized
}

/**
 * Formats company name for filename.
 * Returns fallback if empty.
 */
function formatCompany(company: string | undefined): string {
  if (!company || !company.trim()) return "Application"
  const sanitized = sanitizeForFilename(company)
  // Truncate very long company names
  if (sanitized.length > 30) {
    return sanitized.slice(0, 30).replace(/_+$/, "")
  }
  return sanitized
}

/**
 * Generates a properly formatted filename for document export.
 * 
 * @param params - Parameters for filename generation
 * @returns Formatted filename string
 * 
 * @example
 * generateDocumentFilename({
 *   candidateName: "Alex Chen",
 *   role: "Senior Product Manager",
 *   company: "OpenAI",
 *   documentType: "resume",
 *   extension: "pdf"
 * })
 * // Returns: "Alex Chen_Senior_Product_Manager_OpenAI_Resume.pdf"
 */
export function generateDocumentFilename(params: FilenameParams): string {
  const {
    candidateName,
    role,
    company,
    documentType,
    extension,
  } = params
  
  const name = formatCandidateName(candidateName)
  const roleFormatted = formatRole(role)
  const companyFormatted = formatCompany(company)
  const docTypeSuffix = documentType === "resume" ? "Resume" : "CoverLetter"
  
  return `${name}_${roleFormatted}_${companyFormatted}_${docTypeSuffix}.${extension}`
}

/**
 * Generates filename for a general/fallback document.
 * Used when role or company is missing.
 */
export function generateFallbackFilename(
  candidateName: string,
  documentType: DocumentType,
  extension: ExportExtension
): string {
  const name = formatCandidateName(candidateName)
  const docTypeSuffix = documentType === "resume" ? "Resume" : "CoverLetter"
  const fallbackContext = documentType === "resume" ? "General_Resume" : "General_Application"
  
  return `${name}_${fallbackContext}_${docTypeSuffix}.${extension}`
}

/**
 * Parses an existing filename to extract components.
 * Useful for re-generating with different extension.
 */
export function parseDocumentFilename(filename: string): {
  candidateName: string
  role: string
  company: string
  documentType: DocumentType
  extension: ExportExtension
} | null {
  // Pattern: Name_Role_Company_DocType.ext
  const match = filename.match(/^(.+?)_(.+?)_(.+?)_(Resume|CoverLetter)\.(pdf|docx|txt|html)$/i)
  
  if (!match) return null
  
  return {
    candidateName: match[1].replace(/_/g, " "),
    role: match[2].replace(/_/g, " "),
    company: match[3].replace(/_/g, " "),
    documentType: match[4].toLowerCase() === "resume" ? "resume" : "cover_letter",
    extension: match[5].toLowerCase() as ExportExtension,
  }
}

/**
 * Validates that a filename follows the expected convention.
 */
export function isValidDocumentFilename(filename: string): boolean {
  return parseDocumentFilename(filename) !== null
}

/**
 * Gets the human-readable document type label.
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  return type === "resume" ? "Resume" : "Cover Letter"
}

/**
 * Gets the MIME type for a given extension.
 */
export function getMimeType(extension: ExportExtension): string {
  switch (extension) {
    case "pdf":
      return "application/pdf"
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    case "txt":
      return "text/plain"
    case "html":
      return "text/html"
  }
}

/**
 * Gets the file extension label for UI display.
 */
export function getExtensionLabel(extension: ExportExtension): string {
  switch (extension) {
    case "pdf":
      return "PDF"
    case "docx":
      return "Word Document"
    case "txt":
      return "Plain Text"
    case "html":
      return "HTML"
  }
}
