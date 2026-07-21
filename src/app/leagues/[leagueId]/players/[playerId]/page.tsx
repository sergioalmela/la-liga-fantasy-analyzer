'use client'

import { ArrowLeft, CalendarDays, LineChart, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { PlayerCard } from '@/components/player/player-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import { useLanguage } from '@/i18n/language-provider'
import { playerDetailService } from '@/services/player-detail-service'
import type { PlayerDetail } from '@/types/dashboard'

export default function PlayerDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const leagueId = params.leagueId as string
  const playerId = params.playerId as string
  const [detail, setDetail] = useState<PlayerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadPlayer = async () => {
      const result = await playerDetailService.getPlayerDetail(
        playerId,
        leagueId
      )
      if (!active) return

      if (result.data) setDetail(result.data)
      else setError(t('detail.loadError'))
      setLoading(false)
    }

    void loadPlayer()
    return () => {
      active = false
    }
  }, [leagueId, playerId, t])

  const formatStatus = (status: string): string => {
    const normalized = status.toLowerCase()
    if (normalized === 'ok' || normalized === 'available') {
      return t('detail.status.ok')
    }
    if (normalized.includes('injur') || normalized.includes('lesion')) {
      return t('detail.status.injured')
    }
    if (normalized.includes('suspend') || normalized.includes('sancion')) {
      return t('detail.status.suspended')
    }
    if (normalized.includes('doubt') || normalized.includes('duda')) {
      return t('detail.status.doubt')
    }
    return t('detail.status.unknown')
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/leagues"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" /> {t('detail.back')}
          </Link>

          {loading && <BouncingBallLoader message={t('detail.loading')} />}

          {!loading && error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {!loading && detail && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {detail.player.nickname || detail.player.name}
                </h1>
                <p className="mt-2 text-gray-600">{t('detail.subtitle')}</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div className="space-y-6">
                  <PlayerCard player={detail.player} />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        {t('detail.availability')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        {t('detail.currentStatus')}
                      </p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatStatus(detail.player.playerStatus)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-blue-600" />
                        {t('detail.matchdayPoints')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detail.weeklyStats.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-left text-gray-500">
                              <tr>
                                <th className="pb-2">{t('detail.matchday')}</th>
                                <th className="pb-2 text-right">
                                  {t('common.points')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.weeklyStats.map((week) => (
                                <tr
                                  key={week.weekNumber}
                                  className="border-t border-gray-100"
                                >
                                  <td className="py-2">J{week.weekNumber}</td>
                                  <td className="py-2 text-right font-medium">
                                    {week.totalPoints}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {t('detail.noScores')}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-purple-600" />
                        {t('detail.previousSeasons')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detail.seasons.length > 0 ? (
                        <div className="space-y-2">
                          {detail.seasons.map((season) => (
                            <div
                              key={season.label}
                              className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm"
                            >
                              <span>{season.label}</span>
                              <span className="font-medium">
                                {season.points === null
                                  ? t('common.noPoints')
                                  : `${season.points} pts`}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {t('detail.noSeasons')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
