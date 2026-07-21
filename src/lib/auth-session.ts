export const AUTH_COOKIE_NAME = 'fantasy_session'

export interface JwtPayload {
  aud?: unknown
  exp?: unknown
  iss?: unknown
  nbf?: unknown
}

export function getTokenPayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded)) as unknown
    return payload && typeof payload === 'object'
      ? (payload as JwtPayload)
      : null
  } catch {
    return null
  }
}

export function getTokenExpiration(token: string): number | null {
  const expiration = getTokenPayload(token)?.exp
  return typeof expiration === 'number' && Number.isFinite(expiration)
    ? expiration
    : null
}

export function getTokenLifetimeSeconds(
  token: string,
  now = Date.now()
): number | null {
  const expiration = getTokenExpiration(token)
  if (expiration === null) return null

  return Math.max(0, Math.floor(expiration - now / 1000))
}

export function isValidProviderToken(
  token: string,
  expectedAudience: string,
  expectedIssuer: string,
  now = Date.now()
): boolean {
  const payload = getTokenPayload(token)
  const lifetime = getTokenLifetimeSeconds(token, now)
  const notBefore = payload?.nbf
  const nowSeconds = Math.floor(now / 1000)

  return Boolean(
    lifetime &&
      payload?.aud === expectedAudience &&
      payload.iss === expectedIssuer &&
      (typeof notBefore !== 'number' || notBefore <= nowSeconds + 60)
  )
}
