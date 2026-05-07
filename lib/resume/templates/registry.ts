/**
 * HireWire Template Registry
 *
 * Template authoring: TypeScript base class + JSON config override
 * Parse-back validation: hard fail for ats_pure, soft fail for premium_visual
 * ATS track detection is handled separately (n8n + job URL lookup)
 */

export type TemplateTrack = 'ats_pure' | 'premium_visual'
export type RenderEngine = 'react-pdf' | 'puppeteer'
export type ValidationMode = 'hard_fail' | 'soft_fail'

export interface HWTemplateConfig {
  id: string
  name: string
  track: TemplateTrack
  render_engine: RenderEngine
  columns: 1 | 2
  max_pages: 1 | 2 | 3
  section_order: string[]
  ats_safe_score: number
  ai_survival_score: number
  role_tags: string[]
  validation_mode: ValidationMode
  recommended_for_ats: string[]
  compatible_with_ats: string[]
}

export const TEMPLATE_REGISTRY: Record<string, HWTemplateConfig> = {
  'classic-ats': {
    id: 'classic-ats',
    name: 'Classic ATS',
    track: 'ats_pure',
    render_engine: 'react-pdf',
    columns: 1,
    max_pages: 2,
    section_order: ['contact', 'summary', 'experience', 'skills', 'education', 'certifications'],
    ats_safe_score: 100,
    ai_survival_score: 85,
    role_tags: ['all'],
    validation_mode: 'hard_fail',
    recommended_for_ats: ['workday', 'taleo', 'icims', 'successfactors', 'bamboohr'],
    compatible_with_ats: ['greenhouse', 'lever', 'ashby', 'smartrecruiters'],
  },
  'technical-ats': {
    id: 'technical-ats',
    name: 'Technical (ATS)',
    track: 'ats_pure',
    render_engine: 'react-pdf',
    columns: 1,
    max_pages: 2,
    section_order: ['contact', 'summary', 'skills', 'experience', 'projects', 'education', 'certifications'],
    ats_safe_score: 100,
    ai_survival_score: 88,
    role_tags: ['engineer', 'data', 'devops', 'ml'],
    validation_mode: 'hard_fail',
    recommended_for_ats: ['workday', 'taleo', 'icims', 'greenhouse', 'lever'],
    compatible_with_ats: ['ashby', 'smartrecruiters'],
  },
  'executive-minimal': {
    id: 'executive-minimal',
    name: 'Executive Minimal',
    track: 'ats_pure',
    render_engine: 'react-pdf',
    columns: 1,
    max_pages: 2,
    section_order: ['contact', 'summary', 'experience', 'education', 'certifications'],
    ats_safe_score: 98,
    ai_survival_score: 82,
    role_tags: ['executive', 'director', 'vp'],
    validation_mode: 'hard_fail',
    recommended_for_ats: ['workday', 'taleo', 'icims'],
    compatible_with_ats: ['greenhouse', 'lever', 'ashby'],
  },
  'product-manager': {
    id: 'product-manager',
    name: 'Product Manager',
    track: 'ats_pure',
    render_engine: 'react-pdf',
    columns: 1,
    max_pages: 2,
    section_order: ['contact', 'summary', 'experience', 'projects', 'skills', 'education'],
    ats_safe_score: 100,
    ai_survival_score: 80,
    role_tags: ['pm', 'product'],
    validation_mode: 'hard_fail',
    recommended_for_ats: ['workday', 'greenhouse', 'lever', 'ashby'],
    compatible_with_ats: ['icims', 'taleo', 'smartrecruiters'],
  },
  'early-career': {
    id: 'early-career',
    name: 'Early Career',
    track: 'ats_pure',
    render_engine: 'react-pdf',
    columns: 1,
    max_pages: 1,
    section_order: ['contact', 'summary', 'projects', 'experience', 'education', 'skills'],
    ats_safe_score: 100,
    ai_survival_score: 85,
    role_tags: ['all'],
    validation_mode: 'hard_fail',
    recommended_for_ats: ['workday', 'taleo', 'greenhouse', 'lever', 'icims'],
    compatible_with_ats: ['ashby', 'smartrecruiters'],
  },
  'premium-minimal': {
    id: 'premium-minimal',
    name: 'Premium Minimal',
    track: 'premium_visual',
    render_engine: 'react-pdf',
    columns: 1,
    max_pages: 2,
    section_order: ['contact', 'summary', 'experience', 'skills', 'education', 'projects'],
    ats_safe_score: 90,
    ai_survival_score: 90,
    role_tags: ['all'],
    validation_mode: 'soft_fail',
    recommended_for_ats: ['greenhouse', 'lever', 'ashby'],
    compatible_with_ats: ['smartrecruiters'],
  },
}

export function suggestTemplateFromAnalysis(opts: {
  role_family?: string | null
  ats_source?: string | null
  seniority?: string | null
}): string {
  const { role_family, ats_source, seniority } = opts

  const legacyAts = ['workday', 'taleo', 'icims', 'successfactors']
  if (ats_source && legacyAts.some(a => ats_source.toLowerCase().includes(a))) {
    if (role_family?.toLowerCase().includes('engineer') || role_family?.toLowerCase().includes('data')) {
      return 'technical-ats'
    }
    return 'classic-ats'
  }

  if (seniority === 'Director' || seniority === 'VP' || seniority === 'C-Level') return 'executive-minimal'
  if (role_family?.toLowerCase().includes('product manager') || role_family?.toLowerCase().includes('pm')) return 'product-manager'
  if (role_family?.toLowerCase().includes('engineer') || role_family?.toLowerCase().includes('data')) return 'technical-ats'
  if (seniority === 'Entry') return 'early-career'

  return 'classic-ats'
}
