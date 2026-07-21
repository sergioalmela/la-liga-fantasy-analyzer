import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/entities/player.ts'
import { createContentSecurityPolicy } from '../src/lib/content-security-policy.ts'
import {
  getAllowedFantasyPath,
  preserveUpstreamResponse,
  validateFantasyRequestBody,
} from '../src/lib/fantasy-proxy.ts'
import { buildActivityRadar } from '../src/services/activity-service.ts'
import { ApiClient } from '../src/services/api-client.ts'
import {
  parseActivityPlayers,
  parseCurrentWeek,
  parseLeagueActivity,
  parseLeagueRanking,
  parseLeagues,
  parseOfficialMarketPlayers,
  parseTeamMoney,
  parseTeamPlayers,
  parseTeamsMaster,
} from '../src/services/api-contracts.ts'
import { refreshMarketListings } from '../src/services/market-service.ts'

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

function createPlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    playerTeamId: `team-${id}`,
    name: `Player ${id}`,
    positionId: 1,
    playerStatus: 'ok',
    team: { id: 'team', name: 'Example FC' },
    marketValue: 10_000_000,
    points: 0,
    averagePoints: 0,
    ...overrides,
  }
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

test('normalizes activity, budget and current week contracts', () => {
  const activity = parseLeagueActivity([
    {
      id: 1,
      activityTypeId: '31',
      user1Id: 10,
      user2Id: 20,
      playerMasterId: 68,
      amount: '12000000',
      createdAt: '2026-07-21T10:00:00Z',
    },
  ])
  const money = parseTeamMoney({
    teamMoney: '30000000',
    teamInvestment: 40000000,
  })
  const week = parseCurrentWeek({
    isLive: false,
    weekNumber: 1,
    nextWeek: 2,
    openingWeekDate: '2026-08-15T19:30:00+02:00',
    closingWeekDate: '2026-08-20T03:00:00+02:00',
  })

  assert.equal(activity.error, null)
  assert.equal(activity.data?.[0].user1Id, '10')
  assert.equal(activity.data?.[0].amount, 12000000)
  assert.equal(money.data?.teamMoney, 30000000)
  assert.equal(week.data?.weekNumber, 1)
})

test('builds an enriched read-only activity radar', () => {
  const ranking = parseLeagueRanking([
    {
      position: 1,
      team: {
        id: 100,
        teamPoints: 0,
        manager: { id: 10, managerName: 'Buyer' },
      },
    },
    {
      position: 2,
      team: {
        id: 200,
        teamPoints: 0,
        manager: { id: 20, managerName: 'Seller' },
      },
    },
  ])
  const players = parseActivityPlayers([{ id: 68, nickname: 'Goalkeeper' }])
  assert.ok(ranking.data)
  assert.ok(players.data)

  const radar = buildActivityRadar(
    [
      {
        id: 'activity-1',
        activityTypeId: 31,
        createdAt: '2026-07-21T10:00:00Z',
        user1Id: '10',
        user2Id: '20',
        playerMasterId: '68',
        amount: 12000000,
      },
      {
        id: 'activity-2',
        activityTypeId: 6,
        createdAt: '2026-07-20T10:00:00Z',
        user1Id: '10',
        amount: 2000000,
      },
    ],
    ranking.data,
    players.data,
    { teamMoney: 30000000, teamInvestment: 40000000 },
    {
      isLive: false,
      weekNumber: 1,
      nextWeek: 2,
      openingWeekDate: '2026-08-15T19:30:00+02:00',
      closingWeekDate: '2026-08-20T03:00:00+02:00',
    }
  )

  assert.equal(radar.activities[0].actorName, 'Buyer')
  assert.equal(radar.activities[0].counterpartyName, 'Seller')
  assert.equal(radar.activities[0].playerName, 'Goalkeeper')
  assert.equal(radar.totalVolume, 14000000)
  assert.deepEqual(radar.managerSummaries, [
    {
      managerName: 'Buyer',
      activityCount: 2,
      earned: 2000000,
      spent: 12000000,
    },
    { managerName: 'Seller', activityCount: 0, earned: 12000000, spent: 0 },
  ])
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
  assert.equal(
    getAllowedFantasyPath(
      '/v1/competition/1/league/league-1/market/sell?x-lang=es',
      'POST'
    ),
    '/v1/competition/1/league/league-1/market/sell?x-lang=es'
  )
  assert.equal(
    getAllowedFantasyPath(
      '/v1/competition/1/league/league-1/market/market-1/delete?x-lang=es',
      'DELETE'
    ),
    '/v1/competition/1/league/league-1/market/market-1/delete?x-lang=es'
  )
  assert.equal(
    getAllowedFantasyPath(
      '/v1/competition/1/league/league-1/market/market-1/bid',
      'POST'
    ),
    null
  )
})

test('proxy accepts only a minimal market listing body', () => {
  assert.deepEqual(
    validateFantasyRequestBody(
      'POST',
      JSON.stringify({ playerId: 'player-1', salePrice: 25_000_000 })
    ),
    {
      valid: true,
      body: JSON.stringify({ playerId: 'player-1', salePrice: 25_000_000 }),
    }
  )
  assert.deepEqual(
    validateFantasyRequestBody(
      'POST',
      JSON.stringify({
        playerId: 'player-1',
        salePrice: 25_000_000,
        money: 1,
      })
    ),
    { valid: false }
  )
  assert.deepEqual(
    validateFantasyRequestBody(
      'POST',
      JSON.stringify({ playerId: '../player-1', salePrice: 25_000_000 })
    ),
    { valid: false }
  )
  assert.deepEqual(validateFantasyRequestBody('DELETE', ''), { valid: true })
  assert.deepEqual(validateFantasyRequestBody('DELETE', '{}'), {
    valid: false,
  })
})

test('renews and adds market listings sequentially with partial failure details', async () => {
  const calls: string[] = []
  const progress: string[] = []
  const players = [
    createPlayer('1', {
      saleInfo: {
        marketId: 'market-1',
        salePrice: 9_000_000,
        expirationDate: '2026-07-22T12:00:00Z',
        numberOfOffers: 0,
      },
    }),
    createPlayer('2'),
    createPlayer('3', {
      saleInfo: {
        marketId: 'market-3',
        salePrice: 9_000_000,
        expirationDate: '2026-07-22T12:00:00Z',
        numberOfOffers: 0,
      },
    }),
  ]

  const result = await refreshMarketListings(
    'league-1',
    players,
    (current, total, name) => progress.push(`${current}/${total}:${name}`),
    {
      async withdrawPlayer(_leagueId, marketId) {
        calls.push(`withdraw:${marketId}`)
        return { data: null, error: null }
      },
      async listPlayer(_leagueId, playerId) {
        calls.push(`list:${playerId}`)
        return playerId === 'team-3'
          ? { data: null, error: 'upstream rejected listing' }
          : { data: null, error: null }
      },
    }
  )

  assert.deepEqual(calls, [
    'withdraw:market-1',
    'list:team-1',
    'list:team-2',
    'withdraw:market-3',
    'list:team-3',
  ])
  assert.deepEqual(progress, ['1/3:Player 1', '2/3:Player 2', '3/3:Player 3'])
  assert.deepEqual(result, {
    renewed: 1,
    added: 1,
    failures: [
      'Player 3: listing was withdrawn but could not be renewed (upstream rejected listing)',
    ],
  })
})

test('CSP permits Next tooling only in development', () => {
  const development = createContentSecurityPolicy('test-nonce', true)
  const production = createContentSecurityPolicy('test-nonce', false)

  assert.match(development, /style-src 'self' 'unsafe-inline'/)
  assert.match(development, /script-src[^;]+'unsafe-eval'/)
  assert.doesNotMatch(development, /style-src[^;]+'nonce-/)

  assert.match(production, /style-src 'self' 'nonce-test-nonce'/)
  assert.doesNotMatch(production, /'unsafe-inline'|'unsafe-eval'/)
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
