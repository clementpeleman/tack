import type { api, TackProject } from '../api.js'
import { detectFramework } from '../detect.js'
import { chooseProject, signedInClient } from '../project.js'
import {
  cloudflaredInstallHint,
  hasCloudflared,
  isPortListening,
  startTunnel,
} from '../tunnel.js'
import { bold, dim, error, info, log, step, warn } from '../ui.js'

export interface ShareOptions {
  host: string
  cwd: string
  token?: string
  project?: string
  /** Site to share. Without it, the local dev server is tunnelled instead. */
  url?: string
  /** Local port to tunnel; default from framework detection. */
  port?: number
  passcode?: string
  days?: number
  label?: string
  noBrowser: boolean
  /** `tack share list` / `tack share revoke <id>` */
  sub?: 'list' | 'revoke'
  shareId?: string
}

/**
 * `tack share <url>`: mint a review link that proxies the site with the
 * widget injected. The site itself is untouched, which is the point — it
 * works for previews you cannot edit and for hosts whose CSP would block the
 * script tag.
 */
export async function shareCommand(options: ShareOptions): Promise<number> {
  const signedIn = await signedInClient(options)
  if (!signedIn) return 1
  const { client } = signedIn

  const project = await chooseProject(client, { wanted: options.project, cwd: options.cwd })
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

  if (!options.url) return shareLocal(client, project, options)

  const target = options.url
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

/**
 * `tack share` with no URL: tunnel the dev server through cloudflared, put a
 * share in front of the tunnel URL, keep both alive until Ctrl-C, then revoke.
 */
async function shareLocal(
  client: ReturnType<typeof api>,
  project: TackProject,
  options: ShareOptions,
): Promise<number> {
  let port = options.port
  if (!port) {
    const detection = await detectFramework(options.cwd)
    port = detection?.devPort ?? 3000
  }

  if (!(await isPortListening(port))) {
    error(`Nothing is listening on localhost:${port}.`)
    info('Start your dev server first, or pass --port, or share a URL instead:')
    info(dim('  tack share https://preview.acme.com'))
    return 1
  }

  if (!(await hasCloudflared())) {
    error('Sharing a local dev server needs cloudflared, which is not installed.')
    info(`Install it with: ${bold(cloudflaredInstallHint())}`)
    info(dim('Or share a deployed preview instead: tack share https://…'))
    return 1
  }

  info(`Opening a tunnel to localhost:${port}…`)
  const tunnel = await startTunnel(port)

  let shareId: string | null = null
  const cleanup = async () => {
    await tunnel.stop()
    if (shareId) {
      try {
        await client.revokeShare(shareId)
        info('Share link closed.')
      } catch {
        warn(`Could not revoke the share; run: tack share revoke ${shareId}`)
      }
    }
  }

  try {
    const { url, share } = await client.createShare({
      projectId: project.id,
      targetUrl: tunnel.url,
      passcode: options.passcode,
      days: options.days ?? 1,
      label: options.label ?? `local dev on port ${port}`,
    })
    shareId = share.id

    log()
    step('Project', `${project.name} ${dim(project.projectKey)}`)
    step('Sharing', `localhost:${port} ${dim(`via ${tunnel.url}`)}`)
    log()
    log(`  ${bold(url)}`)
    log()
    info('Send this to your client. Feedback lands in your inbox:')
    info(dim(`${options.host}/projects/${project.id}/inbox`))
    log()
    info(dim(`Live while this runs${share.hasPasscode ? ' · passcode required' : ''}. Press Ctrl-C to stop sharing.`))
  } catch (err) {
    await tunnel.stop()
    throw err
  }

  await new Promise<void>((resolve) => {
    const onSignal = () => {
      log()
      resolve()
    }
    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)
    void tunnel.exited.then(() => {
      warn('The tunnel closed.')
      resolve()
    })
  })

  await cleanup()
  return 0
}
