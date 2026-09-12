import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { api, ApiError, type TackProject } from './api.js'
import { login } from './auth.js'
import { resolveToken } from './config.js'
import { dim, error, info, isInteractive, prompt, select } from './ui.js'

/** `name` from the project's package.json, as a default for a new Tack project. */
export async function packageName(root: string): Promise<string | null> {
  try {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const name = typeof pkg?.name === 'string' ? pkg.name.trim() : ''
    // Strip an npm scope; "@acme/website" reads better as "website".
    return name ? name.replace(/^@[^/]+\//, '') : null
  } catch {
    return null
  }
}

/**
 * An API client with a working token: the stored one if it still validates,
 * otherwise a fresh browser login (interactive only). Shared by every
 * command that talks to the instance.
 */
export async function signedInClient(options: {
  host: string
  token?: string
  noBrowser: boolean
}): Promise<{ client: ReturnType<typeof api>; email: string | null } | null> {
  let token = await resolveToken(options.host, options.token)
  let email: string | null = null

  if (token) {
    try {
      email = (await api(options.host, token).whoami()).email
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
    const result = await login({ host: options.host, noBrowser: options.noBrowser })
    token = result.token
    email = result.email
  }

  return { client: api(options.host, token), email }
}

/**
 * Create a project, prompting for anything not given. The preview URL is
 * optional: it is usually unknown until the first deploy and can be set in
 * settings later; the widget still loads from allowed dev origins meanwhile.
 */
export async function createProjectFlow(
  client: ReturnType<typeof api>,
  input: { cwd: string; name?: string; previewUrl?: string },
): Promise<TackProject | null> {
  let name = input.name?.trim()
  if (!name) {
    if (!isInteractive()) {
      error('A project name is required: tack project create <name>')
      return null
    }
    const suggested = await packageName(input.cwd)
    name =
      (await prompt(suggested ? `Project name [${suggested}]:` : 'Project name:')) ||
      suggested ||
      ''
  }
  if (!name) {
    error('A project name is required.')
    return null
  }

  let previewUrl = input.previewUrl?.trim()
  if (previewUrl == null && isInteractive()) {
    previewUrl = await prompt('Preview URL (optional, where clients will review):')
  }

  const { project } = await client.createProject({ name, previewUrl: previewUrl ?? '' })
  return project
}

const CREATE_NEW = Symbol('create-new')

/**
 * Pick the project a command works on: `--project <id|pk_>` wins; a single
 * project is used as is; several prompt for a choice. Interactive prompts
 * always offer "create a new project" so nobody has to leave the terminal.
 */
export async function chooseProject(
  client: ReturnType<typeof api>,
  options: { wanted?: string; cwd: string },
): Promise<TackProject | null> {
  const { projects } = await client.listProjects()

  if (options.wanted) {
    const match = projects.find(
      (p) => p.id === options.wanted || p.projectKey === options.wanted,
    )
    if (!match) error(`No project matching "${options.wanted}".`)
    return match ?? null
  }

  if (projects.length === 0) {
    if (!isInteractive()) {
      error('No projects yet. Run `tack project create <name>`, or pass --project.')
      return null
    }
    info('No projects yet — creating one.')
    return createProjectFlow(client, { cwd: options.cwd })
  }

  if (projects.length === 1 && !isInteractive()) return projects[0]!

  if (!isInteractive()) {
    error('Multiple projects found. Pass --project <id|pk_…> in non-interactive use.')
    return null
  }

  const choice = await select<TackProject | typeof CREATE_NEW>('Which project?', [
    ...projects.map((p) => ({
      label: p.name,
      hint: p.previewUrl || dim('no preview URL yet'),
      value: p,
    })),
    { label: 'Create a new project', value: CREATE_NEW },
  ])
  if (choice === CREATE_NEW) return createProjectFlow(client, { cwd: options.cwd })
  return choice
}
