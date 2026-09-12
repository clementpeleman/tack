import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ShareProxyOptions {
  dbPath: string
  shareDomain: string
  tackOrigin: (req: IncomingMessage) => string
  allowLocal?: boolean
  log?: (message: string) => void
}

export function createShareProxy(
  options: ShareProxyOptions,
): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>
