import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

/**
 * Output helpers. Deliberately plain: no spinners, no boxes, no banner art.
 * The product voice is quiet and operational, and a CLI that performs
 * confidence reads worse than one that just says what it did.
 */

const useColor =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  (process.env.FORCE_COLOR != null || stdout.isTTY)

const wrap = (open: number, close: number) => (s: string) =>
  useColor ? `\x1b[${open}m${s}\x1b[${close}m` : s

export const dim = wrap(2, 22)
export const bold = wrap(1, 22)
export const red = wrap(31, 39)
export const green = wrap(32, 39)
export const blue = wrap(34, 39)
export const yellow = wrap(33, 39)

export function log(message = ''): void {
  stdout.write(`${message}\n`)
}

export function step(label: string, value: string): void {
  log(`  ${green('✓')} ${label.padEnd(12)} ${value}`)
}

export function info(message: string): void {
  log(`  ${message}`)
}

export function warn(message: string): void {
  log(`  ${yellow('!')} ${message}`)
}

export function error(message: string): void {
  process.stderr.write(`  ${red('✗')} ${message}\n`)
}

export function isInteractive(): boolean {
  return Boolean(stdin.isTTY && stdout.isTTY)
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

export async function confirm(question: string, fallback = true): Promise<boolean> {
  if (!isInteractive()) return fallback
  const hint = fallback ? 'Y/n' : 'y/N'
  const answer = (await ask(`  ${question} [${hint}] `)).toLowerCase()
  if (answer === '') return fallback
  return answer === 'y' || answer === 'yes'
}

export async function prompt(question: string): Promise<string> {
  return ask(`  ${question} `)
}

/**
 * Numbered single-select. Plain readline rather than a raw-mode TUI: this runs
 * once per install, and a list you can read in a scrollback is friendlier than
 * one that redraws.
 */
export async function select<T>(
  question: string,
  options: { label: string; hint?: string; value: T }[],
): Promise<T> {
  if (options.length === 0) throw new Error('No options to choose from')
  if (options.length === 1) return options[0]!.value

  log()
  options.forEach((option, i) => {
    const hint = option.hint ? dim(` ${option.hint}`) : ''
    log(`  ${dim(`${i + 1})`)} ${option.label}${hint}`)
  })
  log()

  for (;;) {
    const answer = await ask(`  ${question} [1-${options.length}] `)
    const index = Number(answer)
    if (Number.isInteger(index) && index >= 1 && index <= options.length) {
      return options[index - 1]!.value
    }
    error(`Enter a number between 1 and ${options.length}.`)
  }
}
