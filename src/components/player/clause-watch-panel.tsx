'use client'

import { Bell, Clock3, RefreshCw, ShieldCheck, Trash2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/i18n/language-provider'
import type { TranslationKey } from '@/i18n/messages'
import { getUnlockTimestamp } from '@/lib/clause-watch'
import type {
  ClauseWatchController,
  ClauseWatchPhase,
} from '@/lib/use-clause-watch'
import { formatCurrency } from '@/utils/format-utils'

function formatCountdown(remainingMs: number, locale: string): string {
  if (remainingMs <= 0) return locale === 'es' ? 'Ahora' : 'Now'
  if (remainingMs < 10_000) return `${(remainingMs / 1_000).toFixed(1)} s`

  const totalSeconds = Math.ceil(remainingMs / 1_000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days} d ${hours} h ${minutes} min`
  if (hours > 0) return `${hours} h ${minutes} min ${seconds} s`
  return `${minutes} min ${seconds} s`
}

function phaseTone(phase: ClauseWatchPhase): string {
  if (phase === 'ready' || phase === 'purchased') return 'text-green-700'
  if (phase === 'waiting' || phase === 'checking') return 'text-blue-700'
  if (phase === 'idle') return 'text-gray-600'
  if (phase === 'purchasing') return 'text-purple-700'
  return 'text-red-700'
}

const PHASE_TRANSLATIONS: Record<ClauseWatchPhase, TranslationKey> = {
  idle: 'clauseWatch.status.idle',
  checking: 'clauseWatch.status.checking',
  waiting: 'clauseWatch.status.waiting',
  ready: 'clauseWatch.status.ready',
  'player-moved': 'clauseWatch.status.player-moved',
  'clause-changed': 'clauseWatch.status.clause-changed',
  'unlock-changed': 'clauseWatch.status.unlock-changed',
  'insufficient-balance': 'clauseWatch.status.insufficient-balance',
  'invalid-unlock': 'clauseWatch.status.invalid-unlock',
  purchasing: 'clauseWatch.status.purchasing',
  purchased: 'clauseWatch.status.purchased',
  failed: 'clauseWatch.status.failed',
}

export function ClauseWatchPanel({
  controller,
}: {
  controller: ClauseWatchController
}) {
  const { locale, t } = useLanguage()
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >('unsupported')

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  if (controller.watches.length === 0) return null

  const requestNotifications = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        setNotificationPermission(await Notification.requestPermission())
      } catch {
        setNotificationPermission('denied')
      }
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock3 className="h-5 w-5 text-blue-600" />
              {t('clauseWatch.title')}
            </CardTitle>
            <p className="mt-1 text-xs text-gray-600">
              {t('clauseWatch.keepOpen')}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {t('clauseWatch.rearm')}
            </p>
          </div>
          {notificationPermission === 'default' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void requestNotifications()}
            >
              <Bell className="h-4 w-4" />
              {t('clauseWatch.enableAlerts')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {controller.watches.map((target) => {
          const unlockTimestamp = getUnlockTimestamp(target.unlockAt)
          const remainingMs =
            unlockTimestamp === null
              ? 0
              : Math.max(0, unlockTimestamp - controller.now)
          const state = controller.runtime[target.playerId] ?? { phase: 'idle' }
          const canBuy = state.phase === 'ready'
          const automaticLabel = target.automatic
            ? t('clauseWatch.automaticArmed')
            : t('clauseWatch.automaticOff')

          return (
            <div
              key={target.playerId}
              className="rounded-lg border border-blue-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {target.playerName}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {formatCurrency(target.expectedClause)}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-gray-900">
                    {formatCountdown(remainingMs, locale)}
                  </p>
                  <p className={`mt-1 text-xs ${phaseTone(state.phase)}`}>
                    {t(PHASE_TRANSLATIONS[state.phase])}
                    {state.error ? ` · ${state.error}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={state.phase === 'checking'}
                    onClick={() => void controller.checkTarget(target)}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${state.phase === 'checking' ? 'animate-spin' : ''}`}
                    />
                    {t('common.refresh')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={target.automatic ? 'primary' : 'outline'}
                    className="gap-2"
                    onClick={() => {
                      if (!target.automatic) {
                        const confirmed = window.confirm(
                          t('clauseWatch.armConfirm', {
                            player: target.playerName,
                            price: formatCurrency(target.expectedClause),
                          })
                        )
                        if (!confirmed) return
                      }
                      controller.setAutomatic(
                        target.playerId,
                        !target.automatic
                      )
                    }}
                  >
                    <Zap className="h-4 w-4" />
                    {automaticLabel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canBuy || state.phase === 'purchasing'}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      const confirmed = window.confirm(
                        t('clauseWatch.buyConfirm', {
                          player: target.playerName,
                          price: formatCurrency(target.expectedClause),
                        })
                      )
                      if (confirmed) void controller.buyNow(target.playerId)
                    }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {t('clauseWatch.buy')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={t('clauseWatch.remove')}
                    onClick={() => controller.removeWatch(target.playerId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
