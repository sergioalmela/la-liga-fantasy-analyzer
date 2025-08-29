import { getPositionName } from '@/lib/player-utils'
import {
  ApiResponse,
  League,
  LeagueRanking,
  MarketEvolution,
  MarketHistoryEntry,
  MarketPlayer,
  MarketValuePoint,
  Match,
  Player,
  PlayerAnalysis,
  TeamLineUp,
  TeamLineupByWeek,
  TeamMoney,
  TrendAnalysis,
  UserInfo,
  UserLeague,
} from '@/types/api'

const API_BASE = 'https://api-fantasy.llt-services.com/api'
const BASE_URL = 'https://api-fantasy.llt-services.com'

export const endpoints = {
  // User endpoints
  user: {
    info: '/v3/user/me',
    leagues: '/v4/leagues',
  },

  // Player endpoints
  player: {
    stats: (playerId: string) => `/v3/player/${playerId}`,
    marketValue: (playerId: string) => `/v3/player/${playerId}/market-value`,
  },

  // Team endpoints
  team: {
    info: (teamId: string) => `/v3/teams/${teamId}`,
    money: (teamId: string) => `/v3/teams/${teamId}/money`,
    lineup: (teamId: string) => `/v3/teams/${teamId}/lineup`,
    lineupByWeek: (teamId: string, weekId: string) =>
      `/v4/teams/${teamId}/lineup/week/${weekId}`,
    favouritePlayers: (teamId: string) =>
      `/v4/teams/${teamId}/favourite-players`,
  },

  // League endpoints
  league: {
    info: (leagueId: string) => `/v4/leagues/${leagueId}`,
    team: (leagueId: string, teamId: string) =>
      `/v3/leagues/${leagueId}/teams/${teamId}`,
    ranking: (leagueId: string) => `/v5/leagues/${leagueId}/ranking`,
    rankingByWeek: (leagueId: string, weekId: number) =>
      `/v5/leagues/${leagueId}/ranking/${weekId}`,
    market: (leagueId: string) => `/v3/league/${leagueId}/market`,
    marketHistory: (leagueId: string) =>
      `/v3/league/${leagueId}/market/history`,
  },

  // Market endpoints
  market: {
    makeBid: (leagueId: string, offerId: string) =>
      `/v3/league/${leagueId}/market/${offerId}/bid`,
  },

  // Stats endpoints
  stats: {
    weekMatches: (weekId: string) => `/stats/v1/stats/week/${weekId}`,
    marketEvolution: {
      week: '/stats/v1/market/evolution/week',
      month: '/stats/v1/market/evolution/month',
      season: '/stats/v1/market/evolution/season',
    },
  },
}

async function makeRequest<T>(
  url: string,
  cookie: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
  } = {}
): Promise<ApiResponse<T>> {
  try {
    const apiUrl = new URL(url)
    const path = apiUrl.pathname + apiUrl.search

    const response = await fetch(
      `/api/fantasy?path=${encodeURIComponent(path)}`,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cookie}`,
        },
        ...(options.body && { body: JSON.stringify(options.body) }),
      }
    )

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function getLeagues(
  cookie: string
): Promise<ApiResponse<League[]>> {
  const url = `${API_BASE}${endpoints.user.leagues}?x-lang=es`
  return makeRequest<League[]>(url, cookie)
}

export async function getMyPlayers(
  cookie: string,
  leagueId: string
): Promise<ApiResponse<Player[]>> {
  const leaguesResponse = await getLeagues(cookie)
  if (!leaguesResponse.data || leaguesResponse.data.length === 0) {
    return { data: null, error: 'Could not get team ID' }
  }

  const league = leaguesResponse.data.find((l) => l.id === leagueId)
  if (!league || !league.team?.id) {
    return { data: null, error: 'League not found or no team ID found' }
  }

  const teamId = league.team.id

  const url = `${API_BASE}${endpoints.team.info(teamId.toString())}?x-lang=es`
  const response = await makeRequest<{ players: any[] }>(url, cookie)

  if (!response.data || !response.data.players) {
    return { data: null, error: 'Could not get squad data' }
  }

  const squadPlayers: Player[] = response.data.players.map((player: any) => ({
    id: player.playerMaster.id,
    nickname: player.playerMaster.nickname,
    name: player.playerMaster.name,
    positionId: player.playerMaster.positionId,
    team: player.playerMaster.team,
    marketValue: player.playerMaster.marketValue,
    playerStatus: player.playerMaster.playerStatus,
    points: player.playerMaster.points,
    averagePoints: player.playerMaster.averagePoints,
    buyoutClause: player.buyoutClause,
    buyoutClauseLockedEndTime: player.buyoutClauseLockedEndTime,
    saleInfo: player.playerMarket,
  }))

  return { data: squadPlayers, error: null }
}

export async function getMarketPlayers(
  cookie: string,
  leagueId: string
): Promise<ApiResponse<MarketPlayer[]>> {
  const url = `${API_BASE}${endpoints.league.market(leagueId)}?x-lang=es`
  return makeRequest<MarketPlayer[]>(url, cookie)
}

export async function getPlayerMarketValue(
  cookie: string,
  playerId: string
): Promise<ApiResponse<MarketValuePoint[]>> {
  const url = `${API_BASE}${endpoints.player.marketValue(playerId)}?x-lang=es`
  return makeRequest<MarketValuePoint[]>(url, cookie)
}

export async function getPlayerInfo(
  cookie: string,
  playerId: string
): Promise<ApiResponse<any>> {
  const url = `${API_BASE}${endpoints.player.stats(playerId)}?x-lang=es`
  return makeRequest<any>(url, cookie)
}

export async function placeBid(
  cookie: string,
  leagueId: string,
  offerId: string,
  bidAmount: number
): Promise<ApiResponse<any>> {
  const url = `${API_BASE}${endpoints.market.makeBid(leagueId, offerId)}?x-lang=es`
  return makeRequest<any>(url, cookie, {
    method: 'POST',
    body: { money: bidAmount },
  })
}

export function analyzeTrend(
  marketValueData: MarketValuePoint[] | null,
  days = 5
): TrendAnalysis {
  if (!marketValueData || marketValueData.length === 0) {
    return {
      trend: 'unknown',
      change: 0,
      changePercent: 0,
      analysis: 'No market data available',
      dataPoints: 0,
    }
  }

  const sortedData = marketValueData
    .filter((item) => item.marketValue > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, days)

  if (sortedData.length < 2) {
    return {
      trend: 'insufficient_data',
      change: 0,
      changePercent: 0,
      analysis: 'Not enough data points',
      dataPoints: sortedData.length,
    }
  }

  const latestValue = sortedData[0].marketValue
  const oldestValue = sortedData[sortedData.length - 1].marketValue
  const change = latestValue - oldestValue
  const changePercent = Number.parseFloat(
    ((change / oldestValue) * 100).toFixed(2)
  )

  let trend: TrendAnalysis['trend'] = 'stable'
  if (Math.abs(changePercent) < 2) {
    trend = 'stable'
  } else if (change > 0) {
    trend = 'rising'
  } else {
    trend = 'falling'
  }

  return {
    trend,
    change,
    changePercent,
    analysis: `${changePercent}% change in ${days} days`,
    latestValue,
    oldestValue,
    dataPoints: sortedData.length,
  }
}

export async function analyzePlayer(
  cookie: string,
  player: Player | MarketPlayer,
  isMyPlayer = false
): Promise<PlayerAnalysis | null> {
  let playerId: string
  let playerName: string
  let currentValue: number
  let position: string
  let team: string

  if (isMyPlayer) {
    const myPlayer = player as Player
    playerId = myPlayer.id
    playerName = myPlayer.nickname || myPlayer.name || `Player ${playerId}`
    currentValue = myPlayer.marketValue || 0
    position = getPositionName(myPlayer.positionId)
    team = myPlayer.team?.name || 'Unknown'
  } else {
    const marketPlayer = player as MarketPlayer
    playerId = marketPlayer.playerMaster?.id || marketPlayer.id
    playerName =
      marketPlayer.playerMaster?.nickname ||
      marketPlayer.playerMaster?.name ||
      `Player ${playerId}`
    currentValue =
      marketPlayer.playerMaster?.marketValue || marketPlayer.salePrice || 0
    position = getPositionName(marketPlayer.playerMaster?.positionId || 0)
    team = marketPlayer.playerMaster?.team?.name || 'Unknown'
  }

  const marketValueResponse = await getPlayerMarketValue(cookie, playerId)
  const playerInfoResponse = await getPlayerInfo(cookie, playerId)

  if (!marketValueResponse.data && !playerInfoResponse.data && !isMyPlayer) {
    return null
  }

  const trend5Days = analyzeTrend(marketValueResponse.data, 5)
  const trend10Days = analyzeTrend(marketValueResponse.data, 10)

  const marketValue = playerInfoResponse.data?.marketValue || currentValue
  const formattedValue =
    typeof marketValue === 'number'
      ? `${(marketValue / 1000000).toFixed(1)}M€`
      : String(marketValue)

  const result: PlayerAnalysis = {
    id: playerId,
    name: playerName,
    isMyPlayer,
    currentValue: marketValue,
    currentValueFormatted: formattedValue,
    position,
    team,
    trends: {
      last5Days: trend5Days,
      last10Days: trend10Days,
    },
    alerts: [],
    saleExpirationHours: null,
    buyoutProtectionHours: null,
  }

  // Generate alerts based on trends and conditions
  const alerts: string[] = []

  // Price trend alerts
  if (trend5Days.changePercent < -15) {
    alerts.push(`🚨 Steep decline: ${trend5Days.changePercent}% in 5 days`)
  } else if (trend5Days.changePercent < -8) {
    alerts.push(`⚠️ Declining: ${trend5Days.changePercent}% in 5 days`)
  }

  if (trend10Days.changePercent < -25) {
    alerts.push(`🚨 Major value loss: ${trend10Days.changePercent}% in 10 days`)
  }

  if (trend5Days.changePercent > 15) {
    alerts.push(`🚀 Hot streak: +${trend5Days.changePercent}% in 5 days`)
  } else if (trend5Days.changePercent > 8) {
    alerts.push(`📈 Rising fast: +${trend5Days.changePercent}% in 5 days`)
  }

  // Volatility alert
  const volatility = Math.abs(
    trend5Days.changePercent - trend10Days.changePercent
  )
  if (volatility > 20) {
    alerts.push(
      `⚡ High volatility: Trend changed ${volatility.toFixed(1)}% between periods`
    )
  }

  result.alerts = alerts

  // Calculate time-based data (without UI messages)
  if (isMyPlayer) {
    const myPlayer = player as Player

    if (myPlayer.saleInfo) {
      const expirationDate = new Date(myPlayer.saleInfo.expirationDate)
      const now = new Date()
      const hoursUntilExpiry = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      )

      result.saleExpirationHours = hoursUntilExpiry
      result.saleInfo = myPlayer.saleInfo
    }

    if (myPlayer.buyoutClause) {
      result.buyoutClause = myPlayer.buyoutClause

      if (myPlayer.buyoutClauseLockedEndTime) {
        const protectionEnd = new Date(myPlayer.buyoutClauseLockedEndTime)
        const now = new Date()
        const hoursUntilUnprotected = Math.ceil(
          (protectionEnd.getTime() - now.getTime()) / (1000 * 60 * 60)
        )
        result.buyoutProtectionHours = hoursUntilUnprotected

        // Add protection alerts
        if (hoursUntilUnprotected <= 0) {
          alerts.push(
            '🔓 Buyout protection expired! Player vulnerable to buyout'
          )
        } else if (hoursUntilUnprotected <= 24) {
          alerts.push(
            `⏰ Buyout protection expires in ${Math.ceil(hoursUntilUnprotected)}h`
          )
        } else if (hoursUntilUnprotected <= 72) {
          alerts.push(
            `⚠️ Buyout protection expires in ${Math.ceil(hoursUntilUnprotected / 24)}d`
          )
        }
      } else {
        alerts.push('🔓 No buyout protection! Player vulnerable to buyout')
      }

      // Alert if buyout is too low compared to current value
      const buyoutRatio = myPlayer.buyoutClause / result.currentValue
      if (buyoutRatio < 0.8) {
        alerts.push(
          `💰 Buyout clause (${(myPlayer.buyoutClause / 1000000).toFixed(1)}M€) below market value - consider increasing`
        )
      }
    }

    // Sale status alerts
    if (myPlayer.saleInfo && result.saleExpirationHours !== null) {
      if (result.saleExpirationHours <= 0) {
        alerts.push('⏰ Sale expired - remove from market or renew')
      } else if (result.saleExpirationHours <= 24) {
        alerts.push(
          `🕐 Sale expires in ${Math.ceil(result.saleExpirationHours)}h`
        )
      }

      // Alert if selling a rising player
      if (trend5Days.changePercent > 5) {
        alerts.push(
          `📈 Selling rising player (+${trend5Days.changePercent}%) - consider removing from market`
        )
      }
    }

    // Update the result with accumulated alerts
    result.alerts = alerts
  } else {
    // Note: Buyout clause information is not available for other managers' players
    // This is private information that only the player owner can see

    // Update alerts for non-my-players (market players, other managers)
    result.alerts = alerts
  }

  // Calculate different scores based on player type
  if (result.isMyPlayer) {
    // Portfolio management score for my players
    ;(result as any).portfolioScore = calculatePortfolioScore(result)
  } else if (!result.isMyPlayer && result.buyoutClause) {
    // Buyout opportunity score for other managers' players (has buyout clause)
    const score = calculateWorthItScore(result)
    console.log(`Calculated buyout score for ${result.name}: ${score}`)
    ;(result as any).worthItScore = score
  } else if (!result.isMyPlayer) {
    // Market value score for market players (no buyout clause)
    ;(result as any).marketScore = calculateMarketScore(result)
  }

  return result
}

function calculateWorthItScore(analysis: PlayerAnalysis): number {
  if (!analysis.buyoutClause) return 0

  let score = 0

  // 1. Value vs Buyout ratio (50% of score) - Most important factor
  const buyoutToValueRatio = analysis.buyoutClause / analysis.currentValue
  if (buyoutToValueRatio < 0.8)
    score += 50 // Excellent deal (buyout < 80% of value)
  else if (buyoutToValueRatio < 1.0)
    score += 40 // Great deal (buyout < value)
  else if (buyoutToValueRatio < 1.2)
    score += 25 // Good deal (buyout slightly above value)
  else if (buyoutToValueRatio < 1.5) score += 10 // Fair deal
  // Above 1.5 ratio gets 0 points (overpriced)

  // 2. Trend analysis (25% of score) - Rising players are much better
  const trend5d = analysis.trends.last5Days.changePercent
  const trend10d = analysis.trends.last10Days.changePercent

  if (trend5d > 10 || trend10d > 20)
    score += 25 // Strong rising trend
  else if (trend5d > 5 || trend10d > 10)
    score += 20 // Good rising trend
  else if (trend5d > 0 || trend10d > 5)
    score += 15 // Moderate rising trend
  else if (trend5d > -5 && trend10d > -10)
    score += 10 // Stable/slight decline
  else if (trend5d > -10 && trend10d > -20) score += 5 // Declining
  // Worse trends get 0 points

  // 3. Protection status (20% of score) - Availability for purchase
  if (analysis.buyoutProtectionHours !== null) {
    if (analysis.buyoutProtectionHours <= 0)
      score += 20 // Available now
    else if (analysis.buyoutProtectionHours <= 24)
      score += 18 // Available within 1 day
    else if (analysis.buyoutProtectionHours <= 72)
      score += 15 // Available within 3 days
    else if (analysis.buyoutProtectionHours <= 168)
      score += 12 // Available within 1 week
    else score += 5 // Available later
  } else {
    score += 20 // Assume available
  }

  // 4. Player value tier (5% of score) - Slight preference for higher value players
  if (analysis.currentValue > 50000000)
    score += 5 // Elite tier
  else if (analysis.currentValue > 20000000)
    score += 4 // High tier
  else if (analysis.currentValue > 10000000)
    score += 3 // Mid tier
  else if (analysis.currentValue > 5000000)
    score += 2 // Decent tier
  else score += 1 // Budget tier

  // Debug logging
  console.log(
    `Score for ${analysis.name}: ${score}/100 (Ratio: ${buyoutToValueRatio.toFixed(2)}, Trend5d: ${trend5d}%, Protection: ${analysis.buyoutProtectionHours}h)`
  )

  return Math.round(score)
}

function calculatePortfolioScore(analysis: PlayerAnalysis): number {
  let score = 0

  // 1. Trend analysis (40% of score) - Most important for portfolio decisions
  const trend5d = analysis.trends.last5Days.changePercent
  const trend10d = analysis.trends.last10Days.changePercent

  if (trend5d > 15 || trend10d > 25)
    score += 40 // Excellent growth
  else if (trend5d > 8 || trend10d > 15)
    score += 35 // Strong growth
  else if (trend5d > 3 || trend10d > 8)
    score += 30 // Good growth
  else if (trend5d > -2 && trend10d > -5)
    score += 25 // Stable
  else if (trend5d > -8 && trend10d > -15)
    score += 15 // Declining - consider selling
  else score += 5 // Poor performance - sell candidate

  // 2. Protection status (30% of score) - Important for timing decisions
  if (analysis.buyoutProtectionHours !== null) {
    if (analysis.buyoutProtectionHours > 168)
      score += 30 // Well protected
    else if (analysis.buyoutProtectionHours > 72)
      score += 25 // Protected
    else if (analysis.buyoutProtectionHours > 24)
      score += 15 // Expiring soon - increase buyout?
    else score += 5 // Vulnerable - increase buyout urgently
  } else {
    score += 20 // Unknown protection status
  }

  // 3. Current sale status (20% of score)
  if (analysis.saleInfo) {
    if (analysis.saleExpirationHours && analysis.saleExpirationHours > 0) {
      // On sale - good if declining, bad if rising
      if (trend5d < -5)
        score += 20 // Good to sell declining player
      else score += 5 // Maybe shouldn't be selling rising player
    }
  } else {
    score += 15 // Not on sale - neutral
  }

  // 4. Player value tier (10% of score)
  if (analysis.currentValue > 50000000)
    score += 10 // Elite - monitor closely
  else if (analysis.currentValue > 20000000)
    score += 8 // High value
  else if (analysis.currentValue > 10000000)
    score += 6 // Mid value
  else if (analysis.currentValue > 5000000)
    score += 4 // Decent value
  else score += 2 // Budget player

  return Math.round(score)
}

function calculateMarketScore(analysis: PlayerAnalysis): number {
  let score = 0

  // 1. Trend analysis (50% of score) - Future potential is key for purchases
  const trend5d = analysis.trends.last5Days.changePercent
  const trend10d = analysis.trends.last10Days.changePercent

  if (trend5d > 10 || trend10d > 20)
    score += 50 // Strong upward trend
  else if (trend5d > 5 || trend10d > 10)
    score += 40 // Good upward trend
  else if (trend5d > 0 || trend10d > 5)
    score += 30 // Moderate growth
  else if (trend5d > -5 && trend10d > -10)
    score += 20 // Stable/slight decline
  else if (trend5d > -10 && trend10d > -20)
    score += 10 // Declining - risky
  else score += 0 // Poor trend - avoid

  // 2. Value assessment (30% of score) - Based on absolute value for budget planning
  if (analysis.currentValue > 50000000)
    score += 15 // Premium tier - high risk/reward
  else if (analysis.currentValue > 20000000)
    score += 25 // High tier - good investment
  else if (analysis.currentValue > 10000000)
    score += 30 // Mid tier - sweet spot
  else if (analysis.currentValue > 5000000)
    score += 25 // Budget tier - good value
  else score += 20 // Very budget - limited upside

  // 3. Recent performance stability (20% of score)
  const trendStability = Math.abs(trend5d - trend10d)
  if (trendStability < 5)
    score += 20 // Consistent trend
  else if (trendStability < 10)
    score += 15 // Fairly consistent
  else if (trendStability < 20)
    score += 10 // Somewhat volatile
  else score += 5 // Very volatile - unpredictable

  return Math.round(score)
}

// New endpoint functions
export async function getUserInfo(
  cookie: string
): Promise<ApiResponse<UserInfo>> {
  const url = `${BASE_URL}${endpoints.user.info}`
  return makeRequest<UserInfo>(url, cookie)
}

export async function getUserLeagues(
  cookie: string
): Promise<ApiResponse<UserLeague[]>> {
  const url = `${BASE_URL}${endpoints.user.leagues}`
  return makeRequest<UserLeague[]>(url, cookie)
}

export async function getTeamMoney(
  cookie: string,
  teamId: string
): Promise<ApiResponse<TeamMoney>> {
  const url = `${BASE_URL}${endpoints.team.money(teamId)}`
  return makeRequest<TeamMoney>(url, cookie)
}

export async function getTeamLineup(
  cookie: string,
  teamId: string
): Promise<ApiResponse<TeamLineUp>> {
  const url = `${BASE_URL}${endpoints.team.lineup(teamId)}`
  return makeRequest<TeamLineUp>(url, cookie)
}

export async function getTeamLineupByWeek(
  cookie: string,
  teamId: string,
  weekId: string
): Promise<ApiResponse<TeamLineupByWeek>> {
  const url = `${BASE_URL}${endpoints.team.lineupByWeek(teamId, weekId)}`
  return makeRequest<TeamLineupByWeek>(url, cookie)
}

export async function getLeagueRanking(
  cookie: string,
  leagueId: string
): Promise<ApiResponse<LeagueRanking[]>> {
  const url = `${BASE_URL}${endpoints.league.ranking(leagueId)}`
  return makeRequest<LeagueRanking[]>(url, cookie)
}

export async function getLeagueTeam(
  cookie: string,
  leagueId: string,
  teamId: string
): Promise<ApiResponse<any>> {
  const url = `${BASE_URL}${endpoints.league.team(teamId, leagueId)}`
  return makeRequest<any>(url, cookie)
}

export async function getLeagueMarketHistory(
  cookie: string,
  leagueId: string
): Promise<ApiResponse<MarketHistoryEntry[]>> {
  const url = `${BASE_URL}${endpoints.league.marketHistory(leagueId)}`
  return makeRequest<MarketHistoryEntry[]>(url, cookie)
}

export async function getMarketEvolutionWeek(
  cookie: string
): Promise<ApiResponse<MarketEvolution>> {
  const url = `${BASE_URL}${endpoints.stats.marketEvolution.week}`
  return makeRequest<MarketEvolution>(url, cookie)
}

export async function getMarketEvolutionMonth(
  cookie: string
): Promise<ApiResponse<MarketEvolution>> {
  const url = `${BASE_URL}${endpoints.stats.marketEvolution.month}`
  return makeRequest<MarketEvolution>(url, cookie)
}

export async function getMarketEvolutionSeason(
  cookie: string
): Promise<ApiResponse<MarketEvolution>> {
  const url = `${BASE_URL}${endpoints.stats.marketEvolution.season}`
  return makeRequest<MarketEvolution>(url, cookie)
}

export async function getWeekMatches(
  cookie: string,
  weekId: string
): Promise<ApiResponse<Match[]>> {
  const url = `${BASE_URL}${endpoints.stats.weekMatches(weekId)}`
  return makeRequest<Match[]>(url, cookie)
}

export async function makeBidOnOffer(
  cookie: string,
  offerId: string,
  leagueId: string,
  amount: number
): Promise<ApiResponse<any>> {
  const url = `${BASE_URL}${endpoints.market.makeBid(leagueId, offerId)}`
  return makeRequest<any>(url, cookie, {
    method: 'POST',
    body: { money: amount },
  })
}
