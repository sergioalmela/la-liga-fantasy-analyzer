import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAllowedFantasyPath,
  preserveUpstreamResponse,
} from '../src/lib/fantasy-proxy.ts'
import { ApiClient } from '../src/services/api-client.ts'
import {
  parseLeagueRanking,
  parseLeagues,
  parseOfficialMarketPlayers,
  parseTeamPlayers,
  parseTeamsMaster,
} from '../src/services/api-contracts.ts'

const playerMaster = {
  id: '68',
  nickname: 'Goalkeeper',
  positionId: '1',
  playerStatus: 'ok',
  team: { id: '3', name: 'Example FC' },
  marketValue: '34914257',
  points: 0,
  averagePoints: 0,
}

test('normalizes league arrays and numeric IDs', () => {
  const result = parseLeagues({
    elements: [
      {
        id: 10,
        name: 'Test League',
        managersNumber: '8',
        premium: true,
        team: { id: 20, isAdmin: true },
      },
    ],
  })

  assert.equal(result.error, null)
  assert.equal(result.data?.[0].id, '10')
  assert.equal(result.data?.[0].team.id, '20')
  assert.equal(result.data?.[0].managersNumber, 8)
})

test('rejects an upstream error object instead of treating it as leagues', () => {
  assert.deepEqual(parseLeagues({ code: 500, message: 'failure' }), {
    data: null,
    error: 'Invalid leagues response',
  })
})

test('normalizes the 2026/27 standing shape', () => {
  const result = parseLeagueRanking([
    {
      position: 1,
      team: {
        id: 20,
        teamPoints: '42',
        manager: { id: 30, managerName: 'Manager' },
      },
    },
  ])

  assert.equal(result.error, null)
  assert.equal(result.data?.[0].points, 42)
  assert.equal(result.data?.[0].team.id, '20')
})

test('normalizes numeric strings in team players', () => {
  const result = parseTeamPlayers({
    players: [
      {
        playerTeamId: 100,
        buyoutClause: '40000000',
        playerMaster,
      },
    ],
  })

  assert.equal(result.error, null)
  assert.equal(result.data?.[0].positionId, 1)
  assert.equal(result.data?.[0].marketValue, 34914257)
})

test('keeps only official league-market players', () => {
  const teams = parseTeamsMaster([{ id: 3, name: 'Example FC' }])
  assert.equal(teams.error, null)

  const result = parseOfficialMarketPlayers(
    [
      {
        id: 200,
        discr: 'marketPlayerLeague',
        salePrice: '35000000',
        expirationDate: '2026-07-22T12:00:00Z',
        numberOfBids: '2',
        playerMaster: {
          ...playerMaster,
          team: undefined,
          teamId: 3,
        },
      },
      { id: 201, discr: 'marketPlayerTeam' },
    ],
    teams.data ?? new Map()
  )

  assert.equal(result.error, null)
  assert.equal(result.data?.length, 1)
  assert.equal(result.data?.[0].saleInfo?.numberOfOffers, 2)
  assert.equal(result.data?.[0].team.name, 'Example FC')
})

test('proxy allowlist rejects external URLs and legacy endpoints', () => {
  assert.equal(
    getAllowedFantasyPath('/v1/competition/1/leagues?x-lang=es', 'GET'),
    '/v1/competition/1/leagues?x-lang=es'
  )
  assert.equal(
    getAllowedFantasyPath('/v3/teams-master?x-lang=es', 'GET'),
    '/v3/teams-master?x-lang=es'
  )
  assert.equal(getAllowedFantasyPath('//example.com/steal', 'GET'), null)
  assert.equal(
    getAllowedFantasyPath('/v1/competition/1/leagues?x-lang=en', 'GET'),
    null
  )
  assert.equal(
    getAllowedFantasyPath('/v1/competition/1/foo/../leagues', 'GET'),
    null
  )
  assert.equal(getAllowedFantasyPath('/v4/leagues', 'GET'), null)
  assert.equal(getAllowedFantasyPath('/v1/competition/1/leagues', 'POST'), null)
})

test('proxy response preserves upstream error statuses and bodies', async () => {
  for (const status of [401, 404, 500]) {
    const upstream = Response.json(
      { code: status, message: 'upstream failed' },
      { status }
    )
    const response = await preserveUpstreamResponse(upstream)

    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), {
      code: status,
      message: 'upstream failed',
    })
  }
})

test('proxy response handles an empty 204 response', async () => {
  const response = await preserveUpstreamResponse(
    new Response(null, { status: 204 })
  )

  assert.equal(response.status, 204)
  assert.equal(await response.text(), '')
})

test('API client exposes the upstream status and message', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.credentials, 'same-origin')
    assert.equal(new Headers(init?.headers).has('Authorization'), false)
    return Response.json(
      { message: 'Authentication is required.' },
      { status: 401 }
    )
  }

  const result = await new ApiClient().get('/v1/competition/1/leagues')
  assert.deepEqual(result, {
    data: null,
    error: 'Authentication is required.',
    status: 401,
  })
})
