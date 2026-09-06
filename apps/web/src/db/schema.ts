import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

const createdAt = () =>
  text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`)

export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name'),
  plan: text('plan', { enum: ['free', 'pro', 'team'] })
    .notNull()
    .default('free'),
  onboardingCompletedAt: text('onboarding_completed_at'),
  createdAt: createdAt(),
})

export const projects = sqliteTable('projects', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  previewUrl: text('preview_url').notNull(),
  projectKey: text('project_key').notNull().unique(),
  settings: text('settings', { mode: 'json' }).$type<Record<string, string>>(),
  // Extra origins the widget may load from, beyond previewUrl. Stored as
  // strict normalized origins (scheme://host[:port], no path, no wildcard) —
  // unlike previewUrl, which is human-typed and tolerates a `*.` prefix.
  // The origin check is the real authorization gate for reading and writing
  // pins, since the project key is public by design, so this list is written
  // only through a validated path.
  allowedOrigins: text('allowed_origins', { mode: 'json' }).$type<string[]>(),
  firstWidgetSeenAt: text('first_widget_seen_at'),
  // Which origin first phoned home — lets the dashboard distinguish "connected
  // from your preview URL" from "connected from localhost".
  firstWidgetOrigin: text('first_widget_origin'),
  createdAt: createdAt(),
  archivedAt: text('archived_at'),
})

export const pins = sqliteTable('pins', {
  id: id(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  url: text('url').notNull(),
  reviewerId: text('reviewer_id').notNull(),
  reviewerName: text('reviewer_name'),
  xPct: real('x_pct').notNull(),
  yPct: real('y_pct').notNull(),
  // yPct is relative to the full document; the screenshot only covers the
  // viewport. This is the click position within that viewport (0–100) so the
  // dashboard can place the marker on the screenshot. Null on older pins.
  viewportYPct: real('viewport_y_pct'),
  scrollY: real('scroll_y').notNull().default(0),
  viewportW: integer('viewport_w').notNull(),
  viewportH: integer('viewport_h').notNull(),
  selector: text('selector'),
  xpath: text('xpath'),
  tackId: text('tack_id'),
  elementText: text('element_text'),
  // Sanitized JSON of a fixed computed-style whitelist (see
  // packages/shared/src/element-styles.ts) captured from the clicked
  // element — gives triage enough visual context without a DOM/style dump.
  elementStyles: text('element_styles'),
  screenshotPath: text('screenshot_path'),
  status: text('status', { enum: ['open', 'resolved'] })
    .notNull()
    .default('open'),
  browser: text('browser'),
  os: text('os'),
  // Placement the widget actually resolved on the live preview page (KTD5).
  // Null until a widget reports; placementCheckedAt drives the dashboard's
  // "verified vs inferred" distinction.
  placementState: text('placement_state', {
    enum: ['anchored', 'approximate', 'lost'],
  }),
  placementCheckedAt: text('placement_checked_at'),
  createdAt: createdAt(),
  resolvedAt: text('resolved_at'),
})

export const replies = sqliteTable('replies', {
  id: id(),
  pinId: text('pin_id')
    .notNull()
    .references(() => pins.id),
  authorType: text('author_type', { enum: ['owner', 'reviewer'] }).notNull(),
  authorId: text('author_id').notNull(),
  body: text('body').notNull(),
  createdAt: createdAt(),
})

export const aiRuns = sqliteTable('ai_runs', {
  id: id(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  status: text('status', {
    enum: ['running', 'completed', 'failed'],
  }).notNull(),
  triggerType: text('trigger_type', { enum: ['manual'] })
    .notNull()
    .default('manual'),
  model: text('model').notNull(),
  pinCount: integer('pin_count').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  estimatedCostCents: real('estimated_cost_cents').notNull().default(0),
  actualCostCents: real('actual_cost_cents').notNull().default(0),
  error: text('error'),
  completedAt: text('completed_at'),
  createdAt: createdAt(),
})

export const aiPinInsights = sqliteTable('ai_pin_insights', {
  id: id(),
  runId: text('run_id')
    .notNull()
    .references(() => aiRuns.id),
  pinId: text('pin_id')
    .notNull()
    .references(() => pins.id),
  label: text('label', {
    enum: ['bug', 'design', 'copy', 'content', 'feature', 'question', 'other'],
  }).notNull(),
  priority: text('priority', {
    enum: ['quick_win', 'needs_decision', 'blocks_launch', 'normal'],
  }).notNull(),
  summary: text('summary').notNull(),
  ambiguous: integer('ambiguous', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
})

export const aiGroups = sqliteTable('ai_groups', {
  id: id(),
  runId: text('run_id')
    .notNull()
    .references(() => aiRuns.id),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  type: text('type', {
    enum: ['bug', 'design', 'copy', 'content', 'feature', 'question', 'other'],
  }).notNull(),
  priority: text('priority', {
    enum: ['quick_win', 'needs_decision', 'blocks_launch', 'normal'],
  }).notNull(),
  implementationBrief: text('implementation_brief').notNull(),
  createdAt: createdAt(),
})

export const aiGroupPins = sqliteTable('ai_group_pins', {
  id: id(),
  groupId: text('group_id')
    .notNull()
    .references(() => aiGroups.id),
  pinId: text('pin_id')
    .notNull()
    .references(() => pins.id),
  runId: text('run_id')
    .notNull()
    .references(() => aiRuns.id),
  createdAt: createdAt(),
})

export const notifications = sqliteTable('notifications', {
  id: id(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  pinId: text('pin_id')
    .notNull()
    .references(() => pins.id),
  channel: text('channel').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  sentAt: text('sent_at'),
  failedAt: text('failed_at'),
  error: text('error'),
  createdAt: createdAt(),
})

export const sessions = sqliteTable('sessions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: createdAt(),
})

/**
 * Revocable, scope-limited owner tokens for non-browser clients (ADR 0002).
 * Deliberately separate from `sessions`: that table doubles as pending
 * magic-link storage, has no revocation or last-used, and anything in it can
 * be replayed as a `tack_session` cookie to get full dashboard authority. An
 * owner token is only ever accepted as a bearer credential and only grants the
 * scopes recorded here.
 */
export const ownerTokens = sqliteTable('owner_tokens', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  // Human-readable, shown in the revoke UI, e.g. "tack-cli on clements-mbp".
  label: text('label').notNull(),
  source: text('source', { enum: ['cli', 'dashboard'] })
    .notNull()
    .default('cli'),
  scopes: text('scopes', { mode: 'json' }).$type<string[]>().notNull(),
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  createdAt: createdAt(),
})

/**
 * Short-lived state for the CLI browser-login handshake. The CLI holds a
 * PKCE verifier and only ever receives a one-shot auth code, so the long-lived
 * token never travels through the browser (and so never lands in history).
 */
export const cliAuthRequests = sqliteTable('cli_auth_requests', {
  id: id(),
  requestIdHash: text('request_id_hash').notNull().unique(),
  codeChallenge: text('code_challenge').notNull(),
  // null = the CLI could not bind a port (SSH/container), so the approval page
  // shows the code for the user to paste instead of redirecting.
  redirectPort: integer('redirect_port'),
  // Shown on both the approval page and in the CLI, so the owner can confirm
  // they are approving their own session and not a framed attacker's.
  userCode: text('user_code').notNull(),
  clientLabel: text('client_label').notNull(),
  approvedUserId: text('approved_user_id').references(() => users.id),
  authCodeHash: text('auth_code_hash'),
  consumedAt: text('consumed_at'),
  expiresAt: text('expires_at').notNull(),
  createdAt: createdAt(),
})
