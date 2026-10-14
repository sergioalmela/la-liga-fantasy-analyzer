interface AuthResponse {
  authenticated?: unknown
  code?: unknown
}

async function parseResponse(response: Response): Promise<AuthResponse> {
  try {
    return (await response.json()) as AuthResponse
  } catch {
    return {}
  }
}

export type LoginError =
  | 'invalid_redirect'
  | 'login_cancelled'
  | 'login_expired'
  | 'login_rejected'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'failed'

const LOGIN_ERRORS = new Set<string>([
  'invalid_redirect',
  'login_cancelled',
  'login_expired',
  'login_rejected',
  'rate_limited',
  'provider_unavailable',
])

/** Starts a LALIGA sign-in and returns the provider URL to open. */
export async function startLogin(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/authorize', {
      method: 'POST',
      credentials: 'same-origin',
    })
    const body = (await response.json()) as { url?: unknown }
    return response.ok && typeof body.url === 'string' ? body.url : null
  } catch {
    return null
  }
}

/** Completes the sign-in with the `authredirect://` URL copied by the user. */
export async function login(
  redirectUrl: string
): Promise<{ authenticated: boolean; error: LoginError | null }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ redirectUrl }),
    })
    const body = await parseResponse(response)
    const authenticated = response.ok && body.authenticated === true

    return {
      authenticated,
      error: authenticated
        ? null
        : typeof body.code === 'string' && LOGIN_ERRORS.has(body.code)
          ? (body.code as LoginError)
          : 'failed',
    }
  } catch {
    return { authenticated: false, error: 'provider_unavailable' }
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    })
  } catch {
    // The local session is also removed when its HttpOnly cookie expires.
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!response.ok) return false

    const body = await parseResponse(response)
    return body.authenticated === true
  } catch {
    return false
  }
}
