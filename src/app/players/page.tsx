'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMyPlayers, getLeagues, type Player } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';
import { Users, TrendingUp, Euro, Clock, Shield, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function PlayerCard({ player }: { player: Player }) {
  const marketValueFormatted = `${(player.marketValue / 1000000).toFixed(1)}M€`;
  const buyoutClauseFormatted = player.buyoutClause ? `${(player.buyoutClause / 1000000).toFixed(1)}M€` : null;
  
  const getBuyoutClauseStatus = () => {
    if (!player.buyoutClause) return null;
    
    if (!player.buyoutClauseLockedEndTime) {
      return { status: 'unprotected', message: 'No protection', color: 'text-red-600' };
    }
    
    const protectionEnd = new Date(player.buyoutClauseLockedEndTime);
    const now = new Date();
    
    if (protectionEnd <= now) {
      return { status: 'expired', message: 'Protection expired', color: 'text-red-600' };
    }
    
    const hoursLeft = Math.ceil((protectionEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft <= 24) {
      return { status: 'expiring', message: `${hoursLeft}h left`, color: 'text-orange-600' };
    }
    
    const daysLeft = Math.ceil(hoursLeft / 24);
    return { status: 'protected', message: `${daysLeft}d left`, color: 'text-green-600' };
  };
  
  const getSaleStatus = () => {
    if (!player.saleInfo) return null;
    
    const expirationDate = new Date(player.saleInfo.expirationDate);
    const now = new Date();
    
    if (expirationDate <= now) {
      return { status: 'expired', message: 'Sale expired', color: 'text-red-600' };
    }
    
    const timeLeft = formatDistanceToNow(expirationDate, { addSuffix: true });
    return { status: 'active', message: `Expires ${timeLeft}`, color: 'text-blue-600' };
  };

  const buyoutStatus = getBuyoutClauseStatus();
  const saleStatus = getSaleStatus();
  const positionNames = {
    1: 'GK',
    2: 'DEF',
    3: 'MID',
    4: 'FWD'
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{player.nickname || player.name}</span>
          <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
            {positionNames[player.positionId as keyof typeof positionNames] || 'Unknown'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Team:</span>
          <span className="font-medium">{player.team?.name || 'Unknown'}</span>
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
          <span className="font-medium">{player.points} ({player.averagePoints.toFixed(1)} avg)</span>
        </div>

        {player.buyoutClause && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Buyout Clause:
              </span>
              <span className="font-medium">{buyoutClauseFormatted}</span>
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
                {(player.saleInfo.salePrice / 1000000).toFixed(1)}M€
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

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPlayers = async () => {
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
        const result = await getMyPlayers(token, leagueId);
        
        if (result.error) {
          setError(result.error);
        } else {
          setPlayers(result.data || []);
        }
      } catch (err) {
        setError('Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, []);

  const totalValue = players.reduce((sum, player) => sum + player.marketValue, 0);
  const totalPoints = players.reduce((sum, player) => sum + player.points, 0);
  const averagePoints = players.length > 0 ? totalPoints / players.length : 0;

  const playersOnSale = players.filter(p => p.saleInfo);
  const playersWithLowBuyout = players.filter(p => 
    p.buyoutClause && p.buyoutClause < p.marketValue * 1.5
  );
  const playersWithExpiringProtection = players.filter(p => {
    if (!p.buyoutClauseLockedEndTime) return false;
    const protectionEnd = new Date(p.buyoutClauseLockedEndTime);
    const hoursLeft = (protectionEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 48;
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Players</h1>
              <p className="mt-2 text-gray-600">
                Manage your current squad and monitor player values
              </p>
            </div>

            {/* Summary Stats */}
            {!loading && !error && players.length > 0 && (
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{players.length}</div>
                    <p className="text-sm text-gray-600">Total Players</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {(totalValue / 1000000).toFixed(1)}M€
                    </div>
                    <p className="text-sm text-gray-600">Squad Value</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{totalPoints}</div>
                    <p className="text-sm text-gray-600">Total Points</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {averagePoints.toFixed(1)}
                    </div>
                    <p className="text-sm text-gray-600">Avg Points</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Alerts */}
            {!loading && !error && (playersOnSale.length > 0 || playersWithLowBuyout.length > 0 || playersWithExpiringProtection.length > 0) && (
              <div className="mb-8 space-y-4">
                {playersOnSale.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">
                      Players on Sale ({playersOnSale.length})
                    </h3>
                    <div className="text-sm text-blue-700">
                      {playersOnSale.map(p => p.nickname || p.name).join(', ')}
                    </div>
                  </div>
                )}
                
                {playersWithLowBuyout.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-orange-900 mb-2">
                      Low Buyout Clauses ({playersWithLowBuyout.length})
                    </h3>
                    <div className="text-sm text-orange-700">
                      {playersWithLowBuyout.map(p => p.nickname || p.name).join(', ')}
                    </div>
                  </div>
                )}
                
                {playersWithExpiringProtection.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-900 mb-2">
                      Expiring Protection ({playersWithExpiringProtection.length})
                    </h3>
                    <div className="text-sm text-red-700">
                      {playersWithExpiringProtection.map(p => p.nickname || p.name).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading players...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && players.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
                <p className="text-gray-600">
                  Your squad appears to be empty.
                </p>
              </div>
            )}

            {!loading && !error && players.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {players.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}