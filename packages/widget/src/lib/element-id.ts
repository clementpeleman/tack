import { finder } from '@medv/finder'

export function getElementSelector(el: HTMLElement): string {
  try {
    return finder(el)
  } catch {
    return fallbackSelector(el)
  }
}

export function getElementXPath(el: HTMLElement): string {
  if (el.id) return `//*[@id="${el.id.replace(/"/g, '\\"')}"]`

  const parts: string[] = []
  let current: HTMLElement | null = el

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1
    let sibling = current.previousElementSibling
    while (sibling) {
      if (sibling.tagName === current.tagName) index++
      sibling = sibling.previousElementSibling
    }
    parts.unshift(`${current.tagName.toLowerCase()}[${index}]`)
    if (current.id) break
    current = current.parentElement
  }

  return `/${parts.join('/')}`
}

export function getTackId(el: HTMLElement): string | undefined {
  const value = el.getAttribute('data-tack-id')
  return value ?? undefined
}

function fallbackSelector(el: HTMLElement): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  const path: string[] = []
  let current: HTMLElement | null = el
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()
    if (current.id) {
      path.unshift(`#${CSS.escape(current.id)}`)
      break
    }
    if (current.className && typeof current.className === 'string') {
      const cls = current.className.trim().split(/\s+/).slice(0, 2).join('.')
      if (cls) selector += `.${cls}`
    }
    path.unshift(selector)
    current = current.parentElement
  }
  return path.join(' > ')
}
