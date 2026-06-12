export const aiLabels = [
  'bug',
  'design',
  'copy',
  'content',
  'feature',
  'question',
  'other',
] as const

export const aiPriorities = [
  'quick_win',
  'needs_decision',
  'blocks_launch',
  'normal',
] as const

export type AiLabel = (typeof aiLabels)[number]
export type AiPriority = (typeof aiPriorities)[number]

export interface AiPinInput {
  id: string
  url: string
  comment: string
  reviewerName: string | null
  selector: string | null
  elementText: string | null
  browser: string | null
  viewport: string
}

export interface AiPinInsight {
  pinId: string
  label: AiLabel
  priority: AiPriority
  summary: string
  ambiguous: boolean
}

export interface AiGroupResult {
  title: string
  summary: string
  type: AiLabel
  priority: AiPriority
  implementationBrief: string
  pinIds: string[]
}

export interface AiInboxResult {
  pins: AiPinInsight[]
  groups: AiGroupResult[]
}

export interface AiUsage {
  inputTokens: number
  outputTokens: number
}
