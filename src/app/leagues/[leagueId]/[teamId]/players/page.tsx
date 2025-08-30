'use client'

import { Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { PlayerCard } from '@/components/player/player-card'
import { Card, CardContent } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import { Player } from '@/entities/player'
import { getAuthToken } from '@/lib/auth'
import {
  PlayerAnalyticsService,
  playerAnalyticsService,
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

  useEffect(() => {
    const loadPlayers = async () => {
      const token = getAuthToken()
      if (!token) return

      try {
        const result = await teamService.getPlayers(token, leagueId, teamId)

        if (result.error) {
          setError(result.error)
        } else {
          const enrichedPlayers =
            await playerAnalyticsService.enrichPlayersWithAnalysis(
              token,
              result.data || []
            )
          setPlayers(enrichedPlayers)
        }
      } catch {
        setError('Failed to load players')
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [leagueId, teamId])

  const summaryStats = PlayerAnalyticsService.calculateSummaryStats(players)
  const playersWithLowBuyout =
    PlayerAnalyticsService.getPlayersWithLowBuyout(players)
  const playersWithExpiringProtection =
    PlayerAnalyticsService.getPlayersWithExpiringProtection(players)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Players</h1>
              <p className="mt-2 text-gray-600">
                Manage your current squad and monitor player values
              </p>
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
