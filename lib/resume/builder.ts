/**
 * HireWire Resume Builder
 *
 * Transforms HWResumeDocument (canonical schema) → ASTDocumentNode
 * This is the only place section ordering and layout rules live.
 * Called by all renderer adapters.
 */

import type { HWResumeDocument } from './schema'
import type { ASTDocumentNode, ASTSectionNode, ASTBlockNode, TextRun } from './ast'
import { TEMPLATE_REGISTRY } from './templates/registry'

function id(): string {
  return crypto.randomUUID().slice(0, 8)
}

function textRun(text: string, opts?: Partial<Omit<TextRun, 'text'>>): TextRun {
  return { text, ...opts }
}

export function buildResumeAST(doc: HWResumeDocument): ASTDocumentNode {
  const template = TEMPLATE_REGISTRY[doc.template_id]
  if (!template) throw new Error(`Unknown template: ${doc.template_id}`)

  const sections: ASTSectionNode[] = []

  for (const sectionKey of template.section_order) {
    const section = buildSection(sectionKey, doc)
    if (section) sections.push(section)
  }

  return {
    id: id(),
    type: 'document',
    template_id: doc.template_id,
    track: template.track,
    children: sections,
  }
}

function buildSection(key: string, doc: HWResumeDocument): ASTSectionNode | null {
  switch (key) {
    case 'contact':        return buildContactSection(doc)
    case 'summary':        return doc.summary ? buildSummarySection(doc) : null
    case 'experience':     return doc.experience.length ? buildExperienceSection(doc) : null
    case 'skills':         return doc.skills.length ? buildSkillsSection(doc) : null
    case 'education':      return doc.education.length ? buildEducationSection(doc) : null
    case 'projects':       return doc.projects?.length ? buildProjectsSection(doc) : null
    case 'certifications': return doc.certifications?.length ? buildCertificationsSection(doc) : null
    case 'publications':   return doc.publications?.length ? buildPublicationsSection(doc) : null
    default:               return null
  }
}

function buildContactSection(doc: HWResumeDocument): ASTSectionNode {
  const c = doc.contact
  const linkItems = [
    c.linkedin_url  && { text: 'LinkedIn',  href: c.linkedin_url },
    c.github_url    && { text: 'GitHub',    href: c.github_url },
    c.portfolio_url && { text: 'Portfolio', href: c.portfolio_url },
  ].filter(Boolean) as Array<{ text: string; href: string }>

  const contactItems = [
    c.location && { text: c.location },
    c.email    && { text: c.email, href: `mailto:${c.email}` },
    c.phone    && { text: c.phone },
    ...linkItems,
  ].filter(Boolean) as Array<{ text: string; href?: string }>

  return {
    id: id(), type: 'section', section_key: 'contact',
    children: [
      { id: id(), type: 'heading', level: 1, align: 'center',
        runs: [textRun(c.full_name, { weight: 'bold' })] },
      { id: id(), type: 'heading', level: 3, align: 'center',
        runs: [textRun(doc.target_job_title)] },
      { id: id(), type: 'contact_row', align: 'center', items: contactItems },
      { id: id(), type: 'divider', weight: 'thin' },
    ],
  }
}

function buildSummarySection(doc: HWResumeDocument): ASTSectionNode {
  return {
    id: id(), type: 'section', section_key: 'summary',
    children: [
      { id: id(), type: 'heading', level: 2, runs: [textRun('PROFESSIONAL SUMMARY', { weight: 'bold' })] },
      { id: id(), type: 'paragraph', runs: [textRun(doc.summary)], spacing_after: 'md' },
    ],
  }
}

function buildExperienceSection(doc: HWResumeDocument): ASTSectionNode {
  const blocks: ASTBlockNode[] = [
    { id: id(), type: 'heading', level: 2, runs: [textRun('PROFESSIONAL EXPERIENCE', { weight: 'bold' })] },
  ]

  for (const exp of doc.experience) {
    const dateStr = exp.is_current
      ? `${exp.start_date} – Present`
      : `${exp.start_date} – ${exp.end_date ?? ''}`

    blocks.push({
      id: id(), type: 'paragraph',
      page_break_hint: exp.page_break_hint ?? 'avoid',
      runs: [
        textRun(exp.title, { weight: 'bold' }),
        textRun('  ·  ', { color: 'muted' }),
        textRun(exp.company),
        textRun('  ·  ', { color: 'muted' }),
        textRun(dateStr, { color: 'muted' }),
        ...(exp.location ? [textRun(`  ·  ${exp.location}`, { color: 'muted' })] : []),
      ],
    })

    if (exp.bullets.length) {
      blocks.push({
        id: id(), type: 'bullet_list',
        items: exp.bullets.map(b => ({
          id: id(), type: 'bullet_item' as const,
          runs: [textRun(b.text)],
          evidence_id: b.evidence_id,
        })),
      })
    }

    blocks.push({ id: id(), type: 'spacer', size: 'sm' })
  }

  return { id: id(), type: 'section', section_key: 'experience', children: blocks }
}

function buildSkillsSection(doc: HWResumeDocument): ASTSectionNode {
  const blocks: ASTBlockNode[] = [
    { id: id(), type: 'heading', level: 2, runs: [textRun('SKILLS', { weight: 'bold' })] },
  ]

  for (const group of doc.skills) {
    if (doc.skills.length === 1 && !group.category) {
      // Flat skills list — single line
      blocks.push({
        id: id(), type: 'paragraph',
        runs: [textRun(group.skills.join(', '))],
        spacing_after: 'sm',
      })
    } else {
      // Grouped skills — "Languages: Python, Go, TypeScript"
      blocks.push({
        id: id(), type: 'paragraph',
        runs: [
          textRun(`${group.category}: `, { weight: 'bold' }),
          textRun(group.skills.join(', ')),
        ],
        spacing_after: 'sm',
      })
    }
  }

  return { id: id(), type: 'section', section_key: 'skills', children: blocks }
}

function buildEducationSection(doc: HWResumeDocument): ASTSectionNode {
  const blocks: ASTBlockNode[] = [
    { id: id(), type: 'heading', level: 2, runs: [textRun('EDUCATION', { weight: 'bold' })] },
  ]

  for (const edu of doc.education) {
    const yearStr = edu.end_year
      ? (edu.start_year ? `${edu.start_year} – ${edu.end_year}` : edu.end_year)
      : (edu.start_year ?? '')

    const degreeStr = [edu.degree, edu.field].filter(Boolean).join(', ')

    blocks.push({
      id: id(), type: 'paragraph',
      page_break_hint: 'avoid',
      runs: [
        textRun(degreeStr, { weight: 'bold' }),
        textRun('  ·  ', { color: 'muted' }),
        textRun(edu.school),
        ...(yearStr ? [textRun(`  ·  ${yearStr}`, { color: 'muted' })] : []),
        ...(edu.honors ? [textRun(`  ·  ${edu.honors}`, { color: 'muted' })] : []),
        ...(edu.gpa ? [textRun(`  ·  GPA: ${edu.gpa}`, { color: 'muted' })] : []),
      ],
      spacing_after: 'sm',
    })
  }

  return { id: id(), type: 'section', section_key: 'education', children: blocks }
}

function buildProjectsSection(doc: HWResumeDocument): ASTSectionNode {
  const blocks: ASTBlockNode[] = [
    { id: id(), type: 'heading', level: 2, runs: [textRun('PROJECTS', { weight: 'bold' })] },
  ]

  for (const proj of doc.projects ?? []) {
    const nameRuns: TextRun[] = [textRun(proj.name, { weight: 'bold' })]
    if (proj.url) nameRuns.push(textRun('  ·  ', { color: 'muted' }), textRun(proj.url, { href: proj.url, color: 'muted' }))

    blocks.push({
      id: id(), type: 'paragraph',
      page_break_hint: proj.page_break_hint ?? 'avoid',
      runs: nameRuns,
    })

    if (proj.tech_stack.length) {
      blocks.push({
        id: id(), type: 'paragraph',
        runs: [textRun(proj.tech_stack.join(', '), { color: 'muted', italic: true })],
        spacing_after: 'sm',
      })
    }

    if (proj.description) {
      blocks.push({
        id: id(), type: 'paragraph',
        runs: [textRun(proj.description)],
        spacing_after: 'sm',
      })
    }

    if (proj.impact) {
      blocks.push({
        id: id(), type: 'bullet_list',
        items: [{ id: id(), type: 'bullet_item', runs: [textRun(proj.impact)], evidence_id: proj.evidence_id }],
      })
    }

    blocks.push({ id: id(), type: 'spacer', size: 'sm' })
  }

  return { id: id(), type: 'section', section_key: 'projects', children: blocks }
}

function buildCertificationsSection(doc: HWResumeDocument): ASTSectionNode {
  const blocks: ASTBlockNode[] = [
    { id: id(), type: 'heading', level: 2, runs: [textRun('CERTIFICATIONS', { weight: 'bold' })] },
  ]

  for (const cert of doc.certifications ?? []) {
    blocks.push({
      id: id(), type: 'paragraph',
      runs: [
        textRun(cert.name, { weight: 'bold' }),
        textRun('  ·  ', { color: 'muted' }),
        textRun(cert.issuer, { color: 'muted' }),
        textRun('  ·  ', { color: 'muted' }),
        textRun(cert.date, { color: 'muted' }),
      ],
      spacing_after: 'sm',
    })
  }

  return { id: id(), type: 'section', section_key: 'certifications', children: blocks }
}

function buildPublicationsSection(doc: HWResumeDocument): ASTSectionNode {
  const blocks: ASTBlockNode[] = [
    { id: id(), type: 'heading', level: 2, runs: [textRun('PUBLICATIONS', { weight: 'bold' })] },
  ]

  for (const pub of doc.publications ?? []) {
    const coAuthors = pub.co_authors?.length
      ? ` (with ${pub.co_authors.join(', ')})`
      : ''

    blocks.push({
      id: id(), type: 'paragraph',
      runs: [
        textRun(pub.title, { weight: 'bold' }),
        textRun(`  ·  ${pub.venue}  ·  ${pub.date}${coAuthors}`, { color: 'muted' }),
      ],
      spacing_after: 'sm',
    })
  }

  return { id: id(), type: 'section', section_key: 'publications', children: blocks }
}
