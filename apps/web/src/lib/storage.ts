import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { resolve } from 'node:path'

const DEFAULT_DIR = resolve(process.cwd(), 'data/screenshots')

function getScreenshotsDir(): string {
  return process.env.SCREENSHOTS_DIR ?? DEFAULT_DIR
}

export function screenshotRelativePath(
  projectId: string,
  pinId: string,
): string {
  return `${projectId}/${pinId}.jpg`
}

export function screenshotAbsolutePath(
  projectId: string,
  pinId: string,
): string {
  return join(getScreenshotsDir(), screenshotRelativePath(projectId, pinId))
}

export async function saveScreenshot(
  projectId: string,
  pinId: string,
  buffer: Buffer,
): Promise<string> {
  const filePath = screenshotAbsolutePath(projectId, pinId)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, buffer)
  return screenshotRelativePath(projectId, pinId)
}

export async function deleteScreenshot(
  projectId: string,
  pinId: string,
): Promise<void> {
  try {
    await unlink(screenshotAbsolutePath(projectId, pinId))
  } catch {
    // missing file is fine
  }
}

export function parseScreenshotBase64(input: string): Buffer | null {
  const match = input.match(/^data:image\/\w+;base64,(.+)$/)
  const base64 = match?.[1] ?? input
  try {
    const buffer = Buffer.from(base64, 'base64')
    return buffer.length > 0 ? buffer : null
  } catch {
    return null
  }
}
