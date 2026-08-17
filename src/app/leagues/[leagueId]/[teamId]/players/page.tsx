'use client'

import { RefreshCw, Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { PlayerCard } from '@/components/player/player-card'
import { SquadAdvisorPanel } from '@/components/player/squad-advisor-panel'
import { StartingProbabilityToggle } from '@/components/player/starting-probability-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import { Player, type PlayerOffer } from '@/entities/player'
import { useLanguage } from '@/i18n/language-provider'
import type { StartingProbability } from '@/lib/starting-probability'
import { useStartingProbabilityPreference } from '@/lib/starting-probability-preference'
import { refreshMarketListings } from '@/services/market-service'
import {
  getMarketTrends,
  isMarketTrendBearish,
  type MarketTrend,
} from '@/services/market-trend-service'
import {
  calculateSummaryStats,
  getPlayersWithExpiringProtection,
  getPlayersWithLowBuyout,
} from '@/services/player-analytics-service'
import {
  acceptPlayerOffer,
  getPlayerOffers,
  getPlayerPurchasePrices,
  increasePlayerBuyout,
  rejectPlayerOffer,
} from '@/services/player-offer-service'
import { getStartingProbabilities } from '@/services/starting-probability-service'
import { teamService } from '@/services/team-service'
import { formatCurrency } from '@/utils/format-utils'
import { sortPlayers } from '@/utils/player-sorting-utils'

export default function TeamPlayersPage() {
  const { t } = useLanguage()
  const params = useParams()
  const leagueId = params.leagueId as string
  const teamId = params.teamId as string
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trends, setTrends] = useState<Map<string, MarketTrend>>(new Map())
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [probabilities, setProbabilities] = useState<
    Map<string, StartingProbability>
  >(new Map())
  const [probabilitiesLoading, setProbabilitiesLoading] = useState(false)
  const [offers, setOffers] = useState<Map<string, PlayerOffer[]>>(new Map())
  const [offersLoading, setOffersLoading] = useState(false)
  const [purchasePrices, setPurchasePrices] = useState<Map<string, number>>(
    new Map()
  )
  const [offerActionId, setOfferActionId] = useState<string | null>(null)
  const [clauseActionId, setClauseActionId] = useState<string | null>(null)
  const {
    enabled: showStartingProbability,
    setEnabled: setShowStartingProbability,
  } = useStartingProbabilityPreference()
  const [refreshingMarket, setRefreshingMarket] = useState(false)
  const [marketStatus, setMarketStatus] = useState<{
    tone: 'progress' | 'success' | 'warning' | 'error'
    message: string
    failures?: string[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadPlayers = async () => {
      try {
        const result = await teamService.getPlayers(leagueId, teamId)

        if (result.error) {
          setError(t('players.loadError'))
        } else {
          const loadedPlayers = result.data || []
          setPlayers(loadedPlayers)
          setTrendsLoading(true)
          getMarketTrends(loadedPlayers)
            .then((marketTrends) => {
              if (!cancelled) setTrends(marketTrends)
            })
            .finally(() => {
              if (!cancelled) setTrendsLoading(false)
            })
        }
      } catch {
        setError(t('players.loadError'))
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

    if (!showStartingProbability || players.length === 0) {
      setProbabilities(new Map())
      setProbabilitiesLoading(false)
      return
    }

    setProbabilitiesLoading(true)
    getStartingProbabilities(players)
      .then((startingProbabilities) => {
        if (!cancelled) setProbabilities(startingProbabilities)
      })
      .finally(() => {
        if (!cancelled) setProbabilitiesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [players, showStartingProbability])

  useEffect(() => {
    let cancelled = false
    const playersWithOffers = players.filter(
      (player) => player.saleInfo && player.saleInfo.numberOfOffers > 0
    )

    if (playersWithOffers.length === 0) {
      setOffers(new Map())
      setOffersLoading(false)
      return
    }

    setOffers(new Map())
    setOffersLoading(true)
    getPlayerOffers(leagueId, playersWithOffers)
      .then((receivedOffers) => {
        if (!cancelled) setOffers(receivedOffers)
      })
      .finally(() => {
        if (!cancelled) setOffersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, players])

  useEffect(() => {
    let cancelled = false

    if (players.length === 0) {
      setPurchasePrices(new Map())
      return
    }

    getPlayerPurchasePrices(leagueId, players).then((prices) => {
      if (!cancelled) setPurchasePrices(prices)
    })

    return () => {
      cancelled = true
    }
  }, [leagueId, players])

  const handleRefreshMarket = async () => {
    if (players.length === 0 || refreshingMarket) return

    const listedPlayers = players.filter((player) => player.saleInfo)
    const unlistedPlayers = players.length - listedPlayers.length
    const confirmed = window.confirm(
      t('market.confirm', {
        listed: listedPlayers.length,
        unlisted: unlistedPlayers,
      })
    )
    if (!confirmed) return

    setRefreshingMarket(true)
    setMarketStatus({
      tone: 'progress',
      message: t('market.processingStart', { total: players.length }),
    })

    const { renewed, added, failures } = await refreshMarketListings(
      leagueId,
      players,
      (current, total, playerName) => {
        setMarketStatus({
          tone: 'progress',
          message: t('market.processing', {
            current,
            total,
            player: playerName,
          }),
        })
      }
    )

    const updatedPlayers = await teamService.getPlayers(leagueId, teamId)
    if (updatedPlayers.data) setPlayers(updatedPlayers.data)

    setMarketStatus({
      tone: failures.length > 0 ? 'warning' : 'success',
      message: t('market.result', {
        renewed,
        added,
        failed:
          failures.length > 0
            ? t('market.failedCount', { count: failures.length })
            : '',
      }),
      ...(failures.length > 0 ? { failures } : {}),
    })
    setRefreshingMarket(false)
  }

  const reloadPlayers = async () => {
    const result = await teamService.getPlayers(leagueId, teamId)
    if (result.data) setPlayers(result.data)
  }

  const handleOfferAction = async (
    player: Player,
    offer: PlayerOffer,
    action: 'accept' | 'reject'
  ) => {
    if (!player.saleInfo || offerActionId) return
    const confirmed = window.confirm(
      t(
        action === 'accept'
          ? 'player.acceptOfferConfirm'
          : 'player.rejectOfferConfirm',
        {
          player: player.nickname || player.name,
          price: formatCurrency(offer.amount),
        }
      )
    )
    if (!confirmed) return

    setOfferActionId(offer.id)
    const result =
      action === 'accept'
        ? await acceptPlayerOffer(leagueId, player.saleInfo.marketId, offer)
        : await rejectPlayerOffer(leagueId, player.saleInfo.marketId, offer.id)
    setMarketStatus({
      tone: result.error ? 'error' : 'success',
      message: result.error
        ? t('player.offerActionError')
        : t(
            action === 'accept'
              ? 'player.offerAccepted'
              : 'player.offerRejected'
          ),
    })
    if (!result.error) await reloadPlayers()
    setOfferActionId(null)
  }

  const handleIncreaseClause = async (player: Player) => {
    if (!player.buyoutClause || clauseActionId) return
    const entered = window.prompt(
      t('player.increaseClausePrompt', {
        player: player.nickname || player.name,
        price: formatCurrency(player.buyoutClause),
      }),
      String((player.buyoutClause + 1_000_000) / 1_000_000)
    )
    if (entered === null) return

    const millions = Number(entered.replace(',', '.'))
    const nextClause = Math.round(millions * 1_000_000)
    if (!Number.isFinite(nextClause) || nextClause <= player.buyoutClause) {
      setMarketStatus({ tone: 'error', message: t('player.invalidClause') })
      return
    }

    const confirmed = window.confirm(
      t('player.increaseClauseConfirm', {
        player: player.nickname || player.name,
        price: formatCurrency(nextClause),
        cost: formatCurrency((nextClause - player.buyoutClause) / 2),
      })
    )
    if (!confirmed) return

    setClauseActionId(player.id)
    const result = await increasePlayerBuyout(leagueId, player.id, nextClause)
    setMarketStatus({
      tone: result.error ? 'error' : 'success',
      message: result.error
        ? t('player.increaseClauseError')
        : t('player.increaseClauseSuccess'),
    })
    if (!result.error) await reloadPlayers()
    setClauseActionId(null)
  }

  const summaryStats = calculateSummaryStats(players)
  const playersWithLowBuyout = getPlayersWithLowBuyout(players)
  const playersWithExpiringProtection =
    getPlayersWithExpiringProtection(players)
  const fallingPlayers = players.filter((player) => {
    const trend = trends.get(player.id)
    return trend ? isMarketTrendBearish(trend) : false
  })

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {t('players.title')}
                  </h1>
                  <p className="mt-2 text-gray-600">{t('players.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StartingProbabilityToggle
                    enabled={showStartingProbability}
                    onChange={setShowStartingProbability}
                  />
                  <Button
                    onClick={() => void handleRefreshMarket()}
                    disabled={
                      refreshingMarket || loading || players.length === 0
                    }
                    className="gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshingMarket ? 'animate-spin' : ''}`}
                    />
                    {t('market.renew')}
                  </Button>
                </div>
              </div>

              {marketStatus && (
                <div
                  className={`mt-4 rounded border px-4 py-3 text-sm ${
                    marketStatus.tone === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : marketStatus.tone === 'progress'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : marketStatus.tone === 'warning'
                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <p>{marketStatus.message}</p>
                  {marketStatus.failures && (
                    <p className="mt-2 whitespace-pre-line">
                      {marketStatus.failures.join('\n')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Summary Stats */}
            {!loading && !error && players.length > 0 && (
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {players.length}
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('players.total')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(summaryStats.totalValue)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('players.squadValue')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {summaryStats.totalPoints}
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('players.totalPoints')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {summaryStats.averagePoints}
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('players.averagePoints')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {!loading && !error && players.length > 0 && (
              <SquadAdvisorPanel
                players={players}
                probabilities={probabilities}
                trends={trends}
                teamId={teamId}
              />
            )}

            {/* Alerts */}
            {!loading &&
              !error &&
              (playersWithLowBuyout.length > 0 ||
                playersWithExpiringProtection.length > 0 ||
                fallingPlayers.length > 0) && (
                <div className="mb-8 space-y-4">
                  {fallingPlayers.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <h3 className="mb-2 text-sm font-medium text-red-900">
                        {t('players.falling', {
                          count: fallingPlayers.length,
                        })}
                      </h3>
                      <p className="mb-2 text-xs text-red-600">
                        {t('players.fallingHint')}
                      </p>
                      <div className="text-sm text-red-700">
                        {fallingPlayers
                          .map((player) => player.nickname || player.name)
                          .join(', ')}
                      </div>
                    </div>
                  )}

                  {playersWithLowBuyout.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-orange-900 mb-2">
                        {t('players.lowBuyouts', {
                          count: playersWithLowBuyout.length,
                        })}
                      </h3>
                      <div className="text-sm text-orange-700">
                        {playersWithLowBuyout
                          .map((p) => p.nickname || p.name)
                          .join(', ')}
                      </div>
                    </div>
                  )}

                  {playersWithExpiringProtection.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-red-900 mb-2">
                        {t('players.expiringProtection', {
                          count: playersWithExpiringProtection.length,
                        })}
                      </h3>
                      <div className="text-sm text-red-700">
                        {playersWithExpiringProtection
                          .map((p) => p.nickname || p.name)
                          .join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {loading && <BouncingBallLoader message={t('players.loading')} />}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && players.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('players.emptyTitle')}
                </h3>
                <p className="text-gray-600">{t('players.emptyText')}</p>
              </div>
            )}

            {!loading && !error && players.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortPlayers(players, 'marketValue', 'desc').map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    detailsHref={`/leagues/${leagueId}/players/${player.id}`}
                    showMarketTrend
                    marketTrend={trends.get(player.id)}
                    marketTrendLoading={trendsLoading}
                    showStartingProbability={showStartingProbability}
                    startingProbability={probabilities.get(player.id)}
                    startingProbabilityLoading={probabilitiesLoading}
                    showOfferDetails
                    offers={offers.get(player.id)}
                    purchasePrice={purchasePrices.get(player.id)}
                    offersLoading={
                      offersLoading &&
                      Boolean(
                        player.saleInfo && player.saleInfo.numberOfOffers > 0
                      )
                    }
                    offerActionId={offerActionId}
                    onAcceptOffer={(offer) =>
                      void handleOfferAction(player, offer, 'accept')
                    }
                    onRejectOffer={(offer) =>
                      void handleOfferAction(player, offer, 'reject')
                    }
                    clauseActionPending={clauseActionId === player.id}
                    onIncreaseClause={() => void handleIncreaseClause(player)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
