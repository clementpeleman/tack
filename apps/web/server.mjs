import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join } from 'node:path'
import serverEntry from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)
const rootDir = dirname(fileURLToPath(import.meta.url))
const staticRoot = join(rootDir, 'dist/client')
process.chdir(rootDir)

const { fetch: handleFetch } = serverEntry

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

function tryServeStatic(pathname, res) {
  if (pathname.includes('..')) return false
  const filePath = join(staticRoot, pathname)
  if (!existsSync(filePath)) return false
  const stat = statSync(filePath)
  if (!stat.isFile()) return false

  const ext = extname(filePath)
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': stat.size,
  })
  createReadStream(filePath).pipe(res)
  return true
}

// Behind a TLS-terminating proxy (Coolify/Traefik, nginx, Caddy) the container
// receives plain HTTP, so the scheme and host must come from forwarded headers
// — otherwise generated URLs (the widget embed snippet, magic links) come out
// http:// and get blocked as mixed content on https client sites. TACK_PUBLIC_URL
// is the authoritative override when headers can't be trusted.
function resolveBaseUrl(req) {
  if (process.env.TACK_PUBLIC_URL) {
    try {
      return new URL(process.env.TACK_PUBLIC_URL).origin
    } catch {
      console.warn('[tack] TACK_PUBLIC_URL is not a valid URL; ignoring')
    }
  }
  const proto =
    (req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() || 'http'
  const host =
    req.headers['x-forwarded-host'] ?? req.headers.host ?? `localhost:${port}`
  return `${proto}://${host}`
}

createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', resolveBaseUrl(req))

    if (
      (req.method === 'GET' || req.method === 'HEAD') &&
      tryServeStatic(requestUrl.pathname, res)
    ) {
      return
    }

    let body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve, reject) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
      })
    }

    const requestInit = {
      method: req.method,
      headers: req.headers,
    }
    if (body && body.length > 0) {
      requestInit.body = body
    }
    const request = new Request(requestUrl.toString(), requestInit)

    const response = await handleFetch(request)
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()))

    if (response.body) {
      Readable.fromWeb(response.body).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    console.error('[tack] server error:', err)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
}).listen(port, () => {
  console.log(`Tack listening on http://0.0.0.0:${port}`)
  console.log(`Data directory: ${process.env.DATABASE_URL ?? join(rootDir, 'tack.db')}`)
})
