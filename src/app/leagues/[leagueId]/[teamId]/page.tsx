'use client'

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import { seasonService } from '@/services/season-service'
import type { CurrentWeek, LeagueRanking } from '@/types/api'
import type {
  CalendarMatch,
  LineupSnapshot,
  MatchStats,
  RankingEvolution,
} from '@/types/dashboard'

const POSITION_LABELS = {
  goalkeeper: 'Goalkeepers',
  defender: 'Defenders',
  midfielder: 'Midfielders',
  forward: 'Forwards',
  coach: 'Coaches',
} as const

function formatMatchDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}

function getMatchStatus(match: CalendarMatch): string {
  if (match.matchState >= 7) return 'Finished'
  if (match.matchState === 2 || match.matchState === 4) return 'Live'
  return 'Scheduled'
}

export default function MatchdayDashboardPage() {
  const params = useParams()
  const leagueId = params.leagueId as string
  const teamId = params.teamId as string
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [lineup, setLineup] = useState<LineupSnapshot | null>(null)
  const [matches, setMatches] = useState<CalendarMatch[]>([])
  const [matchStats, setMatchStats] = useState<MatchStats[]>([])
  const [ranking, setRanking] = useState<LeagueRanking[]>([])
  const [evolution, setEvolution] = useState<RankingEvolution | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const loadCurrentWeek = async () => {
      const result = await seasonService.getCurrentWeek()
      if (result.data) {
        setCurrentWeek(result.data)
        setSelectedWeek(result.data.weekNumber)
        const evolutionResult = await seasonService.getRankingEvolution(
          leagueId,
          result.data.weekNumber
        )
        if (evolutionResult.data) setEvolution(evolutionResult.data)
      } else {
        setErrors([result.error || 'Failed to load the current matchday'])
        setLoading(false)
      }
    }

    void loadCurrentWeek()
  }, [leagueId])

  const loadWeek = useCallback(async () => {
    if (selectedWeek === null) return

    setRefreshing(true)
    const [lineupResult, calendarResult, statsResult, rankingResult] =
      await Promise.all([
        seasonService.getLineup(teamId, selectedWeek),
        seasonService.getCalendar(selectedWeek),
        seasonService.getMatchStats(selectedWeek),
        seasonService.getRanking(leagueId, selectedWeek),
      ])

    setLineup(lineupResult.data)
    setMatches(calendarResult.data || [])
    setMatchStats(statsResult.data || [])
    setRanking(rankingResult.data || [])
    setErrors(
      [
        lineupResult.error,
        calendarResult.error,
        statsResult.error,
        rankingResult.error,
      ].filter((message): message is string => Boolean(message))
    )
    setLoading(false)
    setRefreshing(false)
  }, [leagueId, selectedWeek, teamId])

  useEffect(() => {
    void loadWeek()
  }, [loadWeek])

  const statsByMatch = useMemo(
    () => new Map(matchStats.map((stats) => [stats.matchId, stats.players])),
    [matchStats]
  )
  const lineupGroups = useMemo(() => {
    return Object.entries(POSITION_LABELS).map(([position, label]) => ({
      position,
      label,
      players:
        lineup?.players.filter(
          (player) => player.lineupPosition === position
        ) || [],
    }))
  }, [lineup])
  const starterCount =
    lineup?.players.filter((player) => player.lineupPosition !== 'coach')
      .length || 0

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Matchday dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Lineup, fixtures, standings and weekly progress in one place.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void loadWeek()}
              disabled={refreshing || selectedWeek === null}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>

          {currentWeek && selectedWeek !== null && (
            <Card className="mb-6">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current matchday</p>
                  <p className="text-xl font-bold text-gray-900">
                    Week {currentWeek.weekNumber}
                    {currentWeek.isLive ? ' · Live' : ''}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" /> Closes{' '}
                    {formatMatchDate(currentWeek.closingWeekDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Previous week"
                    disabled={selectedWeek <= 1}
                    onClick={() =>
                      setSelectedWeek((week) => Math.max(1, (week || 1) - 1))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <label className="text-sm font-medium text-gray-700">
                    Week
                    <select
                      className="ml-2 rounded border border-gray-300 bg-white px-3 py-2"
                      value={selectedWeek}
                      onChange={(event) =>
                        setSelectedWeek(Number(event.target.value))
                      }
                    >
                      {Array.from({ length: 38 }, (_, index) => index + 1).map(
                        (week) => (
                          <option key={week} value={week}>
                            {week}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Next week"
                    disabled={selectedWeek >= 38}
                    onClick={() =>
                      setSelectedWeek((week) => Math.min(38, (week || 1) + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && <BouncingBallLoader message="Loading matchday..." />}

          {!loading && errors.length > 0 && (
            <div className="mb-6 rounded border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Some sections are not available yet: {errors.join(' · ')}
            </div>
          )}

          {!loading && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-blue-600" />
                      Your lineup · {starterCount}/11 starters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lineup ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Formation: {lineup.formationName || 'Not specified'}
                        </p>
                        {starterCount < 11 && (
                          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                            Your lineup appears incomplete for this week.
                          </p>
                        )}
                        {lineupGroups
                          .filter((group) => group.players.length > 0)
                          .map((group) => (
                            <div key={group.position}>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {group.label}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {group.players.map((player) => (
                                  <Link
                                    key={player.id}
                                    href={`/leagues/${leagueId}/players/${player.id}`}
                                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-800 hover:border-blue-300 hover:text-blue-700"
                                  >
                                    {player.nickname || player.name}
                                    {player.weekPoints !== undefined
                                      ? ` · ${player.weekPoints} pts`
                                      : ''}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No lineup is available for this week.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-green-600" />
                      Fixtures
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {matches.length > 0 ? (
                      <div className="space-y-3">
                        {matches.map((match) => {
                          const topPlayers =
                            statsByMatch.get(match.id)?.slice(0, 3) || []
                          return (
                            <div
                              key={match.id}
                              className="rounded-lg border border-gray-200 p-3"
                            >
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex-1 font-medium text-gray-900">
                                  {match.local.shortName || match.local.name}
                                </span>
                                <span className="text-center font-bold text-gray-700">
                                  {match.localScore !== null &&
                                  match.visitorScore !== null
                                    ? `${match.localScore} – ${match.visitorScore}`
                                    : 'vs'}
                                </span>
                                <span className="flex-1 text-right font-medium text-gray-900">
                                  {match.visitor.shortName ||
                                    match.visitor.name}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>{formatMatchDate(match.date)}</span>
                                <span>{getMatchStatus(match)}</span>
                              </div>
                              {topPlayers.length > 0 && (
                                <p className="mt-2 text-xs text-purple-700">
                                  Top points:{' '}
                                  {topPlayers
                                    .map(
                                      (player) =>
                                        `${player.name} ${player.weekPoints}`
                                    )
                                    .join(' · ')}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No fixtures are available for this week.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Week standings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ranking.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-gray-500">
                            <tr>
                              <th className="pb-2">Pos.</th>
                              <th className="pb-2">Manager</th>
                              <th className="pb-2 text-right">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...ranking]
                              .sort((a, b) => a.position - b.position)
                              .map((entry) => (
                                <tr
                                  key={entry.team.id}
                                  className={
                                    entry.team.id === teamId
                                      ? 'bg-blue-50 font-semibold'
                                      : ''
                                  }
                                >
                                  <td className="py-2">{entry.position}</td>
                                  <td className="py-2">
                                    {entry.team.manager.managerName}
                                  </td>
                                  <td className="py-2 text-right">
                                    {entry.points}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Standings are not available for this week yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      League evolution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {evolution && evolution.weeks.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-gray-500">
                            <tr>
                              <th className="pb-2">Manager</th>
                              {evolution.weeks.map((week) => (
                                <th
                                  key={week}
                                  className="px-2 pb-2 text-center"
                                >
                                  J{week}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {evolution.teams.map((team) => (
                              <tr
                                key={team.id}
                                className={
                                  team.id === teamId
                                    ? 'bg-purple-50 font-semibold'
                                    : ''
                                }
                              >
                                <td className="whitespace-nowrap py-2 pr-3">
                                  {team.name}
                                </td>
                                {team.positions.map((position, index) => (
                                  <td
                                    key={`${team.id}-${evolution.weeks[index]}`}
                                    className="px-2 py-2 text-center"
                                    title={`${team.cumulativePoints[index]} cumulative points`}
                                  >
                                    {position}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Evolution will appear after the first scored matchday.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
