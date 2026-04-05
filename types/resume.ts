export interface ParsedResumeExperience {
  title: string;
  company: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  bullets?: string[];
}

export interface ParsedResumeEducation {
  school: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  graduationDate?: string | null;
  description?: string | null;
}

export interface ParsedResumeSkill {
  name: string;
  category?: string | null;
}

export interface ParsedResumeData {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  // Links
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  portfolioUrl?: string | null;
  // Main content
  experience: ParsedResumeExperience[];
  education?: ParsedResumeEducation[];
  skills?: ParsedResumeSkill[];
  certifications?: string[];
  rawText?: string | null;
}
