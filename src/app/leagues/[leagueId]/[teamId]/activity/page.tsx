'use client'

import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BouncingBallLoader } from '@/components/ui/football-loading'
import {
  type ActivityRadar,
  activityService,
  type RadarActivity,
} from '@/services/activity-service'
import { formatCurrency } from '@/utils/format-utils'

function formatActivityDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida'

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getActivityDescription(activity: RadarActivity): string {
  const actor = activity.actorName || 'Un mánager'
  const player = activity.playerName ? ` · ${activity.playerName}` : ''
  const counterparty = activity.counterpartyName
    ? ` · ${activity.counterpartyName}`
    : ''

  if (activity.activityTypeId === 9) return `${actor} se unió a la liga`
  if (activity.activityTypeId === 6)
    return `${actor} recibió un premio de jornada`
  if (activity.activityTypeId === 7)
    return `${actor} no puntuó por alineación incorrecta`

  return `${actor} · ${activity.label}${player}${counterparty}`
}

export default function LeagueActivityPage() {
  const params = useParams()
  const leagueId = params.leagueId as string
  const teamId = params.teamId as string
  const [radar, setRadar] = useState<ActivityRadar | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRadar = useCallback(async () => {
    setLoading(true)
    setError('')

    const result = await activityService.getRadar(leagueId, teamId)
    if (result.error || !result.data) {
      setError(result.error || 'No se pudo cargar la actividad')
      setRadar(null)
    } else {
      setRadar(result.data)
    }
    setLoading(false)
  }, [leagueId, teamId])

  useEffect(() => {
    void loadRadar()
  }, [loadRadar])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Radar de actividad
                </h1>
                <p className="mt-2 text-gray-600">
                  Movimientos recientes, presupuesto y balance por mánager.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => void loadRadar()}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                Actualizar
              </Button>
            </div>

            {loading && <BouncingBallLoader message="Cargando actividad..." />}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {!loading && radar && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="flex items-center gap-3">
                      <CalendarDays className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Jornada actual</p>
                        <p className="text-2xl font-bold">
                          {radar.currentWeek.weekNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {radar.currentWeek.isLive
                            ? 'En juego'
                            : 'No iniciada'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center gap-3">
                      <CircleDollarSign className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Presupuesto</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(radar.money.teamMoney)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-500">Inversión</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(radar.money.teamInvestment)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center gap-3">
                      <Activity className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="text-sm text-gray-500">
                          Volumen reciente
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(radar.totalVolume)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {radar.managerSummaries.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Balance reciente por mánager
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {radar.managerSummaries.map((summary) => (
                        <Card key={summary.managerName} className="p-4">
                          <CardContent>
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="w-4 h-4 text-blue-600" />
                              <h3 className="font-semibold">
                                {summary.managerName}
                              </h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-gray-500">Acciones</p>
                                <p className="font-semibold">
                                  {summary.activityCount}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Gasto</p>
                                <p className="font-semibold text-red-600">
                                  {formatCurrency(summary.spent)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Ingreso</p>
                                <p className="font-semibold text-green-600">
                                  {formatCurrency(summary.earned)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Últimos movimientos
                  </h2>

                  {radar.activities.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8 text-gray-600">
                        Todavía no hay actividad en esta liga.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {radar.activities.map((activity) => (
                        <Card key={activity.id} className="p-4">
                          <CardContent className="flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-1">
                                  {activity.label}
                                </span>
                                <time className="text-xs text-gray-500">
                                  {formatActivityDate(activity.createdAt)}
                                </time>
                              </div>
                              <p className="text-gray-900">
                                {getActivityDescription(activity)}
                              </p>
                            </div>

                            {activity.amount !== undefined && (
                              <span
                                className={`font-semibold whitespace-nowrap ${
                                  activity.direction === 'expense'
                                    ? 'text-red-600'
                                    : activity.direction === 'income'
                                      ? 'text-green-600'
                                      : 'text-gray-700'
                                }`}
                              >
                                {activity.direction === 'expense' ? '-' : '+'}
                                {formatCurrency(Math.abs(activity.amount))}
                              </span>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
