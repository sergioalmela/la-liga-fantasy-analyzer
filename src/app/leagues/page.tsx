'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type League } from '@/types/api';
import { getAuthToken } from '@/lib/auth';
import {Trophy, Users, Check, Shield, Star} from 'lucide-react';
import Link from 'next/link';
import {leagueService} from "@/services/league-service";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLeagues = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const result = await leagueService.getLeagues(token);

        if (result.error) {
          setError(result.error);
        } else {
          setLeagues(result.data || []);
        }
      } catch (err) {
        setError('Failed to load leagues');
      } finally {
        setLoading(false);
      }
    };

    loadLeagues();
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Leagues</h1>
              <p className="mt-2 text-gray-600">
                Manage your fantasy football leagues and teams
              </p>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading leagues...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {leagues.map((league) => (
                  <Card key={league.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        {league.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>Players: {league.managersNumber}</span>
                        </div>
                        
                        {league.premium && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Premium</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          {league.team.isAdmin ? (
                            <>
                              <Shield className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-600">Admin</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-gray-600" />
                              <span className="text-gray-600">Member</span>
                            </>
                          )}
                        </div>

                        <div className="pt-4 flex gap-2 flex-wrap">
                          <Link href={`/leagues/${league.id}/${league.team.id}/opportunities`}>
                            <Button size="sm" variant="primary">
                              <Star className="w-5 h-5" /> Opportunities
                            </Button>
                          </Link>
                          <Link href={`/leagues/${league.id}/${league.team.id}/players`}>
                            <Button size="sm" variant="outline">
                              My Players
                            </Button>
                          </Link>
                          <Link href={`/leagues/${league.id}/market`}>
                            <Button size="sm" variant="outline">
                              Market
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && !error && leagues.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues found</h3>
                <p className="text-gray-600">
                  You don't seem to be participating in any leagues yet.
                </p>
              </div>
            )}

          </div>
        </main>
      </div>
    </AuthGuard>
  );
}