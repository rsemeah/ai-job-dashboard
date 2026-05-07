/**
 * HireWire Document AST
 *
 * The single layout-aware layer between canonical schema and renderer adapters.
 * One AST = one truth. Both PDF and DOCX renderers consume this.
 *
 * Pagination: Hybrid — AST carries page-break hints, renderer resolves actual breaks.
 * No template logic duplicated across renderers.
 */

export type ASTNodeType =
  | 'document'
  | 'section'
  | 'block'
  | 'heading'
  | 'paragraph'
  | 'bullet_list'
  | 'bullet_item'
  | 'contact_row'
  | 'divider'
  | 'spacer'

export type TextWeight = 'normal' | 'bold' | 'semibold'
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'
export type TextAlign = 'left' | 'center' | 'right'

export type PageBreakHint =
  | 'avoid'
  | 'before'
  | 'allow'

export interface TextRun {
  text: string
  weight?: TextWeight
  italic?: boolean
  underline?: boolean
  href?: string
  color?: string
}

interface ASTBaseNode {
  id: string
  type: ASTNodeType
  page_break_hint?: PageBreakHint
}

export interface ASTDocumentNode extends ASTBaseNode {
  type: 'document'
  template_id: string
  track: 'ats_pure' | 'premium_visual'
  children: ASTSectionNode[]
}

export interface ASTSectionNode extends ASTBaseNode {
  type: 'section'
  section_key: string
  children: ASTBlockNode[]
}

export type ASTBlockNode =
  | ASTHeadingNode
  | ASTParagraphNode
  | ASTBulletListNode
  | ASTContactRowNode
  | ASTDividerNode
  | ASTSpacerNode

export interface ASTHeadingNode extends ASTBaseNode {
  type: 'heading'
  level: 1 | 2 | 3
  runs: TextRun[]
  align?: TextAlign
}

export interface ASTParagraphNode extends ASTBaseNode {
  type: 'paragraph'
  runs: TextRun[]
  align?: TextAlign
  spacing_after?: 'sm' | 'md' | 'lg'
}

export interface ASTBulletListNode extends ASTBaseNode {
  type: 'bullet_list'
  items: ASTBulletItemNode[]
}

export interface ASTBulletItemNode extends ASTBaseNode {
  type: 'bullet_item'
  runs: TextRun[]
  evidence_id?: string
  indent?: 0 | 1
}

export interface ASTContactRowNode extends ASTBaseNode {
  type: 'contact_row'
  items: Array<{ text: string; href?: string }>
  align?: TextAlign
}

export interface ASTDividerNode extends ASTBaseNode {
  type: 'divider'
  weight?: 'thin' | 'thick'
}

export interface ASTSpacerNode extends ASTBaseNode {
  type: 'spacer'
  size: 'xs' | 'sm' | 'md' | 'lg'
}
