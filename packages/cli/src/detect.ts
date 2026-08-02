import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

export type FrameworkId = 'next-app' | 'vite' | 'sveltekit' | 'html'

export interface Detection {
  framework: FrameworkId
  label: string
  /** Path, relative to the project root, that will be patched. */
  file: string
  /** How the snippet is inserted into that file. */
  strategy: 'body-anchor' | 'entry-module'
  devPort: number
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function firstExisting(
  root: string,
  candidates: string[],
): Promise<string | null> {
  for (const candidate of candidates) {
    if (await exists(join(root, candidate))) return candidate
  }
  return null
}

async function readPackageJson(
  root: string,
): Promise<Record<string, any> | null> {
  try {
    return JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  } catch {
    return null
  }
}

function hasDep(pkg: Record<string, any> | null, name: string): boolean {
  if (!pkg) return false
  return Boolean(
    pkg.dependencies?.[name] ??
      pkg.devDependencies?.[name] ??
      pkg.peerDependencies?.[name],
  )
}

/**
 * The dev port decides which origin gets allowlisted, so a wrong guess is
 * visible (the widget silently won't load). It's shown in the confirm step and
 * overridable with --origin, and `tack origin add` exists as the recovery path.
 */
export function devPortFromScripts(
  pkg: Record<string, any> | null,
  fallback: number,
): number {
  const dev = typeof pkg?.scripts?.dev === 'string' ? pkg.scripts.dev : ''
  const match = dev.match(/(?:--port[= ]|-p[= ])(\d{2,5})/)
  if (match) {
    const port = Number(match[1])
    if (Number.isInteger(port) && port > 0 && port < 65536) return port
  }
  return fallback
}

/**
 * Vite's HTML entry points at the real module entry; patching that module
 * rather than index.html is what lets the snippet be gated on
 * `import.meta.env`, which index.html cannot express.
 */
async function viteEntryModule(root: string): Promise<string | null> {
  try {
    const html = await readFile(join(root, 'index.html'), 'utf8')
    const match = html.match(
      /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i,
    )
    if (match?.[1]) {
      const src = match[1].replace(/^\.?\//, '')
      if (await exists(join(root, src))) return src
    }
  } catch {
    /* fall through to the conventional locations */
  }

  return firstExisting(root, [
    'src/main.ts',
    'src/main.tsx',
    'src/main.js',
    'src/main.jsx',
    'src/index.ts',
    'src/index.tsx',
  ])
}

export async function detectFramework(root: string): Promise<Detection | null> {
  const pkg = await readPackageJson(root)

  // Next.js App Router. React 19 hoists and dedupes `<script async src>`
  // rendered from a component, so a raw tag in the layout needs no import.
  if (hasDep(pkg, 'next')) {
    const layout = await firstExisting(root, [
      'app/layout.tsx',
      'app/layout.jsx',
      'src/app/layout.tsx',
      'src/app/layout.jsx',
    ])
    if (layout) {
      return {
        framework: 'next-app',
        label: 'Next.js (App Router)',
        file: layout,
        strategy: 'body-anchor',
        devPort: devPortFromScripts(pkg, 3000),
      }
    }
  }

  if (hasDep(pkg, '@sveltejs/kit')) {
    if (await exists(join(root, 'src/app.html'))) {
      return {
        framework: 'sveltekit',
        label: 'SvelteKit',
        file: 'src/app.html',
        strategy: 'body-anchor',
        devPort: devPortFromScripts(pkg, 5173),
      }
    }
  }

  const viteConfig = await firstExisting(root, [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mts',
    'vite.config.mjs',
  ])
  if (viteConfig || hasDep(pkg, 'vite')) {
    const entry = await viteEntryModule(root)
    if (entry) {
      return {
        framework: 'vite',
        label: 'Vite',
        file: entry,
        strategy: 'entry-module',
        devPort: devPortFromScripts(pkg, 5173),
      }
    }
  }

  // No build tooling, but there is an HTML file to patch.
  if (!pkg && (await exists(join(root, 'index.html')))) {
    return {
      framework: 'html',
      label: 'Plain HTML',
      file: 'index.html',
      strategy: 'body-anchor',
      devPort: 8080,
    }
  }

  return null
}
