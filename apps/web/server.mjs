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

createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? `localhost:${port}`
    const requestUrl = new URL(req.url ?? '/', `http://${host}`)

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
