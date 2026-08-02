import { api, ApiError } from '../api.js'
import { login } from '../auth.js'
import {
  clearCredentials,
  credentialsPath,
  readCredentials,
  resolveToken,
} from '../config.js'
import { detectFramework } from '../detect.js'
import { bold, dim, error, info, log, step } from '../ui.js'

export async function loginCommand(options: {
  host: string
  noBrowser: boolean
}): Promise<number> {
  const existing = await readCredentials(options.host)
  if (existing) {
    info(`Already signed in to ${options.host}. Re-authenticating.`)
  }
  const { email } = await login({ host: options.host, noBrowser: options.noBrowser })
  log()
  info(`Signed in as ${bold(email ?? 'unknown')}.`)
  info(dim(`Token stored in ${credentialsPath()}`))
  return 0
}

export async function logoutCommand(options: {
  host: string
}): Promise<number> {
  const stored = await readCredentials(options.host)

  if (stored) {
    // Revoke server-side too, so a copied credentials file is not still valid.
    try {
      await api(options.host, stored.token).revoke()
    } catch {
      info(dim('Could not reach the server to revoke; clearing locally.'))
    }
  }

  const cleared = await clearCredentials(options.host)
  info(cleared ? `Signed out of ${options.host}.` : 'Not signed in.')
  return 0
}

export async function statusCommand(options: {
  host: string
  cwd: string
  token?: string
}): Promise<number> {
  const token = await resolveToken(options.host, options.token)

  log()
  step('Host', options.host)

  if (!token) {
    step('Auth', dim('not signed in'))
  } else {
    try {
      const who = await api(options.host, token).whoami()
      step('Auth', `${who.email ?? 'unknown'} ${dim(who.scopes.join(', '))}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        step('Auth', dim('token expired or revoked — run `tack login`'))
      } else {
        throw err
      }
    }
  }

  const detection = await detectFramework(options.cwd)
  step(
    'Project',
    detection
      ? `${detection.label} ${dim(detection.file)}`
      : dim('no supported framework detected here'),
  )

  return 0
}

export async function originCommand(options: {
  host: string
  token?: string
  project?: string
  origin: string
}): Promise<number> {
  const token = await resolveToken(options.host, options.token)
  if (!token) {
    error('Not signed in. Run `tack login` first.')
    return 1
  }

  const client = api(options.host, token)
  const { projects } = await client.listProjects()

  const project = options.project
    ? projects.find(
        (p) => p.id === options.project || p.projectKey === options.project,
      )
    : projects.length === 1
      ? projects[0]
      : undefined

  if (!project) {
    error(
      options.project
        ? `No project matching "${options.project}".`
        : 'Multiple projects — pass --project <id|pk_…>.',
    )
    return 1
  }

  const result = await client.addOrigin(project.id, options.origin)
  info(`Allowed origins for ${bold(project.name)}:`)
  for (const origin of result.allowedOrigins) info(`  ${origin}`)
  return 0
}
