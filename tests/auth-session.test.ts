import assert from 'node:assert/strict'
import test from 'node:test'
import { isAuthenticated, login, logout } from '../src/lib/auth.ts'
import {
  getTokenExpiration,
  getTokenLifetimeSeconds,
  getTokenPayload,
} from '../src/lib/auth-session.ts'

function createToken(expiration: number): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode({ exp: expiration })}.signature`
}

test('reads JWT expiration and rejects malformed tokens', () => {
  const token = createToken(2_000_000_000)
  assert.equal(getTokenExpiration(token), 2_000_000_000)
  assert.deepEqual(getTokenPayload(token), { exp: 2_000_000_000 })
  assert.equal(getTokenExpiration('not-a-token'), null)
})

test('calculates remaining token lifetime without returning negatives', () => {
  const now = 1_900_000_000_000
  assert.equal(getTokenLifetimeSeconds(createToken(1_900_000_060), now), 60)
  assert.equal(getTokenLifetimeSeconds(createToken(1_899_999_999), now), 0)
})

test('login returns only session state and sends credentials to the BFF', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  let requestBody = ''
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body)
    assert.equal(init?.credentials, 'same-origin')
    return Response.json({ authenticated: true })
  }

  const result = await login('manager@example.com', 'temporary-password')
  assert.deepEqual(result, { authenticated: true, error: null })
  assert.deepEqual(JSON.parse(requestBody), {
    email: 'manager@example.com',
    password: 'temporary-password',
  })
})

test('session helpers use same-origin requests', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  const methods: string[] = []
  globalThis.fetch = async (_input, init) => {
    methods.push(init?.method || 'GET')
    return Response.json({ authenticated: true })
  }

  assert.equal(await isAuthenticated(), true)
  await logout()
  assert.deepEqual(methods, ['GET', 'DELETE'])
})
