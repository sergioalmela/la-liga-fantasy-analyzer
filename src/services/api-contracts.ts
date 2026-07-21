import type { Player } from '../entities/player'
import type {
  ActivityPlayer,
  CurrentWeek,
  League,
  LeagueActivity,
  LeagueRanking,
  TeamMoney,
} from '../types/api'
import type {
  CalendarMatch,
  FantasyUserProfile,
  LineupPlayer,
  LineupSnapshot,
  MatchStats,
  PlayerDetail,
  PlayerSeasonSummary,
  PlayerWeeklyStat,
  RankingEvolution,
} from '../types/dashboard.ts'

type JsonRecord = Record<string, unknown>

export type TeamMasterLookup = Map<
  string,
  { id: string; name: string; shortName?: string }
>

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

    const shortName = asString(entry.shortName)
    teams.set(id, { id, name, ...(shortName ? { shortName } : {}) })
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

export function parseFantasyUser(
  value: unknown
): ContractResult<FantasyUserProfile> {
  if (!isRecord(value)) return { data: null, error: 'Invalid user response' }
  const root = isRecord(value.user) ? value.user : value
  const id = asString(root.id ?? root.userId)
  const managerName =
    asString(root.managerName) ?? asString(root.name) ?? asString(root.nickname)

  if (!id || !managerName) {
    return { data: null, error: 'Invalid user response' }
  }

  return {
    data: { id, managerName, banned: root.banned === true },
    error: null,
  }
}

const LINEUP_POSITIONS = {
  goalkeeper: { positionId: 1, lineupPosition: 'goalkeeper' },
  defender: { positionId: 2, lineupPosition: 'defender' },
  midfield: { positionId: 3, lineupPosition: 'midfielder' },
  midfielder: { positionId: 3, lineupPosition: 'midfielder' },
  striker: { positionId: 4, lineupPosition: 'forward' },
  forward: { positionId: 4, lineupPosition: 'forward' },
  coach: { positionId: 5, lineupPosition: 'coach' },
} as const

function getWeekPoints(
  playerMaster: JsonRecord,
  weekNumber: number
): number | null {
  const stats = unwrapArray(playerMaster.lastStats ?? playerMaster.playerStats)
  if (!stats) return null

  const week = stats.find(
    (entry) => isRecord(entry) && asNumber(entry.weekNumber) === weekNumber
  )
  return isRecord(week)
    ? asNumber(week.totalPoints ?? week.points ?? week.weekPoints)
    : null
}

export function parseLineup(
  value: unknown,
  weekNumber: number,
  teams?: TeamMasterLookup
): ContractResult<LineupSnapshot> {
  if (!isRecord(value)) return { data: null, error: 'Invalid lineup response' }

  const formation = isRecord(value.formation) ? value.formation : value
  const players: LineupPlayer[] = []

  for (const [key, metadata] of Object.entries(LINEUP_POSITIONS)) {
    const entries = formation[key]
    if (!Array.isArray(entries)) continue

    for (const entry of entries) {
      if (!isRecord(entry)) {
        return { data: null, error: 'Invalid lineup player' }
      }
      const master = isRecord(entry.playerMaster) ? entry.playerMaster : entry
      const normalizedMaster = {
        ...master,
        positionId: asNumber(master.positionId) ?? metadata.positionId,
        marketValue: asNumber(master.marketValue) ?? 0,
        points: asNumber(master.points) ?? 0,
        averagePoints: asNumber(master.averagePoints) ?? 0,
      }
      const weekPoints = getWeekPoints(master, weekNumber)
      const player = parsePlayerMaster(
        normalizedMaster,
        {
          ...(asString(entry.playerTeamId)
            ? { playerTeamId: asString(entry.playerTeamId) }
            : {}),
          lineupPosition: metadata.lineupPosition,
          ...(weekPoints !== null ? { weekPoints } : {}),
        },
        teams
      )

      if (!player) return { data: null, error: 'Invalid lineup player' }
      players.push(player as LineupPlayer)
    }
  }

  const formationName =
    asString(formation.tacticalFormation) ??
    asString(value.tacticalFormation) ??
    asString(value.formationName)

  return {
    data: {
      formationName,
      players,
      updatedAt: asString(value.updatedAt),
    },
    error: null,
  }
}

export function parseCalendar(
  value: unknown,
  teams: TeamMasterLookup
): ContractResult<CalendarMatch[]> {
  const entries = unwrapArray(value, ['elements', 'matches'])
  if (!entries) return { data: null, error: 'Invalid calendar response' }

  const matches: CalendarMatch[] = []
  for (const entry of entries) {
    if (!isRecord(entry)) return { data: null, error: 'Invalid match entry' }

    const id = asString(entry.id)
    const date = asString(entry.matchDate ?? entry.date)
    const embeddedLocal = isRecord(entry.local) ? entry.local : null
    const embeddedVisitor = isRecord(entry.visitor) ? entry.visitor : null
    const localId = asString(entry.localId ?? embeddedLocal?.id)
    const visitorId = asString(entry.visitorId ?? embeddedVisitor?.id)
    const localTeam = localId ? teams.get(localId) : null
    const visitorTeam = visitorId ? teams.get(visitorId) : null
    const matchState = asNumber(entry.matchState)

    if (!id || !date || !localId || !visitorId || matchState === null) {
      return { data: null, error: 'Invalid match entry' }
    }

    matches.push({
      id,
      date,
      local: {
        id: localId,
        name:
          asString(embeddedLocal?.name) ?? localTeam?.name ?? `Team ${localId}`,
        ...(localTeam?.shortName ? { shortName: localTeam.shortName } : {}),
      },
      visitor: {
        id: visitorId,
        name:
          asString(embeddedVisitor?.name) ??
          visitorTeam?.name ??
          `Team ${visitorId}`,
        ...(visitorTeam?.shortName ? { shortName: visitorTeam.shortName } : {}),
      },
      matchState,
      localScore: asNumber(entry.localScore),
      visitorScore: asNumber(entry.visitorScore),
    })
  }

  return { data: matches, error: null }
}

function parseStatPlayers(team: unknown): MatchStats['players'] {
  if (!isRecord(team) || !Array.isArray(team.players)) return []

  return team.players.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const id = asString(entry.id)
    const name = asString(entry.nickname) ?? asString(entry.name)
    const weekPoints = asNumber(entry.weekPoints ?? entry.points)
    return id && name && weekPoints !== null ? [{ id, name, weekPoints }] : []
  })
}

export function parseMatchStats(value: unknown): ContractResult<MatchStats[]> {
  const entries = unwrapArray(value, ['elements', 'matches'])
  if (!entries) return { data: null, error: 'Invalid match stats response' }

  const matches: MatchStats[] = []
  for (const entry of entries) {
    if (!isRecord(entry)) {
      return { data: null, error: 'Invalid match stats entry' }
    }
    const matchId = asString(entry.id ?? entry.matchId)
    if (!matchId) return { data: null, error: 'Invalid match stats entry' }

    matches.push({
      matchId,
      players: [
        ...parseStatPlayers(entry.local ?? entry.home),
        ...parseStatPlayers(entry.visitor ?? entry.away),
      ].sort((a, b) => b.weekPoints - a.weekPoints),
    })
  }

  return { data: matches, error: null }
}

export function buildRankingEvolution(
  weeklyRankings: Array<{ week: number; ranking: LeagueRanking[] }>
): RankingEvolution {
  const ordered = [...weeklyRankings].sort((a, b) => a.week - b.week)
  const teams = new Map<
    string,
    {
      id: string
      name: string
      weeklyPoints: Map<number, number>
      positions: number[]
      cumulativePoints: number[]
    }
  >()

  for (const { week, ranking } of ordered) {
    for (const entry of ranking) {
      const id = entry.team.id
      const existing = teams.get(id) ?? {
        id,
        name: entry.team.manager.managerName,
        weeklyPoints: new Map<number, number>(),
        positions: [],
        cumulativePoints: [],
      }
      existing.weeklyPoints.set(week, entry.points)
      teams.set(id, existing)
    }
  }

  const teamList = [...teams.values()]
  const running = new Map(teamList.map((team) => [team.id, 0]))
  for (const { week } of ordered) {
    for (const team of teamList) {
      const total =
        (running.get(team.id) ?? 0) + (team.weeklyPoints.get(week) ?? 0)
      running.set(team.id, total)
      team.cumulativePoints.push(total)
    }

    const ranked = [...teamList].sort(
      (a, b) =>
        (running.get(b.id) ?? 0) - (running.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name)
    )
    ranked.forEach((team, index) => {
      team.positions.push(index + 1)
    })
  }

  return {
    weeks: ordered.map(({ week }) => week),
    teams: teamList
      .map(({ weeklyPoints: _weeklyPoints, ...team }) => team)
      .sort(
        (a, b) =>
          (a.positions.at(-1) ?? Number.MAX_SAFE_INTEGER) -
          (b.positions.at(-1) ?? Number.MAX_SAFE_INTEGER)
      ),
  }
}

export function parsePlayerDetail(
  value: unknown,
  teams?: TeamMasterLookup
): ContractResult<PlayerDetail> {
  if (!isRecord(value)) {
    return { data: null, error: 'Invalid player detail response' }
  }

  const master = isRecord(value.playerMaster)
    ? value.playerMaster
    : isRecord(value.player)
      ? value.player
      : value
  const market = isRecord(value.marketPlayer)
    ? value.marketPlayer
    : isRecord(value.playerMarket)
      ? value.playerMarket
      : null
  const marketId = market ? asString(market.id) : null
  const salePrice = market ? asNumber(market.salePrice) : null
  const expirationDate = market ? asString(market.expirationDate) : null

  const player = parsePlayerMaster(
    {
      ...master,
      marketValue: asNumber(master.marketValue) ?? 0,
      points: asNumber(master.points) ?? 0,
      averagePoints: asNumber(master.averagePoints) ?? 0,
    },
    {
      ...(asString(value.playerTeamId)
        ? { playerTeamId: asString(value.playerTeamId) }
        : {}),
      ...(asNumber(value.buyoutClause) !== null
        ? { buyoutClause: asNumber(value.buyoutClause) }
        : {}),
      ...(asString(value.buyoutClauseLockedEndTime)
        ? {
            buyoutClauseLockedEndTime: asString(
              value.buyoutClauseLockedEndTime
            ),
          }
        : {}),
      ...(marketId && salePrice !== null && expirationDate
        ? {
            saleInfo: {
              marketId,
              salePrice,
              expirationDate,
              numberOfOffers: asNumber(market?.numberOfOffers) ?? 0,
            },
          }
        : {}),
    },
    teams
  )

  if (!player) return { data: null, error: 'Invalid player detail response' }

  const stats = unwrapArray(master.playerStats ?? master.lastStats) ?? []
  const weeklyStats: PlayerWeeklyStat[] = stats.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const weekNumber = asNumber(entry.weekNumber)
    const totalPoints = asNumber(entry.totalPoints ?? entry.points)
    return weekNumber !== null && totalPoints !== null
      ? [{ weekNumber, totalPoints }]
      : []
  })

  const seasonEntries = Array.isArray(value.seasons) ? value.seasons : []
  const seasons: PlayerSeasonSummary[] = seasonEntries.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const label =
      asString(entry.name) ?? asString(entry.season) ?? asString(entry.year)
    return label
      ? [{ label, points: asNumber(entry.points ?? entry.totalPoints) }]
      : []
  })

  return {
    data: {
      player,
      weeklyStats: weeklyStats.sort((a, b) => a.weekNumber - b.weekNumber),
      seasons,
    },
    error: null,
  }
}
