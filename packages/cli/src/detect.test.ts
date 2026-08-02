import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { detectFramework, devPortFromScripts } from './detect.js'

const dirs: string[] = []

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'tack-cli-'))
  dirs.push(root)
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, path)
    await mkdir(join(full, '..'), { recursive: true })
    await writeFile(full, contents)
  }
  return root
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

describe('detect: Next.js App Router', () => {
  it('targets app/layout.tsx', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({ dependencies: { next: '15.0.0' } }),
      'app/layout.tsx': '<html><body>{children}</body></html>',
    })
    const detection = await detectFramework(root)
    expect(detection?.framework).toBe('next-app')
    expect(detection?.file).toBe('app/layout.tsx')
    expect(detection?.strategy).toBe('body-anchor')
    expect(detection?.devPort).toBe(3000)
  })

  it('finds the layout under src/', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({ dependencies: { next: '15.0.0' } }),
      'src/app/layout.tsx': '<html><body>{children}</body></html>',
    })
    expect((await detectFramework(root))?.file).toBe('src/app/layout.tsx')
  })
})

describe('detect: Vite', () => {
  it('follows index.html to the real entry module', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({ devDependencies: { vite: '^6' } }),
      'vite.config.ts': 'export default {}',
      'index.html':
        '<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>',
      'src/main.tsx': 'createRoot(document.getElementById("root")).render(<App />)',
    })
    const detection = await detectFramework(root)
    expect(detection?.framework).toBe('vite')
    // Patching the entry module rather than index.html is what allows the
    // import.meta.env gate.
    expect(detection?.file).toBe('src/main.tsx')
    expect(detection?.strategy).toBe('entry-module')
    expect(detection?.devPort).toBe(5173)
  })

  it('falls back to a conventional entry when index.html has no module script', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({ devDependencies: { vite: '^6' } }),
      'vite.config.js': 'export default {}',
      'index.html': '<body></body>',
      'src/main.ts': 'console.log(1)',
    })
    expect((await detectFramework(root))?.file).toBe('src/main.ts')
  })
})

describe('detect: SvelteKit and plain HTML', () => {
  it('targets src/app.html for SvelteKit', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({
        devDependencies: { '@sveltejs/kit': '^2' },
      }),
      'src/app.html': '<body>%sveltekit.body%</body>',
    })
    const detection = await detectFramework(root)
    expect(detection?.framework).toBe('sveltekit')
    expect(detection?.file).toBe('src/app.html')
  })

  it('treats a bare index.html as plain HTML', async () => {
    const root = await fixture({ 'index.html': '<body><h1>hi</h1></body>' })
    expect((await detectFramework(root))?.framework).toBe('html')
  })

  it('returns null when nothing is recognized', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({ dependencies: { express: '^4' } }),
    })
    expect(await detectFramework(root)).toBeNull()
  })
})

describe('detect: dev port', () => {
  it('reads an explicit port from the dev script', () => {
    expect(devPortFromScripts({ scripts: { dev: 'vite --port 4000' } }, 5173)).toBe(4000)
    expect(devPortFromScripts({ scripts: { dev: 'next dev -p 3001' } }, 3000)).toBe(3001)
    expect(devPortFromScripts({ scripts: { dev: 'vite --port=4321' } }, 5173)).toBe(4321)
  })

  it('falls back when there is no port to read', () => {
    expect(devPortFromScripts({ scripts: { dev: 'vite' } }, 5173)).toBe(5173)
    expect(devPortFromScripts(null, 3000)).toBe(3000)
  })
})
