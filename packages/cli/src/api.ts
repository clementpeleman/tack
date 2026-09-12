export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface TackShare {
  id: string
  slug: string
  url: string
  targetUrl: string
  label: string | null
  hasPasscode: boolean
  expiresAt: string
  revokedAt: string | null
  lastAccessAt: string | null
  live: boolean
}

export interface TackProject {
  id: string
  name: string
  previewUrl: string
  projectKey: string
  allowedOrigins: string[]
  connected: boolean
}

async function request<T>(
  host: string,
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = init

  let response: Response
  try {
    response = await fetch(new URL(path, host), {
      ...rest,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    })
  } catch (cause) {
    throw new ApiError(
      `Could not reach ${host}. Is the host correct and running?`,
      0,
    )
  }

  if (response.status === 401) {
    throw new ApiError('Not signed in, or the token expired.', 401)
  }
  if (response.status === 403) {
    throw new ApiError('This token is not allowed to do that.', 403)
  }

  const text = await response.text()
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message =
      typeof data.error === 'string' ? data.error : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return data as T
}

export function api(host: string, token?: string) {
  return {
    whoami: () =>
      request<{ email: string | null; scopes: string[] }>(host, '/api/cli/whoami', {
        token,
      }),

    listProjects: () =>
      request<{ projects: TackProject[] }>(host, '/api/cli/projects', { token }),

    createProject: (input: { name: string; previewUrl: string }) =>
      request<{ project: TackProject }>(host, '/api/cli/projects', {
        token,
        method: 'POST',
        body: JSON.stringify(input),
      }),

    addOrigin: (projectId: string, origin: string) =>
      request<{ allowedOrigins: string[] }>(
        host,
        `/api/cli/projects/${projectId}/origins`,
        { token, method: 'POST', body: JSON.stringify({ origin }) },
      ),

    startAuth: (input: {
      codeChallenge: string
      redirectPort: number | null
      clientLabel: string
    }) =>
      request<{
        requestId: string
        userCode: string
        authorizeUrl: string
        expiresAt: string
      }>(host, '/api/cli/auth/start', {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    exchange: (input: {
      requestId: string
      code: string
      codeVerifier: string
      label: string
    }) =>
      request<{ token: string; expiresAt: string }>(host, '/api/cli/auth/token', {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    revoke: () =>
      request<{ ok: true }>(host, '/api/cli/auth/revoke', {
        token,
        method: 'POST',
      }),

    listShares: (projectId: string) =>
      request<{ shares: TackShare[] }>(
        host,
        `/api/cli/shares?projectId=${encodeURIComponent(projectId)}`,
        { token },
      ),

    createShare: (input: {
      projectId: string
      targetUrl: string
      passcode?: string
      days?: number
      label?: string
    }) =>
      request<{ share: TackShare; url: string }>(host, '/api/cli/shares', {
        token,
        method: 'POST',
        body: JSON.stringify(input),
      }),

    revokeShare: (shareId: string) =>
      request<{ ok: true }>(host, `/api/cli/shares/${encodeURIComponent(shareId)}`, {
        token,
        method: 'DELETE',
      }),
  }
}
