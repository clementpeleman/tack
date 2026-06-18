import { domToJpeg } from 'modern-screenshot'

export async function captureViewportScreenshot(): Promise<string | null> {
  try {
    const dataUrl = await domToJpeg(document.documentElement, {
      quality: 0.7,
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
