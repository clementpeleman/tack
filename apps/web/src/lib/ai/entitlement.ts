export type AiEntitlementReason = 'disabled' | 'missing_key'

export interface AiEntitlement {
  entitled: boolean
  reason: AiEntitlementReason | null
}

type EnvLike = Record<string, string | undefined>

// Self-host: AI Inbox is off unless the owner opts in with both flags.
// Hosted: the deployment itself is the opt-in; per-tier run counting
// arrives with the hosted buildout.
export function getAiEntitlement(env: EnvLike = process.env): AiEntitlement {
  const isHosted = env.TACK_DEPLOYMENT === 'hosted'
  if (!isHosted && env.TACK_AI_ENABLED !== 'true') {
    return { entitled: false, reason: 'disabled' }
  }
  if (!env.OPENAI_API_KEY) {
    return { entitled: false, reason: 'missing_key' }
  }
  return { entitled: true, reason: null }
}

export function aiEntitlementMessage(reason: AiEntitlementReason): string {
  return reason === 'disabled'
    ? 'AI Inbox is off on this server. Set TACK_AI_ENABLED=true and OPENAI_API_KEY to enable analysis.'
    : 'AI analysis needs an OpenAI key on the server. Add OPENAI_API_KEY, then run Analyze pins again.'
}
