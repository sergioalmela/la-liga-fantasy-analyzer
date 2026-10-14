import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import {
  buildAuthorizeUrl,
  createPendingLogin,
  getRefreshTokenLifetimeSeconds,
  LALIGA_CLIENT_ID,
  LALIGA_ISSUER,
  LALIGA_REDIRECT_URI,
  parseAuthorizationRedirect,
  parsePendingLogin,
  selectSessionToken,
  serializePendingLogin,
  statesMatch,
} from '../src/lib/laliga-oauth.ts'

function createToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode(claims)}.signature`
}

test('builds a PKCE authorize URL for the interactive LALIGA policy', () => {
  const pending = createPendingLogin()
  const url = new URL(buildAuthorizeUrl(pending))
  const expectedChallenge = createHash('sha256')
    .update(pending.verifier)
    .digest('base64url')

  assert.equal(url.origin, 'https://login.laliga.es')
  assert.equal(url.searchParams.get('p'), 'B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN')
  assert.equal(url.searchParams.get('client_id'), LALIGA_CLIENT_ID)
  assert.equal(url.searchParams.get('response_type'), 'code')
  assert.equal(url.searchParams.get('redirect_uri'), LALIGA_REDIRECT_URI)
  assert.equal(url.searchParams.get('code_challenge'), expectedChallenge)
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('state'), pending.state)
  assert.equal(url.searchParams.has('code_verifier'), false)
  assert.ok(pending.verifier.length >= 43 && pending.verifier.length <= 128)
})

test('round-trips the pending login cookie and rejects tampered values', () => {
  const pending = createPendingLogin()
  assert.deepEqual(parsePendingLogin(serializePendingLogin(pending)), pending)
  assert.equal(parsePendingLogin(undefined), null)
  assert.equal(parsePendingLogin('only-state'), null)
  assert.equal(parsePendingLogin('a.b.c'), null)
  assert.equal(parsePendingLogin('a b.c'), null)
})

test('compares states without accepting different lengths', () => {
  assert.equal(statesMatch('abc', 'abc'), true)
  assert.equal(statesMatch('abc', 'abd'), false)
  assert.equal(statesMatch('abc', 'abcd'), false)
})

test('extracts code and state from the pasted redirect URL', () => {
  assert.deepEqual(
    parseAuthorizationRedirect(
      ` "${LALIGA_REDIRECT_URI}?state=s1&code=eyJ.a-b_c~d" `
    ),
    { kind: 'code', code: 'eyJ.a-b_c~d', state: 's1' }
  )
  assert.deepEqual(
    parseAuthorizationRedirect(`${LALIGA_REDIRECT_URI}/?code=c&state=s`),
    { kind: 'code', code: 'c', state: 's' }
  )
  assert.deepEqual(
    parseAuthorizationRedirect(`${LALIGA_REDIRECT_URI}#code=c&state=s`),
    { kind: 'code', code: 'c', state: 's' }
  )
})

test('rejects foreign, malformed and cancelled redirects', () => {
  assert.deepEqual(
    parseAuthorizationRedirect(
      `${LALIGA_REDIRECT_URI}?error=access_denied&state=s`
    ),
    { kind: 'denied' }
  )
  for (const input of [
    '',
    'not a url',
    'https://evil.example/?code=c&state=s',
    'authredirect://com.example.other?code=c&state=s',
    `${LALIGA_REDIRECT_URI}/callback?code=c&state=s`,
    `${LALIGA_REDIRECT_URI}?code=c`,
    `${LALIGA_REDIRECT_URI}?code=a%20b&state=s`,
    `${LALIGA_REDIRECT_URI}?code=${'a'.repeat(5000)}&state=s`,
  ]) {
    assert.deepEqual(parseAuthorizationRedirect(input), { kind: 'invalid' })
  }
})

test('prefers a valid access token and falls back to the id token', () => {
  const now = 1_900_000_000_000
  const valid = createToken({
    aud: LALIGA_CLIENT_ID,
    iss: LALIGA_ISSUER,
    exp: 1_900_086_400,
  })
  const foreign = createToken({
    aud: 'other',
    iss: LALIGA_ISSUER,
    exp: 1_900_086_400,
  })

  assert.equal(selectSessionToken({ access_token: valid }, now), valid)
  assert.equal(
    selectSessionToken({ access_token: foreign, id_token: valid }, now),
    valid
  )
  assert.equal(selectSessionToken({ id_token: foreign }, now), null)
  assert.equal(selectSessionToken({}, now), null)
})

test('caps the refresh cookie lifetime at 90 days', () => {
  const ninetyDays = 90 * 24 * 60 * 60
  assert.equal(getRefreshTokenLifetimeSeconds({}), ninetyDays)
  assert.equal(
    getRefreshTokenLifetimeSeconds({ refresh_token_expires_in: 3600 }),
    3600
  )
  assert.equal(
    getRefreshTokenLifetimeSeconds({ refresh_token_expires_in: 10 ** 9 }),
    ninetyDays
  )
})
