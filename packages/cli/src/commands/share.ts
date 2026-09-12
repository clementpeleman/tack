import { api, ApiError, type TackProject } from '../api.js'
import { login } from '../auth.js'
import { resolveToken } from '../config.js'
import { bold, dim, error, info, isInteractive, log, select, step } from '../ui.js'

export interface ShareOptions {
  host: string
  token?: string
  project?: string
  /** Site to share. Required until the tunnel exists (`tack share` alone). */
  url?: string
  passcode?: string
  days?: number
  label?: string
  noBrowser: boolean
  /** `tack share list` / `tack share revoke <id>` */
  sub?: 'list' | 'revoke'
  shareId?: string
}

async function signedInClient(options: ShareOptions) {
  let token = await resolveToken(options.host, options.token)
  if (token) {
    try {
      await api(options.host, token).whoami()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) token = null
      else throw err
    }
  }
  if (!token) {
    if (!isInteractive()) {
      error('Not signed in. Set TACK_TOKEN, or run `tack login` first.')
      return null
    }
    token = (await login({ host: options.host, noBrowser: options.noBrowser })).token
  }
  return api(options.host, token)
}

async function pickProject(
  client: ReturnType<typeof api>,
  wanted: string | undefined,
): Promise<TackProject | null> {
  const { projects } = await client.listProjects()
  if (wanted) {
    const match = projects.find((p) => p.id === wanted || p.projectKey === wanted)
    if (!match) error(`No project matching "${wanted}".`)
    return match ?? null
  }
  if (projects.length === 0) {
    error('No projects yet. Run `tack init` or create one in the dashboard.')
    return null
  }
  if (projects.length === 1) return projects[0]!
  if (!isInteractive()) {
    error('Multiple projects — pass --project <id|pk_…>.')
    return null
  }
  return select(
    'Which project?',
    projects.map((p) => ({ label: p.name, hint: p.previewUrl, value: p })),
  )
}

/**
 * `tack share <url>`: mint a review link that proxies the site with the
 * widget injected. The site itself is untouched, which is the point — it
 * works for previews you cannot edit and for hosts whose CSP would block the
 * script tag.
 */
export async function shareCommand(options: ShareOptions): Promise<number> {
  const client = await signedInClient(options)
  if (!client) return 1

  const project = await pickProject(client, options.project)
  if (!project) return 1

  if (options.sub === 'list') {
    const { shares } = await client.listShares(project.id)
    const live = shares.filter((s) => s.live)
    if (live.length === 0) {
      info(`No active share links for ${bold(project.name)}.`)
      return 0
    }
    log()
    for (const s of live) {
      log(`  ${s.url}`)
      log(
        `  ${dim(`→ ${s.targetUrl}${s.hasPasscode ? ' · passcode' : ''} · expires ${s.expiresAt.slice(0, 10)} · id ${s.id}`)}`,
      )
      log()
    }
    return 0
  }

  if (options.sub === 'revoke') {
    if (!options.shareId) {
      error('Usage: tack share revoke <id>')
      return 1
    }
    await client.revokeShare(options.shareId)
    info('Share link revoked. The URL now shows "no longer active".')
    return 0
  }

  const target = options.url ?? project.previewUrl
  if (!target) {
    error('Pass the site to share: tack share https://preview.acme.com')
    info(dim('Sharing a local dev server directly is not available yet.'))
    return 1
  }

  const { url, share } = await client.createShare({
    projectId: project.id,
    targetUrl: target,
    passcode: options.passcode,
    days: options.days,
    label: options.label,
  })

  log()
  step('Project', `${project.name} ${dim(project.projectKey)}`)
  step('Sharing', target)
  log()
  log(`  ${bold(url)}`)
  log()
  info('Send this to your client. Feedback lands in your inbox:')
  info(dim(`${options.host}/projects/${project.id}/inbox`))
  log()
  info(
    dim(
      `Expires ${share.expiresAt.slice(0, 10)}${share.hasPasscode ? ' · passcode required' : ''} · revoke with: tack share revoke ${share.id}`,
    ),
  )
  return 0
}
