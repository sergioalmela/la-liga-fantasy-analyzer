'use client'

import { Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { PlayerCard } from '@/components/player/player-card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import { Player } from '@/entities/player'
import { useLanguage } from '@/i18n/language-provider'
import {
  type MarketTrend,
  recordAndBuildMarketTrends,
} from '@/services/market-trend-service'
import { teamService } from '@/services/team-service'
import { sortOpportunities } from '@/utils/player-sorting-utils'

export default function MarketPlayersPage() {
  const { t } = useLanguage()
  const params = useParams()
  const leagueId = params.leagueId as string
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trends, setTrends] = useState<Map<string, MarketTrend>>(new Map())

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const result = await teamService.getOfficialMarketPlayers(leagueId)

        if (result.error) {
          setError(t('players.loadError'))
        } else {
          const loadedPlayers = result.data || []
          setPlayers(loadedPlayers)
          setTrends(recordAndBuildMarketTrends(loadedPlayers))
        }
      } catch {
        setError(t('players.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [leagueId, t])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                {t('market.title')}
              </h1>
              <p className="mt-2 text-gray-600">{t('market.subtitle')}</p>
            </div>

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
                <p className="text-gray-600">{t('market.emptyText')}</p>
              </div>
            )}

            {!loading && !error && players.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortOpportunities(players).map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    detailsHref={`/leagues/${leagueId}/players/${player.id}`}
                    showMarketTrend
                    marketTrend={trends.get(player.id)}
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
