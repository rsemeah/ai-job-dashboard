/**
 * HireWire Structured Document Types
 * 
 * These types define the JSON structure for resumes and cover letters
 * that can be rendered to multiple formats (DOCX, PDF, HTML)
 */

import { ResumeTemplateType } from "./types"

// ============================================================================
// STRUCTURED RESUME
// ============================================================================

export interface StructuredResume {
  // Meta
  templateType: ResumeTemplateType
  generatedAt: string
  jobId: string
  version: string
  
  // Basics
  basics: {
    name: string
    email: string
    phone?: string
    location?: string
    linkedinUrl?: string
    githubUrl?: string
    portfolioUrl?: string
  }
  
  // Summary
  summary: string
  
  // Skills (grouped for technical resumes)
  skills: SkillGroup[]
  
  // Experience
  experience: ExperienceEntry[]
  
  // Education
  education: EducationEntry[]
  
  // Projects (primarily for technical resumes)
  projects?: ProjectEntry[]
  
  // Certifications
  certifications?: CertificationEntry[]
  
  // Publications (primarily for CVs)
  publications?: PublicationEntry[]
  
  // Awards
  awards?: AwardEntry[]
  
  // ATS metadata
  atsKeywords: string[]
  
  // Template-specific metadata
  templateMeta: {
    sectionOrder: string[]
    emphasisAreas: string[]
    pageCount: number
  }
  
  // Provenance tracking
  provenance: BulletProvenanceEntry[]
}

export interface SkillGroup {
  category: string
  skills: string[]
}

export interface ExperienceEntry {
  id: string
  title: string
  company: string
  location?: string
  startDate: string
  endDate?: string
  isCurrent: boolean
  bullets: ExperienceBullet[]
}

export interface ExperienceBullet {
  text: string
  evidenceId?: string
  matchedRequirement?: string
  keywordsUsed: string[]
  hasMetric: boolean
}

export interface EducationEntry {
  degree: string
  school: string
  field?: string
  graduationYear?: string
  honors?: string
  gpa?: string
}

export interface ProjectEntry {
  id: string
  title: string
  description: string
  techStack: string[]
  impact: string
  url?: string
  githubUrl?: string
}

export interface CertificationEntry {
  name: string
  issuer: string
  dateObtained: string
  expiryDate?: string
  credentialId?: string
  url?: string
}

export interface PublicationEntry {
  title: string
  venue: string
  date: string
  url?: string
  coAuthors?: string[]
  type: "journal" | "conference" | "book_chapter" | "whitepaper" | "other"
}

export interface AwardEntry {
  title: string
  issuer: string
  date: string
  description?: string
}

export interface BulletProvenanceEntry {
  bulletText: string
  sourceEvidenceId: string
  sourceEvidenceTitle: string
  sourceRole: string
  sourceCompany: string
  matchedRequirementText?: string
  claimConfidence: "high" | "medium" | "low"
}

// ============================================================================
// STRUCTURED COVER LETTER
// ============================================================================

export interface StructuredCoverLetter {
  // Meta
  templateType: ResumeTemplateType
  generatedAt: string
  jobId: string
  version: string
  
  // Recipient info
  recipient: {
    name?: string
    title?: string
    company: string
    department?: string
  }
  
  // Opening
  opening: {
    greeting: string
    hookParagraph: string
  }
  
  // Body sections
  bodySections: CoverLetterSection[]
  
  // Closing
  closing: {
    callToAction: string
    signoff: string
    senderName: string
  }
  
  // Template metadata
  templateMeta: {
    tone: "formal" | "professional" | "conversational"
    length: "short" | "standard" | "detailed"
    emphasisAreas: string[]
  }
  
  // Provenance tracking
  provenance: ParagraphProvenanceEntry[]
}

export interface CoverLetterSection {
  id: string
  themeAddressed: string
  paragraphText: string
  evidenceIdsUsed: string[]
  claimConfidence: "high" | "medium" | "low"
}

export interface ParagraphProvenanceEntry {
  paragraphId: string
  themeAddressed: string
  evidenceIdsUsed: string[]
  claimConfidence: "high" | "medium" | "low"
}

// ============================================================================
// EXPORT FORMATS
// ============================================================================

export type ExportFormat = "docx" | "pdf" | "txt" | "html"

export interface ExportOptions {
  format: ExportFormat
  templateType: ResumeTemplateType
  includeProvenance?: boolean
  filename?: string
}

export interface ExportResult {
  success: boolean
  format: ExportFormat
  filename: string
  mimeType: string
  data: Buffer | string
  error?: string
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

export interface TemplateRenderer {
  id: string
  name: string
  templateType: ResumeTemplateType
  supportsDocx: boolean
  supportsPdf: boolean
  supportsHtml: boolean
  render: (doc: StructuredResume | StructuredCoverLetter, format: ExportFormat) => Promise<ExportResult>
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert plain text resume to structured format
 */
export function parseResumeToStructured(
  plainText: string,
  profile: {
    full_name?: string
    email?: string
    phone?: string
    location?: string
    linkedinUrl?: string
    githubUrl?: string
    portfolioUrl?: string
    education?: { degree: string; school: string; year?: string }[]
    skills?: string[]
  },
  jobId: string,
  templateType: ResumeTemplateType,
  provenance: BulletProvenanceEntry[]
): StructuredResume {
  // Parse sections from plain text
  const sections = plainText.split(/\n\n+/)
  
  // Extract summary (usually after header)
  const summaryMatch = plainText.match(/SUMMARY\n([\s\S]*?)(?=\n[A-Z]+\n|$)/)
  const summary = summaryMatch?.[1]?.trim() || ""
  
  // Extract experience bullets
  const experienceMatch = plainText.match(/EXPERIENCE\n([\s\S]*?)(?=\nSKILLS\n|$)/)
  const experienceText = experienceMatch?.[1]?.trim() || ""
  const bullets = experienceText
    .split("\n")
    .filter(line => line.startsWith("•"))
    .map(line => line.replace(/^•\s*/, "").trim())
  
  // Extract skills
  const skillsMatch = plainText.match(/SKILLS\n([\s\S]*?)(?=\nEDUCATION\n|$)/)
  const skillsText = skillsMatch?.[1]?.trim() || ""
  const skills = skillsText.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  
  // Build experience entry from bullets
  const experienceEntry: ExperienceEntry = {
    id: "exp-1",
    title: provenance[0]?.sourceRole || "Professional",
    company: provenance[0]?.sourceCompany || "Company",
    startDate: "",
    isCurrent: true,
    bullets: bullets.map((text, i) => ({
      text,
      evidenceId: provenance[i]?.sourceEvidenceId,
      matchedRequirement: provenance[i]?.matchedRequirementText,
      keywordsUsed: [],
      hasMetric: /\d+%|\$\d+|\d+\s*(users|customers|team|engineers|people)/i.test(text),
    })),
  }
  
  return {
    templateType,
    generatedAt: new Date().toISOString(),
    jobId,
    version: "1.0",
    basics: {
      name: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone,
      location: profile.location,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
    },
    summary,
    skills: skills.length > 0 ? [{ category: "Skills", skills }] : [],
    experience: [experienceEntry],
    education: (profile.education || []).map(edu => ({
      degree: edu.degree,
      school: edu.school,
      graduationYear: edu.year,
    })),
    atsKeywords: skills.slice(0, 10),
    templateMeta: {
      sectionOrder: ["basics", "summary", "experience", "skills", "education"],
      emphasisAreas: ["experience"],
      pageCount: 1,
    },
    provenance,
  }
}

/**
 * Convert plain text cover letter to structured format
 */
export function parseCoverLetterToStructured(
  plainText: string,
  company: string,
  jobId: string,
  templateType: ResumeTemplateType,
  provenance: ParagraphProvenanceEntry[]
): StructuredCoverLetter {
  const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  return {
    templateType,
    generatedAt: new Date().toISOString(),
    jobId,
    version: "1.0",
    recipient: {
      company,
    },
    opening: {
      greeting: "Dear Hiring Manager,",
      hookParagraph: paragraphs[0] || "",
    },
    bodySections: paragraphs.slice(1, -1).map((text, i) => ({
      id: `section-${i}`,
      themeAddressed: provenance[i + 1]?.themeAddressed || "Experience",
      paragraphText: text,
      evidenceIdsUsed: provenance[i + 1]?.evidenceIdsUsed || [],
      claimConfidence: provenance[i + 1]?.claimConfidence || "medium",
    })),
    closing: {
      callToAction: paragraphs[paragraphs.length - 1] || "",
      signoff: "Best regards,",
      senderName: "",
    },
    templateMeta: {
      tone: "professional",
      length: paragraphs.length <= 3 ? "short" : "standard",
      emphasisAreas: [],
    },
    provenance,
  }
}
