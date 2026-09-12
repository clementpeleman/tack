import { spawn, type ChildProcess } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isPortListening } from './tunnel.js'

const START_TIMEOUT_MS = 60_000

/** A dev server for a site answers GET / with HTML; an API or CMS backend does not. */
async function servesHtml(port: number): Promise<boolean> {
  if (!(await isPortListening(port))) return false
  for (const host of ['127.0.0.1', '[::1]']) {
    try {
      const res = await fetch(`http://${host}:${port}/`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(2500),
        headers: { accept: 'text/html' },
      })
      const type = res.headers.get('content-type') ?? ''
      if (res.status < 500 && /text\/html/i.test(type)) return true
      // A redirect to a page still means a web app lives here.
      if (res.status >= 300 && res.status < 400) return true
      return false
    } catch {
      /* try the other family */
    }
  }
  return false
}

type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Lockfile decides; falls back to npm. */
export async function detectPackageManager(root: string): Promise<PackageManager> {
  if (await exists(join(root, 'pnpm-lock.yaml'))) return 'pnpm'
  if (await exists(join(root, 'yarn.lock'))) return 'yarn'
  if (await exists(join(root, 'bun.lockb')) || (await exists(join(root, 'bun.lock')))) return 'bun'
  return 'npm'
}

export async function hasDevScript(root: string): Promise<boolean> {
  try {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    return typeof pkg?.scripts?.dev === 'string'
  } catch {
    return false
  }
}

export interface DevServer {
  port: number
  stop: () => void
  exited: Promise<number | null>
}

/**
 * Run the project's `dev` script and wait until it listens. The port comes
 * from the server's own output when it prints one (Vite and Next both print
 * `http://localhost:<port>`), which matters because Vite silently moves to
 * the next port when the configured one is taken. Falls back to polling the
 * expected port.
 */
export function startDevServer(
  root: string,
  expectedPort: number,
  onLog?: (line: string) => void,
): Promise<DevServer> {
  return new Promise(async (resolve, reject) => {
    const pm = await detectPackageManager(root)
    const args = pm === 'npm' ? ['run', 'dev'] : ['run', 'dev']
    const child: ChildProcess = spawn(pm, args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', BROWSER: 'none' },
    })

    let settled = false
    let resolveExit: (code: number | null) => void = () => {}
    const exited = new Promise<number | null>((r) => { resolveExit = r })
    const stop = () => { if (child.exitCode == null) child.kill('SIGTERM') }

    const finish = (port: number) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearInterval(poll)
      if (graceTimer) clearTimeout(graceTimer)
      resolve({ port, stop, exited })
    }

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      clearInterval(poll)
      stop()
      reject(new Error(`The dev server did not start listening within ${START_TIMEOUT_MS / 1000}s.`))
    }, START_TIMEOUT_MS)

    // Fallback for servers that print nothing recognisable.
    const poll = setInterval(() => {
      void servesHtml(expectedPort).then((ok) => { if (ok) finish(expectedPort) })
    }, 1000)

    // Tooling often prints several URLs (a CMS API, a GraphQL playground, a
    // proxy) before the app itself. Only a port that answers with HTML on "/"
    // counts, and a line the tool marks as "Local:" (Vite, Next, Astro) wins
    // outright; other candidates get a short grace period in case that line
    // is still coming.
    const seen = new Set<number>()
    let graceTimer: ReturnType<typeof setTimeout> | null = null
    const consider = (port: number, preferred: boolean) => {
      if (seen.has(port)) return
      seen.add(port)
      void servesHtml(port).then((ok) => {
        if (!ok || settled) return
        if (preferred) {
          finish(port)
          return
        }
        if (!graceTimer) graceTimer = setTimeout(() => finish(port), 3000)
      })
    }

    const scan = (chunk: Buffer) => {
      // Vite colours its URL even with FORCE_COLOR=0; strip ANSI before matching.
      const text = chunk.toString('utf8').replace(/\x1b\[[0-9;]*m/g, '')
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        onLog?.(line)
        const re = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0):(\d{2,5})(\/[^\s]*)?/g
        for (const m of line.matchAll(re)) {
          const path = m[2] ?? '/'
          if (path !== '/' && path !== '') continue // an API or playground URL
          consider(Number(m[1]), /\blocal\b/i.test(line))
        }
      }
    }
    child.stdout?.on('data', scan)
    child.stderr?.on('data', scan)

    child.once('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearInterval(poll)
      reject(new Error(`Could not run \`${pm} run dev\`: ${err.message}`))
    })
    child.once('exit', (code) => {
      resolveExit(code)
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearInterval(poll)
      reject(new Error(`\`${pm} run dev\` exited with code ${code ?? 'unknown'} before listening.`))
    })
  })
}
