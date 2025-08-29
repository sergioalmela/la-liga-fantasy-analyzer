import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Euro, Clock, Shield, AlertTriangle, Target, User, Shirt } from 'lucide-react';
import { type Player, getPlayerDisplayName, getFormattedMarketValue, getFormattedBuyoutClause, getFormattedSalePrice } from '@/entities/player';
import { PositionBadge } from '@/components/ui/position-badge';
import { 
  getBuyoutClauseStatus, 
  getSaleStatus,
  getMomentumDisplay,
  getTrendDisplay
} from '@/lib/player-utils';

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const buyoutStatus = getBuyoutClauseStatus(player);
  const saleStatus = getSaleStatus(player);

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
            Team:
          </span>
          <span className="font-medium text-slate-800">{player.team.name}</span>
        </div>
        
        {player.owner && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <User className="w-4 h-4" />
              Owner:
            </span>
            <span className="font-medium text-blue-600">{player.owner.name}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Euro className="w-4 h-4" />
            Market Value:
          </span>
          <span className="font-medium text-green-600">{getFormattedMarketValue(player)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Target className="w-4 h-4" />
            Points:
          </span>
          <span className="font-medium text-slate-800">{player.points} ({player.averagePoints.toFixed(1)} avg)</span>
        </div>

        {player.buyoutClause && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Buyout Clause:
              </span>
              <span className="font-medium text-slate-800">{getFormattedBuyoutClause(player)}</span>
            </div>
            {buyoutStatus && (
              <div className={`text-xs ${buyoutStatus.color} flex items-center gap-1`}>
                {buyoutStatus.status === 'protected' ? (
                  <Shield className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {buyoutStatus.message}
              </div>
            )}
          </div>
        )}

        {player.analysis && (() => {
          const momentumDisplay = getMomentumDisplay(player.analysis.momentumScore);
          const trend1d = getTrendDisplay(player.analysis.trends.last1Days);
          const trend3d = getTrendDisplay(player.analysis.trends.last3Days);
          const trend7d = getTrendDisplay(player.analysis.trends.last7Days);
          
          return (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <momentumDisplay.icon className={`w-4 h-4 ${momentumDisplay.iconColor}`} />
                  Momentum:
                </span>
                <span className={`font-bold ${momentumDisplay.scoreColor}`}>
                  {momentumDisplay.formattedScore}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Trends (1d/3d/7d):</span>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded ${trend1d.className}`}>
                    {trend1d.formattedValue}
                  </span>
                  <span className={`px-2 py-1 rounded ${trend3d.className}`}>
                    {trend3d.formattedValue}
                  </span>
                  <span className={`px-2 py-1 rounded ${trend7d.className}`}>
                    {trend7d.formattedValue}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {player.saleInfo && (
          <div className="border-t pt-3 bg-blue-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" />
                On Sale:
              </span>
              <span className="font-medium text-blue-700">
                {getFormattedSalePrice(player.saleInfo.salePrice)}
              </span>
            </div>
            {saleStatus && (
              <div className={`text-xs ${saleStatus.color}`}>
                {saleStatus.message}
              </div>
            )}
            <div className="text-xs text-blue-600 mt-1">
              {player.saleInfo.numberOfOffers} offers
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}