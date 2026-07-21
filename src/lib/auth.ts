interface AuthResponse {
  authenticated?: unknown
  error?: unknown
}

async function parseResponse(response: Response): Promise<AuthResponse> {
  try {
    return (await response.json()) as AuthResponse
  } catch {
    return {}
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ authenticated: boolean; error: string | null }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    })
    const body = await parseResponse(response)

    return {
      authenticated: response.ok && body.authenticated === true,
      error:
        typeof body.error === 'string'
          ? body.error
          : response.ok
            ? null
            : 'Authentication failed',
    }
  } catch {
    return {
      authenticated: false,
      error: 'Authentication service is unavailable',
    }
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
