import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { hostname } from 'node:os'
import { api } from './api.js'
import { saveCredentials } from './config.js'
import { bold, dim, info, isInteractive, log, prompt, warn } from './ui.js'

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function clientLabel(): string {
  return `tack-cli on ${hostname()}`
}

/** Best-effort: the URL is always printed too, so this failing is not fatal. */
function openBrowser(url: string): void {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]

  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' })
    child.on('error', () => {})
    child.unref()
  } catch {
    /* the printed URL is the fallback */
  }
}

interface CallbackResult {
  code: string
  state: string
}

/**
 * Binds an ephemeral port on 127.0.0.1 and resolves with the first /callback
 * hit. Never binds 0.0.0.0 — that would expose the callback to the LAN.
 */
function listenForCallback(): Promise<{
  port: number
  waitForCode: Promise<CallbackResult>
  close: () => void
}> {
  return new Promise((resolve, reject) => {
    let settle: (value: CallbackResult) => void
    let fail: (reason: Error) => void
    const waitForCode = new Promise<CallbackResult>((res, rej) => {
      settle = res
      fail = rej
    })

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname !== '/callback') {
        res.writeHead(404)
        res.end()
        return
      }

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      // Static markup — never reflect query params into the response.
      res.end(
        '<!doctype html><meta charset="utf-8"><title>Tack</title>' +
          '<body style="font-family:system-ui;padding:48px;max-width:32rem">' +
          '<h1 style="font-size:1.25rem">Signed in</h1>' +
          '<p style="color:#555">You can close this tab and return to your terminal.</p>',
      )

      if (code && state) settle({ code, state })
      else fail(new Error('Callback was missing the code or state.'))
    })

    server.on('error', reject)

    const timer = setTimeout(() => {
      fail(new Error('Timed out waiting for the browser.'))
      server.close()
    }, LOGIN_TIMEOUT_MS)
    timer.unref()

    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address == null || typeof address === 'string') {
        reject(new Error('Could not determine the callback port.'))
        return
      }
      resolve({
        port: address.port,
        waitForCode,
        close: () => {
          clearTimeout(timer)
          server.close()
        },
      })
    })
  })
}

export interface LoginOptions {
  host: string
  noBrowser?: boolean
}

/**
 * Browser login. Prefers the loopback redirect; falls back to the user pasting
 * a code when no port can be bound or there is no browser to open (SSH,
 * containers, `--no-browser`).
 */
export async function login({ host, noBrowser }: LoginOptions): Promise<{
  token: string
  email: string | null
}> {
  const { verifier, challenge } = createPkcePair()
  const label = clientLabel()

  const preferManual = Boolean(noBrowser) || Boolean(process.env.SSH_CONNECTION)

  let listener: Awaited<ReturnType<typeof listenForCallback>> | null = null
  if (!preferManual) {
    try {
      listener = await listenForCallback()
    } catch {
      listener = null
    }
  }

  const client = api(host)
  const started = await client.startAuth({
    codeChallenge: challenge,
    redirectPort: listener?.port ?? null,
    clientLabel: label,
  })

  log()
  info(`Verification code: ${bold(started.userCode)}`)
  info(dim('Confirm this matches the code shown in the browser.'))
  log()
  info('Opening your browser to sign in…')
  info(dim(started.authorizeUrl))
  log()

  if (!preferManual) openBrowser(started.authorizeUrl)

  let code: string
  if (listener) {
    try {
      const result = await listener.waitForCode
      if (result.state !== started.requestId) {
        throw new Error('State did not match — discarding this login attempt.')
      }
      code = result.code
    } finally {
      listener.close()
    }
  } else {
    if (!isInteractive()) {
      throw new Error(
        'No browser callback available and no TTY to paste a code into. Use TACK_TOKEN in non-interactive environments.',
      )
    }
    warn('Could not open a local callback port; falling back to manual entry.')
    code = await prompt('Paste the code from the browser:')
    if (!code) throw new Error('No code entered.')
  }

  const exchanged = await client.exchange({
    requestId: started.requestId,
    code,
    codeVerifier: verifier,
    label,
  })

  const whoami = await api(host, exchanged.token).whoami().catch(() => ({
    email: null,
    scopes: [] as string[],
  }))

  await saveCredentials(host, {
    token: exchanged.token,
    email: whoami.email,
    createdAt: new Date().toISOString(),
  })

  return { token: exchanged.token, email: whoami.email }
}
