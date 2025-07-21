const API_BASE = 'https://api-fantasy.llt-services.com/api';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface League {
  id: string;
  access: string;
  type: {
    id: string;
    canBeDuplicated: boolean;
    assets: {
      logo_list_item: string;
      logo_white: string;
    };
    sponsor: {
      id: number;
      name: string;
    };
    prizeInformation: {
      title: string;
      description: string;
    };
  };
  managersNumber: number;
  name: string;
  config: {
    features: {
      buyoutClause: boolean;
    };
    premiumFeatures: {
      formations: boolean;
      captain: boolean;
      bench: boolean;
      loan: boolean;
      ideal: boolean;
      coach: boolean;
    };
    premiumConfigurations: {
      loan: {
        duration: number;
        maxLoans: number;
        enableConclude: boolean;
        minPercentage: number;
      };
      ideal: {
        reward: number;
      };
    };
  };
  isDuplicated: boolean;
  isSecondRound: boolean;
  token: string;
  description: string;
  premium: boolean;
  team: {
    id: number;
    money: number;
    teamPoints: number;
    playersNumber: number;
    teamValue: number;
    canPunctuate: boolean;
    position: number | null;
    isAdmin: boolean;
  };
}

export interface Player {
  id: string;
  nickname?: string;
  name: string;
  positionId: number;
  team: {
    id: string;
    name: string;
  };
  marketValue: number;
  playerStatus: string;
  points: number;
  averagePoints: number;
  buyoutClause?: number;
  buyoutClauseLockedEndTime?: string;
  saleInfo?: {
    salePrice: number;
    expirationDate: string;
    numberOfOffers: number;
  };
}

export interface MarketPlayer {
  id: string;
  playerMaster: {
    id: string;
    nickname?: string;
    name: string;
    positionId: number;
    team: {
      id: string;
      name: string;
    };
    marketValue: number;
    playerStatus: string;
    points: number;
    averagePoints: number;
  };
  salePrice: number;
  expirationDate: string;
  numberOfBids: number;
}

export interface MarketValuePoint {
  date: string;
  marketValue: number;
}

export interface TrendAnalysis {
  trend: 'rising' | 'falling' | 'stable' | 'insufficient_data' | 'unknown';
  change: number;
  changePercent: number;
  analysis: string;
  latestValue?: number;
  oldestValue?: number;
  dataPoints: number;
}

export interface PlayerAnalysis {
  id: string;
  name: string;
  isMyPlayer: boolean;
  currentValue: number;
  currentValueFormatted: string;
  position: string;
  team: string;
  trends: {
    last5Days: TrendAnalysis;
    last10Days: TrendAnalysis;
  };
  alerts: string[];
  saleExpirationHours: number | null;
  buyoutProtectionHours: number | null;
  buyoutClause?: number;
  saleInfo?: {
    salePrice: number;
    expirationDate: string;
    numberOfOffers: number;
  };
}

async function makeRequest<T>(url: string, cookie: string): Promise<ApiResponse<T>> {
  try {
    const apiUrl = new URL(url);
    const path = apiUrl.pathname + apiUrl.search;
    
    const response = await fetch(`/api/fantasy?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cookie}`,
      },
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
  const url = `${API_BASE}/v4/leagues?x-lang=es`;
  return makeRequest<League[]>(url, cookie);
}

export async function getMyPlayers(cookie: string, leagueId: string): Promise<ApiResponse<Player[]>> {
  const leaguesResponse = await getLeagues(cookie);
  if (!leaguesResponse.data || leaguesResponse.data.length === 0) {
    return { data: null, error: 'Could not get team ID' };
  }

  const teamId = leaguesResponse.data[0].team?.id;
  if (!teamId) {
    return { data: null, error: 'No team ID found' };
  }

  const url = `${API_BASE}/v3/teams/${teamId}?x-lang=es`;
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
  const url = `${API_BASE}/v3/league/${leagueId}/market?x-lang=es`;
  return makeRequest<MarketPlayer[]>(url, cookie);
}

export async function getPlayerMarketValue(cookie: string, playerId: string): Promise<ApiResponse<MarketValuePoint[]>> {
  const url = `${API_BASE}/v3/player/${playerId}/market-value?x-lang=es`;
  return makeRequest<MarketValuePoint[]>(url, cookie);
}

export async function getPlayerInfo(cookie: string, playerId: string): Promise<ApiResponse<any>> {
  const url = `${API_BASE}/v3/player/${playerId}?x-lang=es`;
  return makeRequest<any>(url, cookie);
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
  let analysis = '';

  if (Math.abs(changePercent) < 2) {
    trend = 'stable';
    analysis = `Stable price (${changePercent}% change)`;
  } else if (change > 0) {
    trend = 'rising';
    analysis = `📈 Rising +${changePercent}% (${(change / 1000000).toFixed(1)}M€) in ${days} days`;
  } else {
    trend = 'falling';
    analysis = `📉 Falling ${changePercent}% (${(change / 1000000).toFixed(1)}M€) in ${days} days`;
  }

  return {
    trend,
    change,
    changePercent,
    analysis,
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

  // Generate alerts
  if (trend5Days.trend === 'falling' && Math.abs(trend5Days.changePercent) > 5) {
    result.alerts.push(`⚠️ Significant drop in 5 days: ${trend5Days.changePercent}%`);
  }
  if (trend5Days.trend === 'rising' && trend5Days.changePercent > 10) {
    result.alerts.push(`🚀 Strong growth in 5 days: +${trend5Days.changePercent}%`);
  }
  if (trend10Days.trend === 'falling' && Math.abs(trend10Days.changePercent) > 10) {
    result.alerts.push(`📉 Major decline in 10 days: ${trend10Days.changePercent}%`);
  }

  // Handle sale information and buyout clauses for my players
  if (isMyPlayer) {
    const myPlayer = player as Player;
    
    if (myPlayer.saleInfo) {
      const expirationDate = new Date(myPlayer.saleInfo.expirationDate);
      const now = new Date();
      const hoursUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      result.saleExpirationHours = hoursUntilExpiry;
      result.saleInfo = myPlayer.saleInfo;
      
      if (hoursUntilExpiry <= 48 && hoursUntilExpiry > 0) {
        result.alerts.push(`⏰ Sale expires in ${hoursUntilExpiry}h`);
      } else if (hoursUntilExpiry <= 168 && hoursUntilExpiry > 0) {
        const days = Math.ceil(hoursUntilExpiry / 24);
        result.alerts.push(`⏰ Sale expires in ${days} days`);
      }
      
      result.alerts.push(`💰 Your player is on sale for ${(myPlayer.saleInfo.salePrice / 1000000).toFixed(1)}M€`);
    }

    if (myPlayer.buyoutClause) {
      result.buyoutClause = myPlayer.buyoutClause;
      
      if (myPlayer.buyoutClause < currentValue * 1.5) {
        const buyoutValue = (myPlayer.buyoutClause / 1000000).toFixed(1);
        result.alerts.push(`⚠️ Low buyout clause: ${buyoutValue}M€`);
      }

      if (myPlayer.buyoutClauseLockedEndTime) {
        const protectionEnd = new Date(myPlayer.buyoutClauseLockedEndTime);
        const now = new Date();
        const hoursUntilUnprotected = Math.ceil((protectionEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        result.buyoutProtectionHours = hoursUntilUnprotected;
        
        if (hoursUntilUnprotected <= 0) {
          result.alerts.push(`🚨 Buyout clause protection has EXPIRED - player can be bought out!`);
        } else if (hoursUntilUnprotected <= 48) {
          result.alerts.push(`🔓 Buyout clause protection expires in ${hoursUntilUnprotected}h`);
        } else if (hoursUntilUnprotected <= 168) {
          const days = Math.ceil(hoursUntilUnprotected / 24);
          result.alerts.push(`🔓 Buyout clause protection expires in ${days} days`);
        }
      }
    }
  }

  return result;
}