/**
 * The URL this instance is reachable at, for links that leave the server
 * (magic links, CLI authorize URLs, notification links).
 *
 * `TACK_PUBLIC_URL` is authoritative. Without it the only source is the
 * request itself, whose Host / X-Forwarded-Host an attacker controls: they
 * can request a magic link for the owner's address with their own host and
 * the owner receives a valid token pointing at the attacker's domain. That is
 * acceptable when links are only printed to the server log (no email
 * provider), so the fallback is allowed there, but refused in production once
 * links actually get emailed.
 */
import { isEmailConfigured } from '#/lib/email'

export class PublicUrlError extends Error {
  constructor() {
    super(
      'TACK_PUBLIC_URL is not set. Set it to the https URL of this instance (e.g. https://tack.example.com) before emailing sign-in links.',
    )
    this.name = 'PublicUrlError'
  }
}

export function configuredPublicOrigin(): string | null {
  const raw = process.env.TACK_PUBLIC_URL
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

/** Origin for outbound links. Throws when a spoofable fallback would be used to email a link. */
export function publicOrigin(request: Request): string {
  const configured = configuredPublicOrigin()
  if (configured) return configured

  if (process.env.NODE_ENV === 'production' && isEmailConfigured()) {
    throw new PublicUrlError()
  }
  return new URL(request.url).origin
}
