export const PLAYER_POSITIONS = {
  1: 'Goalkeeper',
  2: 'Defender',
  3: 'Midfielder',
  4: 'Forward',
  5: 'Coach',
}

export const POSITION_METADATA = {
  1: { label: 'GK', emoji: '🥅' },
  2: { label: 'DEF', emoji: '🛡️' },
  3: { label: 'MID', emoji: '⚙️' },
  4: { label: 'FWD', emoji: '⚡' },
  5: { label: 'CH', emoji: '👔' },
}

export interface Player {
  id: string
  name: string
  nickname?: string
  positionId: number
  playerStatus: string
  team: {
    id: string
    name: string
  }
  marketValue: number
  points: number
  averagePoints: number
  buyoutClause?: number
  buyoutClauseLockedEndTime?: string
  saleInfo?: {
    salePrice: number
    expirationDate: string
    numberOfOffers: number
  }
  analysis?: {
    trends: {
      last1Days: number
      last3Days: number
      last7Days: number
    }
    momentumScore: number
  }
  owner?: {
    id: string
    name: string
    teamName: string
  }
}

export function getPlayerDisplayName(player: Player): string {
  return player.nickname || player.name
}

export function getPlayerPositionName(player: Player): string {
  return (
    PLAYER_POSITIONS[player.positionId as keyof typeof PLAYER_POSITIONS] ||
    'Unknown'
  )
}

export function getPlayerPositionMetadata(player: Player) {
  return (
    POSITION_METADATA[player.positionId as keyof typeof POSITION_METADATA] || {
      label: '?',
      emoji: '❓',
    }
  )
}

export function getFormattedMarketValue(player: Player): string {
  return `${(player.marketValue / 1000000).toFixed(1)}M€`
}

export function getFormattedBuyoutClause(player: Player): string | null {
  return player.buyoutClause
    ? `${(player.buyoutClause / 1000000).toFixed(1)}M€`
    : null
}

export function getFormattedSalePrice(salePrice: number): string {
  return `${(salePrice / 1000000).toFixed(1)}M€`
}
