'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { getMyPlayers } from '@/lib/api';
import { type Player } from '@/types/api';
import { getAuthToken } from '@/lib/auth';
import { Users } from 'lucide-react';
import { PlayerCard } from '@/components/player/player-card';
import { formatCurrency } from '@/lib/player-utils';


export default function LeaguePlayersPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPlayers = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
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
  }, [leagueId]);

  const totalValue = players.reduce((sum, player) => sum + player.marketValue, 0);
  const totalPoints = players.reduce((sum, player) => sum + player.points, 0);
  const averagePoints = players.length > 0 ? totalPoints / players.length : 0;

  const playersOnSale = players.filter(p => p.saleInfo);
  const playersWithLowBuyout = players.filter(p => 
    p.buyoutClause && p.buyoutClause < p.marketValue * 1.2 &&
      // Ensure buyout clause is not locked or 2 days before expiration
    (!p.buyoutClauseLockedEndTime || new Date(p.buyoutClauseLockedEndTime).getTime() - new Date().getTime() > 2 * 24 * 60 * 60 * 1000)
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
                      {formatCurrency(totalValue)}
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