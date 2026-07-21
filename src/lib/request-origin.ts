type OriginRequest = {
  headers: Headers
  nextUrl: URL
}

function firstForwardedValue(value: string | null): string | null {
  const first = value?.split(',', 1)[0]?.trim()
  return first || null
}

function getPublicOrigin(request: OriginRequest): string | null {
  const host =
    firstForwardedValue(request.headers.get('x-forwarded-host')) ||
    request.headers.get('host')?.trim() ||
    request.nextUrl.host
  const protocol =
    firstForwardedValue(request.headers.get('x-forwarded-proto')) ||
    request.nextUrl.protocol.replace(/:$/, '')

  if (!host || (protocol !== 'http' && protocol !== 'https')) return null

  try {
    return new URL(`${protocol}://${host}`).origin
  } catch {
    return null
  }
}

export function isSameOriginRequest(
  request: OriginRequest,
  allowMissingOrigin = false
): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return allowMissingOrigin

  try {
    return new URL(origin).origin === getPublicOrigin(request)
  } catch {
    return false
  }
}
