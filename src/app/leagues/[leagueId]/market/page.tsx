'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Player } from '@/entities/player';
import { getAuthToken } from '@/lib/auth';
import { Users } from 'lucide-react';
import { PlayerCard } from '@/components/player/player-card';
import {teamService} from "@/services/team-service";
import {PlayerAnalyticsService, playerAnalyticsService} from "@/services/player-analytics-service";
import {formatCurrency} from "@/utils/format-utils";
import {PlayerSortingUtils} from "@/utils/player-sorting-utils";
import { BouncingBallLoader } from '@/components/ui/football-loading';

export default function MarketPlayersPage() {
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
        const result = await teamService.getOfficialMarketPlayers(token, leagueId);

        if (result.error) {
          setError(result.error);
        } else {
          const enrichedPlayers = await playerAnalyticsService.enrichPlayersWithAnalysis(token, result.data || []);
          setPlayers(enrichedPlayers);
        }
      } catch (err) {
        setError('Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [leagueId]);

  const summaryStats = PlayerAnalyticsService.calculateSummaryStats(players);
  const playersOnSale = PlayerAnalyticsService.getPlayersOnSale(players);
  const playersWithLowBuyout = PlayerAnalyticsService.getPlayersWithLowBuyout(players);
  const playersWithExpiringProtection = PlayerAnalyticsService.getPlayersWithExpiringProtection(players);

  return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Official Market Players</h1>
                <p className="mt-2 text-gray-600">
                  Players sold directly by La Liga teams
                </p>
              </div>

              {loading && (
                  <BouncingBallLoader message="Loading players..." />
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
                    {PlayerSortingUtils.sortOpportunities(players).map((player) => (
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