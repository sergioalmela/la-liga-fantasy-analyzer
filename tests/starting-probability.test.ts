import assert from 'node:assert/strict'
import test from 'node:test'
import {
  matchStartingProbability,
  normalizePlayerName,
  parseStartingProbabilityPage,
  type StartingProbabilityRequestPlayer,
} from '../src/lib/starting-probability.ts'

const sourceHtml = `
  <div class="jugador_11706 jugador tipo_lista d-none block-new "
    data-nombre="pau-cubarsi"
    data-probabilidad="80%"
    data-valor-laliga-fantasy="98953366">
    <span class="nombre">Pau Cubarsí</span>
  </div>
  <div class="jugador_4397 jugador tipo_lista d-none block-new "
    data-nombre="marcos-alonso"
    data-probabilidad="90%"
    data-valor-laliga-fantasy="71704119">
    <span class="nombre">Marcos Alonso</span>
  </div>
  <div class="jugador_100 jugador tipo_lista d-none block-new "
    data-nombre="gonzalo-villar"
    data-probabilidad="80%"
    data-valor-laliga-fantasy="7027127">
    <span class="nombre">Gonzalo Villar</span>
  </div>
  <div class="jugador_101 jugador tipo_lista d-none block-new "
    data-nombre="rafa-mir"
    data-probabilidad="20%"
    data-valor-laliga-fantasy="7027127">
    <span class="nombre">Rafa Mir</span>
  </div>
`

function player(
  overrides: Partial<StartingProbabilityRequestPlayer> = {}
): StartingProbabilityRequestPlayer {
  return {
    id: '1775',
    name: 'Pau Cubarsí',
    teamId: '4',
    marketValue: 98_953_366,
    ...overrides,
  }
}

test('normalizes accents and punctuation in player names', () => {
  assert.equal(normalizePlayerName('  Pau Cubarsí '), 'pau cubarsi')
  assert.equal(
    normalizePlayerName('Marc-André ter Stegen'),
    'marc andre ter stegen'
  )
})

test('parses starting probabilities and source links from team HTML', () => {
  const parsed = parseStartingProbabilityPage(sourceHtml)

  assert.equal(parsed.length, 4)
  assert.deepEqual(parsed[0], {
    sourcePlayerId: '11706',
    name: 'Pau Cubarsí',
    slug: 'pau-cubarsi',
    probability: 80,
    marketValue: 98_953_366,
    sourceUrl: 'https://www.futbolfantasy.com/jugadores/pau-cubarsi',
  })
  assert.equal(parsed[1].probability, 90)
})

test('matches Marcos Alonso directly without the global Fantasy catalogue', () => {
  const match = matchStartingProbability(
    player({
      id: 'marcos',
      name: 'Marcos Alonso',
      nickname: 'Marcos Alonso',
      teamId: '6',
      marketValue: 71_704_119,
    }),
    parseStartingProbabilityPage(sourceHtml)
  )

  assert.deepEqual(match, {
    probability: 90,
    sourceName: 'FútbolFantasy',
    sourceUrl: 'https://www.futbolfantasy.com/jugadores/marcos-alonso',
  })
})

test('matches an abbreviated official name by initial and surname', () => {
  const match = matchStartingProbability(
    player({
      id: 'villar',
      name: 'G. Villar',
      nickname: 'G. Villar',
      teamId: '7',
      marketValue: 7_027_127,
    }),
    parseStartingProbabilityPage(sourceHtml)
  )

  assert.equal(match?.probability, 80)
})

test('uses a unique market value but rejects an ambiguous one', () => {
  const candidates = parseStartingProbabilityPage(sourceHtml)

  assert.equal(
    matchStartingProbability(
      player({
        name: 'Different API name',
        nickname: 'Different API name',
        marketValue: 98_953_366,
      }),
      candidates
    )?.probability,
    80
  )
  assert.equal(
    matchStartingProbability(
      player({
        name: 'Unknown player',
        nickname: 'Unknown player',
        marketValue: 7_027_127,
      }),
      candidates
    ),
    null
  )
})

test('filters malformed probabilities and players', () => {
  const malformed = `
    <div class="jugador_1 jugador tipo_lista" data-nombre="one" data-probabilidad="101%"></div>
    <div class="jugador_2 jugador tipo_lista" data-probabilidad="80%"></div>
  `

  assert.deepEqual(parseStartingProbabilityPage(malformed), [])
})
