// HireWire Resume Template Style Configs
// Each config defines: layout, accent, typography weight, section order, and design personality
// All use HireWire design system: Barlow Condensed (headings), DM Sans (body), JetBrains Mono (data)

import { TemplateId } from "../types/ResumeProps";

export type LayoutVariant =
  | "single-column"        // ATS safest — single linear flow
  | "single-with-sidebar"  // visual sidebar for skills/contact, main for experience
  | "header-accent"        // bold header band, clean body
  | "executive-ruled"      // heavy ruled lines, structured hierarchy
  | "editorial";           // asymmetric header, magazine-feel

export type SectionKey =
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "certifications"
  | "projects"
  | "publications"
  | "languages"
  | "awards";

export interface TemplateConfig {
  id: TemplateId;
  label: string;
  industry: string;
  tier: "ic" | "senior-ic" | "manager" | "director" | "executive";
  layout: LayoutVariant;
  accentColor: string;
  headerStyle: "centered" | "left-aligned" | "split";
  sectionOrder: SectionKey[];
  typographyScale: "compact" | "standard" | "generous";
  ruleDividers: boolean;
  showSkillBadges: boolean; // pill badges vs plain list
  atsNote: string;
}

export const TEMPLATE_CONFIGS: Record<TemplateId, TemplateConfig> = {

  // ─── TECHNOLOGY ───────────────────────────────────────────────────────────

  "tech-engineer": {
    id: "tech-engineer",
    label: "Software Engineer",
    industry: "Technology",
    tier: "ic",
    layout: "single-column",
    accentColor: "#d90009",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "skills", "experience", "projects", "education", "certifications"],
    typographyScale: "compact",
    ruleDividers: true,
    showSkillBadges: true,
    atsNote: "Single column. Skills grouped by category. ATS-safe.",
  },

  "tech-lead": {
    id: "tech-lead",
    label: "Engineering Lead / Architect",
    industry: "Technology",
    tier: "director",
    layout: "header-accent",
    accentColor: "#1a1a2e",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "skills", "projects", "education", "certifications"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Header accent band. Experience-first for senior roles.",
  },

  // ─── FINANCE ──────────────────────────────────────────────────────────────

  "finance-analyst": {
    id: "finance-analyst",
    label: "Financial Analyst / Associate",
    industry: "Finance",
    tier: "ic",
    layout: "single-column",
    accentColor: "#0d3b66",
    headerStyle: "centered",
    sectionOrder: ["summary", "experience", "education", "certifications", "skills"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Conservative layout. Education prominence. CFA/CPA cert display.",
  },

  "finance-director": {
    id: "finance-director",
    label: "Finance Director / VP",
    industry: "Finance",
    tier: "director",
    layout: "executive-ruled",
    accentColor: "#0d3b66",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "education", "certifications", "awards"],
    typographyScale: "generous",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Ruled executive layout. Achievement-led bullets.",
  },

  // ─── HEALTHCARE ───────────────────────────────────────────────────────────

  "health-clinical": {
    id: "health-clinical",
    label: "Clinical / Nursing",
    industry: "Healthcare",
    tier: "ic",
    layout: "single-column",
    accentColor: "#1b6ca8",
    headerStyle: "centered",
    sectionOrder: ["summary", "certifications", "experience", "education", "skills", "languages"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: true,
    atsNote: "Certifications elevated. License/credential display prominent.",
  },

  "health-admin": {
    id: "health-admin",
    label: "Healthcare Administrator / Director",
    industry: "Healthcare",
    tier: "director",
    layout: "header-accent",
    accentColor: "#1b6ca8",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "education", "certifications", "awards"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Admin-focused. Outcome metrics in bullets.",
  },

  // ─── CREATIVE & MARKETING ─────────────────────────────────────────────────

  "creative-ic": {
    id: "creative-ic",
    label: "Designer / Copywriter / Marketer",
    industry: "Creative & Marketing",
    tier: "ic",
    layout: "editorial",
    accentColor: "#d90009",
    headerStyle: "split",
    sectionOrder: ["summary", "experience", "skills", "projects", "education"],
    typographyScale: "standard",
    ruleDividers: false,
    showSkillBadges: true,
    atsNote: "Editorial layout. Portfolio/project links prominent. ATS-safe single parse column.",
  },

  "creative-lead": {
    id: "creative-lead",
    label: "CMO / Brand Lead / Creative Director",
    industry: "Creative & Marketing",
    tier: "executive",
    layout: "header-accent",
    accentColor: "#2d2d2d",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "skills", "awards", "education"],
    typographyScale: "generous",
    ruleDividers: false,
    showSkillBadges: false,
    atsNote: "Strong brand hierarchy. Campaign results in bullets.",
  },

  // ─── LEGAL ────────────────────────────────────────────────────────────────

  "legal-associate": {
    id: "legal-associate",
    label: "Attorney / Paralegal / Associate",
    industry: "Legal",
    tier: "ic",
    layout: "single-column",
    accentColor: "#2c3e50",
    headerStyle: "centered",
    sectionOrder: ["summary", "experience", "education", "certifications", "publications", "awards"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Traditional legal format. Bar admission in certifications. Publication support.",
  },

  "legal-partner": {
    id: "legal-partner",
    label: "Partner / Senior Counsel",
    industry: "Legal",
    tier: "executive",
    layout: "executive-ruled",
    accentColor: "#1a1a1a",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "publications", "education", "certifications", "awards"],
    typographyScale: "generous",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Publications elevated for partner track. Heavy ruled hierarchy.",
  },

  // ─── EDUCATION ────────────────────────────────────────────────────────────

  "edu-teacher": {
    id: "edu-teacher",
    label: "Teacher / Instructor / Professor",
    industry: "Education",
    tier: "ic",
    layout: "single-column",
    accentColor: "#2e6b3e",
    headerStyle: "centered",
    sectionOrder: ["summary", "experience", "education", "certifications", "publications", "awards"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Credential and license focused. Teaching philosophy in summary.",
  },

  "edu-admin": {
    id: "edu-admin",
    label: "Principal / Dean / Administrator",
    industry: "Education",
    tier: "director",
    layout: "header-accent",
    accentColor: "#2e6b3e",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "education", "awards", "certifications"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Leadership outcomes in bullets. Academic hierarchy respected.",
  },

  // ─── CONSULTING & STRATEGY ────────────────────────────────────────────────

  "consulting-analyst": {
    id: "consulting-analyst",
    label: "Analyst / Consultant",
    industry: "Consulting & Strategy",
    tier: "ic",
    layout: "single-column",
    accentColor: "#4a4a8a",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "education", "skills", "certifications"],
    typographyScale: "compact",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Impact metrics in every bullet. STAR-format bullet support.",
  },

  "consulting-principal": {
    id: "consulting-principal",
    label: "Principal / Managing Director / Partner",
    industry: "Consulting & Strategy",
    tier: "executive",
    layout: "executive-ruled",
    accentColor: "#4a4a8a",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "education", "publications", "awards"],
    typographyScale: "generous",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Engagement portfolio in experience. Thought leadership in publications.",
  },

  // ─── SALES & BD ───────────────────────────────────────────────────────────

  "sales-ic": {
    id: "sales-ic",
    label: "Account Executive / SDR / BDR",
    industry: "Sales & Business Development",
    tier: "ic",
    layout: "single-with-sidebar",
    accentColor: "#d90009",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "skills", "education", "certifications"],
    typographyScale: "compact",
    ruleDividers: true,
    showSkillBadges: true,
    atsNote: "Quota metrics in every role. Revenue numbers prominent.",
  },

  "sales-vp": {
    id: "sales-vp",
    label: "VP Sales / CRO / Sales Director",
    industry: "Sales & Business Development",
    tier: "executive",
    layout: "header-accent",
    accentColor: "#8b1a1a",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "awards", "education", "certifications"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "ARR/pipeline/team size metrics. Awards section for President's Club etc.",
  },

  // ─── OPERATIONS & SUPPLY CHAIN ────────────────────────────────────────────

  "ops-coordinator": {
    id: "ops-coordinator",
    label: "Operations Coordinator / Analyst",
    industry: "Operations & Supply Chain",
    tier: "ic",
    layout: "single-column",
    accentColor: "#4a6741",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "skills", "certifications", "education"],
    typographyScale: "compact",
    ruleDividers: true,
    showSkillBadges: true,
    atsNote: "Process improvement metrics. Lean/Six Sigma cert display.",
  },

  "ops-director": {
    id: "ops-director",
    label: "Operations Director / COO",
    industry: "Operations & Supply Chain",
    tier: "executive",
    layout: "executive-ruled",
    accentColor: "#3a3a3a",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "education", "certifications", "awards"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Cost savings and efficiency metrics dominant. P&L ownership signals.",
  },

  // ─── EXECUTIVE & GENERAL ──────────────────────────────────────────────────

  "exec-senior-ic": {
    id: "exec-senior-ic",
    label: "Senior Individual Contributor",
    industry: "Cross-Industry",
    tier: "senior-ic",
    layout: "single-with-sidebar",
    accentColor: "#d90009",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "skills", "education", "certifications", "awards"],
    typographyScale: "standard",
    ruleDividers: true,
    showSkillBadges: true,
    atsNote: "Adaptable to any domain. Depth-of-expertise signals.",
  },

  "exec-csuite": {
    id: "exec-csuite",
    label: "C-Suite / Founder / Board",
    industry: "Cross-Industry",
    tier: "executive",
    layout: "executive-ruled",
    accentColor: "#1a1a1a",
    headerStyle: "left-aligned",
    sectionOrder: ["summary", "experience", "awards", "education", "publications"],
    typographyScale: "generous",
    ruleDividers: true,
    showSkillBadges: false,
    atsNote: "Board-ready format. Company impact scale in every bullet. No skills badges.",
  },
};

export const getTemplateConfig = (id: TemplateId): TemplateConfig => {
  return TEMPLATE_CONFIGS[id];
};

export const getTemplatesByIndustry = (industry: string): TemplateConfig[] => {
  return Object.values(TEMPLATE_CONFIGS).filter((t) => t.industry === industry);
};

export const ALL_TEMPLATE_IDS = Object.keys(TEMPLATE_CONFIGS) as TemplateId[];
