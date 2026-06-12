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
  firstWidgetSeenAt: text('first_widget_seen_at'),
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
  scrollY: real('scroll_y').notNull().default(0),
  viewportW: integer('viewport_w').notNull(),
  viewportH: integer('viewport_h').notNull(),
  selector: text('selector'),
  xpath: text('xpath'),
  tackId: text('tack_id'),
  elementText: text('element_text'),
  screenshotPath: text('screenshot_path'),
  status: text('status', { enum: ['open', 'resolved'] })
    .notNull()
    .default('open'),
  browser: text('browser'),
  os: text('os'),
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
