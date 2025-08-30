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
import { leagueService } from '@/services/league-service'
import {
  PlayerAnalyticsService,
  playerAnalyticsService,
} from '@/services/player-analytics-service'
import { teamService } from '@/services/team-service'
import { sortOpportunities } from '@/utils/player-sorting-utils'

export default function PlayerOpportunitiesPage() {
  const params = useParams()
  const leagueId = params.leagueId as string
  const teamId = params.teamId as string

  const [opponentPlayers, setOpponentPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPlayers = async () => {
      const token = getAuthToken()
      if (!token) return

      try {
        const usersResult = await leagueService.getUsers(token, leagueId)

        if (usersResult.error) {
          setError(usersResult.error)
        } else {
          const opponentUsers =
            usersResult.data?.filter((user) => {
              return user.team.id.toString() !== teamId
            }) || []

          if (opponentUsers.length > 0) {
            const opponentPlayersResults = await Promise.all(
              opponentUsers.map((user) =>
                teamService.getPlayers(token, leagueId, user.team.id.toString())
              )
            )

            const allOpponentPlayersWithOwner = opponentPlayersResults
              .filter((result) => result.data)
              .flatMap((result, index) => {
                const owner = opponentUsers[index]
                return (result.data || []).map((player) => ({
                  ...player,
                  owner: {
                    id: owner.team.manager.id,
                    name: owner.team.manager.managerName,
                    teamName: owner.team.manager.managerName,
                  },
                }))
              })

            const expiringOpponentPlayers =
              PlayerAnalyticsService.getPlayersWithExpiringProtection(
                allOpponentPlayersWithOwner
              )
            const enrichedOpponentPlayers =
              await playerAnalyticsService.enrichPlayersWithAnalysis(
                token,
                expiringOpponentPlayers
              )

            setOpponentPlayers(enrichedOpponentPlayers)
          }
        }
      } catch {
        setError('Failed to load opponent players')
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [leagueId, teamId])

  const playersWithOpportunities =
    PlayerAnalyticsService.getPlayersWithLowBuyout(opponentPlayers)
  const playersWithExpiringProtection =
    PlayerAnalyticsService.getPlayersWithExpiringProtection(opponentPlayers)
  const summaryStats =
    PlayerAnalyticsService.calculateSummaryStats(opponentPlayers)
  const trendingUpPlayers =
    PlayerAnalyticsService.getTrendingUpPlayers(opponentPlayers)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Player Opportunities
              </h1>
              <p className="mt-2 text-gray-600">
                Discover buying opportunities from other managers' players with
                trend analysis
              </p>
            </div>

            {loading && (
              <BouncingBallLoader message="Loading opponent players..." />
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
                  No opponent players found
                </h3>
                <p className="text-gray-600">
                  No players available from other managers in this league.
                </p>
              </div>
            )}

            {!loading && !error && opponentPlayers.length > 0 && (
              <div className="space-y-8">
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {opponentPlayers.length}
                      </div>
                      <p className="text-sm text-gray-600">Total Players</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {playersWithOpportunities.length}
                      </div>
                      <p className="text-sm text-gray-600">Low Buyouts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {trendingUpPlayers.length}
                      </div>
                      <p className="text-sm text-gray-600">Trending Up</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {summaryStats.averagePoints}
                      </div>
                      <p className="text-sm text-gray-600">Avg Points</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Opportunity Alerts */}
                {(playersWithOpportunities.length > 0 ||
                  playersWithExpiringProtection.length > 0) && (
                  <div className="mb-8 space-y-4">
                    {playersWithOpportunities.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-orange-900 mb-2">
                          🎯 Low Buyout Opportunities (
                          {playersWithOpportunities.length})
                        </h3>
                        <div className="text-sm text-orange-700">
                          {playersWithOpportunities
                            .map((p) => p.nickname || p.name)
                            .join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {sortOpportunities(opponentPlayers).map((player) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
