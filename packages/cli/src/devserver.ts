import { spawn, type ChildProcess } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isPortListening } from './tunnel.js'

const START_TIMEOUT_MS = 60_000

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
      void isPortListening(expectedPort).then((up) => { if (up) finish(expectedPort) })
    }, 1000)

    const scan = (chunk: Buffer) => {
      // Vite colours its URL even with FORCE_COLOR=0; strip ANSI before matching.
      const text = chunk.toString('utf8').replace(/\x1b\[[0-9;]*m/g, '')
      for (const line of text.split('\n')) if (line.trim()) onLog?.(line)
      const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0):(\d{2,5})/)
      if (match) {
        const port = Number(match[1])
        // Confirm it accepts connections before handing it out.
        void isPortListening(port).then((up) => { if (up) finish(port) })
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
