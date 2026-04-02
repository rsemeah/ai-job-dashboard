// HireWire Resume Templates — Pack Index
// Import from this file throughout HireWire

// Components
export { ResumeBase } from "./components/ResumeBase";
export { ResumeRenderer } from "./components/ResumeRenderer";

// Types
export type {
  ResumeProps,
  ResumeContact,
  ResumeExperienceItem,
  ResumeEducationItem,
  ResumeCertification,
  ResumeSkillGroup,
  ResumeProject,
  ResumePublication,
  ScoringMetadata,
  TemplateId,
} from "./types/ResumeProps";

// Config utilities
export {
  TEMPLATE_CONFIGS,
  ALL_TEMPLATE_IDS,
  getTemplateConfig,
  getTemplatesByIndustry,
} from "./config/resumeTemplates.config";

export type {
  TemplateConfig,
  LayoutVariant,
  SectionKey,
} from "./config/resumeTemplates.config";
