import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Euro, Clock, Shield, AlertTriangle } from 'lucide-react';
import { type Player } from '@/types/api';
import { 
  getBuyoutClauseStatus, 
  getSaleStatus, 
  formatCurrency, 
  getPositionName 
} from '@/lib/player-utils';

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const marketValueFormatted = formatCurrency(player.marketValue);
  const buyoutClauseFormatted = player.buyoutClause ? formatCurrency(player.buyoutClause) : null;
  
  const buyoutStatus = getBuyoutClauseStatus(player);
  const saleStatus = getSaleStatus(player);
  const positionName = getPositionName(player.positionId);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{player.nickname || player.name}</span>
          <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
            {positionName}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Team:</span>
          <span className="font-medium text-slate-800">{player.team?.name || 'Unknown'}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Euro className="w-4 h-4" />
            Market Value:
          </span>
          <span className="font-medium text-green-600">{marketValueFormatted}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
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
              <span className="font-medium text-slate-800">{buyoutClauseFormatted}</span>
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

        {player.saleInfo && (
          <div className="border-t pt-3 bg-blue-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" />
                On Sale:
              </span>
              <span className="font-medium text-blue-700">
                {formatCurrency(player.saleInfo.salePrice)}
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