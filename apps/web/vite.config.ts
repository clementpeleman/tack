import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'node:path'
import { createShareProxy } from './share-proxy.mjs'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Serve share links in development too, so `http://<slug>.share.localhost:3000`
 * works against the dev server. Set TACK_SHARE_DOMAIN=share.localhost and
 * TACK_SHARE_PORT=3000; add TACK_SHARE_ALLOW_LOCAL=true to share a local
 * fixture site.
 */
function shareProxyPlugin(): Plugin {
  return {
    name: 'tack-share-proxy',
    configureServer(server) {
      const shareDomain = process.env.TACK_SHARE_DOMAIN?.trim()
      if (!shareDomain) return
      const port = Number(process.env.PORT ?? 3000)
      const proxy = createShareProxy({
        dbPath: process.env.DATABASE_URL ?? resolve(process.cwd(), 'tack.db'),
        shareDomain,
        tackOrigin: () => process.env.TACK_PUBLIC_URL ?? `http://localhost:${port}`,
        allowLocal: process.env.TACK_SHARE_ALLOW_LOCAL === 'true',
        log: (m) => server.config.logger.warn(`[tack share] ${m}`),
      })
      server.middlewares.use((req, res, next) => {
        proxy(req, res).then((handled) => { if (!handled) next() }, next)
      })
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    allowedHosts: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Tack-Reviewer',
    },
  },
  plugins: [shareProxyPlugin(), devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
