import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import {
  AlertTriangle,
  Check,
  Clock,
  Euro,
  Eye,
  EyeOff,
  Minus,
  Percent,
  Shield,
  Shirt,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  X,
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
  type PlayerOffer,
} from '@/entities/player'
import { useLanguage } from '@/i18n/language-provider'
import { getBuyoutClauseStatus, getSaleStatus } from '@/lib/player-utils'
import type { StartingProbability } from '@/lib/starting-probability'
import {
  getMarketTrendSignal,
  type MarketTrend,
  type MarketTrendSignal,
} from '@/services/market-trend-service'

const TREND_SIGNAL_STYLES: Record<MarketTrendSignal, string> = {
  'rising-confirmed': 'bg-green-100 text-green-700',
  'rising-slowing': 'bg-amber-100 text-amber-800',
  'possible-bullish-turn': 'bg-amber-100 text-amber-800',
  'possible-bearish-turn': 'bg-orange-100 text-orange-800',
  'likely-bearish-turn': 'bg-red-100 text-red-700',
  'falling-confirmed': 'bg-red-100 text-red-700',
  'possible-rebound': 'bg-amber-100 text-amber-800',
  mixed: 'bg-gray-100 text-gray-700',
}

interface PlayerCardProps {
  player: Player
  detailsHref?: string
  marketTrend?: MarketTrend | null
  marketTrendLoading?: boolean
  showMarketTrend?: boolean
  showStartingProbability?: boolean
  startingProbability?: StartingProbability | null
  startingProbabilityLoading?: boolean
  showOfferDetails?: boolean
  showSaleInfo?: boolean
  offers?: PlayerOffer[]
  offersLoading?: boolean
  purchasePrice?: number
  clauseWatchEnabled?: boolean
  clauseWatched?: boolean
  onToggleClauseWatch?: () => void
  onIncreaseClause?: () => void
  clauseActionPending?: boolean
  onAcceptOffer?: (offer: PlayerOffer) => void
  onRejectOffer?: (offer: PlayerOffer) => void
  offerActionId?: string | null
}

export function PlayerCard({
  player,
  detailsHref,
  marketTrend,
  marketTrendLoading = false,
  showMarketTrend = false,
  showStartingProbability = false,
  startingProbability,
  startingProbabilityLoading = false,
  showOfferDetails = false,
  showSaleInfo = true,
  offers,
  offersLoading = false,
  purchasePrice,
  clauseWatchEnabled = false,
  clauseWatched = false,
  onToggleClauseWatch,
  onIncreaseClause,
  clauseActionPending = false,
  onAcceptOffer,
  onRejectOffer,
  offerActionId,
}: PlayerCardProps) {
  const { locale, t } = useLanguage()
  const buyoutStatus = getBuyoutClauseStatus(player)
  const saleStatus = getSaleStatus(player)
  const trendSignal = marketTrend ? getMarketTrendSignal(marketTrend) : null
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
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  const formatTrendPercentage = (percentage: number): string =>
    new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(percentage)
  const formatOfferDifference = (amount: number): string => {
    const difference = amount - player.marketValue
    if (difference === 0) {
      return t('player.offerEqual', {
        price: formatMarketChange(player.marketValue),
      })
    }

    const percentage =
      player.marketValue > 0
        ? (Math.abs(difference) / player.marketValue) * 100
        : 0
    return t(difference > 0 ? 'player.offerAbove' : 'player.offerBelow', {
      price: formatMarketChange(player.marketValue),
      amount: formatMarketChange(Math.abs(difference)),
      percentage: formatTrendPercentage(percentage),
    })
  }
  const formatPurchaseDifference = (amount: number): string => {
    if (!purchasePrice) return ''

    const difference = amount - purchasePrice
    if (difference === 0) {
      return t('player.offerPurchaseEqual', {
        price: formatMarketChange(purchasePrice),
      })
    }

    const percentage = (Math.abs(difference) / purchasePrice) * 100
    return t(
      difference > 0
        ? 'player.offerPurchaseAbove'
        : 'player.offerPurchaseBelow',
      {
        price: formatMarketChange(purchasePrice),
        amount: formatMarketChange(Math.abs(difference)),
        percentage: formatTrendPercentage(percentage),
      }
    )
  }

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

        {showStartingProbability && (
          <div className="flex items-start justify-between gap-3 border-t pt-3 text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Percent className="h-4 w-4" />
              {t('probability.label')}
            </span>
            {startingProbability ? (
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
                    startingProbability.probability >= 80
                      ? 'bg-green-100 text-green-700'
                      : startingProbability.probability >= 50
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {startingProbability.probability}%
                </span>
                <a
                  href={startingProbability.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t('probability.source', {
                    source: startingProbability.sourceName,
                  })}
                </a>
              </div>
            ) : (
              <span className="text-right text-xs text-gray-500">
                {t(
                  startingProbabilityLoading
                    ? 'probability.loading'
                    : 'probability.unavailable'
                )}
              </span>
            )}
          </div>
        )}

        {showMarketTrend && (
          <div className="flex items-start justify-between gap-3 border-t pt-3 text-sm">
            <span className="text-gray-600">{t('trend.label')}</span>
            {marketTrend ? (
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`flex items-center gap-1 text-right font-semibold ${
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
                    {t('trend.momentum')}{' '}
                    {marketTrend.momentumScore > 0 ? '+' : ''}
                    {formatTrendPercentage(marketTrend.momentumScore)}%
                  </span>
                </span>
                {marketTrend.periods.map((period) => (
                  <span
                    key={period.days}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                      period.direction === 'up'
                        ? 'bg-green-100 text-green-700'
                        : period.direction === 'down'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span>{t('trend.period', { days: period.days })}</span>
                    {period.direction === 'up' ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : period.direction === 'down' ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {period.change > 0 ? '+' : period.change < 0 ? '-' : ''}
                      {formatMarketChange(Math.abs(period.change))} ·{' '}
                      {period.changePercent > 0 ? '+' : ''}
                      {formatTrendPercentage(period.changePercent)}%
                    </span>
                  </span>
                ))}
                {trendSignal && (
                  <span
                    className={`mt-1 rounded px-2 py-1 text-right text-xs font-semibold ${TREND_SIGNAL_STYLES[trendSignal]}`}
                  >
                    {t(`trend.signal.${trendSignal}`)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-right text-xs text-gray-500">
                {t(marketTrendLoading ? 'trend.loading' : 'trend.unavailable')}
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
            {clauseWatchEnabled && onToggleClauseWatch && (
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                onClick={onToggleClauseWatch}
              >
                {clauseWatched ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {t(
                  clauseWatched
                    ? 'clauseWatch.stopWatching'
                    : 'clauseWatch.watch'
                )}
              </button>
            )}
            {onIncreaseClause && (
              <button
                type="button"
                className="mt-3 ml-3 inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline disabled:opacity-50"
                disabled={clauseActionPending}
                onClick={onIncreaseClause}
              >
                <Shield className="h-3.5 w-3.5" />
                {t(
                  clauseActionPending
                    ? 'player.increasingClause'
                    : 'player.increaseClause'
                )}
              </button>
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

        {showSaleInfo && player.saleInfo && (
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
              {t(
                player.saleInfo.numberOfOffers === 1
                  ? 'player.offerCountOne'
                  : 'player.offerCountOther',
                { count: player.saleInfo.numberOfOffers }
              )}
            </div>
            {showOfferDetails && player.saleInfo.numberOfOffers > 0 && (
              <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
                {offersLoading ? (
                  <p className="text-xs text-blue-600">
                    {t('player.offerAmountsLoading')}
                  </p>
                ) : offers && offers.length > 0 ? (
                  offers.map((offer, index) => {
                    const difference = offer.amount - player.marketValue
                    const purchaseDifference = purchasePrice
                      ? offer.amount - purchasePrice
                      : null
                    return (
                      <div
                        key={offer.id}
                        className="rounded border border-blue-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-blue-700">
                            {t('player.offerNumber', { number: index + 1 })}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {getFormattedSalePrice(offer.amount)}
                          </span>
                        </div>
                        <p
                          className={`mt-1 text-right text-xs font-medium ${
                            difference > 0
                              ? 'text-green-600'
                              : difference < 0
                                ? 'text-red-600'
                                : 'text-slate-600'
                          }`}
                        >
                          {formatOfferDifference(offer.amount)}
                        </p>
                        {purchaseDifference !== null && (
                          <p
                            className={`mt-1 text-right text-xs font-medium ${
                              purchaseDifference > 0
                                ? 'text-green-600'
                                : purchaseDifference < 0
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                            }`}
                          >
                            {formatPurchaseDifference(offer.amount)}
                          </p>
                        )}
                        {onAcceptOffer && onRejectOffer && (
                          <div className="mt-2 flex justify-end gap-2 border-t border-blue-100 pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              disabled={offerActionId === offer.id}
                              onClick={() => onRejectOffer(offer)}
                            >
                              <X className="h-3.5 w-3.5" />
                              {t('player.rejectOffer')}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              disabled={offerActionId === offer.id}
                              onClick={() => onAcceptOffer(offer)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              {t('player.acceptOffer')}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-blue-600">
                    {t('player.offerAmountsUnavailable')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
