import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'

export interface ShareProxyOptions {
  dbPath: string
  shareDomain: string
  tackOrigin: (req: IncomingMessage) => string
  allowLocal?: boolean
  log?: (message: string) => void
}

export interface ShareProxy {
  (req: IncomingMessage, res: ServerResponse): Promise<boolean>
  /** Handle a WebSocket upgrade on a share host; resolves true when handled. */
  upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<boolean>
  isShareHost(req: IncomingMessage): boolean
}

export function createShareProxy(options: ShareProxyOptions): ShareProxy
