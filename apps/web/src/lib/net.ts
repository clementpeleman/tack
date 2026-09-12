import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

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
  const addresses = isIP(bare)
    ? [{ address: bare }]
    : await lookup(bare, { all: true }).catch(() => [])
  if (addresses.length === 0) {
    throw new Error(`Could not resolve ${hostname}.`)
  }
  for (const { address } of addresses) {
    if (!isPublicIp(address)) {
      throw new Error(`${hostname} resolves to a private address; only public sites can be shared.`)
    }
  }
  return addresses.map((a) => a.address)
}
