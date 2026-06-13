type EnvLike = Record<string, string | undefined>

// Hosted always allows open signup; self-host requires an explicit opt-in so a
// public instance does not hand accounts to any stranger who finds the URL.
// The first owner always gets in via the empty-instance claim (see auth.ts),
// regardless of this flag.
export function isSignupAllowed(env: EnvLike = process.env): boolean {
  if (env.TACK_DEPLOYMENT === 'hosted') return true
  return env.TACK_ALLOW_SIGNUP === 'true'
}
