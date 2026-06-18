export type PinStatus = 'open' | 'resolved'
export type AuthorType = 'owner' | 'reviewer'
export type Plan = 'free' | 'pro' | 'team'

export { normalizePinUrl } from './url.ts'
export {
  inferPlacementFromMetadata,
  resolvePlacementForDisplay,
  type PinPlacement,
  type PinAnchorMetadata,
  type PlacementDisplay,
} from './placement.ts'

export interface Pin {
  id: string
  projectId: string
  url: string
  reviewerId: string
  reviewerName: string | null
  xPct: number
  yPct: number
  scrollY: number
  viewportW: number
  viewportH: number
  selector: string | null
  xpath: string | null
  tackId: string | null
  elementText: string | null
  screenshotPath: string | null
  status: PinStatus
  browser: string | null
  os: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface Reply {
  id: string
  pinId: string
  authorType: AuthorType
  authorId: string
  body: string
  createdAt: string
}

export interface Project {
  id: string
  userId: string
  name: string
  previewUrl: string
  projectKey: string
  createdAt: string
  archivedAt: string | null
}
