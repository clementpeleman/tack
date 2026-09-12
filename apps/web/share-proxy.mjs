// Share proxy: serves `<slug>.<TACK_SHARE_DOMAIN>` by fetching the share's
// target site and injecting the widget into HTML on the way through. Plain
// Node so both `server.mjs` (production) and the Vite dev server can use it
// without a build step. Reads the shares table directly with better-sqlite3.
import Database from 'better-sqlite3'
import { createHash, timingSafeEqual } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length',
])
// Headers from the target that must not reach the browser: framing/CSP would
// block the injected widget; encoding/length no longer match after rewrite.
const STRIP_RESPONSE = new Set([
  'content-security-policy', 'content-security-policy-report-only',
  'x-frame-options', 'content-encoding', 'content-length', 'transfer-encoding',
  'connection', 'keep-alive', 'set-cookie',
])
const PASSCODE_COOKIE = 'tack_share'
const ACCESS_WRITE_INTERVAL_MS = 60_000
const DNS_CACHE_MS = 60_000

function isPublicIp(ip) {
  const v = isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && (b === 168 || b === 0)) return false
    if (a === 198 && (b === 18 || b === 19)) return false
    if (a >= 224) return false
    return true
  }
  if (v === 6) {
    const l = ip.toLowerCase()
    if (l === '::' || l === '::1') return false
    if (/^fe[89ab]/.test(l) || /^f[cd]/.test(l) || l.startsWith('ff')) return false
    const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPublicIp(mapped[1])
    return true
  }
  return false
}

function page(res, status, title, body) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
  })
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;background:#fbfbfc;color:#1c1c20}.card{max-width:360px;padding:2rem;text-align:center}h1{font-size:1.125rem;margin:0 0 .5rem}p{font-size:.875rem;color:#57575e;line-height:1.5;margin:0 0 1.25rem}input{width:100%;box-sizing:border-box;padding:.6rem .75rem;border:1px solid #d6d6db;border-radius:.5rem;font-size:1rem;margin-bottom:.75rem}button{width:100%;padding:.7rem 1rem;border:none;border-radius:.5rem;background:#3b5bdb;color:#fff;font-size:.875rem;font-weight:500;cursor:pointer}.err{color:#b42318}@media(prefers-color-scheme:dark){body{background:#1a1a1f;color:#f5f5f6}p{color:#a8a8b0}input{background:#26262c;color:#f5f5f6;border-color:#3a3a42}}</style></head>
<body><div class="card">${body}</div></body></html>`)
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function parseCookies(header) {
  const out = {}
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

/**
 * @param {object} options
 * @param {string} options.dbPath
 * @param {string} options.shareDomain   e.g. "share.example.com"
 * @param {(req: import('node:http').IncomingMessage) => string} options.tackOrigin
 *        Origin of the Tack instance (for the widget script and API).
 * @param {boolean} [options.allowLocal]  Allow private targets (dev only).
 * @param {(msg: string) => void} [options.log]
 * @returns {(req, res) => Promise<boolean>}  true when the request was handled.
 */
export function createShareProxy({ dbPath, shareDomain, tackOrigin, allowLocal = false, log = () => {} }) {
  const domain = shareDomain.toLowerCase().replace(/^\*\./, '')
  const suffix = `.${domain}`
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  const findShare = db.prepare(
    `SELECT s.id, s.slug, s.target_url, s.passcode_hash, s.expires_at, s.revoked_at, p.project_key
       FROM shares s JOIN projects p ON p.id = s.project_id
      WHERE s.slug = ?`,
  )
  const touch = db.prepare(`UPDATE shares SET last_access_at = ? WHERE id = ?`)
  const lastTouch = new Map()
  const dnsCache = new Map()

  async function assertPublic(hostname) {
    if (allowLocal) return
    const cached = dnsCache.get(hostname)
    if (cached && cached.until > Date.now()) {
      if (!cached.ok) throw new Error('private')
      return
    }
    let ok = false
    try {
      const bare = hostname.replace(/^\[|\]$/g, '')
      const addrs = isIP(bare) ? [{ address: bare }] : await lookup(bare, { all: true })
      ok = addrs.length > 0 && addrs.every((a) => isPublicIp(a.address))
    } catch {
      ok = false
    }
    dnsCache.set(hostname, { ok, until: Date.now() + DNS_CACHE_MS })
    if (!ok) throw new Error('private')
  }

  return async function handle(req, res) {
    const rawHost = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
      .split(',')[0]
      .trim()
      .toLowerCase()
    const hostOnly = rawHost.replace(/:\d+$/, '')
    if (!hostOnly.endsWith(suffix)) return false

    const slug = hostOnly.slice(0, -suffix.length)
    if (!slug || slug.includes('.')) {
      page(res, 404, 'Not found', '<h1>Not found</h1><p>This is not a valid share link.</p>')
      return true
    }

    const share = findShare.get(slug)
    if (!share || share.revoked_at || Date.parse(share.expires_at) <= Date.now()) {
      page(
        res, 410, 'Link expired',
        '<h1>This review link is no longer active</h1><p>It expired or was closed by the person who shared it. Ask them for a fresh link.</p>',
      )
      return true
    }

    const proto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() || 'http'
    const shareOrigin = `${proto}://${rawHost}`
    const reqUrl = new URL(req.url ?? '/', shareOrigin)

    // Optional passcode gate. The cookie carries the passcode hash, which is
    // itself derived from the slug, so a cookie from one share is useless on
    // another.
    if (share.passcode_hash) {
      if (reqUrl.pathname === '/__tack/passcode' && req.method === 'POST') {
        const form = new URLSearchParams((await readBody(req)).toString('utf8'))
        const provided = createHash('sha256').update(`${slug}:${form.get('passcode') ?? ''}`).digest('hex')
        const a = Buffer.from(provided), b = Buffer.from(share.passcode_hash)
        if (a.length === b.length && timingSafeEqual(a, b)) {
          const secure = proto === 'https' ? '; Secure' : ''
          res.writeHead(303, {
            Location: '/',
            'Set-Cookie': `${PASSCODE_COOKIE}=${provided}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}${secure}`,
          })
          res.end()
          return true
        }
        page(res, 401, 'Passcode', passcodeForm(true))
        return true
      }
      const cookie = parseCookies(req.headers.cookie)[PASSCODE_COOKIE] ?? ''
      const a = Buffer.from(cookie), b = Buffer.from(share.passcode_hash)
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        page(res, 401, 'Passcode', passcodeForm(false))
        return true
      }
    }

    const now = Date.now()
    if ((lastTouch.get(share.id) ?? 0) + ACCESS_WRITE_INTERVAL_MS < now) {
      lastTouch.set(share.id, now)
      try { touch.run(new Date(now).toISOString(), share.id) } catch { /* ignore */ }
    }

    const target = new URL(share.target_url)
    try {
      await assertPublic(target.hostname)
    } catch {
      page(res, 502, 'Unavailable', '<h1>This link cannot be served</h1><p>The shared site is not reachable from here.</p>')
      return true
    }

    const upstream = new URL(target.origin)
    upstream.pathname = target.pathname.replace(/\/$/, '') + reqUrl.pathname
    upstream.search = reqUrl.search

    const headers = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (HOP_BY_HOP.has(k) || k.startsWith('proxy-')) continue
      if (k === 'cookie') {
        // Never forward the passcode cookie; everything else belongs to the site.
        const kept = Object.entries(parseCookies(v)).filter(([n]) => n !== PASSCODE_COOKIE)
        if (kept.length) headers.cookie = kept.map(([n, val]) => `${n}=${val}`).join('; ')
        continue
      }
      headers[k] = Array.isArray(v) ? v.join(', ') : v
    }
    headers.host = target.host
    headers['x-forwarded-host'] = rawHost
    headers['x-forwarded-proto'] = proto
    if (headers.origin === shareOrigin) headers.origin = target.origin
    if (typeof headers.referer === 'string' && headers.referer.startsWith(shareOrigin)) {
      headers.referer = target.origin + headers.referer.slice(shareOrigin.length)
    }

    const abort = new AbortController()
    req.on('close', () => abort.abort())
    const init = { method: req.method, headers, redirect: 'manual', signal: abort.signal }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = await readBody(req)
    }

    let response
    try {
      response = await fetch(upstream, init)
    } catch (err) {
      if (abort.signal.aborted) return true
      log(`upstream fetch failed for ${slug}: ${err?.message ?? err}`)
      page(res, 502, 'Unavailable', '<h1>The shared site did not respond</h1><p>Try again in a moment. If this keeps happening, the preview may be down.</p>')
      return true
    }

    const outHeaders = {}
    for (const [k, v] of response.headers) {
      if (STRIP_RESPONSE.has(k)) continue
      if (k === 'location' && v.startsWith(target.origin)) {
        outHeaders[k] = shareOrigin + v.slice(target.origin.length)
        continue
      }
      outHeaders[k] = v
    }
    // Cookies from the site: drop Domain= so they bind to the share host.
    const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    if (setCookies.length) {
      outHeaders['set-cookie'] = setCookies.map((c) =>
        c.replace(/;\s*domain=[^;]*/i, '').replace(proto === 'http' ? /;\s*secure/i : /$^/, ''),
      )
    }
    outHeaders['cache-control'] = 'no-store'
    outHeaders['x-robots-tag'] = 'noindex'

    const type = response.headers.get('content-type') ?? ''
    if (/text\/html/i.test(type) && req.method !== 'HEAD') {
      let html = await response.text()
      html = html.split(target.origin).join(shareOrigin)
      // A CSP delivered as a <meta> tag would block the injected script just
      // like the header we strip above.
      html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '')
      const origin = tackOrigin(req)
      // A site that already embeds the widget (via `tack init`) keeps its
      // own tag; the widget refuses to mount twice anyway, but one is cleaner.
      if (!html.includes('tack-widget.js')) {
        const tag = `<script src="${origin}/tack-widget.js" data-project="${escapeHtml(share.project_key)}" data-api="${origin}"></script>`
        const at = html.lastIndexOf('</body>')
        html = at === -1 ? html + tag : html.slice(0, at) + tag + html.slice(at)
      }
      outHeaders['content-type'] = type
      res.writeHead(response.status, outHeaders)
      res.end(html)
      return true
    }

    res.writeHead(response.status, outHeaders)
    if (response.body && req.method !== 'HEAD') {
      Readable.fromWeb(response.body).pipe(res)
    } else {
      res.end()
    }
    return true
  }
}

function passcodeForm(wrong) {
  return `<h1>Enter the passcode</h1><p>The person who shared this preview set a passcode.</p>
<form method="POST" action="/__tack/passcode"><input type="password" name="passcode" autocomplete="off" autofocus required placeholder="Passcode">${wrong ? '<p class="err">That passcode is not right.</p>' : ''}<button type="submit">Open preview</button></form>`
}
