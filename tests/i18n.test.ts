import assert from 'node:assert/strict'
import test from 'node:test'
import { messages, translate } from '../src/i18n/messages.ts'

test('keeps Spanish and English translation catalogs in sync', () => {
  assert.deepEqual(
    Object.keys(messages.en).sort(),
    Object.keys(messages.es).sort()
  )
})

test('uses Spanish copy and interpolates dynamic values', () => {
  assert.equal(translate('es', 'nav.leagues'), 'Ligas')
  assert.equal(
    translate('es', 'market.processing', {
      current: 2,
      total: 5,
      player: 'Jugador',
    }),
    'Procesando 2 de 5: Jugador'
  )
})

test('switches the same key to English', () => {
  assert.equal(
    translate('en', 'dashboard.lineup', { count: 10 }),
    'Your lineup · 10/11 starters'
  )
})
