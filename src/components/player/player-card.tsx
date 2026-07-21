import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import {
  AlertTriangle,
  Clock,
  Euro,
  Minus,
  Shield,
  Shirt,
  Target,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PositionBadge } from '@/components/ui/position-badge'
import {
  getFormattedBuyoutClause,
  getFormattedMarketValue,
  getFormattedSalePrice,
  getPlayerDisplayName,
  type Player,
} from '@/entities/player'
import { useLanguage } from '@/i18n/language-provider'
import { getBuyoutClauseStatus, getSaleStatus } from '@/lib/player-utils'
import type { MarketTrend } from '@/services/market-trend-service'

interface PlayerCardProps {
  player: Player
  detailsHref?: string
  marketTrend?: MarketTrend | null
  showMarketTrend?: boolean
}

export function PlayerCard({
  player,
  detailsHref,
  marketTrend,
  showMarketTrend = false,
}: PlayerCardProps) {
  const { locale, t } = useLanguage()
  const buyoutStatus = getBuyoutClauseStatus(player)
  const saleStatus = getSaleStatus(player)
  const buyoutMessage = (() => {
    if (!buyoutStatus) return ''
    if (buyoutStatus.status === 'unprotected') return t('player.noProtection')
    if (buyoutStatus.status === 'expired') return t('player.protectionExpired')
    if (buyoutStatus.status === 'expiring') {
      return t('player.hoursLeft', {
        hours: buyoutStatus.remainingHours || 0,
      })
    }
    return t('player.daysLeft', {
      days: Math.ceil((buyoutStatus.remainingHours || 0) / 24),
    })
  })()
  const saleMessage = (() => {
    if (!saleStatus || !player.saleInfo) return ''
    if (saleStatus.status === 'expired') return t('player.saleExpired')
    return t('player.saleExpires', {
      time: formatDistanceToNow(new Date(player.saleInfo.expirationDate), {
        addSuffix: true,
        locale: locale === 'es' ? es : enUS,
      }),
    })
  })()
  const formatMarketChange = (amount: number): string =>
    new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{getPlayerDisplayName(player)}</span>
          <PositionBadge player={player} variant="compact" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Shirt className="w-4 h-4" />
            {t('player.team')}
          </span>
          <span className="font-medium text-slate-800">{player.team.name}</span>
        </div>

        {showMarketTrend && (
          <div className="flex items-start justify-between gap-3 border-t pt-3 text-sm">
            <span className="text-gray-600">{t('trend.label')}</span>
            {marketTrend ? (
              <span
                className={`flex items-center gap-1 text-right font-medium ${
                  marketTrend.direction === 'up'
                    ? 'text-green-600'
                    : marketTrend.direction === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                }`}
              >
                {marketTrend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : marketTrend.direction === 'down' ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>
                  {t(`trend.${marketTrend.direction}`)}{' '}
                  {marketTrend.change > 0
                    ? '+'
                    : marketTrend.change < 0
                      ? '-'
                      : ''}
                  {formatMarketChange(Math.abs(marketTrend.change))} (
                  {marketTrend.changePercent > 0 ? '+' : ''}
                  {marketTrend.changePercent}%) ·{' '}
                  {t('trend.days', { days: marketTrend.days })}
                </span>
              </span>
            ) : (
              <span className="text-right text-xs text-gray-500">
                {t('trend.collecting')}
              </span>
            )}
          </div>
        )}

        {player.owner && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <User className="w-4 h-4" />
              {t('player.owner')}
            </span>
            <span className="font-medium text-blue-600">
              {player.owner.name}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Euro className="w-4 h-4" />
            {t('player.marketValue')}
          </span>
          <span className="font-medium text-green-600">
            {getFormattedMarketValue(player)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Target className="w-4 h-4" />
            {t('player.points')}
          </span>
          <span className="font-medium text-slate-800">
            {player.points} ({player.averagePoints.toFixed(1)}{' '}
            {t('player.average')})
          </span>
        </div>

        {player.buyoutClause && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                {t('player.buyout')}
              </span>
              <span className="font-medium text-slate-800">
                {getFormattedBuyoutClause(player)}
              </span>
            </div>
            {buyoutStatus && (
              <div
                className={`text-xs ${buyoutStatus.color} flex items-center gap-1`}
              >
                {buyoutStatus.status === 'protected' ? (
                  <Shield className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {buyoutMessage}
              </div>
            )}
          </div>
        )}

        {detailsHref && (
          <div className="border-t pt-3 text-right">
            <Link
              href={detailsHref}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {t('player.details')}
            </Link>
          </div>
        )}

        {player.saleInfo && (
          <div className="border-t pt-3 bg-blue-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {t('player.onSale')}
              </span>
              <span className="font-medium text-blue-700">
                {getFormattedSalePrice(player.saleInfo.salePrice)}
              </span>
            </div>
            {saleStatus && (
              <div className={`text-xs ${saleStatus.color}`}>{saleMessage}</div>
            )}
            <div className="text-xs text-blue-600 mt-1">
              {t('player.offers', {
                count: player.saleInfo.numberOfOffers,
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
