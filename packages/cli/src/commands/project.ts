import { chooseProject, createProjectFlow, signedInClient } from '../project.js'
import { bold, dim, error, info, log, step } from '../ui.js'

export interface ProjectOptions {
  host: string
  cwd: string
  token?: string
  noBrowser: boolean
  sub?: string
  name?: string
  previewUrl?: string
}

/**
 * `tack project create [name] [--preview-url <url>]` and `tack project list`.
 */
export async function projectCommand(options: ProjectOptions): Promise<number> {
  if (options.sub !== 'create' && options.sub !== 'list') {
    error('Usage: tack project create [name] [--preview-url <url>] | tack project list')
    return 1
  }

  const signedIn = await signedInClient(options)
  if (!signedIn) return 1
  const { client } = signedIn

  if (options.sub === 'list') {
    const { projects } = await client.listProjects()
    if (projects.length === 0) {
      info('No projects yet. Create one with: tack project create <name>')
      return 0
    }
    log()
    for (const p of projects) {
      log(`  ${bold(p.name)} ${dim(p.projectKey)}`)
      log(
        `  ${dim(`${p.previewUrl || 'no preview URL'} · ${p.connected ? 'connected' : 'not connected yet'} · id ${p.id}`)}`,
      )
      log()
    }
    return 0
  }

  const project = await createProjectFlow(client, {
    cwd: options.cwd,
    name: options.name,
    previewUrl: options.previewUrl,
  })
  if (!project) return 1

  log()
  step('Created', `${project.name} ${dim(project.projectKey)}`)
  if (project.previewUrl) step('Preview', project.previewUrl)
  log()
  info('Next:')
  info(`${dim('1.')} tack init                 add the widget to this codebase`)
  info(`${dim('2.')} tack share                or share your dev server right away`)
  info(dim(`Dashboard: ${options.host}/projects/${project.id}/install`))
  return 0
}

export { chooseProject }
