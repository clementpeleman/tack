import { lookup, Resolver } from 'node:dns/promises'
import { isIP } from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'

const LOOKUP_ATTEMPTS = 6
const LOOKUP_RETRY_MS = 1500

/**
 * Anything the proxy fetches on a user's behalf must sit on the public
 * internet. Loopback, RFC1918, link-local, CGNAT and their IPv6 counterparts
 * would let a share target the Tack host itself or whatever sits beside it
 * on the same network.
 */
export function isPublicIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isPublicIpv4(ip)
  if (version === 6) return isPublicIpv6(ip)
  return false
}

function isPublicIpv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number) as [number, number]
  if (a === 0 || a === 10 || a === 127) return false
  if (a === 100 && b >= 64 && b <= 127) return false // CGNAT
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 192 && b === 0) return false // 192.0.0.0/24, 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return false
  if (a >= 224) return false // multicast + reserved
  return true
}

function isPublicIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return false
  if (lower.startsWith('fe80:') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return false
  if (lower.startsWith('fc') || lower.startsWith('fd')) return false // ULA
  if (lower.startsWith('ff')) return false // multicast
  // IPv4-mapped: ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPublicIpv4(mapped[1]!)
  return true
}

const PUBLIC_RESOLVERS = ['1.1.1.1', '8.8.8.8']

async function resolvePublic(hostname: string): Promise<{ address: string }[]> {
  let sawResolverError = false
  for (const server of PUBLIC_RESOLVERS) {
    const resolver = new Resolver({ timeout: 2000, tries: 1 })
    resolver.setServers([server])
    try {
      const [v4, v6] = await Promise.all([
        resolver.resolve4(hostname).catch((e: NodeJS.ErrnoException) => {
          if (e.code !== 'ENOTFOUND' && e.code !== 'ENODATA') sawResolverError = true
          return [] as string[]
        }),
        resolver.resolve6(hostname).catch(() => [] as string[]),
      ])
      const all = [...v4, ...v6]
      if (all.length > 0) return all.map((address) => ({ address }))
    } catch {
      sawResolverError = true
    }
  }
  // Public DNS blocked (some corporate networks): use whatever the OS says.
  if (sawResolverError) {
    return lookup(hostname, { all: true }).catch(() => [])
  }
  return []
}

/**
 * Resolve a hostname and require every address to be public. Returns the
 * addresses so a caller that wants to pin the connection can. Set
 * TACK_SHARE_ALLOW_LOCAL=true in development to proxy a dev server on
 * localhost; never in production.
 */
export async function assertPublicHost(hostname: string): Promise<string[]> {
  if (process.env.TACK_SHARE_ALLOW_LOCAL === 'true') return []
  const bare = hostname.replace(/^\[|\]$/g, '')
  if (bare === 'localhost' || bare.endsWith('.localhost')) {
    throw new Error('Target must be a public site, not localhost.')
  }
  // Resolve against public resolvers rather than the OS one: a hostname
  // minted seconds ago (a fresh tunnel) is not in every cache yet, and the
  // OS resolver would cache the miss for minutes. Retry a few times to give
  // propagation a chance; fall back to the system resolver if public DNS is
  // unreachable from this network.
  let addresses: { address: string }[] = isIP(bare) ? [{ address: bare }] : []
  for (let attempt = 0; addresses.length === 0 && attempt < LOOKUP_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(LOOKUP_RETRY_MS)
    addresses = await resolvePublic(bare)
  }
  if (addresses.length === 0) {
    throw new Error(`Could not resolve ${hostname}. If it was just created, wait a moment and try again.`)
  }
  for (const { address } of addresses) {
    if (!isPublicIp(address)) {
      throw new Error(`${hostname} resolves to a private address; only public sites can be shared.`)
    }
  }
  return addresses.map((a) => a.address)
}
