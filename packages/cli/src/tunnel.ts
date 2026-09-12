import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { Resolver } from 'node:dns/promises'
import { connect } from 'node:net'
import { promisify } from 'node:util'

const run = promisify(execFile)
const TUNNEL_URL_TIMEOUT_MS = 45_000

/**
 * Phase 2 of share links leans on `cloudflared` rather than a tunnel of our
 * own: it is one binary, needs no account for quick tunnels, and the CLI
 * stays dependency-free. The trade-off is Cloudflare in the trust chain and
 * a URL that changes per run, which is why the share is created per session
 * and revoked on exit.
 */

export async function hasCloudflared(): Promise<boolean> {
  try {
    await run('cloudflared', ['--version'])
    return true
  } catch {
    return false
  }
}

export function cloudflaredInstallHint(): string {
  switch (process.platform) {
    case 'darwin':
      return 'brew install cloudflared'
    case 'win32':
      return 'winget install Cloudflare.cloudflared'
    default:
      return 'https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/'
  }
}

function tryConnect(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    const done = (value: boolean) => {
      socket.destroy()
      resolve(value)
    }
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
    socket.setTimeout(1500, () => done(false))
  })
}

/**
 * True when something accepts TCP connections on localhost:port. Both
 * families are tried: Vite binds `localhost`, which on recent Node resolves
 * to ::1 first, so an IPv4-only probe reports a running dev server as dead.
 */
export async function isPortListening(port: number): Promise<boolean> {
  return (await tryConnect('127.0.0.1', port)) || (await tryConnect('::1', port))
}

export type TunnelDnsResult =
  | { ok: true; waitedMs: number }
  | { ok: false; reason: 'timeout' | 'resolvers-unreachable'; waitedMs: number }

/**
 * A quick tunnel's hostname is minted when cloudflared connects, and the DNS
 * record follows a few seconds later. Asking the system resolver before it
 * exists is worse than useless: the "no such name" answer is cached for
 * minutes, on this machine and, if the share were created now, on the Tack
 * server. So the name is checked against public resolvers directly, and the
 * share is only created once both of them answer.
 *
 * Never fatal: on a network that blocks public DNS (some hotspots and
 * corporate networks) it waits a fixed grace period instead, and on a
 * timeout the caller proceeds anyway — the server retries its own lookup.
 */
export async function waitForTunnel(
  url: string,
  onProgress?: (elapsedMs: number) => void,
  timeoutMs = 45_000,
): Promise<TunnelDnsResult> {
  const hostname = new URL(url).hostname
  const started = Date.now()
  const resolvers = ['1.1.1.1', '8.8.8.8'].map((server) => {
    const r = new Resolver({ timeout: 2000, tries: 1 })
    r.setServers([server])
    return r
  })

  // Can we reach public DNS at all? If a name that certainly exists does
  // not resolve through either, the network is blocking us; do not spend
  // 45 s learning that.
  const reachable = await Promise.all(
    resolvers.map((r) => r.resolve4('cloudflare.com').then(() => true, () => false)),
  )
  if (!reachable.some(Boolean)) {
    await new Promise((r) => setTimeout(r, 8000))
    return { ok: false, reason: 'resolvers-unreachable', waitedMs: Date.now() - started }
  }
  const usable = resolvers.filter((_, i) => reachable[i])

  let lastTick = 0
  while (Date.now() - started < timeoutMs) {
    const answers = await Promise.all(
      usable.map((r) => r.resolve4(hostname).then((a) => a.length > 0, () => false)),
    )
    if (answers.every(Boolean)) {
      // One more beat so resolvers in between have it too.
      await new Promise((r) => setTimeout(r, 2000))
      return { ok: true, waitedMs: Date.now() - started }
    }
    const elapsed = Date.now() - started
    if (elapsed - lastTick >= 10_000) {
      lastTick = elapsed
      onProgress?.(elapsed)
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return { ok: false, reason: 'timeout', waitedMs: Date.now() - started }
}

export interface Tunnel {
  url: string
  /** Resolves once cloudflared is gone. */
  stop: () => Promise<void>
  /** Resolves when cloudflared exits on its own (crash, network loss). */
  exited: Promise<number | null>
}

/**
 * Start a quick tunnel to localhost:port and resolve with its public URL.
 * `--http-host-header` makes cloudflared present the request to the dev
 * server as if it came from localhost; Vite refuses unknown hosts otherwise.
 */
export function startTunnel(port: number, onLog?: (line: string) => void): Promise<Tunnel> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(
      'cloudflared',
      [
        'tunnel',
        '--url', `http://localhost:${port}`,
        '--http-host-header', `localhost:${port}`,
        '--no-autoupdate',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )

    let settled = false
    let exitCode: number | null = null
    let resolveExit: (code: number | null) => void = () => {}
    const exited = new Promise<number | null>((r) => { resolveExit = r })

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      reject(new Error('cloudflared did not report a tunnel URL within 45 seconds.'))
    }, TUNNEL_URL_TIMEOUT_MS)

    const scan = (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      for (const line of text.split('\n')) if (line.trim()) onLog?.(line)
      if (settled) return
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
      if (match) {
        settled = true
        clearTimeout(timer)
        resolve({
          url: match[0],
          // cloudflared honours a 30 s grace period on SIGTERM. That is fine
          // for a server, but here the user pressed Ctrl-C and the share is
          // already revoked, so give it a moment and then insist.
          stop: async () => {
            if (child.exitCode != null) return
            child.kill('SIGTERM')
            const gone = await Promise.race([
              exited.then(() => true),
              new Promise<boolean>((r) => setTimeout(() => r(false), 3000).unref()),
            ])
            if (!gone && child.exitCode == null) child.kill('SIGKILL')
          },
          exited,
        })
      }
    }
    child.stdout?.on('data', scan)
    child.stderr?.on('data', scan)

    child.once('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`Could not start cloudflared: ${err.message}`))
    })
    child.once('exit', (code) => {
      exitCode = code
      resolveExit(exitCode)
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`cloudflared exited with code ${code ?? 'unknown'} before reporting a URL.`))
    })
  })
}
