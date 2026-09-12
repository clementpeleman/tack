import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { detectFramework } from '../detect.js'
import { chooseProject, signedInClient } from '../project.js'
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
import { bold, confirm, dim, error, info, log, step, warn } from '../ui.js'

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
  const signedIn = await signedInClient(options)
  if (!signedIn) return 1
  const { client, email } = signedIn

  const project = await chooseProject(client, { wanted: options.project, cwd: root })
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
  info(`${bold('Done.')} What happens next:`)
  log()
  const steps: string[] = []
  if (options.gate === 'env') {
    steps.push(
      detection.strategy === 'entry-module'
        ? 'Locally nothing to set: the widget is on in `vite dev`.'
        : 'Set TACK_ENABLED=1 in your local env and start the dev server.',
    )
  } else {
    steps.push('Start your dev server.')
  }
  steps.push(`Open ${devOrigin} — the pin button appears bottom-right.`)
  if (options.gate === 'env') {
    steps.push(
      detection.strategy === 'entry-module'
        ? 'On preview deploys set VITE_TACK_ENABLED=true, then deploy.'
        : 'On preview deploys set TACK_ENABLED=1, then deploy.',
    )
  }
  if (project.previewUrl) {
    steps.push(
      `Reviewers use ${project.previewUrl}. If your preview host changes per branch, set the preview URL to a wildcard like https://*.vercel.app in project settings.`,
    )
  } else {
    steps.push(
      'Set the preview URL in project settings once the site is deployed — until then only the dev origin above can load the widget.',
    )
  }
  steps.push(`Dashboard: ${options.host}/projects/${project.id}/connect`)
  steps.forEach((s, i) => info(`${dim(`${i + 1}.`)} ${s}`))
  log()
  info(dim('The widget only loads at viewports 768px and wider.'))

  return 0
}
