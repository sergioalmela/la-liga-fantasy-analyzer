import assert from 'node:assert/strict'
import test from 'node:test'
import { isSameOriginRequest } from '../src/lib/request-origin.ts'

function request(
  origin: string | null,
  headers: Record<string, string> = {},
  internalUrl = 'http://localhost:3000/api/auth/login'
) {
  const requestHeaders = new Headers(headers)
  if (origin) requestHeaders.set('origin', origin)

  return {
    headers: requestHeaders,
    nextUrl: new URL(internalUrl),
  }
}

test('accepts a direct same-origin request', () => {
  assert.equal(
    isSameOriginRequest(
      request('http://localhost:3000', { host: 'localhost:3000' })
    ),
    true
  )
})

test('reconstructs the public HTTPS origin behind a reverse proxy', () => {
  assert.equal(
    isSameOriginRequest(
      request('https://laligafantasy.xyz', {
        host: 'laligafantasy.xyz',
        'x-forwarded-proto': 'https',
      })
    ),
    true
  )
})

test('uses an explicit forwarded host when the proxy rewrites Host', () => {
  assert.equal(
    isSameOriginRequest(
      request('https://laligafantasy.xyz', {
        host: 'localhost:3000',
        'x-forwarded-host': 'laligafantasy.xyz',
        'x-forwarded-proto': 'https',
      })
    ),
    true
  )
})

test('rejects a different host or protocol behind a reverse proxy', () => {
  const headers = {
    host: 'localhost:3000',
    'x-forwarded-host': 'laligafantasy.xyz',
    'x-forwarded-proto': 'https',
  }

  assert.equal(
    isSameOriginRequest(request('https://attacker.example', headers)),
    false
  )
  assert.equal(
    isSameOriginRequest(request('http://laligafantasy.xyz', headers)),
    false
  )
})

test('rejects missing or malformed origins unless explicitly allowed', () => {
  assert.equal(isSameOriginRequest(request(null)), false)
  assert.equal(isSameOriginRequest(request(null), true), true)
  assert.equal(isSameOriginRequest(request('not a URL')), false)
})
