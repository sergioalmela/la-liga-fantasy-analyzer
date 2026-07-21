'use client'

import { RefreshCw, Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { PlayerCard } from '@/components/player/player-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import { Player } from '@/entities/player'
import { refreshMarketListings } from '@/services/market-service'
import {
  calculateSummaryStats,
  getPlayersWithExpiringProtection,
  getPlayersWithLowBuyout,
} from '@/services/player-analytics-service'
import { teamService } from '@/services/team-service'
import { formatCurrency } from '@/utils/format-utils'
import { sortPlayers } from '@/utils/player-sorting-utils'

export default function TeamPlayersPage() {
  const params = useParams()
  const leagueId = params.leagueId as string
  const teamId = params.teamId as string
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshingMarket, setRefreshingMarket] = useState(false)
  const [marketStatus, setMarketStatus] = useState<{
    tone: 'progress' | 'success' | 'warning' | 'error'
    message: string
    failures?: string[]
  } | null>(null)

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const result = await teamService.getPlayers(leagueId, teamId)

        if (result.error) {
          setError(result.error)
        } else {
          setPlayers(result.data || [])
        }
      } catch {
        setError('Failed to load players')
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [leagueId, teamId])

  const handleRefreshMarket = async () => {
    if (players.length === 0 || refreshingMarket) return

    const listedPlayers = players.filter((player) => player.saleInfo)
    const unlistedPlayers = players.length - listedPlayers.length
    const confirmed = window.confirm(
      `This will renew ${listedPlayers.length} existing listings and add ${unlistedPlayers} players to the market at their current market value. Existing listings must be withdrawn before they can be renewed. Continue?`
    )
    if (!confirmed) return

    setRefreshingMarket(true)
    setMarketStatus({
      tone: 'progress',
      message: `Processing 0 of ${players.length} players...`,
    })

    const { renewed, added, failures } = await refreshMarketListings(
      leagueId,
      players,
      (current, total, playerName) => {
        setMarketStatus({
          tone: 'progress',
          message: `Processing ${current} of ${total}: ${playerName}`,
        })
      }
    )

    const updatedPlayers = await teamService.getPlayers(leagueId, teamId)
    if (updatedPlayers.data) setPlayers(updatedPlayers.data)

    setMarketStatus({
      tone: failures.length > 0 ? 'warning' : 'success',
      message: `${renewed} listings renewed and ${added} players added.${
        failures.length > 0 ? ` ${failures.length} failed.` : ''
      }`,
      ...(failures.length > 0 ? { failures } : {}),
    })
    setRefreshingMarket(false)
  }

  const summaryStats = calculateSummaryStats(players)
  const playersWithLowBuyout = getPlayersWithLowBuyout(players)
  const playersWithExpiringProtection =
    getPlayersWithExpiringProtection(players)

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
                    My Players
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Review your current squad and monitor player values
                  </p>
                </div>
                <Button
                  onClick={() => void handleRefreshMarket()}
                  disabled={refreshingMarket || loading || players.length === 0}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshingMarket ? 'animate-spin' : ''}`}
                  />
                  Add / renew all on market
                </Button>
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
                    <p className="text-sm text-gray-600">Total Players</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(summaryStats.totalValue)}
                    </div>
                    <p className="text-sm text-gray-600">Squad Value</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {summaryStats.totalPoints}
                    </div>
                    <p className="text-sm text-gray-600">Total Points</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {summaryStats.averagePoints}
                    </div>
                    <p className="text-sm text-gray-600">Avg Points</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Alerts */}
            {!loading &&
              !error &&
              (playersWithLowBuyout.length > 0 ||
                playersWithExpiringProtection.length > 0) && (
                <div className="mb-8 space-y-4">
                  {playersWithLowBuyout.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-orange-900 mb-2">
                        Low Buyout Clauses ({playersWithLowBuyout.length})
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
                        Expiring Protection (
                        {playersWithExpiringProtection.length})
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

            {loading && <BouncingBallLoader message="Loading players..." />}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && players.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No players found
                </h3>
                <p className="text-gray-600">Your squad appears to be empty.</p>
              </div>
            )}

            {!loading && !error && players.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortPlayers(players, 'marketValue', 'desc').map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
