import {
  buildAuthorizeUrl,
  createPendingLogin,
  parseAuthorizationRedirect,
  statesMatch,
} from './laliga-oauth.ts'
import {
  exchangeAuthorizationCode,
  type TokenResult,
} from './laliga-session.ts'

const LOGIN_ORIGIN = 'https://login.laliga.es'
const STEP_TIMEOUT_MS = 15000

export interface SignInPage {
  csrf: string
  transId: string
  tenantPath: string
  policy: string
  api: string
  usernameField: string
  passwordField: string
}

function readAssignedObject(
  html: string,
  name: string
): Record<string, unknown> | null {
  const match = html.match(
    new RegExp(`var ${name} = (\\{[\\s\\S]*?\\});\\s*\\n`)
  )
  if (!match) return null
  try {
    const value = JSON.parse(match[1]) as unknown
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Reads the values LALIGA's B2C page embeds for its own sign-in script. */
export function parseSignInPage(html: string): SignInPage | null {
  const settings = readAssignedObject(html, 'SETTINGS')
  const fields = readAssignedObject(html, 'SA_FIELDS')?.AttributeFields
  const hosts = settings?.hosts as Record<string, unknown> | undefined
  if (!settings || !hosts || !Array.isArray(fields)) return null

  const ids = fields as Array<Record<string, unknown>>
  const passwordField = ids.find((f) => f.USER_INPUT_TYPE === 'Password')?.ID
  const usernameField = ids.find((f) => f.USER_INPUT_TYPE !== 'Password')?.ID

  const page = {
    csrf: settings.csrf,
    transId: settings.transId,
    tenantPath: hosts.tenant,
    policy: hosts.policy,
    api: settings.api,
    usernameField,
    passwordField,
  }
  return Object.values(page).every((v) => typeof v === 'string' && v)
    ? (page as SignInPage)
    : null
}

/** Minimal cookie jar for the B2C transaction cookies on login.laliga.es. */
class CookieJar {
  private readonly cookies = new Map<string, string>()

  store(response: Response): void {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';')
      const separator = pair.indexOf('=')
      if (separator <= 0) continue
      const name = pair.slice(0, separator).trim()
      const value = pair.slice(separator + 1).trim()
      const expires = attributes
        .map((a) => a.trim())
        .find((a) => a.toLowerCase().startsWith('expires='))
      const expired = expires && Date.parse(expires.slice(8)) <= Date.now()
      if (!value || expired) this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
  }

  header(): string {
    return [...this.cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }
}

export type PasswordSignInResult =
  | TokenResult
  | { status: 'invalid_credentials' }

/**
 * Replays LALIGA's own sign-in page server-side: load the authorize page,
 * submit the credentials, then read the authorization code from the redirect
 * the browser would hand to the mobile app. Only local accounts work this way;
 * Google and Apple require the interactive flow.
 */
export async function signInWithPassword(
  email: string,
  password: string,
  signal?: AbortSignal
): Promise<PasswordSignInResult> {
  const pending = createPendingLogin()
  const jar = new CookieJar()
  const step = (init: RequestInit = {}) => {
    const timeout = AbortSignal.timeout(STEP_TIMEOUT_MS)
    const headers = new Headers(init.headers)
    const cookie = jar.header()
    if (cookie) headers.set('Cookie', cookie)
    return {
      ...init,
      headers,
      redirect: 'manual' as const,
      cache: 'no-store' as const,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    }
  }

  try {
    const authorize = await fetch(buildAuthorizeUrl(pending), step())
    jar.store(authorize)
    const page = authorize.ok ? parseSignInPage(await authorize.text()) : null
    if (!page) return { status: 'unavailable' }

    const base = `${LOGIN_ORIGIN}${page.tenantPath}`
    const transaction = new URLSearchParams({
      tx: page.transId,
      p: page.policy,
    })
    const submitted = await fetch(
      `${base}/SelfAsserted?${transaction}`,
      step({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': page.csrf,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams({
          request_type: 'RESPONSE',
          [page.usernameField]: email,
          [page.passwordField]: password,
        }),
      })
    )
    jar.store(submitted)
    const verdict = (await submitted.json().catch(() => ({}))) as {
      status?: unknown
      errorCode?: unknown
    }
    if (submitted.status === 429) return { status: 'rate_limited' }
    // Credential errors carry an AADB2C code (e.g. AADB2C90053 unknown user);
    // a 400 without one means the form changed and must not blame the user.
    if (
      verdict.status === '400' &&
      typeof verdict.errorCode === 'string' &&
      verdict.errorCode.startsWith('AADB2C')
    ) {
      return { status: 'invalid_credentials' }
    }
    if (!submitted.ok || verdict.status !== '200') {
      return { status: 'unavailable' }
    }

    const confirmed = await fetch(
      `${base}/api/${page.api}/confirmed?${new URLSearchParams({
        rememberMe: 'false',
        csrf_token: page.csrf,
        tx: page.transId,
        p: page.policy,
      })}`,
      step()
    )
    const redirect = parseAuthorizationRedirect(
      confirmed.headers.get('location') || ''
    )
    if (
      redirect.kind !== 'code' ||
      !statesMatch(pending.state, redirect.state)
    ) {
      return { status: 'unavailable' }
    }

    return exchangeAuthorizationCode(redirect.code, pending.verifier, signal)
  } catch {
    return { status: 'unavailable' }
  }
}
