'use client'

import { Lightbulb, Shirt, ShoppingCart, TrendingDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Player } from '@/entities/player'
import { getPlayerDisplayName } from '@/entities/player'
import { useLanguage } from '@/i18n/language-provider'
import type { StartingProbability } from '@/lib/starting-probability'
import { applyLineup } from '@/services/lineup-service'
import type { MarketTrend } from '@/services/market-trend-service'
import {
  buildLineupPayload,
  FORMATIONS,
  type Formation,
  getSellCandidates,
  getSquadNeeds,
  recommendLineup,
} from '@/services/squad-advisor-service'

const POSITION_KEYS = {
  1: 'advisor.goalkeepers',
  2: 'advisor.defenders',
  3: 'advisor.midfielders',
  4: 'advisor.forwards',
} as const

export function SquadAdvisorPanel({
  players,
  probabilities,
  trends,
  teamId,
}: {
  players: Player[]
  probabilities: ReadonlyMap<string, StartingProbability>
  trends: ReadonlyMap<string, MarketTrend>
  teamId: string
}) {
  const { t } = useLanguage()
  const [formation, setFormation] = useState<Formation>('4-3-3')
  const [applying, setApplying] = useState(false)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)
  const lineup = useMemo(
    () => recommendLineup(players, formation, probabilities, trends),
    [formation, players, probabilities, trends]
  )
  const needs = useMemo(() => getSquadNeeds(players), [players])
  const sells = useMemo(
    () => getSellCandidates(players, lineup, probabilities, trends),
    [lineup, players, probabilities, trends]
  )
  const lineupPayload = useMemo(
    () => buildLineupPayload(lineup, formation),
    [formation, lineup]
  )

  const handleApply = async () => {
    if (!lineupPayload || applying) return
    const confirmed = window.confirm(t('advisor.applyConfirm', { formation }))
    if (!confirmed) return

    setApplying(true)
    setApplyStatus(null)
    const result = await applyLineup(teamId, lineupPayload)
    setApplyStatus(
      result.error ? t('advisor.applyError') : t('advisor.applySuccess')
    )
    setApplying(false)
  }

  return (
    <Card className="mb-8 border-indigo-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-indigo-600" />
              {t('advisor.title')}
            </CardTitle>
            <p className="mt-1 text-xs text-gray-600">{t('advisor.hint')}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            {t('advisor.formation')}
            <select
              value={formation}
              onChange={(event) =>
                setFormation(event.target.value as Formation)
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {Object.keys(FORMATIONS).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            size="sm"
            disabled={!lineupPayload || applying}
            onClick={() => void handleApply()}
          >
            {applying ? t('advisor.applying') : t('advisor.apply')}
          </Button>
        </div>
        {applyStatus && (
          <p className="mt-3 text-sm text-indigo-700">{applyStatus}</p>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg bg-indigo-50 p-4 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <Shirt className="h-4 w-4" />
            {t('advisor.lineup', { count: lineup.length })}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {([1, 2, 3, 4] as const).map((positionId) => {
              const positionPlayers = lineup.filter(
                (player) => player.positionId === positionId
              )
              return (
                <div key={positionId}>
                  <p className="text-xs font-medium uppercase text-indigo-700">
                    {t(POSITION_KEYS[positionId])}
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {positionPlayers.length > 0
                      ? positionPlayers.map(getPlayerDisplayName).join(', ')
                      : t('advisor.noPlayer')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg bg-amber-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
              <ShoppingCart className="h-4 w-4" />
              {t('advisor.needs')}
            </h3>
            <p className="text-sm text-amber-800">
              {needs.length > 0
                ? needs
                    .map(
                      (need) =>
                        `${t(POSITION_KEYS[need.positionId])}: ${need.missing}`
                    )
                    .join(' · ')
                : t('advisor.noNeeds')}
            </p>
          </section>

          <section className="rounded-lg bg-red-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-900">
              <TrendingDown className="h-4 w-4" />
              {t('advisor.sellReview')}
            </h3>
            <p className="text-sm text-red-800">
              {sells.length > 0
                ? sells
                    .map((candidate) => getPlayerDisplayName(candidate.player))
                    .join(', ')
                : t('advisor.noSells')}
            </p>
            {sells.length > 0 && (
              <p className="mt-2 text-xs text-red-600">
                {t('advisor.sellDisclaimer')}
              </p>
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
