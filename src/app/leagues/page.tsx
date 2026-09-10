'use client'

import {
  Activity,
  Check,
  LayoutDashboard,
  Shield,
  Shirt,
  ShoppingCart,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/i18n/language-provider'
import { leagueService } from '@/services/league-service'
import { type League } from '@/types/api'

export default function LeaguesPage() {
  const { t } = useLanguage()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadLeagues = async () => {
      try {
        const result = await leagueService.getLeagues()

        if (result.error) {
          setError(t('leagues.loadError'))
        } else {
          setLeagues(result.data || [])
        }
      } catch {
        setError(t('leagues.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadLeagues()
  }, [t])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                {t('leagues.title')}
              </h1>
              <p className="mt-2 text-gray-600">{t('leagues.subtitle')}</p>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">{t('leagues.loading')}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {leagues.map((league) => (
                  <Card
                    key={league.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        {league.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>
                            {t('leagues.managers', {
                              count: league.managersNumber,
                            })}
                          </span>
                        </div>

                        {league.premium && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">
                              {t('leagues.premium')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          {league.team.isAdmin ? (
                            <>
                              <Shield className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-600">
                                {t('leagues.admin')}
                              </span>
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-gray-600" />
                              <span className="text-gray-600">
                                {t('leagues.member')}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="space-y-2 pt-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/leagues/${league.id}/${league.team.id}/opportunities`}
                            >
                              <Button
                                size="sm"
                                className="gap-1.5 bg-amber-500 hover:bg-amber-600"
                              >
                                <Star className="h-4 w-4" />
                                {t('leagues.opportunities')}
                              </Button>
                            </Link>
                            <Link
                              href={`/leagues/${league.id}/${league.team.id}/players`}
                            >
                              <Button size="sm" className="gap-1.5">
                                <Shirt className="h-4 w-4" />
                                {t('leagues.myPlayers')}
                              </Button>
                            </Link>
                            <Link href={`/leagues/${league.id}/market`}>
                              <Button
                                size="sm"
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                {t('leagues.market')}
                              </Button>
                            </Link>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/leagues/${league.id}/${league.team.id}`}
                            >
                              <Button size="sm" variant="outline">
                                <LayoutDashboard className="mr-1 h-4 w-4" />
                                {t('leagues.matchday')}
                              </Button>
                            </Link>
                            <Link
                              href={`/leagues/${league.id}/${league.team.id}/activity`}
                            >
                              <Button size="sm" variant="outline">
                                <Activity className="mr-1 h-4 w-4" />
                                {t('leagues.radar')}
                              </Button>
                            </Link>
                            <Link
                              href={`/leagues/${league.id}/${league.team.id}/lineup`}
                            >
                              <Button size="sm" variant="outline">
                                <Sparkles className="mr-1 h-4 w-4" />
                                {t('leagues.lineupRecommender')}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && !error && leagues.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('leagues.emptyTitle')}
                </h3>
                <p className="text-gray-600">{t('leagues.emptyText')}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
