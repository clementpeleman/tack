import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'

/**
 * Credential storage, keyed by host so a self-hosted instance and the hosted
 * service can be logged in at the same time.
 */

export interface HostCredentials {
  token: string
  email: string | null
  createdAt: string
}

interface CredentialsFile {
  version: 1
  hosts: Record<string, HostCredentials>
}

const EMPTY: CredentialsFile = { version: 1, hosts: {} }

export function configDir(): string {
  if (process.env.TACK_CONFIG_DIR) return process.env.TACK_CONFIG_DIR
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA
    if (appData) return join(appData, 'tack')
  }
  if (process.env.XDG_CONFIG_HOME) {
    return join(process.env.XDG_CONFIG_HOME, 'tack')
  }
  return join(homedir(), '.tack')
}

export function credentialsPath(): string {
  return join(configDir(), 'credentials.json')
}

/** Trailing slashes and casing shouldn't create a second entry for one host. */
export function normalizeHost(host: string): string {
  const withScheme = /^https?:\/\//i.test(host) ? host : `https://${host}`
  const url = new URL(withScheme)
  return url.origin.toLowerCase()
}

async function readFileSafe(): Promise<CredentialsFile> {
  try {
    const raw = await readFile(credentialsPath(), 'utf8')
    const parsed = JSON.parse(raw) as CredentialsFile
    if (!parsed || typeof parsed !== 'object' || !parsed.hosts) return { ...EMPTY }
    return parsed
  } catch {
    return { ...EMPTY }
  }
}

/**
 * Write via temp file + rename. `writeFile`'s mode only applies when it
 * creates the file, so rewriting an existing credentials file in place would
 * silently keep whatever permissions were already on it.
 */
async function writeFileSafe(data: CredentialsFile): Promise<void> {
  const target = credentialsPath()
  await mkdir(dirname(target), { recursive: true, mode: 0o700 })

  const tmp = `${target}.${randomBytes(6).toString('hex')}.tmp`
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
  await rename(tmp, target)

  // No-op on Windows; harmless there.
  try {
    await chmod(target, 0o600)
  } catch {
    /* ignore */
  }
}

export async function readCredentials(
  host: string,
): Promise<HostCredentials | null> {
  const file = await readFileSafe()
  return file.hosts[normalizeHost(host)] ?? null
}

export async function saveCredentials(
  host: string,
  credentials: HostCredentials,
): Promise<void> {
  const file = await readFileSafe()
  file.hosts[normalizeHost(host)] = credentials
  await writeFileSafe(file)
}

export async function clearCredentials(host: string): Promise<boolean> {
  const file = await readFileSafe()
  const key = normalizeHost(host)
  if (!file.hosts[key]) return false
  delete file.hosts[key]
  await writeFileSafe(file)
  return true
}

/**
 * Precedence: explicit flag, then env, then the stored file. `--token` is
 * supported but documented as discouraged — argv is visible in `ps` and lands
 * in shell history; `TACK_TOKEN` is the intended CI path.
 */
export async function resolveToken(
  host: string,
  flagToken?: string,
): Promise<string | null> {
  if (flagToken) return flagToken
  if (process.env.TACK_TOKEN) return process.env.TACK_TOKEN
  const stored = await readCredentials(host)
  return stored?.token ?? null
}
