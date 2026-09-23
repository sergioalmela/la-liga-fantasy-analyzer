import assert from 'node:assert/strict'
import test from 'node:test'
import { createLoginRateLimiter } from '../src/lib/login-rate-limit.ts'

test('limits attempts per trusted client and expires the window', () => {
  const limit = createLoginRateLimiter()
  const headers = new Headers({ 'x-real-ip': '192.0.2.1' })
  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal(limit(headers, true, 0), 0)
  }
  assert.equal(limit(headers, true, 1000), 299)
  assert.equal(
    limit(new Headers({ 'x-real-ip': '2001:db8::1' }), true, 1000),
    0
  )
  assert.equal(limit(headers, true, 300000), 0)
})

test('untrusted or malformed headers cannot create separate clients', () => {
  for (const trustProxy of [true, false]) {
    const limit = createLoginRateLimiter()
    for (let attempt = 0; attempt < 10; attempt++) {
      assert.equal(
        limit(
          new Headers({ 'x-real-ip': `spoofed-${attempt}` }),
          trustProxy,
          0
        ),
        0
      )
    }
    assert.equal(limit(new Headers(), trustProxy, 0), 300)
    if (!trustProxy) {
      assert.equal(
        limit(new Headers({ 'x-real-ip': '192.0.2.2' }), false, 0),
        300
      )
    }
  }
})

test('bounds memory without evicting active limits', () => {
  const limit = createLoginRateLimiter()
  for (let client = 0; client < 4096; client++) {
    const ip = `10.0.${Math.floor(client / 256)}.${client % 256}`
    assert.equal(limit(new Headers({ 'x-real-ip': ip }), true, 0), 0)
  }
  const newClient = new Headers({ 'x-real-ip': '192.0.2.1' })
  assert.equal(limit(newClient, true, 0), 300)
  assert.equal(limit(newClient, true, 300000), 0)
})
