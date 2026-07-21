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
import { playerDetailService } from '@/services/player-detail-service'
import type { PlayerDetail } from '@/types/dashboard'

function formatStatus(status: string): string {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function PlayerDetailPage() {
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
      else setError(result.error || 'Failed to load player details')
      setLoading(false)
    }

    void loadPlayer()
    return () => {
      active = false
    }
  }, [leagueId, playerId])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/leagues"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to leagues
          </Link>

          {loading && <BouncingBallLoader message="Loading player..." />}

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
                <p className="mt-2 text-gray-600">
                  Current league data and matchday scores.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div className="space-y-6">
                  <PlayerCard player={detail.player} />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        Availability
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">Current status</p>
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
                        Matchday points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detail.weeklyStats.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-left text-gray-500">
                              <tr>
                                <th className="pb-2">Matchday</th>
                                <th className="pb-2 text-right">Points</th>
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
                          No matchday scores are available yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-purple-600" />
                        Previous seasons
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
                                  ? 'No points'
                                  : `${season.points} pts`}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          The API does not provide previous-season data for this
                          player.
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
