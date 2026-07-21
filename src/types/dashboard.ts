import type { Player } from '../entities/player.ts'

export interface FantasyUserProfile {
  id: string
  managerName: string
  banned: boolean
}

export interface LineupPlayer extends Player {
  weekPoints?: number
  lineupPosition: 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'coach'
}

export interface LineupSnapshot {
  formationName: string | null
  players: LineupPlayer[]
  updatedAt: string | null
}

export interface CalendarTeam {
  id: string
  name: string
  shortName?: string
}

export interface CalendarMatch {
  id: string
  date: string
  local: CalendarTeam
  visitor: CalendarTeam
  matchState: number
  localScore: number | null
  visitorScore: number | null
}

export interface MatchStatPlayer {
  id: string
  name: string
  weekPoints: number
}

export interface MatchStats {
  matchId: string
  players: MatchStatPlayer[]
}

export interface RankingEvolutionTeam {
  id: string
  name: string
  positions: number[]
  cumulativePoints: number[]
}

export interface RankingEvolution {
  weeks: number[]
  teams: RankingEvolutionTeam[]
}

export interface PlayerWeeklyStat {
  weekNumber: number
  totalPoints: number
}

export interface PlayerSeasonSummary {
  label: string
  points: number | null
}

export interface PlayerDetail {
  player: Player
  weeklyStats: PlayerWeeklyStat[]
  seasons: PlayerSeasonSummary[]
}
