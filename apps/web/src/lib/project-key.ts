import { randomBytes } from 'node:crypto'

export function generateProjectKey(): string {
  return `pk_${randomBytes(16).toString('hex')}`
}
