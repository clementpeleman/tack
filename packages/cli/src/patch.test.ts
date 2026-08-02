import { describe, expect, it } from 'vitest'
import type { Detection } from './detect.js'
import {
  buildSnippet,
  hasForeignWidget,
  isAlreadyInstalled,
  MARKER,
  planPatch,
} from './patch.js'

const nextDetection: Detection = {
  framework: 'next-app',
  label: 'Next.js (App Router)',
  file: 'app/layout.tsx',
  strategy: 'body-anchor',
  devPort: 3000,
}

const viteDetection: Detection = {
  framework: 'vite',
  label: 'Vite',
  file: 'src/main.tsx',
  strategy: 'entry-module',
  devPort: 5173,
}

const input = {
  host: 'https://tack.example.com',
  projectKey: 'pk_abc123',
  gate: 'env' as const,
}

describe('snippet: production gating', () => {
  it('gates Next.js on an explicit variable, not NODE_ENV', () => {
    // A Vercel preview deploy has NODE_ENV=production, so a NODE_ENV gate
    // would hide the widget on the exact surface it exists for.
    const snippet = buildSnippet(nextDetection, input)
    expect(snippet).toContain("process.env.TACK_ENABLED === '1'")
    expect(snippet).not.toContain('NODE_ENV')
  })

  it('gates Vite on import.meta.env so the block tree-shakes away', () => {
    const snippet = buildSnippet(viteDetection, input)
    expect(snippet).toContain('import.meta.env.DEV')
    expect(snippet).toContain("import.meta.env.VITE_TACK_ENABLED === 'true'")
  })

  it('emits no condition under --gate none', () => {
    const snippet = buildSnippet(nextDetection, { ...input, gate: 'none' })
    expect(snippet).not.toContain('&&')
    expect(snippet).toContain('<script async')
  })

  it('always carries the project key and api host', () => {
    for (const detection of [nextDetection, viteDetection]) {
      const snippet = buildSnippet(detection, input)
      expect(snippet).toContain('pk_abc123')
      expect(snippet).toContain('https://tack.example.com')
      expect(snippet).toContain(MARKER)
    }
  })
})

describe('patch: idempotency', () => {
  it('recognizes its own marker even if host and key changed', () => {
    const patched = `<body>\n  {/* ${MARKER} */}\n  <script async src="https://other/tack-widget.js" />\n</body>`
    expect(isAlreadyInstalled(patched)).toBe(true)
  })

  it('flags a hand-pasted snippet separately from its own', () => {
    const manual = '<body><script src="https://x/tack-widget.js"></script></body>'
    expect(isAlreadyInstalled(manual)).toBe(false)
    expect(hasForeignWidget(manual)).toBe(true)
  })

  it('does not flag an untouched file', () => {
    expect(isAlreadyInstalled('<body></body>')).toBe(false)
    expect(hasForeignWidget('<body></body>')).toBe(false)
  })
})

describe('patch: body anchor', () => {
  const layout = [
    'export default function RootLayout({ children }) {',
    '  return (',
    '    <html lang="en">',
    '      <body className="antialiased">',
    '        {children}',
    '      </body>',
    '    </html>',
    '  )',
    '}',
  ].join('\n')

  it('inserts before </body> and only adds lines', () => {
    const snippet = buildSnippet(nextDetection, input)
    const plan = planPatch(nextDetection, layout, snippet)
    if ('error' in plan) throw new Error(plan.error)

    const before = layout.split('\n')
    const after = plan.patched.split('\n')

    expect(after.length).toBeGreaterThan(before.length)
    // Every original line survives, in order — a pure addition.
    expect(after.filter((l) => before.includes(l) && l.trim() !== '')).toEqual(
      expect.arrayContaining(before.filter((l) => l.trim() !== '')),
    )
    expect(plan.patched.indexOf(MARKER)).toBeLessThan(
      plan.patched.indexOf('</body>'),
    )
  })

  it('indents to match the anchor line', () => {
    const snippet = buildSnippet(nextDetection, input)
    const plan = planPatch(nextDetection, layout, snippet)
    if ('error' in plan) throw new Error(plan.error)
    const markerLine = plan.patched
      .split('\n')
      .find((l) => l.includes(MARKER))!
    expect(markerLine.startsWith('        ')).toBe(true)
  })

  it('reports an error instead of guessing when there is no </body>', () => {
    const plan = planPatch(nextDetection, 'export default function X() {}', 'x')
    expect('error' in plan).toBe(true)
  })

  it('preserves CRLF line endings', () => {
    const crlf = layout.split('\n').join('\r\n')
    const plan = planPatch(nextDetection, crlf, buildSnippet(nextDetection, input))
    if ('error' in plan) throw new Error(plan.error)
    expect(plan.eol).toBe('\r\n')
    expect(plan.patched.includes('\r\n')).toBe(true)
  })
})

describe('patch: entry module', () => {
  it('appends after the app bootstrap', () => {
    const main = "import App from './App'\ncreateRoot(el).render(<App />)\n"
    const plan = planPatch(viteDetection, main, buildSnippet(viteDetection, input))
    if ('error' in plan) throw new Error(plan.error)

    expect(plan.patched.startsWith("import App from './App'")).toBe(true)
    expect(plan.patched.indexOf(MARKER)).toBeGreaterThan(
      plan.patched.indexOf('createRoot'),
    )
  })
})
