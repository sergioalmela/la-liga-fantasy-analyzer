import { isIP } from 'node:net'

const WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 10
const MAX_CLIENTS = 4096

export function createLoginRateLimiter() {
  const clients = new Map<string, { attempts: number; expiresAt: number }>()

  return (headers: Headers, trustProxy: boolean, now = Date.now()): number => {
    const forwardedIp = headers.get('x-real-ip') || ''
    const client = trustProxy && isIP(forwardedIp) ? forwardedIp : 'unknown'
    for (const [key, value] of clients) {
      if (value.expiresAt <= now) clients.delete(key)
    }

    let entry = clients.get(client)
    if (!entry) {
      if (clients.size >= MAX_CLIENTS) return Math.ceil(WINDOW_MS / 1000)
      entry = { attempts: 0, expiresAt: now + WINDOW_MS }
      clients.set(client, entry)
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      return Math.ceil((entry.expiresAt - now) / 1000)
    }
    entry.attempts += 1
    return 0
  }
}

// One process per deployment; Caddy must overwrite X-Real-IP before it is trusted.
export const limitLogin = createLoginRateLimiter()
