import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { isValidProviderToken } from './auth-session.ts'

export const LALIGA_CLIENT_ID = 'af88bcff-1157-40a0-b579-030728aacf0b'
export const LALIGA_ISSUER =
  'https://login.laliga.es/335316eb-f606-4361-bb86-35a7edcdcec1/v2.0/'
export const LALIGA_REDIRECT_URI = 'authredirect://com.lfp.laligafantasy'
export const LALIGA_SCOPE = 'openid offline_access'

// The ROPC policy (B2C_1A_ResourceOwnerv2) was removed in October 2026; this
// interactive policy also covers Google and Apple accounts.
const SIGN_IN_POLICY = 'B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN'
const OAUTH_BASE =
  'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0'
export const LALIGA_AUTHORIZE_URL = `${OAUTH_BASE}/authorize`
export const LALIGA_TOKEN_URL = `${OAUTH_BASE}/token?p=${SIGN_IN_POLICY}`

const MAX_REDIRECT_LENGTH = 4096
const OPAQUE_VALUE = /^[A-Za-z0-9._~-]+$/
const BASE64URL_VALUE = /^[A-Za-z0-9_-]+$/
const DEFAULT_REFRESH_LIFETIME_SECONDS = 90 * 24 * 60 * 60

export interface PendingLogin {
  state: string
  verifier: string
}

export type AuthorizationRedirect =
  | { kind: 'code'; code: string; state: string }
  | { kind: 'denied' }
  | { kind: 'invalid' }

export function createPendingLogin(): PendingLogin {
  return {
    state: randomBytes(16).toString('base64url'),
    verifier: randomBytes(64).toString('base64url'),
  }
}

export function getCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function buildAuthorizeUrl({ state, verifier }: PendingLogin): string {
  const url = new URL(LALIGA_AUTHORIZE_URL)
  url.search = new URLSearchParams({
    p: SIGN_IN_POLICY,
    client_id: LALIGA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: LALIGA_REDIRECT_URI,
    scope: LALIGA_SCOPE,
    code_challenge: getCodeChallenge(verifier),
    code_challenge_method: 'S256',
    state,
    nonce: state,
  }).toString()
  return url.toString()
}

export function serializePendingLogin({
  state,
  verifier,
}: PendingLogin): string {
  return `${state}.${verifier}`
}

export function parsePendingLogin(
  value: string | undefined
): PendingLogin | null {
  const [state, verifier, extra] = value?.split('.') ?? []
  if (extra !== undefined || !state || !verifier) return null
  if (!BASE64URL_VALUE.test(state) || !BASE64URL_VALUE.test(verifier)) {
    return null
  }
  return { state, verifier }
}

export function statesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Accepts the `authredirect://` URL the browser could not open. */
export function parseAuthorizationRedirect(
  input: string
): AuthorizationRedirect {
  const value = input.trim().replace(/^["']|["']$/g, '')
  if (!value || value.length > MAX_REDIRECT_LENGTH) return { kind: 'invalid' }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { kind: 'invalid' }
  }

  if (
    `${url.protocol}//${url.host}` !== LALIGA_REDIRECT_URI ||
    (url.pathname !== '' && url.pathname !== '/')
  ) {
    return { kind: 'invalid' }
  }

  const params = new URLSearchParams(url.search || url.hash.slice(1))
  if (params.has('error')) return { kind: 'denied' }

  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state || !OPAQUE_VALUE.test(code)) return { kind: 'invalid' }
  return { kind: 'code', code, state }
}

/** B2C returns an id_token, and an access_token only for API scopes. */
export function selectSessionToken(
  payload: Record<string, unknown>,
  now = Date.now()
): string | null {
  for (const candidate of [payload.access_token, payload.id_token]) {
    if (
      typeof candidate === 'string' &&
      isValidProviderToken(candidate, LALIGA_CLIENT_ID, LALIGA_ISSUER, now)
    ) {
      return candidate
    }
  }
  return null
}

export function getRefreshTokenLifetimeSeconds(
  payload: Record<string, unknown>
): number {
  const lifetime = Number(payload.refresh_token_expires_in)
  return Number.isFinite(lifetime) && lifetime > 0
    ? Math.min(Math.floor(lifetime), DEFAULT_REFRESH_LIFETIME_SECONDS)
    : DEFAULT_REFRESH_LIFETIME_SECONDS
}
