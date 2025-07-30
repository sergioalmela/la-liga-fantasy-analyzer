import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Euro, Clock, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { type MarketPlayer } from '@/types/api';
import { 
  getMarketSaleStatus, 
  formatCurrency, 
  getPositionName,
  calculatePriceDifference 
} from '@/lib/player-utils';

interface MarketPlayerCardProps {
  player: MarketPlayer;
  onPlaceBid: (playerId: string, playerName: string, playerMasterId: string) => void;
  biddingPlayer: string | null;
  bidAmount: string;
  setBidAmount: (amount: string) => void;
  bidLoading: boolean;
  bidError: string | null;
  bidSuccess: string | null;
  openBidDialog: (playerId: string) => void;
  closeBidDialog: () => void;
}

export function MarketPlayerCard({
  player,
  onPlaceBid,
  biddingPlayer,
  bidAmount,
  setBidAmount,
  bidLoading,
  bidError,
  bidSuccess,
  openBidDialog,
  closeBidDialog
}: MarketPlayerCardProps) {
  const marketValueFormatted = formatCurrency(player.playerMaster.marketValue);
  const salePriceFormatted = formatCurrency(player.salePrice);
  const saleStatus = getMarketSaleStatus(player);
  const positionName = getPositionName(player.playerMaster.positionId);
  
  const { difference: priceDifference, percentDiff: pricePercentDiff, isGoodDeal } = 
    calculatePriceDifference(player.salePrice, player.playerMaster.marketValue);

  return (
    <Card className={`hover:shadow-md transition-shadow ${isGoodDeal ? 'border-green-200' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{player.playerMaster.nickname || player.playerMaster.name}</span>
          <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
            {positionName}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Team:</span>
          <span className="font-medium text-slate-800">{player.playerMaster.team?.name || 'Unknown'}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Market Value</div>
            <div className="font-medium text-gray-500">{marketValueFormatted}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Sale Price</div>
            <div className={`font-medium ${isGoodDeal ? 'text-green-600' : 'text-red-600'}`}>
              {salePriceFormatted}
            </div>
          </div>
        </div>
        
        {priceDifference !== 0 && (
          <div className={`text-xs px-2 py-1 rounded ${
            isGoodDeal ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {isGoodDeal ? '📉' : '📈'} {isGoodDeal ? '-' : '+'}{formatCurrency(Math.abs(priceDifference))} ({pricePercentDiff}%)
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Points:
          </span>
          <span className="font-medium text-slate-800">
            {player.playerMaster.points} ({player.playerMaster.averagePoints.toFixed(1)} avg)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Users className="w-4 h-4" />
            Bids:
          </span>
          <span className="font-medium text-slate-800">{player.numberOfBids}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Status:
          </span>
          <span className={`text-sm font-medium ${saleStatus.color}`}>
            {saleStatus.message}
          </span>
        </div>

        {saleStatus.status !== 'expired' && (
          <div className="border-t pt-3">
            {biddingPlayer === player.id ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Bid amount (€)"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={player.salePrice + 1}
                  />
                  <Button
                    onClick={() => onPlaceBid(
                      player.id,
                      player.playerMaster.nickname || player.playerMaster.name,
                      player.playerMaster.id
                    )}
                    disabled={bidLoading || !bidAmount || parseInt(bidAmount) <= player.salePrice}
                    size="sm"
                  >
                    {bidLoading ? 'Bidding...' : 'Bid'}
                  </Button>
                </div>
                
                {bidError && (
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {bidError}
                  </div>
                )}
                
                {bidSuccess && (
                  <div className="text-xs text-green-600">
                    {bidSuccess}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeBidDialog}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => openBidDialog(player.id)}
                className="w-full"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Place Bid
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}