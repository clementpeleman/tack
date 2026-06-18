import { render } from 'preact'
import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks'
import { Launcher } from './components/Launcher'
import { PinMode } from './components/PinMode'
import { CommentModal } from './components/CommentModal'
import { PinOverlay } from './components/PinOverlay'
import { PinPopover } from './components/PinPopover'
import { WidgetErrorBanner } from './components/WidgetErrorBanner'
import {
  setApiHost,
  widgetInit,
  createPin,
  updatePin,
  deletePin,
  createReply,
  connectWidgetEvents,
  reportPlacements,
  WidgetApiError,
} from './lib/api'
import { resolvePinPlacement } from './lib/placement'
import { getReviewerId } from './lib/reviewer'
import { watchWidgetTheme } from './lib/theme'
import { captureViewportScreenshot } from './lib/screenshot'
import {
  getElementSelector,
  getElementXPath,
  getTackId,
} from './lib/element-id'
import { normalizePinUrl } from '@tack/shared'
import type { PinPlacement } from '@tack/shared'
import widgetStyles from './styles/widget.css?inline'

interface PinData {
  id: string
  xPct: number
  yPct: number
  status: string
  reviewerId: string
  reviewerName: string | null
  comment: string | null
  tackId?: string | null
  selector?: string | null
  xpath?: string | null
  placement?: PinPlacement
}

interface PendingPin {
  xPct: number
  yPct: number
  element: HTMLElement | null
}

function scrollToPin(pin: PinData) {
  const targetY =
    (pin.yPct / 100) * document.documentElement.scrollHeight -
    window.innerHeight / 2
  window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
}

function Widget({ projectKey, apiHost }: { projectKey: string; apiHost: string }) {
  const [active, setActive] = useState(false)
  const [pins, setPins] = useState<PinData[]>([])
  const [pending, setPending] = useState<PendingPin | null>(null)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [threadVersion, setThreadVersion] = useState(0)
  const pinQueryParamsRef = useRef<string[] | undefined>(undefined)
  const deeplinkHandled = useRef(false)
  const reviewerId = useMemo(() => getReviewerId(), [])

  const reloadPins = useCallback((): Promise<PinData[]> => {
    const url = normalizePinUrl(
      window.location.pathname,
      window.location.search,
      pinQueryParamsRef.current,
    )
    return widgetInit(projectKey, url)
      .then((data) => {
        if (Array.isArray(data.pinQueryParams)) {
          pinQueryParamsRef.current = data.pinQueryParams as string[]
        }

        if (data.connection?.originMatched === false) {
          const previewUrl = data.project?.previewUrl ?? data.connection?.previewUrl
          setInitError(
            previewUrl
              ? `This page doesn't match the project preview URL (${previewUrl}).`
              : "This page doesn't match the project preview URL.",
          )
          setPins([])
          return []
        }

        setInitError(null)
        const loaded = normalizePins(data.pins ?? [])
        setPins(loaded)
        // Report the placement we actually resolve on this live page so the
        // dashboard shows verified state, not a metadata guess. Deferred a frame
        // so layout is settled before measuring anchors.
        if (loaded.length > 0) {
          requestAnimationFrame(() => {
            void reportPlacements(
              projectKey,
              loaded.map((p) => ({
                pinId: p.id,
                placement: resolvePinPlacement(p).placement,
              })),
            )
          })
        }
        return loaded
      })
      .catch((err) => {
        const message =
          err instanceof WidgetApiError
            ? err.message
            : 'Could not connect to Tack.'
        setInitError(message)
        console.error('[tack] init failed:', err)
        return []
      })
  }, [projectKey])

  useEffect(() => {
    setApiHost(apiHost)
    reloadPins().then((loaded) => {
      const pinParam = new URLSearchParams(window.location.search).get('pin')
      if (pinParam && !deeplinkHandled.current) {
        const target = loaded.find((p) => p.id === pinParam)
        if (target) {
          deeplinkHandled.current = true
          scrollToPin(target)
          setTimeout(() => setSelectedPinId(target.id), 400)
        }
      }
    })
  }, [apiHost, reloadPins])

  useEffect(() => {
    return connectWidgetEvents(projectKey, () => {
      void reloadPins().then(() => {
        setThreadVersion((v) => v + 1)
      })
    })
  }, [projectKey, reloadPins])

  const handleToggle = useCallback(() => {
    if (active) {
      setPending(null)
    }
    setSelectedPinId(null)
    setActive(!active)
  }, [active])

  const handlePlace = useCallback((xPct: number, yPct: number, el: HTMLElement | null) => {
    setSelectedPinId(null)
    setPending({ xPct, yPct, element: el })
    setActive(false)
  }, [])

  const handleSubmit = useCallback(async (name: string, comment: string) => {
    if (!pending) return

    try {
      setActionError(null)
      const el = pending.element
      const screenshot = await captureViewportScreenshot()
      const url = normalizePinUrl(
        window.location.pathname,
        window.location.search,
        pinQueryParamsRef.current,
      )
      const result = await createPin({
        projectKey,
        url,
        reviewerId,
        reviewerName: name || undefined,
        xPct: pending.xPct,
        yPct: pending.yPct,
        scrollY: window.scrollY,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        selector: el ? getElementSelector(el) : undefined,
        xpath: el ? getElementXPath(el) : undefined,
        tackId: el ? getTackId(el) : undefined,
        elementText: el?.textContent?.slice(0, 80) || undefined,
        body: comment,
        browser: navigator.userAgent.slice(0, 100),
        screenshot: screenshot ?? undefined,
      })

      setPins((prev) => [...prev, normalizePin(result.pin, comment)])
      setPending(null)
    } catch (err) {
      const message =
        err instanceof WidgetApiError
          ? err.message
          : 'Could not save pin.'
      setActionError(message)
      console.error('[tack] failed to create pin:', err)
    }
  }, [pending, projectKey, reviewerId])

  const handleCancel = useCallback(() => {
    setPending(null)
  }, [])

  const selectedPin = pins.find((p) => p.id === selectedPinId) ?? null
  const selectedIndex = selectedPin ? pins.indexOf(selectedPin) : -1

  // Pins are only shown in placement mode (the launcher is active) or when a
  // specific pin is selected (e.g. a `?pin=` deeplink). Otherwise the host
  // site stays clean.
  const showPins = active || selectedPinId !== null

  const handleSavePin = useCallback(async (comment: string, name: string) => {
    if (!selectedPinId) return
    await updatePin({
      projectKey,
      pinId: selectedPinId,
      reviewerId,
      comment,
      reviewerName: name || undefined,
    })
    setPins((prev) =>
      prev.map((p) =>
        p.id === selectedPinId
          ? { ...p, comment, reviewerName: name || null }
          : p,
      ),
    )
  }, [projectKey, reviewerId, selectedPinId])

  const handleDeletePin = useCallback(async () => {
    if (!selectedPinId) return
    await deletePin({ projectKey, pinId: selectedPinId, reviewerId })
    setPins((prev) => prev.filter((p) => p.id !== selectedPinId))
    setSelectedPinId(null)
  }, [projectKey, reviewerId, selectedPinId])

  const handleReply = useCallback(async (comment: string, name: string) => {
    if (!selectedPinId) return
    await createReply({
      projectKey,
      pinId: selectedPinId,
      reviewerId,
      comment,
      reviewerName: name || undefined,
    })
  }, [projectKey, reviewerId, selectedPinId])

  return (
    <>
      {(initError || actionError) && (
        <WidgetErrorBanner
          message={actionError ?? initError ?? ''}
          onDismiss={() => {
            setInitError(null)
            setActionError(null)
          }}
        />
      )}
      {active && <PinMode onPlace={handlePlace} onCancel={() => setActive(false)} />}
      {showPins && (
        <PinOverlay
          pins={pins}
          reviewerId={reviewerId}
          selectedPinId={selectedPinId}
          onSelectPin={setSelectedPinId}
        />
      )}
      {pending && (
        <CommentModal
          x={pending.xPct}
          y={pending.yPct}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      {selectedPin && selectedIndex >= 0 && (
        <PinPopover
          pin={selectedPin}
          index={selectedIndex}
          isOwn={selectedPin.reviewerId === reviewerId}
          projectKey={projectKey}
          threadVersion={threadVersion}
          onClose={() => setSelectedPinId(null)}
          onSave={handleSavePin}
          onDelete={handleDeletePin}
          onReply={handleReply}
        />
      )}
      <Launcher active={active} pinCount={pins.length} onClick={handleToggle} />
    </>
  )
}

function normalizePin(pin: Record<string, unknown>, comment?: string): PinData {
  return {
    id: String(pin.id),
    xPct: Number(pin.xPct),
    yPct: Number(pin.yPct),
    status: String(pin.status ?? 'open'),
    reviewerId: String(pin.reviewerId),
    reviewerName: pin.reviewerName != null ? String(pin.reviewerName) : null,
    tackId: pin.tackId != null ? String(pin.tackId) : null,
    selector: pin.selector != null ? String(pin.selector) : null,
    xpath: pin.xpath != null ? String(pin.xpath) : null,
    comment:
      comment ??
      (pin.comment != null ? String(pin.comment) : null),
  }
}

function normalizePins(raw: Record<string, unknown>[]): PinData[] {
  return raw.map((pin) => normalizePin(pin))
}

export interface MountTackWidgetOptions {
  /** Public project key (`pk_…`). */
  projectKey: string
  /** Origin of the Tack host, e.g. `https://tack.example.com`. */
  apiHost: string
  /**
   * Optional script element to read theme config (`data-theme`) from.
   * The script-tag loader passes its own element; other loaders (e.g. the
   * browser extension) pass nothing and fall back to localStorage/system.
   */
  themeScript?: HTMLScriptElement | null
}

/**
 * Mount the Tack widget into the current document. Loader-agnostic: the
 * script-tag IIFE and the browser extension's content script both call this
 * with explicit config instead of relying on `document.currentScript`.
 *
 * Returns `false` (and does nothing) when the viewport is too small, the
 * project key is missing, or the widget is already mounted.
 */
export function mountTackWidget({
  projectKey,
  apiHost,
  themeScript = null,
}: MountTackWidgetOptions): boolean {
  if (window.innerWidth < 768) return false

  if (!projectKey) {
    console.error('[tack] mountTackWidget requires a projectKey')
    return false
  }

  if (document.getElementById('tack-widget-host')) return false

  const host = document.createElement('div')
  host.id = 'tack-widget-host'
  document.body.appendChild(host)

  watchWidgetTheme(host, themeScript)

  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = widgetStyles
  shadow.appendChild(style)

  const mountPoint = document.createElement('div')
  mountPoint.style.position = 'fixed'
  mountPoint.style.inset = '0'
  mountPoint.style.pointerEvents = 'none'
  mountPoint.style.zIndex = '2147483646'
  shadow.appendChild(mountPoint)

  const observer = new MutationObserver(() => {
    mountPoint.querySelectorAll(
      'button, .tack-crosshair-overlay, .tack-modal, .tack-pin-hit, .tack-popover-backdrop',
    ).forEach((el) => {
      ;(el as HTMLElement).style.pointerEvents = 'auto'
    })
  })
  observer.observe(mountPoint, { childList: true, subtree: true })

  render(<Widget projectKey={projectKey} apiHost={apiHost} />, mountPoint)
  return true
}

/** Remove a mounted widget, if present. */
export function unmountTackWidget(): void {
  document.getElementById('tack-widget-host')?.remove()
}
