export type PinEventType = 'pin.created' | 'pin.updated' | 'reply.created'

export interface PinEvent {
  type: PinEventType
  projectId: string
  pinId: string
}

type Listener = (event: PinEvent) => void

const subscribers = new Map<string, Set<Listener>>()

export function subscribeProjectEvents(
  projectId: string,
  listener: Listener,
): () => void {
  let set = subscribers.get(projectId)
  if (!set) {
    set = new Set()
    subscribers.set(projectId, set)
  }
  set.add(listener)
  return () => {
    set?.delete(listener)
    if (set && set.size === 0) subscribers.delete(projectId)
  }
}

export function emitProjectEvent(event: PinEvent): void {
  subscribers.get(event.projectId)?.forEach((listener) => {
    try {
      listener(event)
    } catch {
      // ignore listener errors
    }
  })
}

export function createProjectEventStream(
  projectId: string,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      const send = (event: PinEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        )
      }

      const unsubscribe = subscribeProjectEvents(projectId, send)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'))
      }, 25_000)

      signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        controller.close()
      })
    },
  })
}
