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
import { useLanguage } from '@/i18n/language-provider'
import type { TranslationKey } from '@/i18n/messages'
import {
  type ActivityRadar,
  activityService,
  type RadarActivity,
} from '@/services/activity-service'
import { formatCurrency } from '@/utils/format-utils'

type Translate = ReturnType<typeof useLanguage>['t']

const ACTIVITY_LABEL_KEYS: Partial<Record<number, TranslationKey>> = {
  1: 'activity.type.1',
  4: 'activity.type.4',
  6: 'activity.type.6',
  7: 'activity.type.7',
  9: 'activity.type.9',
  31: 'activity.type.31',
  32: 'activity.type.32',
  33: 'activity.type.33',
}

function formatActivityDate(
  value: string,
  locale: 'es' | 'en',
  t: Translate
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('common.unknownDate')

  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getActivityLabel(activity: RadarActivity, t: Translate): string {
  const key = ACTIVITY_LABEL_KEYS[activity.activityTypeId]
  return key
    ? t(key)
    : t('activity.type.other', { id: activity.activityTypeId })
}

function getActivityDescription(activity: RadarActivity, t: Translate): string {
  const actor = activity.actorName || t('activity.unknownManager')
  const player = activity.playerName ? ` · ${activity.playerName}` : ''
  const counterparty = activity.counterpartyName
    ? ` · ${activity.counterpartyName}`
    : ''

  if (activity.activityTypeId === 9) return t('activity.joined', { actor })
  if (activity.activityTypeId === 6) return t('activity.reward', { actor })
  if (activity.activityTypeId === 7)
    return t('activity.invalidLineup', { actor })

  return `${actor} · ${getActivityLabel(activity, t)}${player}${counterparty}`
}

export default function LeagueActivityPage() {
  const { locale, t } = useLanguage()
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
      setError(t('activity.loadError'))
      setRadar(null)
    } else {
      setRadar(result.data)
    }
    setLoading(false)
  }, [leagueId, t, teamId])

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
                  {t('activity.title')}
                </h1>
                <p className="mt-2 text-gray-600">{t('activity.subtitle')}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => void loadRadar()}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                {t('common.refresh')}
              </Button>
            </div>

            {loading && <BouncingBallLoader message={t('activity.loading')} />}

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
                        <p className="text-sm text-gray-500">
                          {t('activity.currentWeek')}
                        </p>
                        <p className="text-2xl font-bold">
                          {radar.currentWeek.weekNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {radar.currentWeek.isLive
                            ? t('dashboard.live')
                            : t('activity.notStarted')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center gap-3">
                      <CircleDollarSign className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">
                          {t('activity.budget')}
                        </p>
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
                        <p className="text-sm text-gray-500">
                          {t('activity.investment')}
                        </p>
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
                          {t('activity.volume')}
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
                      {t('activity.balance')}
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
                                <p className="text-gray-500">
                                  {t('activity.actions')}
                                </p>
                                <p className="font-semibold">
                                  {summary.activityCount}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">
                                  {t('activity.spent')}
                                </p>
                                <p className="font-semibold text-red-600">
                                  {formatCurrency(summary.spent)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">
                                  {t('activity.earned')}
                                </p>
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
                    {t('activity.latest')}
                  </h2>

                  {radar.activities.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8 text-gray-600">
                        {t('activity.empty')}
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
                                  {getActivityLabel(activity, t)}
                                </span>
                                <time className="text-xs text-gray-500">
                                  {formatActivityDate(
                                    activity.createdAt,
                                    locale,
                                    t
                                  )}
                                </time>
                              </div>
                              <p className="text-gray-900">
                                {getActivityDescription(activity, t)}
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
