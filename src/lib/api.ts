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
