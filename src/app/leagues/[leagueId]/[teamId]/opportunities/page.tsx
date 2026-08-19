'use client'

import { Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { ClauseWatchPanel } from '@/components/player/clause-watch-panel'
import { PlayerCard } from '@/components/player/player-card'
import { StartingProbabilityToggle } from '@/components/player/starting-probability-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import type { Player } from '@/entities/player'
import { useLanguage } from '@/i18n/language-provider'
import type { StartingProbability } from '@/lib/starting-probability'
import { useStartingProbabilityPreference } from '@/lib/starting-probability-preference'
import { useClauseWatch } from '@/lib/use-clause-watch'
import { leagueService } from '@/services/league-service'
import {
  getMarketTrends,
  type MarketTrend,
} from '@/services/market-trend-service'
import {
  type ClauseUnlockFilter,
  calculateSummaryStats,
  filterPlayersByClauseUnlock,
  getPlayersWithExpiringProtection,
  getPlayersWithLowBuyout,
} from '@/services/player-analytics-service'
import { getStartingProbabilities } from '@/services/starting-probability-service'
import { teamService } from '@/services/team-service'
import { sortOpportunities } from '@/utils/player-sorting-utils'

type PositionFilter = 'all' | 1 | 2 | 3 | 4

export default function PlayerOpportunitiesPage() {
  const { t } = useLanguage()
  const params = useParams()
  const leagueId = params.leagueId as string
  const teamId = params.teamId as string

  const [opponentPlayers, setOpponentPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trends, setTrends] = useState<Map<string, MarketTrend>>(new Map())
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [probabilities, setProbabilities] = useState<
    Map<string, StartingProbability>
  >(new Map())
  const [probabilitiesLoading, setProbabilitiesLoading] = useState(false)
  const [clauseFilter, setClauseFilter] = useState<ClauseUnlockFilter>('all')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all')
  const {
    enabled: showStartingProbability,
    setEnabled: setShowStartingProbability,
  } = useStartingProbabilityPreference()
  const handleClausePurchased = useCallback((target: { playerId: string }) => {
    setOpponentPlayers((current) =>
      current.filter((player) => player.id !== target.playerId)
    )
  }, [])
  const clauseWatch = useClauseWatch({
    leagueId,
    teamId,
    onPurchased: handleClausePurchased,
  })

  useEffect(() => {
    let cancelled = false

    const loadPlayers = async () => {
      try {
        const usersResult = await leagueService.getUsers(leagueId)

        if (usersResult.error) {
          setError(t('opportunities.loadError'))
        } else {
          const opponentUsers =
            usersResult.data?.filter((user) => {
              return user.team.id.toString() !== teamId
            }) || []

          if (opponentUsers.length > 0) {
            const opponentPlayersResults = await Promise.all(
              opponentUsers.map((user) =>
                teamService.getPlayers(leagueId, user.team.id.toString())
              )
            )

            const allOpponentPlayersWithOwner = opponentPlayersResults
              .map((result, index) => ({ result, owner: opponentUsers[index] }))
              .filter(({ result }) => result.data)
              .flatMap(({ result, owner }) => {
                return (result.data || []).map((player) => ({
                  ...player,
                  owner: {
                    id: owner.team.manager.id,
                    name: owner.team.manager.managerName,
                    teamName: owner.team.manager.managerName,
                    teamId: owner.team.id,
                  },
                }))
              })

            setOpponentPlayers(allOpponentPlayersWithOwner)
            setTrendsLoading(true)
            getMarketTrends(allOpponentPlayersWithOwner)
              .then((marketTrends) => {
                if (!cancelled) setTrends(marketTrends)
              })
              .finally(() => {
                if (!cancelled) setTrendsLoading(false)
              })
          }
        }
      } catch {
        setError(t('opportunities.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
    return () => {
      cancelled = true
    }
  }, [leagueId, t, teamId])

  useEffect(() => {
    let cancelled = false

    if (!showStartingProbability || opponentPlayers.length === 0) {
      setProbabilities(new Map())
      setProbabilitiesLoading(false)
      return
    }

    setProbabilitiesLoading(true)
    getStartingProbabilities(opponentPlayers)
      .then((startingProbabilities) => {
        if (!cancelled) setProbabilities(startingProbabilities)
      })
      .finally(() => {
        if (!cancelled) setProbabilitiesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [opponentPlayers, showStartingProbability])

  const playersWithOpportunities = getPlayersWithLowBuyout(opponentPlayers)
  const playersWithExpiringProtection =
    getPlayersWithExpiringProtection(opponentPlayers)
  const summaryStats = calculateSummaryStats(opponentPlayers)
  const clauseFilteredPlayers = filterPlayersByClauseUnlock(
    opponentPlayers,
    clauseFilter
  )
  const filteredPlayers =
    positionFilter === 'all'
      ? clauseFilteredPlayers
      : clauseFilteredPlayers.filter(
          (player) => player.positionId === positionFilter
        )
  const clauseFilters: Array<{
    value: ClauseUnlockFilter
    label: string
  }> = [
    { value: 'all', label: t('opportunities.filterAll') },
    { value: 'unlocked', label: t('opportunities.filterUnlocked') },
    { value: '24h', label: t('opportunities.filter24h') },
    { value: '48h', label: t('opportunities.filter48h') },
  ]
  const positionFilters: Array<{
    value: PositionFilter
    label: string
  }> = [
    { value: 'all', label: t('opportunities.positionAll') },
    { value: 1, label: t('advisor.goalkeepers') },
    { value: 2, label: t('advisor.defenders') },
    { value: 3, label: t('advisor.midfielders') },
    { value: 4, label: t('advisor.forwards') },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t('opportunities.title')}
                </h1>
                <p className="mt-2 text-gray-600">
                  {t('opportunities.subtitle')}
                </p>
              </div>
              <StartingProbabilityToggle
                enabled={showStartingProbability}
                onChange={setShowStartingProbability}
              />
            </div>

            {loading && (
              <BouncingBallLoader message={t('opportunities.loading')} />
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && opponentPlayers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('opportunities.emptyTitle')}
                </h3>
                <p className="text-gray-600">{t('opportunities.emptyText')}</p>
              </div>
            )}

            {!loading && !error && opponentPlayers.length > 0 && (
              <div className="space-y-8">
                <ClauseWatchPanel controller={clauseWatch} />
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {opponentPlayers.length}
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('players.total')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {playersWithOpportunities.length}
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('opportunities.lowBuyouts')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {playersWithExpiringProtection.length}
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('opportunities.protectionExpiring')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {summaryStats.averagePoints}
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('players.averagePoints')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                    <div>
                      <p className="text-xs text-gray-500">
                        {t('opportunities.filterCount', {
                          count: filteredPlayers.length,
                          total: opponentPlayers.length,
                        })}
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-gray-900">
                          {t('opportunities.filterLabel')}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {clauseFilters.map((filter) => (
                            <Button
                              key={filter.value}
                              type="button"
                              size="sm"
                              variant={
                                clauseFilter === filter.value
                                  ? 'primary'
                                  : 'outline'
                              }
                              aria-pressed={clauseFilter === filter.value}
                              onClick={() => setClauseFilter(filter.value)}
                            >
                              {filter.label}
                            </Button>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-gray-900">
                          {t('opportunities.positionFilter')}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {positionFilters.map((filter) => (
                            <Button
                              key={filter.value}
                              type="button"
                              size="sm"
                              variant={
                                positionFilter === filter.value
                                  ? 'primary'
                                  : 'outline'
                              }
                              aria-pressed={positionFilter === filter.value}
                              onClick={() => setPositionFilter(filter.value)}
                            >
                              {filter.label}
                            </Button>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </div>

                  {filteredPlayers.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {sortOpportunities(filteredPlayers, trends).map(
                        (player) => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            detailsHref={`/leagues/${leagueId}/players/${player.id}`}
                            showMarketTrend
                            marketTrend={trends.get(player.id)}
                            marketTrendLoading={trendsLoading}
                            showSaleInfo={false}
                            showStartingProbability={showStartingProbability}
                            startingProbability={probabilities.get(player.id)}
                            startingProbabilityLoading={probabilitiesLoading}
                            clauseWatchEnabled={
                              Boolean(player.buyoutClause) &&
                              Boolean(player.owner?.teamId) &&
                              Boolean(player.playerTeamId)
                            }
                            clauseWatched={clauseWatch.watches.some(
                              (target) => target.playerId === player.id
                            )}
                            onToggleClauseWatch={() => {
                              const watched = clauseWatch.watches.some(
                                (target) => target.playerId === player.id
                              )
                              if (watched) {
                                clauseWatch.removeWatch(player.id)
                              } else {
                                clauseWatch.addWatch(player)
                              }
                            }}
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
                      {t('opportunities.filterEmpty')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
