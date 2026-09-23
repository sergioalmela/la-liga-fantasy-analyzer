import assert from 'node:assert/strict'

const base = process.env.TEST_BASE_URL || 'https://localhost:8443'
const login = await fetch(new URL('/login', base))
assert.equal(login.status, 200)
assert.match(login.headers.get('content-security-policy'), /nonce-/)
assert.equal(login.headers.get('x-content-type-options'), 'nosniff')
assert.equal(login.headers.get('x-powered-by'), null)
const html = await login.text()
const asset = html.match(/src="([^"]*\/_next\/static\/[^"]+)"/)?.[1]
assert.ok(asset, 'page references a bundled script')
assert.equal((await fetch(new URL(asset, base))).status, 200)
const session = await fetch(new URL('/api/auth/session', base))
assert.equal(session.status, 200)
assert.deepEqual(await session.json(), { authenticated: false })
assert.equal(session.headers.get('cache-control'), 'no-store')
const post = (origin, ip) => fetch(new URL('/api/auth/login', base), {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json', 'x-real-ip': ip },
  body: '{}',
})
assert.equal((await post('https://attacker.example', '192.0.2.1')).status, 403)
for (let attempt = 0; attempt < 10; attempt++) {
  assert.equal((await post(base, `192.0.2.${attempt}`)).status, 400)
}
const limited = await post(base, '192.0.2.100')
assert.equal(limited.status, 429, 'client headers cannot bypass Caddy IP handling')
assert.ok(Number(limited.headers.get('retry-after')) > 0)
assert.equal(limited.headers.get('cache-control'), 'no-store')
console.log('HTTPS, assets, session, origin and login throttling checks passed.')
