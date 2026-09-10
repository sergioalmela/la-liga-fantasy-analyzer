'use client'

import {
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Percent,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { SquadTabs } from '@/components/player/squad-tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import { PositionBadge } from '@/components/ui/position-badge'
import type { Player } from '@/entities/player'
import { getPlayerDisplayName } from '@/entities/player'
import { useLanguage } from '@/i18n/language-provider'
import type { TranslationKey } from '@/i18n/messages'
import type { StartingProbability } from '@/lib/starting-probability'
import { leagueService } from '@/services/league-service'
import { applyLineup } from '@/services/lineup-service'
import {
  getMarketTrends,
  type MarketTrend,
} from '@/services/market-trend-service'
import {
  buildLineupPayload,
  isPlayerUnavailable,
  MINIMUM_STARTING_PROBABILITY,
  recommendBestLineup,
} from '@/services/squad-advisor-service'
import { getStartingProbabilities } from '@/services/starting-probability-service'
import { teamService } from '@/services/team-service'

const POSITION_KEYS = {
  1: 'advisor.goalkeepers',
  2: 'advisor.defenders',
  3: 'advisor.midfielders',
  4: 'advisor.forwards',
  5: 'advisor.coaches',
} as const

function statusKey(status: string): TranslationKey {
  const normalized = status.toLowerCase()
  if (normalized.includes('injur') || normalized.includes('lesion')) {
    return 'detail.status.injured'
  }
  if (normalized.includes('suspend') || normalized.includes('sancion')) {
    return 'detail.status.suspended'
  }
  if (normalized.includes('doubt') || normalized.includes('duda')) {
    return 'detail.status.doubt'
  }
  if (normalized.includes('out_of_league')) {
    return 'detail.status.outOfLeague'
  }
  if (normalized === 'ok') return 'detail.status.ok'
  return 'detail.status.unknown'
}

export default function LineupRecommendationPage() {
  const { t } = useLanguage()
  const params = useParams()
  const leagueId = params.leagueId as string
  const teamId = params.teamId as string
  const [players, setPlayers] = useState<Player[]>([])
  const [probabilities, setProbabilities] = useState<
    Map<string, StartingProbability>
  >(new Map())
  const [trends, setTrends] = useState<Map<string, MarketTrend>>(new Map())
  const [premiumFormations, setPremiumFormations] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)

  const loadRecommendation = useCallback(async () => {
    setLoading(true)
    setError('')
    setApplyStatus(null)

    try {
      const [playersResult, leaguesResult] = await Promise.all([
        teamService.getPlayers(leagueId, teamId),
        leagueService.getLeagues(),
      ])
      if (playersResult.error || !playersResult.data) {
        setError(t('lineupRecommender.loadError'))
        return
      }

      const loadedPlayers = playersResult.data
      const league = leaguesResult.data?.find((entry) => entry.id === leagueId)
      setPlayers(loadedPlayers)
      setPremiumFormations(Boolean(league?.config.premiumFeatures.formations))

      const [startingProbabilities, marketTrends] = await Promise.all([
        getStartingProbabilities(loadedPlayers),
        getMarketTrends(loadedPlayers),
      ])
      setProbabilities(startingProbabilities)
      setTrends(marketTrends)
    } catch {
      setError(t('lineupRecommender.loadError'))
    } finally {
      setLoading(false)
    }
  }, [leagueId, t, teamId])

  useEffect(() => {
    void loadRecommendation()
  }, [loadRecommendation])

  const recommendation = useMemo(
    () =>
      recommendBestLineup(players, probabilities, trends, premiumFormations),
    [players, premiumFormations, probabilities, trends]
  )
  const lineupIds = useMemo(
    () => new Set(recommendation.lineup.map((player) => player.id)),
    [recommendation.lineup]
  )
  const lineupPayload = useMemo(
    () => buildLineupPayload(recommendation.lineup, recommendation.formation),
    [recommendation]
  )
  const knownLineupProbabilities = recommendation.lineup.flatMap((player) => {
    const probability = probabilities.get(player.id)
    return probability ? [probability.probability] : []
  })
  const averageProbability =
    knownLineupProbabilities.length > 0
      ? Math.round(
          knownLineupProbabilities.reduce((total, value) => total + value, 0) /
            knownLineupProbabilities.length
        )
      : null
  const safePlayers = recommendation.lineup.filter(
    (player) =>
      (probabilities.get(player.id)?.probability ?? 0) >=
        MINIMUM_STARTING_PROBABILITY && !isPlayerUnavailable(player)
  ).length
  const riskCount = new Set(
    [
      ...recommendation.belowMinimumProbability,
      ...recommendation.unknownProbability,
      ...recommendation.unavailable,
    ].map((player) => player.id)
  ).size

  const handleApply = async () => {
    if (!lineupPayload || applying) return
    const confirmed = window.confirm(
      t('advisor.applyConfirm', { formation: recommendation.formation })
    )
    if (!confirmed) return

    setApplying(true)
    setApplyStatus(null)
    const result = await applyLineup(teamId, lineupPayload)
    setApplyStatus(
      result.error ? t('advisor.applyError') : t('advisor.applySuccess')
    )
    setApplying(false)
  }

  const allPlayers = useMemo(
    () =>
      [...players].sort((left, right) => {
        const selectedDifference =
          Number(lineupIds.has(right.id)) - Number(lineupIds.has(left.id))
        if (selectedDifference !== 0) return selectedDifference
        const probabilityDifference =
          (probabilities.get(right.id)?.probability ?? -1) -
          (probabilities.get(left.id)?.probability ?? -1)
        if (probabilityDifference !== 0) return probabilityDifference
        return right.averagePoints - left.averagePoints
      }),
    [lineupIds, players, probabilities]
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                <Sparkles className="h-7 w-7 text-indigo-600" />
                {t('lineupRecommender.title')}
              </h1>
              <p className="mt-2 text-gray-600">
                {t('lineupRecommender.subtitle', {
                  minimum: MINIMUM_STARTING_PROBABILITY,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              disabled={loading}
              onClick={() => void loadRecommendation()}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              {t('common.refresh')}
            </Button>
          </div>

          <SquadTabs leagueId={leagueId} teamId={teamId} active="lineup" />

          {loading && (
            <BouncingBallLoader message={t('lineupRecommender.loading')} />
          )}
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && players.length > 0 && (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-indigo-700">
                      {recommendation.formation}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('lineupRecommender.bestFormation')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-green-700">
                      {safePlayers}/11
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('lineupRecommender.aboveMinimum', {
                        minimum: MINIMUM_STARTING_PROBABILITY,
                      })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-blue-700">
                      {averageProbability === null
                        ? '—'
                        : `${averageProbability}%`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('lineupRecommender.averageProbability')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-amber-700">
                      {riskCount}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('lineupRecommender.riskCount')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {(recommendation.belowMinimumProbability.length > 0 ||
                recommendation.unknownProbability.length > 0 ||
                recommendation.unavailable.length > 0) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    {t('lineupRecommender.forcedTitle')}
                  </p>
                  {recommendation.belowMinimumProbability.length > 0 && (
                    <p className="mt-2">
                      {t('lineupRecommender.belowMinimum', {
                        players: recommendation.belowMinimumProbability
                          .map(getPlayerDisplayName)
                          .join(', '),
                        minimum: MINIMUM_STARTING_PROBABILITY,
                      })}
                    </p>
                  )}
                  {recommendation.unknownProbability.length > 0 && (
                    <p className="mt-2">
                      {t('lineupRecommender.unknownProbability', {
                        players: recommendation.unknownProbability
                          .map(getPlayerDisplayName)
                          .join(', '),
                      })}
                    </p>
                  )}
                  {recommendation.unavailable.length > 0 && (
                    <p className="mt-2">
                      {t('lineupRecommender.unavailable', {
                        players: recommendation.unavailable
                          .map(getPlayerDisplayName)
                          .join(', '),
                      })}
                    </p>
                  )}
                </div>
              )}

              <Card className="border-indigo-200">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-indigo-600" />
                      {t('lineupRecommender.recommendedEleven', {
                        formation: recommendation.formation,
                      })}
                    </CardTitle>
                    <p className="mt-1 text-xs text-gray-600">
                      {t('lineupRecommender.selectionExplanation')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!lineupPayload || applying}
                    onClick={() => void handleApply()}
                  >
                    {applying ? t('advisor.applying') : t('advisor.apply')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {!lineupPayload && (
                    <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                      {t('advisor.applyUnavailable')}
                    </p>
                  )}
                  {applyStatus && (
                    <p className="mb-4 rounded bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                      {applyStatus}
                    </p>
                  )}
                  <div className="grid gap-4 lg:grid-cols-4">
                    {([1, 2, 3, 4] as const).map((positionId) => (
                      <section
                        key={positionId}
                        className="rounded-lg bg-indigo-50 p-4"
                      >
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-800">
                          {t(POSITION_KEYS[positionId])}
                        </h3>
                        <div className="space-y-2">
                          {recommendation.lineup
                            .filter(
                              (player) => player.positionId === positionId
                            )
                            .map((player) => {
                              const probability = probabilities.get(player.id)
                              return (
                                <Link
                                  key={player.id}
                                  href={`/leagues/${leagueId}/players/${player.id}`}
                                  className="flex items-center justify-between gap-2 rounded-md border border-indigo-100 bg-white px-3 py-2 hover:border-indigo-300"
                                >
                                  <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                                    {getPlayerDisplayName(player)}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      probability &&
                                      probability.probability >=
                                        MINIMUM_STARTING_PROBABILITY
                                        ? 'bg-green-100 text-green-700'
                                        : probability
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {probability
                                      ? `${probability.probability}%`
                                      : t('lineupRecommender.noProbability')}
                                  </span>
                                </Link>
                              )
                            })}
                        </div>
                      </section>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('lineupRecommender.allPlayers')}</CardTitle>
                  <p className="text-xs text-gray-600">
                    {t('lineupRecommender.allPlayersHint')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allPlayers.map((player) => {
                      const probability = probabilities.get(player.id)
                      const selected = lineupIds.has(player.id)
                      return (
                        <div
                          key={player.id}
                          className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center ${
                            selected
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {selected ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                            ) : (
                              <span className="h-5 w-5 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/leagues/${leagueId}/players/${player.id}`}
                                className="truncate font-medium text-gray-900 hover:text-blue-700"
                              >
                                {getPlayerDisplayName(player)}
                              </Link>
                              <p className="text-xs text-gray-500">
                                {t(statusKey(player.playerStatus))}
                              </p>
                            </div>
                          </div>
                          <PositionBadge player={player} variant="compact" />
                          <div className="flex items-center gap-1 text-sm font-semibold">
                            <Percent className="h-4 w-4 text-gray-400" />
                            <span
                              className={
                                probability &&
                                probability.probability >=
                                  MINIMUM_STARTING_PROBABILITY
                                  ? 'text-green-700'
                                  : probability
                                    ? 'text-red-700'
                                    : 'text-gray-500'
                              }
                            >
                              {probability
                                ? `${probability.probability}%`
                                : t('lineupRecommender.noProbability')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {t('lineupRecommender.pointsAverage', {
                              points: player.averagePoints.toFixed(1),
                            })}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!loading && !error && players.length === 0 && (
            <p className="rounded border border-gray-200 bg-white p-8 text-center text-gray-600">
              {t('players.emptyText')}
            </p>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
