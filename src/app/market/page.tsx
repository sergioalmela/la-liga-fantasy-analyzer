'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMarketPlayers, getLeagues, type MarketPlayer } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';
import { ShoppingCart, Euro, Clock, Users, TrendingUp, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function MarketPlayerCard({ player }: { player: MarketPlayer }) {
  const marketValueFormatted = `${(player.playerMaster.marketValue / 1000000).toFixed(1)}M€`;
  const salePriceFormatted = `${(player.salePrice / 1000000).toFixed(1)}M€`;
  
  const getSaleStatus = () => {
    const expirationDate = new Date(player.expirationDate);
    const now = new Date();
    
    if (expirationDate <= now) {
      return { status: 'expired', message: 'Expired', color: 'text-red-600' };
    }
    
    const hoursLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft <= 24) {
      return { status: 'ending_soon', message: `${hoursLeft}h left`, color: 'text-orange-600' };
    }
    
    const timeLeft = formatDistanceToNow(expirationDate, { addSuffix: true });
    return { status: 'active', message: `Ends ${timeLeft}`, color: 'text-green-600' };
  };

  const saleStatus = getSaleStatus();
  const positionNames = {
    1: 'GK',
    2: 'DEF', 
    3: 'MID',
    4: 'FWD'
  };
  
  const priceDifference = player.salePrice - player.playerMaster.marketValue;
  const pricePercentDiff = ((priceDifference / player.playerMaster.marketValue) * 100).toFixed(1);
  const isGoodDeal = priceDifference < 0;

  return (
    <Card className={`hover:shadow-md transition-shadow ${isGoodDeal ? 'border-green-200' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{player.playerMaster.nickname || player.playerMaster.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
              {positionNames[player.playerMaster.positionId as keyof typeof positionNames] || 'Unknown'}
            </span>
            {isGoodDeal && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                Good Deal
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Team:</span>
          <span className="font-medium">{player.playerMaster.team?.name || 'Unknown'}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Euro className="w-4 h-4" />
            Market Value:
          </span>
          <span className="font-medium">{marketValueFormatted}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <ShoppingCart className="w-4 h-4" />
            Sale Price:
          </span>
          <span className={`font-medium ${isGoodDeal ? 'text-green-600' : 'text-red-600'}`}>
            {salePriceFormatted}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Price Difference:</span>
          <span className={`font-medium text-sm ${isGoodDeal ? 'text-green-600' : 'text-red-600'}`}>
            {priceDifference > 0 ? '+' : ''}{(priceDifference / 1000000).toFixed(1)}M€ ({pricePercentDiff}%)
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Points:
          </span>
          <span className="font-medium">
            {player.playerMaster.points} ({player.playerMaster.averagePoints.toFixed(1)} avg)
          </span>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Sale Status:
            </span>
            <span className={`text-sm font-medium ${saleStatus.color}`}>
              {saleStatus.message}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Bids:
            </span>
            <span className="text-sm font-medium">{player.numberOfBids}</span>
          </div>
        </div>

        <div className="pt-3">
          <Button 
            size="sm" 
            variant={isGoodDeal ? "primary" : "outline"} 
            className="w-full"
            disabled={saleStatus.status === 'expired'}
          >
            {saleStatus.status === 'expired' ? 'Sale Ended' : 'Place Bid'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketPage() {
  const [marketPlayers, setMarketPlayers] = useState<MarketPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [positionFilter, setPositionFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'value' | 'points' | 'expiration'>('expiration');

  useEffect(() => {
    const loadMarketPlayers = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        // First get leagues to get the league ID
        const leaguesResult = await getLeagues(token);
        if (leaguesResult.error || !leaguesResult.data?.length) {
          setError('Could not load league information');
          return;
        }

        const leagueId = leaguesResult.data[0].id;
        const result = await getMarketPlayers(token, leagueId);
        
        if (result.error) {
          setError(result.error);
        } else {
          setMarketPlayers(result.data || []);
        }
      } catch (err) {
        setError('Failed to load market players');
      } finally {
        setLoading(false);
      }
    };

    loadMarketPlayers();
  }, []);

  const filteredAndSortedPlayers = marketPlayers
    .filter(player => {
      if (positionFilter === null) return true;
      return player.playerMaster.positionId === positionFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.salePrice - b.salePrice;
        case 'value':
          return b.playerMaster.marketValue - a.playerMaster.marketValue;
        case 'points':
          return b.playerMaster.points - a.playerMaster.points;
        case 'expiration':
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        default:
          return 0;
      }
    });

  const positionCounts = {
    1: marketPlayers.filter(p => p.playerMaster.positionId === 1).length, // GK
    2: marketPlayers.filter(p => p.playerMaster.positionId === 2).length, // DEF
    3: marketPlayers.filter(p => p.playerMaster.positionId === 3).length, // MID
    4: marketPlayers.filter(p => p.playerMaster.positionId === 4).length, // FWD
  };

  const goodDeals = marketPlayers.filter(p => p.salePrice < p.playerMaster.marketValue).length;
  const endingSoon = marketPlayers.filter(p => {
    const hoursLeft = (new Date(p.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 24;
  }).length;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Transfer Market</h1>
              <p className="mt-2 text-gray-600">
                Browse available players and find the best deals
              </p>
            </div>

            {/* Summary Stats */}
            {!loading && !error && marketPlayers.length > 0 && (
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{marketPlayers.length}</div>
                    <p className="text-sm text-gray-600">Available Players</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{goodDeals}</div>
                    <p className="text-sm text-gray-600">Good Deals</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{endingSoon}</div>
                    <p className="text-sm text-gray-600">Ending Soon</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {marketPlayers.reduce((sum, p) => sum + p.numberOfBids, 0)}
                    </div>
                    <p className="text-sm text-gray-600">Total Bids</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters and Sort */}
            {!loading && !error && marketPlayers.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Position:</span>
                  <select
                    value={positionFilter || ''}
                    onChange={(e) => setPositionFilter(e.target.value ? Number(e.target.value) : null)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="">All ({marketPlayers.length})</option>
                    <option value="1">GK ({positionCounts[1]})</option>
                    <option value="2">DEF ({positionCounts[2]})</option>
                    <option value="3">MID ({positionCounts[3]})</option>
                    <option value="4">FWD ({positionCounts[4]})</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="expiration">Expiration</option>
                    <option value="price">Sale Price</option>
                    <option value="value">Market Value</option>
                    <option value="points">Points</option>
                  </select>
                </div>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading market players...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && marketPlayers.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No players available</h3>
                <p className="text-gray-600">
                  The transfer market is currently empty.
                </p>
              </div>
            )}

            {!loading && !error && filteredAndSortedPlayers.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedPlayers.map((player) => (
                  <MarketPlayerCard key={`${player.playerMaster.id}-${player.salePrice}`} player={player} />
                ))}
              </div>
            )}

            {!loading && !error && marketPlayers.length > 0 && filteredAndSortedPlayers.length === 0 && (
              <div className="text-center py-12">
                <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No players match your filters</h3>
                <p className="text-gray-600">
                  Try adjusting your position filter to see more players.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}