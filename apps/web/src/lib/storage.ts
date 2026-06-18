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

// Cap stored screenshots so a hostile or buggy client can't fill the disk.
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024 // 5 MB decoded

export function parseScreenshotBase64(input: string): Buffer | null {
  // Only accept image data URLs (the widget always sends data:image/jpeg).
  const match =
    typeof input === 'string'
      ? input.match(/^data:image\/(?:png|jpe?g|webp);base64,(.+)$/)
      : null
  if (!match) return null
  // Reject oversized payloads before allocating (base64 ≈ 4/3 of raw bytes).
  if (match[1].length > Math.ceil((MAX_SCREENSHOT_BYTES * 4) / 3) + 4) return null
  try {
    const buffer = Buffer.from(match[1], 'base64')
    if (buffer.length === 0 || buffer.length > MAX_SCREENSHOT_BYTES) return null
    return buffer
  } catch {
    return null
  }
}
