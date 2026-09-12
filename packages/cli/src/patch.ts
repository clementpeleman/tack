import { readFile, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { Detection } from './detect.js'
import { dim, green } from './ui.js'

/**
 * The marker is what makes `init` idempotent. It is checked instead of the
 * snippet text because the host and project key can legitimately change
 * between runs while the block is still "already installed".
 */
export const MARKER = 'tack:widget'

export type Gate = 'env' | 'dev' | 'none'

export interface SnippetInput {
  host: string
  projectKey: string
  gate: Gate
}

const scriptAttrs = ({ host, projectKey }: SnippetInput) =>
  `src="${host}/tack-widget.js" data-project="${projectKey}" data-api="${host}"`

/**
 * Production is off by default and off by omission: the gate is fail-closed,
 * so someone who never sets the variable can never ship the widget to real
 * users. A Vercel preview has NODE_ENV=production, so gating on NODE_ENV alone
 * would hide the widget on exactly the surface this product exists for — hence
 * an explicit variable rather than an inferred environment.
 */
export function buildSnippet(detection: Detection, input: SnippetInput): string {
  const attrs = scriptAttrs(input)

  if (detection.strategy === 'entry-module') {
    const condition =
      input.gate === 'none'
        ? 'true'
        : input.gate === 'dev'
          ? 'import.meta.env.DEV'
          : "import.meta.env.DEV || import.meta.env.VITE_TACK_ENABLED === 'true'"

    return [
      `// ${MARKER} — feedback widget, installed by @usetack/cli`,
      `if (${condition}) {`,
      `  const tackScript = document.createElement('script')`,
      `  tackScript.src = '${input.host}/tack-widget.js'`,
      `  tackScript.dataset.project = '${input.projectKey}'`,
      `  tackScript.dataset.api = '${input.host}'`,
      `  document.body.appendChild(tackScript)`,
      `}`,
    ].join('\n')
  }

  if (detection.framework === 'next-app') {
    if (input.gate === 'none') {
      return `{/* ${MARKER} */}\n<script async ${attrs} />`
    }
    const condition =
      input.gate === 'dev'
        ? "process.env.NODE_ENV !== 'production'"
        : "process.env.TACK_ENABLED === '1'"
    return [
      `{/* ${MARKER} */}`,
      `{${condition} && (`,
      `  <script async ${attrs} />`,
      `)}`,
    ].join('\n')
  }

  // SvelteKit app.html and plain HTML have no build-time condition available
  // here, so the tag goes in ungated and the caller warns about it.
  return `<!-- ${MARKER} -->\n<script async ${attrs}></script>`
}

export function isAlreadyInstalled(contents: string): boolean {
  return contents.includes(MARKER)
}

/** Catches a snippet pasted by hand from the dashboard fallback. */
export function hasForeignWidget(contents: string): boolean {
  return !isAlreadyInstalled(contents) && contents.includes('tack-widget.js')
}

export interface PatchPlan {
  file: string
  original: string
  patched: string
  insertedAt: number
  insertedLines: string[]
  eol: '\n' | '\r\n'
}

function detectEol(contents: string): '\n' | '\r\n' {
  return contents.includes('\r\n') ? '\r\n' : '\n'
}

/**
 * Only ever inserts. Nothing existing is moved, reindented or rewritten, which
 * is what makes a string-level patch safe to review as a pure-addition diff.
 */
export function planPatch(
  detection: Detection,
  contents: string,
  snippet: string,
): PatchPlan | { error: string } {
  const eol = detectEol(contents)
  const lines = contents.split(/\r?\n/)

  if (detection.strategy === 'entry-module') {
    // Appended so it runs after the app's own bootstrap has mounted.
    const trailingBlank = lines.length > 0 && lines[lines.length - 1] === ''
    const insertAt = trailingBlank ? lines.length - 1 : lines.length
    const block = ['', ...snippet.split('\n')]
    const patchedLines = [...lines]
    patchedLines.splice(insertAt, 0, ...block)
    return {
      file: detection.file,
      original: contents,
      patched: patchedLines.join(eol),
      insertedAt: insertAt,
      insertedLines: block,
      eol,
    }
  }

  // Match the LAST </body>: in a root layout or an HTML document there is
  // exactly one, and taking the last is correct if a nested string ever appears.
  let anchor = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i]!.includes('</body>')) {
      anchor = i
      break
    }
  }
  if (anchor === -1) {
    return {
      error: `Could not find a </body> tag in ${detection.file}.`,
    }
  }

  const anchorLine = lines[anchor]!
  const baseIndent = anchorLine.match(/^\s*/)?.[0] ?? ''
  const indent = baseIndent + '  '
  const block = snippet.split('\n').map((line) => (line ? indent + line : line))

  const patchedLines = [...lines]

  // `<body>…</body>` on a single line (a minimal layout): inserting above the
  // line would put the tag outside <body>. Split the line at </body> so the
  // snippet lands inside it; the opening part keeps its original text.
  const closeAt = anchorLine.lastIndexOf('</body>')
  const head = anchorLine.slice(0, closeAt)
  if (head.trim().length > 0) {
    const tail = baseIndent + anchorLine.slice(closeAt)
    patchedLines.splice(anchor, 1, head.replace(/\s+$/, ''), ...block, tail)
    return {
      file: detection.file,
      original: contents,
      patched: patchedLines.join(eol),
      insertedAt: anchor + 1,
      insertedLines: block,
      eol,
    }
  }

  patchedLines.splice(anchor, 0, ...block)

  return {
    file: detection.file,
    original: contents,
    patched: patchedLines.join(eol),
    insertedAt: anchor,
    insertedLines: block,
    eol,
  }
}

/** Pure-addition diff with a few lines of context on each side. */
export function renderDiff(plan: PatchPlan, context = 3): string {
  const patched = plan.patched.split(/\r?\n/)
  const start = Math.max(0, plan.insertedAt - context)
  const end = Math.min(
    patched.length,
    plan.insertedAt + plan.insertedLines.length + context,
  )

  const width = String(end).length
  const out: string[] = []

  for (let i = start; i < end; i++) {
    const inserted =
      i >= plan.insertedAt && i < plan.insertedAt + plan.insertedLines.length
    const no = String(i + 1).padStart(width)
    out.push(
      inserted
        ? `  ${green('+')} ${dim(no)} ${green(patched[i] ?? '')}`
        : `    ${dim(no)} ${dim(patched[i] ?? '')}`,
    )
  }

  return out.join('\n')
}

/** Atomic write that preserves the file's existing permissions. */
export async function applyPatch(
  root: string,
  plan: PatchPlan,
): Promise<void> {
  const target = join(root, plan.file)
  const mode = await stat(target).then(
    (s) => s.mode & 0o777,
    () => 0o644,
  )

  const tmp = join(
    dirname(target),
    `.${randomBytes(6).toString('hex')}.tack.tmp`,
  )
  await writeFile(tmp, plan.patched, { encoding: 'utf8', mode })
  await rename(tmp, target)
}

export async function readTarget(
  root: string,
  file: string,
): Promise<string | null> {
  try {
    return await readFile(join(root, file), 'utf8')
  } catch {
    return null
  }
}
