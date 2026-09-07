import { domToJpeg } from 'modern-screenshot'

export async function captureViewportScreenshot(): Promise<string | null> {
  try {
    const dataUrl = await domToJpeg(document.documentElement, {
      quality: 0.7,
      // Render at 1x regardless of devicePixelRatio: a retina capture is 4x
      // the pixels to rasterize, encode and upload, and the dashboard shows
      // it scaled down anyway.
      scale: 1,
      // A single cross-origin font or image without CORS headers would
      // otherwise stall the capture for the library's 30s default.
      timeout: 8000,
      width: window.innerWidth,
      height: window.innerHeight,
      style: {
        transform: `translateY(${-window.scrollY}px)`,
      },
      // Exclude Tack's own overlay (launcher, pins, "Leave feedback" card)
      // so it never appears in the captured screenshot.
      filter: (node) =>
        !(node instanceof Element && node.id === 'tack-widget-host'),
    })
    return dataUrl
  } catch (err) {
    console.warn('[tack] screenshot capture failed:', err)
    return null
  }
}
