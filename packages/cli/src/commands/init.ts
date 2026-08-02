import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { api, ApiError, type TackProject } from '../api.js'
import { login } from '../auth.js'
import { resolveToken } from '../config.js'
import { detectFramework } from '../detect.js'
import {
  applyPatch,
  buildSnippet,
  hasForeignWidget,
  isAlreadyInstalled,
  planPatch,
  readTarget,
  renderDiff,
  type Gate,
} from '../patch.js'
import {
  bold,
  confirm,
  dim,
  error,
  info,
  isInteractive,
  log,
  select,
  step,
  warn,
} from '../ui.js'

const run = promisify(execFile)

export interface InitOptions {
  host: string
  cwd: string
  token?: string
  project?: string
  origin?: string
  gate: Gate
  yes: boolean
  dryRun: boolean
  noBrowser: boolean
}

async function isDirty(root: string, file: string): Promise<boolean | null> {
  try {
    const { stdout } = await run('git', ['status', '--porcelain', '--', file], {
      cwd: root,
    })
    return stdout.trim().length > 0
  } catch {
    // Not a git repo, or git isn't installed.
    return null
  }
}

async function resolveProject(
  client: ReturnType<typeof api>,
  options: InitOptions,
): Promise<TackProject | null> {
  const { projects } = await client.listProjects()

  if (options.project) {
    const match = projects.find(
      (p) => p.id === options.project || p.projectKey === options.project,
    )
    if (!match) {
      error(`No project matching "${options.project}".`)
      return null
    }
    return match
  }

  if (projects.length === 0) {
    if (!isInteractive()) {
      error('No projects yet. Create one in the dashboard, or pass --project.')
      return null
    }
    info('No projects yet — creating one.')
    const name = await (await import('../ui.js')).prompt('Project name:')
    const previewUrl = await (await import('../ui.js')).prompt(
      'Preview URL (where clients will review):',
    )
    if (!name || !previewUrl) {
      error('A name and preview URL are required.')
      return null
    }
    const { project } = await client.createProject({ name, previewUrl })
    return project
  }

  if (!isInteractive()) {
    error('Multiple projects found. Pass --project <id|pk_…> in non-interactive use.')
    return null
  }

  return select(
    'Which project?',
    projects.map((p) => ({
      label: p.name,
      hint: p.previewUrl,
      value: p,
    })),
  )
}

export async function initCommand(options: InitOptions): Promise<number> {
  const root = options.cwd

  const detection = await detectFramework(root)
  if (!detection) {
    error('Could not detect a supported framework here.')
    log()
    info('Supported: Next.js (App Router), Vite, SvelteKit, plain HTML.')
    info('Add the script tag manually from your project\'s install page.')
    return 1
  }

  // Auth before touching any files, so a login failure leaves nothing behind.
  let token = await resolveToken(options.host, options.token)
  let email: string | null = null

  if (token) {
    try {
      email = (await api(options.host, token).whoami()).email
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        token = null
      } else {
        throw err
      }
    }
  }

  if (!token) {
    if (!isInteractive()) {
      error('Not signed in. Set TACK_TOKEN, or run `tack login` first.')
      return 1
    }
    const result = await login({ host: options.host, noBrowser: options.noBrowser })
    token = result.token
    email = result.email
  }

  const client = api(options.host, token)
  const project = await resolveProject(client, options)
  if (!project) return 1

  const devOrigin = options.origin ?? `http://localhost:${detection.devPort}`

  log()
  step('Signed in', email ?? dim('(unknown)'))
  step('Project', `${project.name} ${dim(project.projectKey)}`)
  step('Detected', `${detection.label} ${dim(detection.file)}`)
  step('Dev origin', devOrigin)

  const contents = await readTarget(root, detection.file)
  if (contents == null) {
    error(`Could not read ${detection.file}.`)
    return 1
  }

  if (isAlreadyInstalled(contents)) {
    log()
    info(`Already installed in ${bold(detection.file)}. Nothing to do.`)
    return 0
  }
  if (hasForeignWidget(contents)) {
    log()
    warn(`${detection.file} already loads tack-widget.js.`)
    info('Remove the existing snippet first if you want the CLI to manage it.')
    return 0
  }

  const snippet = buildSnippet(detection, {
    host: options.host,
    projectKey: project.projectKey,
    gate: options.gate,
  })

  const plan = planPatch(detection, contents, snippet)
  if ('error' in plan) {
    error(plan.error)
    log()
    info('Add this to your page instead:')
    log()
    log(snippet.split('\n').map((l) => `    ${l}`).join('\n'))
    return 1
  }

  log()
  log(`  ${bold(detection.file)}`)
  log()
  log(renderDiff(plan))
  log()

  const gateNote =
    options.gate === 'env'
      ? detection.strategy === 'entry-module'
        ? 'Runs in dev automatically. Set VITE_TACK_ENABLED=true on preview deploys.'
        : detection.framework === 'next-app'
          ? 'Set TACK_ENABLED=1 locally and on preview deploys to switch it on.'
          : null
      : options.gate === 'none'
        ? 'No environment gate — this will load wherever the file ships.'
        : 'Development only.'

  if (gateNote) info(dim(gateNote))
  if (options.gate !== 'none' && detection.strategy === 'body-anchor' && detection.framework !== 'next-app') {
    warn('This file has no build-time environment, so the tag cannot be gated.')
    warn('It will load anywhere this page is served, including production.')
  }
  info(dim(`Registers ${devOrigin} as an allowed origin for "${project.name}".`))

  const dirty = await isDirty(root, detection.file)
  if (dirty === true) {
    log()
    warn(`${detection.file} has uncommitted changes.`)
  } else if (dirty === null) {
    log()
    warn('Not a git repository — this edit will not be easy to undo.')
  }

  if (options.dryRun) {
    log()
    info('Dry run — nothing was written.')
    return 0
  }

  log()
  const proceed = options.yes || (await confirm('Apply?', true))
  if (!proceed) {
    info('Nothing was written.')
    return 0
  }

  try {
    await client.addOrigin(project.id, devOrigin)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Could not register ${devOrigin}: ${message}`)
    info('Fix the origin and re-run, or add it from project settings.')
    return 1
  }

  await applyPatch(root, plan)

  log()
  info(`${bold('Done.')} Start your dev server and open the page.`)
  if (options.gate === 'env' && detection.framework === 'next-app') {
    info(dim('Remember: TACK_ENABLED=1 must be set for the widget to render.'))
  }
  info(dim('The widget only loads at viewports 768px and wider.'))

  return 0
}
