#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { ApiError } from './api.js'
import { initCommand } from './commands/init.js'
import { shareCommand } from './commands/share.js'
import {
  loginCommand,
  logoutCommand,
  originCommand,
  statusCommand,
} from './commands/misc.js'
import type { Gate } from './patch.js'
import { error, log, warn } from './ui.js'

const VERSION: string = createRequire(import.meta.url)('../package.json').version

/** The hosted service. Self-hosters pass --host or set TACK_HOST. */
const DEFAULT_HOST = 'https://tack.peleman.io'

const HELP = `
  tack — install the Tack feedback widget

  Usage
    npx @usetack/cli init [options]

  Commands
    init                 Detect the framework and add the widget
    login                Sign in to a Tack instance
    logout               Revoke this machine's token and forget it
    status               Show host, sign-in state and detected framework
    origin add <url>     Allow an extra local dev origin
    share                Share your running dev server: opens a tunnel and
                         prints a review link that lives until Ctrl-C
    share <url>          Create a review link for a deployed preview that
                         serves it with the widget injected
    share list           Show active review links
    share revoke <id>    Close a review link

  Options
    --host <url>         Your Tack instance, for self-hosting.
                         Default: $TACK_HOST, else https://tack.peleman.io
    --project <id|pk_>   Project to install, skips the prompt
    --origin <url>       Dev origin to allow (default: detected dev port)
    --gate <env|dev|none>
                         When the widget loads. Default env: off unless the
                         environment variable is set, so it never reaches
                         production by accident.
    --cwd <dir>          Project directory (default: current)
    --yes                Skip the confirmation prompt
    --dry-run            Show the diff and exit without writing
    --no-browser         Print the URL instead of opening a browser
    --token <token>      Discouraged; prefer TACK_TOKEN (argv is visible in ps)
    --passcode <code>    share: require a passcode to open the link
    --days <n>           share: expiry in days (default 7 for a URL, 1 for a tunnel)
    --port <n>           share: local port to tunnel (default: detected dev port)
    --help, --version

  Environment
    TACK_HOST            Instance URL (self-host); overrides the hosted default
    TACK_TOKEN           Token for CI and other non-interactive use
    TACK_CONFIG_DIR      Override where credentials are stored
    NO_COLOR             Disable colour
`

function resolveHost(flag?: string): string | null {
  const raw = flag ?? process.env.TACK_HOST ?? DEFAULT_HOST
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const url = new URL(withScheme)
    // The bearer token travels in every request; over plain http to a remote
    // host it is readable on the wire. Loopback is the one legitimate case.
    if (url.protocol === 'http:' && !isLoopbackHost(url.hostname)) {
      warn(`${url.origin} is plain http — your token will be sent unencrypted.`)
    }
    return url.origin
  } catch {
    return null
  }
}

function isLoopbackHost(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return (
    bare === 'localhost' ||
    bare === '::1' ||
    bare.endsWith('.localhost') ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(bare)
  )
}

function parseGate(value: string | undefined): Gate | null {
  if (value == null) return 'env'
  if (value === 'env' || value === 'dev' || value === 'none') return value
  return null
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: false,
    options: {
      host: { type: 'string' },
      project: { type: 'string' },
      origin: { type: 'string' },
      gate: { type: 'string' },
      cwd: { type: 'string' },
      token: { type: 'string' },
      passcode: { type: 'string' },
      days: { type: 'string' },
      port: { type: 'string' },
      yes: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'no-browser': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      version: { type: 'boolean', default: false },
    },
  })

  if (values.version) {
    log(VERSION)
    return 0
  }

  const command = positionals[0]

  if (values.help || !command || command === 'help') {
    log(HELP)
    return command || values.help ? 0 : 1
  }

  const host = resolveHost(values.host as string | undefined)
  if (!host) {
    error('Invalid host. Pass --host https://tack.example.com or set TACK_HOST.')
    return 1
  }

  const gate = parseGate(values.gate as string | undefined)
  if (!gate) {
    error('--gate must be one of: env, dev, none')
    return 1
  }

  const cwd = resolve((values.cwd as string | undefined) ?? process.cwd())
  const token = values.token as string | undefined

  switch (command) {
    case 'init':
      return initCommand({
        host,
        cwd,
        token,
        project: values.project as string | undefined,
        origin: values.origin as string | undefined,
        gate,
        yes: Boolean(values.yes),
        dryRun: Boolean(values['dry-run']),
        noBrowser: Boolean(values['no-browser']),
      })

    case 'login':
      return loginCommand({ host, noBrowser: Boolean(values['no-browser']) })

    case 'logout':
      return logoutCommand({ host })

    case 'status':
      return statusCommand({ host, cwd, token })

    case 'share': {
      const sub = positionals[1]
      const days = values.days == null ? undefined : Number(values.days)
      if (days !== undefined && !Number.isInteger(days)) {
        error('--days must be a whole number')
        return 1
      }
      const port = values.port == null ? undefined : Number(values.port)
      if (port !== undefined && !(Number.isInteger(port) && port > 0 && port < 65536)) {
        error('--port must be a port number')
        return 1
      }
      return shareCommand({
        host,
        cwd,
        token,
        port,
        project: values.project as string | undefined,
        url: sub === 'list' || sub === 'revoke' ? undefined : sub,
        passcode: values.passcode as string | undefined,
        days,
        noBrowser: Boolean(values['no-browser']),
        sub: sub === 'list' || sub === 'revoke' ? sub : undefined,
        shareId: sub === 'revoke' ? positionals[2] : undefined,
      })
    }

    case 'origin': {
      const sub = positionals[1]
      const url = positionals[2]
      if (sub !== 'add' || !url) {
        error('Usage: tack origin add <url>')
        return 1
      }
      return originCommand({
        host,
        token,
        project: values.project as string | undefined,
        origin: url,
      })
    }

    default:
      error(`Unknown command: ${command}`)
      log(HELP)
      return 1
  }
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((err: unknown) => {
    if (err instanceof ApiError) {
      error(err.message)
    } else if (err instanceof Error) {
      error(err.message)
    } else {
      error(String(err))
    }
    process.exitCode = 1
  })
