#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { ApiError } from './api.js'
import { initCommand } from './commands/init.js'
import {
  loginCommand,
  logoutCommand,
  originCommand,
  statusCommand,
} from './commands/misc.js'
import type { Gate } from './patch.js'
import { error, log } from './ui.js'

const VERSION = '0.1.0'

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

  Options
    --host <url>         Tack instance (default: $TACK_HOST)
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
    --help, --version

  Environment
    TACK_HOST            Default instance URL
    TACK_TOKEN           Token for CI and other non-interactive use
    TACK_CONFIG_DIR      Override where credentials are stored
    NO_COLOR             Disable colour
`

function resolveHost(flag?: string): string | null {
  const raw = flag ?? process.env.TACK_HOST
  if (!raw) return null
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return new URL(withScheme).origin
  } catch {
    return null
  }
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
    error('No Tack host. Pass --host https://tack.example.com or set TACK_HOST.')
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
