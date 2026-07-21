import type { Player } from '../entities/player'
import type {
  ActivityPlayer,
  CurrentWeek,
  League,
  LeagueActivity,
  LeagueRanking,
  TeamMoney,
} from '../types/api'

type JsonRecord = Record<string, unknown>

export type TeamMasterLookup = Map<string, { id: string; name: string }>

export type ContractResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function unwrapArray(value: unknown, keys: string[] = []): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return null

  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key]
  }

  return null
}

export function parseTeamsMaster(
  value: unknown
): ContractResult<TeamMasterLookup> {
  const entries = unwrapArray(value, ['teams'])
  if (!entries) return { data: null, error: 'Invalid teams response' }

  const teams: TeamMasterLookup = new Map()
  for (const entry of entries) {
    if (!isRecord(entry)) return { data: null, error: 'Invalid team entry' }

    const id = asString(entry.id)
    const name = asString(entry.name)
    if (!id || !name) return { data: null, error: 'Invalid team entry' }

    teams.set(id, { id, name })
  }

  return { data: teams, error: null }
}

export function parseLeagueActivity(
  value: unknown
): ContractResult<LeagueActivity[]> {
  const entries = unwrapArray(value, ['elements'])
  if (!entries) return { data: null, error: 'Invalid activity response' }

  const activity: LeagueActivity[] = []
  for (const entry of entries) {
    if (!isRecord(entry)) {
      return { data: null, error: 'Invalid activity entry' }
    }

    const id = asString(entry.id)
    const activityTypeId = asNumber(entry.activityTypeId)
    const createdAt = asString(entry.createdAt ?? entry.timestamp)
    const user1Id = asString(entry.user1Id)
    const user2Id = asString(entry.user2Id)
    const playerMasterId = asString(entry.playerMasterId ?? entry.playerId)
    const amount = asNumber(entry.amount)
    const weekNumber = asNumber(entry.weekNumber)
    if (!id || activityTypeId === null || !createdAt) {
      return { data: null, error: 'Invalid activity entry' }
    }

    activity.push({
      id,
      activityTypeId,
      createdAt,
      ...(user1Id ? { user1Id } : {}),
      ...(user2Id ? { user2Id } : {}),
      ...(playerMasterId ? { playerMasterId } : {}),
      ...(amount !== null ? { amount } : {}),
      ...(weekNumber !== null ? { weekNumber } : {}),
    })
  }

  return { data: activity, error: null }
}

export function parseActivityPlayers(
  value: unknown
): ContractResult<ActivityPlayer[]> {
  const entries = unwrapArray(value, ['elements'])
  if (!entries) return { data: null, error: 'Invalid players response' }

  const players: ActivityPlayer[] = []
  for (const entry of entries) {
    if (!isRecord(entry)) return { data: null, error: 'Invalid player entry' }

    const id = asString(entry.id)
    const name = asString(entry.nickname) ?? asString(entry.name)
    if (!id || !name) return { data: null, error: 'Invalid player entry' }
    players.push({ id, name })
  }

  return { data: players, error: null }
}

export function parseTeamMoney(value: unknown): ContractResult<TeamMoney> {
  if (!isRecord(value)) return { data: null, error: 'Invalid money response' }

  const teamMoney = asNumber(value.teamMoney)
  const teamInvestment = asNumber(value.teamInvestment)
  if (teamMoney === null || teamInvestment === null) {
    return { data: null, error: 'Invalid money response' }
  }

  return { data: { teamMoney, teamInvestment }, error: null }
}

export function parseCurrentWeek(value: unknown): ContractResult<CurrentWeek> {
  if (!isRecord(value)) return { data: null, error: 'Invalid week response' }

  const weekNumber = asNumber(value.weekNumber)
  const nextWeek = asNumber(value.nextWeek)
  const openingWeekDate = asString(value.openingWeekDate)
  const closingWeekDate = asString(value.closingWeekDate)
  if (
    weekNumber === null ||
    nextWeek === null ||
    !openingWeekDate ||
    !closingWeekDate
  ) {
    return { data: null, error: 'Invalid week response' }
  }

  return {
    data: {
      isLive: value.isLive === true,
      weekNumber,
      nextWeek,
      openingWeekDate,
      closingWeekDate,
    },
    error: null,
  }
}

export function parseLeagues(value: unknown): ContractResult<League[]> {
  const entries = unwrapArray(value, ['elements', 'leagues'])
  if (!entries) return { data: null, error: 'Invalid leagues response' }

  const leagues: League[] = []
  for (const entry of entries) {
    if (!isRecord(entry) || !isRecord(entry.team)) {
      return { data: null, error: 'Invalid league entry' }
    }

    const id = asString(entry.id)
    const name = asString(entry.name)
    const teamId = asString(entry.team.id)
    const managersNumber = asNumber(entry.managersNumber)

    if (!id || !name || !teamId || managersNumber === null) {
      return { data: null, error: 'Invalid league entry' }
    }

    leagues.push({
      ...entry,
      id,
      name,
      managersNumber,
      premium: entry.premium === true,
      team: {
        ...entry.team,
        id: teamId,
        isAdmin: entry.team.isAdmin === true,
      },
    } as League)
  }

  return { data: leagues, error: null }
}

export function parseLeagueRanking(
  value: unknown
): ContractResult<LeagueRanking[]> {
  const entries = unwrapArray(value, ['elements'])
  if (!entries) return { data: null, error: 'Invalid standing response' }

  const ranking: LeagueRanking[] = []
  for (const entry of entries) {
    if (!isRecord(entry) || !isRecord(entry.team)) {
      return { data: null, error: 'Invalid standing entry' }
    }

    const manager = isRecord(entry.team.manager) ? entry.team.manager : null
    const teamId = asString(entry.team.id)
    const managerId = manager ? asString(manager.id) : null
    const managerName = manager ? asString(manager.managerName) : null
    const position = asNumber(entry.position)
    const points = asNumber(entry.points ?? entry.team.teamPoints)

    if (
      !teamId ||
      !managerId ||
      !managerName ||
      position === null ||
      points === null
    ) {
      return { data: null, error: 'Invalid standing entry' }
    }

    ranking.push({
      ...entry,
      position,
      previousPosition: asNumber(entry.previousPosition) ?? position,
      points,
      team: {
        ...entry.team,
        id: teamId,
        teamPoints: asNumber(entry.team.teamPoints) ?? points,
        manager: {
          ...manager,
          id: managerId,
          managerName,
        },
      },
    } as LeagueRanking)
  }

  return { data: ranking, error: null }
}

function parsePlayerMaster(
  playerMaster: unknown,
  extra: JsonRecord,
  teams?: TeamMasterLookup
): Player | null {
  if (!isRecord(playerMaster)) return null

  const id = asString(playerMaster.id)
  const nickname = asString(playerMaster.nickname)
  const name = asString(playerMaster.name) ?? nickname
  const positionId = asNumber(playerMaster.positionId)
  const embeddedTeam = isRecord(playerMaster.team) ? playerMaster.team : null
  const teamId = asString(embeddedTeam?.id ?? playerMaster.teamId)
  const masterTeam = teamId ? teams?.get(teamId) : null
  const teamName = asString(embeddedTeam?.name) ?? masterTeam?.name ?? null
  const marketValue = asNumber(playerMaster.marketValue)
  const points = asNumber(playerMaster.points)
  const averagePoints = asNumber(playerMaster.averagePoints)

  if (
    !id ||
    !name ||
    positionId === null ||
    !teamId ||
    !teamName ||
    marketValue === null ||
    points === null ||
    averagePoints === null
  ) {
    return null
  }

  return {
    id,
    name,
    ...(nickname ? { nickname } : {}),
    positionId,
    playerStatus: asString(playerMaster.playerStatus) ?? 'unknown',
    team: { id: teamId, name: teamName },
    marketValue,
    points,
    averagePoints,
    ...extra,
  }
}

export function parseTeamPlayers(value: unknown): ContractResult<Player[]> {
  if (!isRecord(value) || !Array.isArray(value.players)) {
    return { data: null, error: 'Invalid team response' }
  }

  const players: Player[] = []
  for (const entry of value.players) {
    if (!isRecord(entry)) return { data: null, error: 'Invalid team player' }

    const playerMarket = isRecord(entry.playerMarket)
      ? entry.playerMarket
      : null
    const marketId = playerMarket ? asString(playerMarket.id) : null
    const salePrice = playerMarket ? asNumber(playerMarket.salePrice) : null
    const expirationDate = playerMarket
      ? asString(playerMarket.expirationDate)
      : null

    const player = parsePlayerMaster(entry.playerMaster, {
      ...(asString(entry.playerTeamId)
        ? { playerTeamId: asString(entry.playerTeamId) }
        : {}),
      ...(asNumber(entry.buyoutClause) !== null
        ? { buyoutClause: asNumber(entry.buyoutClause) }
        : {}),
      ...(asString(entry.buyoutClauseLockedEndTime)
        ? {
            buyoutClauseLockedEndTime: asString(
              entry.buyoutClauseLockedEndTime
            ),
          }
        : {}),
      ...(playerMarket && marketId && salePrice !== null && expirationDate
        ? {
            saleInfo: {
              marketId,
              salePrice,
              expirationDate,
              numberOfOffers: asNumber(playerMarket.numberOfOffers) ?? 0,
            },
          }
        : {}),
    })

    if (!player) return { data: null, error: 'Invalid team player' }
    players.push(player)
  }

  return { data: players, error: null }
}

export function parseOfficialMarketPlayers(
  value: unknown,
  teams: TeamMasterLookup
): ContractResult<Player[]> {
  const entries = unwrapArray(value, ['elements'])
  if (!entries) return { data: null, error: 'Invalid market response' }

  const players: Player[] = []
  for (const entry of entries) {
    if (!isRecord(entry) || entry.discr !== 'marketPlayerLeague') continue

    const marketId = asString(entry.id)
    const salePrice = asNumber(entry.salePrice)
    const expirationDate = asString(entry.expirationDate)
    if (!marketId || salePrice === null || !expirationDate) {
      return { data: null, error: 'Invalid market player' }
    }

    const player = parsePlayerMaster(
      entry.playerMaster,
      {
        saleInfo: {
          marketId,
          salePrice,
          expirationDate,
          numberOfOffers: asNumber(entry.numberOfBids) ?? 0,
        },
      },
      teams
    )

    if (!player) return { data: null, error: 'Invalid market player' }
    players.push(player)
  }

  return { data: players, error: null }
}
