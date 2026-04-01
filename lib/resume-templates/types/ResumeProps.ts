// HireWire Resume Template Props
// Single source of truth for all 20 template components
// All fields optional except name — templates degrade gracefully

export interface ResumeContact {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
}

export interface ResumeExperienceItem {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string; // undefined = "Present"
  bullets: string[]; // evidence-matched bullets from HireWire generation
  keywords?: string[]; // job-specific keywords injected by generation layer
}

export interface ResumeEducationItem {
  institution: string;
  degree: string;
  field?: string;
  graduationDate?: string;
  gpa?: string;
  honors?: string[];
}

export interface ResumeCertification {
  name: string;
  issuer?: string;
  date?: string;
  credentialId?: string;
}

export interface ResumeSkillGroup {
  category: string; // e.g. "Languages", "Frameworks", "Tools"
  skills: string[];
}

export interface ResumeProject {
  name: string;
  description?: string;
  url?: string;
  highlights?: string[];
}

export interface ResumePublication {
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
}

export interface ScoringMetadata {
  fitScore?: number;         // 0–100
  confidenceScore?: number;  // 0–100
  keywordMatchRate?: number; // 0–100
  showScores?: boolean;      // default false — gates display
}

export interface ResumeProps {
  // Identity
  name: string;
  title?: string; // professional headline / target role
  contact?: ResumeContact;
  summary?: string;

  // Core sections
  experience?: ResumeExperienceItem[];
  education?: ResumeEducationItem[];
  skills?: ResumeSkillGroup[];
  certifications?: ResumeCertification[];

  // Extended sections
  projects?: ResumeProject[];
  publications?: ResumePublication[];
  languages?: string[];
  volunteerWork?: string[];
  awards?: string[];

  // Template control
  templateId: TemplateId;
  accentColor?: string; // override per-template default

  // HireWire generation metadata
  targetJobTitle?: string;
  targetIndustry?: string;
  scoring?: ScoringMetadata;

  // Print/export control
  pageBreakAfterSummary?: boolean;
  compactMode?: boolean; // reduces spacing for 1-page fit
}

// All 20 template IDs
export type TemplateId =
  // Technology
  | "tech-engineer"
  | "tech-lead"
  // Finance
  | "finance-analyst"
  | "finance-director"
  // Healthcare
  | "health-clinical"
  | "health-admin"
  // Creative & Marketing
  | "creative-ic"
  | "creative-lead"
  // Legal
  | "legal-associate"
  | "legal-partner"
  // Education
  | "edu-teacher"
  | "edu-admin"
  // Consulting & Strategy
  | "consulting-analyst"
  | "consulting-principal"
  // Sales & BD
  | "sales-ic"
  | "sales-vp"
  // Operations & Supply Chain
  | "ops-coordinator"
  | "ops-director"
  // Executive & General
  | "exec-senior-ic"
  | "exec-csuite";
