import {
  ApiResponse,
  League,
  Player,
  MarketPlayer,
  MarketValuePoint,
  TrendAnalysis,
  PlayerAnalysis,
  MarketHistoryEntry,
  MarketValueHistory,
  UserRegion,
  UserDivision,
  UserInfo,
  TeamMoney,
  TeamLineUp,
  PlayerPosition,
  PlayerMaster,
  TeamInfo,
  LeagueRankingTeam,
  LeagueRanking,
  Match,
  MarketEvolutionPlayer,
  MarketEvolution,
  UserLeague,
  TeamLineupByWeek,
} from '../types/api';

const API_BASE = 'https://api-fantasy.llt-services.com/api';
const BASE_URL = "https://api-fantasy.llt-services.com";

export const endpoints = {
  // User endpoints
  user: {
    info: `/v3/user/me`,
    leagues: `/v4/leagues`,
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
    lineupByWeek: (teamId: string, weekId: string) => `/v4/teams/${teamId}/lineup/week/${weekId}`,
    favouritePlayers: (teamId: string) => `/v4/teams/${teamId}/favourite-players`,
  },

  // League endpoints
  league: {
    info: (leagueId: string) => `/v4/leagues/${leagueId}`,
    team: (teamId: string, leagueId: string) => `/v3/leagues/${leagueId}/teams/${teamId}`,
    ranking: (leagueId: string) => `/v5/leagues/${leagueId}/ranking`,
    rankingByWeek: (leagueId: string, weekId: number) => `/v5/leagues/${leagueId}/ranking/${weekId}`,
    market: (leagueId: string) => `/v3/league/${leagueId}/market`,
    marketHistory: (leagueId: string) => `/v3/league/${leagueId}/market/history`,
  },

  // Market endpoints
  market: {
    makeBid: (leagueId: string, offerId: string) => `/v3/league/${leagueId}/market/${offerId}/bid`,
  },

  // Stats endpoints
  stats: {
    weekMatches: (weekId: string) => `/stats/v1/stats/week/${weekId}`,
    marketEvolution: {
      week: `/stats/v1/market/evolution/week`,
      month: `/stats/v1/market/evolution/month`,
      season: `/stats/v1/market/evolution/season`,
    },
  },
};


async function makeRequest<T>(url: string, cookie: string, options: {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
} = {}): Promise<ApiResponse<T>> {
  try {
    const apiUrl = new URL(url);
    const path = apiUrl.pathname + apiUrl.search;
    
    const response = await fetch(`/api/fantasy?path=${encodeURIComponent(path)}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cookie}`,
      },
      ...(options.body && { body: JSON.stringify(options.body) }),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getLeagues(cookie: string): Promise<ApiResponse<League[]>> {
  const url = `${API_BASE}${endpoints.user.leagues}?x-lang=es`;
  return makeRequest<League[]>(url, cookie);
}

export async function getMyPlayers(cookie: string, leagueId: string): Promise<ApiResponse<Player[]>> {
  const leaguesResponse = await getLeagues(cookie);
  if (!leaguesResponse.data || leaguesResponse.data.length === 0) {
    return { data: null, error: 'Could not get team ID' };
  }

  const league = leaguesResponse.data.find(l => l.id === leagueId);
  if (!league || !league.team?.id) {
    return { data: null, error: 'League not found or no team ID found' };
  }

  const teamId = league.team.id;

  const url = `${API_BASE}${endpoints.team.info(teamId.toString())}?x-lang=es`;
  const response = await makeRequest<{ players: any[] }>(url, cookie);

  if (!response.data || !response.data.players) {
    return { data: null, error: 'Could not get squad data' };
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
  }));

  return { data: squadPlayers, error: null };
}

export async function getMarketPlayers(cookie: string, leagueId: string): Promise<ApiResponse<MarketPlayer[]>> {
  const url = `${API_BASE}${endpoints.league.market(leagueId)}?x-lang=es`;
  return makeRequest<MarketPlayer[]>(url, cookie);
}

export async function getPlayerMarketValue(cookie: string, playerId: string): Promise<ApiResponse<MarketValuePoint[]>> {
  const url = `${API_BASE}${endpoints.player.marketValue(playerId)}?x-lang=es`;
  return makeRequest<MarketValuePoint[]>(url, cookie);
}

export async function getPlayerInfo(cookie: string, playerId: string): Promise<ApiResponse<any>> {
  const url = `${API_BASE}${endpoints.player.stats(playerId)}?x-lang=es`;
  return makeRequest<any>(url, cookie);
}

export async function placeBid(cookie: string, leagueId: string, offerId: string, bidAmount: number): Promise<ApiResponse<any>> {
  const url = `${API_BASE}${endpoints.market.makeBid(leagueId, offerId)}?x-lang=es`;
  return makeRequest<any>(url, cookie, {
    method: 'POST',
    body: { money: bidAmount }
  });
}

export function analyzeTrend(marketValueData: MarketValuePoint[] | null, days = 5): TrendAnalysis {
  if (!marketValueData || marketValueData.length === 0) {
    return {
      trend: 'unknown',
      change: 0,
      changePercent: 0,
      analysis: 'No market data available',
      dataPoints: 0,
    };
  }

  const sortedData = marketValueData
    .filter(item => item.marketValue > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, days);

  if (sortedData.length < 2) {
    return {
      trend: 'insufficient_data',
      change: 0,
      changePercent: 0,
      analysis: 'Not enough data points',
      dataPoints: sortedData.length,
    };
  }

  const latestValue = sortedData[0].marketValue;
  const oldestValue = sortedData[sortedData.length - 1].marketValue;
  const change = latestValue - oldestValue;
  const changePercent = parseFloat(((change / oldestValue) * 100).toFixed(2));

  let trend: TrendAnalysis['trend'] = 'stable';
  if (Math.abs(changePercent) < 2) {
    trend = 'stable';
  } else if (change > 0) {
    trend = 'rising';
  } else {
    trend = 'falling';
  }

  return {
    trend,
    change,
    changePercent,
    analysis: `${changePercent}% change in ${days} days`,
    latestValue,
    oldestValue,
    dataPoints: sortedData.length,
  };
}

export async function analyzePlayer(cookie: string, player: Player | MarketPlayer, isMyPlayer = false): Promise<PlayerAnalysis | null> {
  let playerId: string;
  let playerName: string;
  let currentValue: number;
  let position: string;
  let team: string;

  if (isMyPlayer) {
    const myPlayer = player as Player;
    playerId = myPlayer.id;
    playerName = myPlayer.nickname || myPlayer.name || `Player ${playerId}`;
    currentValue = myPlayer.marketValue || 0;
    position = `Position ${myPlayer.positionId}`;
    team = myPlayer.team?.name || 'Unknown';
  } else {
    const marketPlayer = player as MarketPlayer;
    playerId = marketPlayer.playerMaster?.id || marketPlayer.id;
    playerName = marketPlayer.playerMaster?.nickname || marketPlayer.playerMaster?.name || `Player ${playerId}`;
    currentValue = marketPlayer.playerMaster?.marketValue || marketPlayer.salePrice || 0;
    position = `Position ${marketPlayer.playerMaster?.positionId}`;
    team = marketPlayer.playerMaster?.team?.name || 'Unknown';
  }

  const marketValueResponse = await getPlayerMarketValue(cookie, playerId);
  const playerInfoResponse = await getPlayerInfo(cookie, playerId);

  if (!marketValueResponse.data && !playerInfoResponse.data && !isMyPlayer) {
    return null;
  }

  const trend5Days = analyzeTrend(marketValueResponse.data, 5);
  const trend10Days = analyzeTrend(marketValueResponse.data, 10);

  const marketValue = playerInfoResponse.data?.marketValue || currentValue;
  const formattedValue = typeof marketValue === 'number' ? 
    `${(marketValue / 1000000).toFixed(1)}M€` : String(marketValue);

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
  };

  // Calculate time-based data (without UI messages)
  if (isMyPlayer) {
    const myPlayer = player as Player;
    
    if (myPlayer.saleInfo) {
      const expirationDate = new Date(myPlayer.saleInfo.expirationDate);
      const now = new Date();
      const hoursUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      result.saleExpirationHours = hoursUntilExpiry;
      result.saleInfo = myPlayer.saleInfo;
    }

    if (myPlayer.buyoutClause) {
      result.buyoutClause = myPlayer.buyoutClause;

      if (myPlayer.buyoutClauseLockedEndTime) {
        const protectionEnd = new Date(myPlayer.buyoutClauseLockedEndTime);
        const now = new Date();
        const hoursUntilUnprotected = Math.ceil((protectionEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
        result.buyoutProtectionHours = hoursUntilUnprotected;
      }
    }
  }

  return result;
}

// New endpoint functions
export async function getUserInfo(cookie: string): Promise<ApiResponse<UserInfo>> {
  const url = `${BASE_URL}${endpoints.user.info}`;
  return makeRequest<UserInfo>(url, cookie);
}

export async function getUserLeagues(cookie: string): Promise<ApiResponse<UserLeague[]>> {
  const url = `${BASE_URL}${endpoints.user.leagues}`;
  return makeRequest<UserLeague[]>(url, cookie);
}

export async function getTeamMoney(cookie: string, teamId: string): Promise<ApiResponse<TeamMoney>> {
  const url = `${BASE_URL}${endpoints.team.money(teamId)}`;
  return makeRequest<TeamMoney>(url, cookie);
}

export async function getTeamLineup(cookie: string, teamId: string): Promise<ApiResponse<TeamLineUp>> {
  const url = `${BASE_URL}${endpoints.team.lineup(teamId)}`;
  return makeRequest<TeamLineUp>(url, cookie);
}

export async function getTeamLineupByWeek(cookie: string, teamId: string, weekId: string): Promise<ApiResponse<TeamLineupByWeek>> {
  const url = `${BASE_URL}${endpoints.team.lineupByWeek(teamId, weekId)}`;
  return makeRequest<TeamLineupByWeek>(url, cookie);
}

export async function getLeagueRanking(cookie: string, leagueId: string): Promise<ApiResponse<LeagueRanking[]>> {
  const url = `${BASE_URL}${endpoints.league.ranking(leagueId)}`;
  return makeRequest<LeagueRanking[]>(url, cookie);
}

export async function getLeagueMarketHistory(cookie: string, leagueId: string): Promise<ApiResponse<MarketHistoryEntry[]>> {
  const url = `${BASE_URL}${endpoints.league.marketHistory(leagueId)}`;
  return makeRequest<MarketHistoryEntry[]>(url, cookie);
}

export async function getMarketEvolutionWeek(cookie: string): Promise<ApiResponse<MarketEvolution>> {
  const url = `${BASE_URL}${endpoints.stats.marketEvolution.week}`;
  return makeRequest<MarketEvolution>(url, cookie);
}

export async function getMarketEvolutionMonth(cookie: string): Promise<ApiResponse<MarketEvolution>> {
  const url = `${BASE_URL}${endpoints.stats.marketEvolution.month}`;
  return makeRequest<MarketEvolution>(url, cookie);
}

export async function getMarketEvolutionSeason(cookie: string): Promise<ApiResponse<MarketEvolution>> {
  const url = `${BASE_URL}${endpoints.stats.marketEvolution.season}`;
  return makeRequest<MarketEvolution>(url, cookie);
}

export async function getWeekMatches(cookie: string, weekId: string): Promise<ApiResponse<Match[]>> {
  const url = `${BASE_URL}${endpoints.stats.weekMatches(weekId)}`;
  return makeRequest<Match[]>(url, cookie);
}

export async function makeBidOnOffer(
  cookie: string, 
  offerId: string, 
  leagueId: string, 
  amount: number
): Promise<ApiResponse<any>> {
  const url = `${BASE_URL}${endpoints.market.makeBid(leagueId, offerId)}`;
  return makeRequest<any>(url, cookie, {
    method: 'POST',
    body: { money: amount }
  });
}