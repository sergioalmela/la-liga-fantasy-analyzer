'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  getMyPlayers, 
  getMarketPlayers, 
  getLeagues, 
  analyzePlayer
} from '@/lib/api';
import { 
  type PlayerAnalysis,
  type Player,
  type MarketPlayer
} from '@/types/api';
import { getAuthToken } from '@/lib/auth';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';

function PlayerAnalysisCard({ analysis }: { analysis: PlayerAnalysis }) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'falling':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising':
        return 'text-green-600';
      case 'falling':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const highPriorityAlerts = analysis.alerts.filter(alert => 
    alert.includes('🚨') || alert.includes('⚠️') || alert.includes('🔓')
  );

  return (
    <Card className={`hover:shadow-md transition-shadow ${analysis.alerts.length > 0 ? 'border-orange-200' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{analysis.name}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${
              analysis.isMyPlayer ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {analysis.isMyPlayer ? 'My Player' : 'Market'}
            </span>
            {analysis.alerts.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-medium">
                {analysis.alerts.length} alerts
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Value:</span>
          <span className="font-medium text-green-600">{analysis.currentValueFormatted}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Team:</span>
          <span className="font-medium text-slate-800">{analysis.team}</span>
        </div>

        {/* Trends */}
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Price Trends</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getTrendIcon(analysis.trends.last5Days.trend)}
                5 days:
              </span>
              <span className={getTrendColor(analysis.trends.last5Days.trend)}>
                {analysis.trends.last5Days.changePercent > 0 ? '+' : ''}{analysis.trends.last5Days.changePercent}%
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getTrendIcon(analysis.trends.last10Days.trend)}
                10 days:
              </span>
              <span className={getTrendColor(analysis.trends.last10Days.trend)}>
                {analysis.trends.last10Days.changePercent > 0 ? '+' : ''}{analysis.trends.last10Days.changePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {analysis.alerts.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Alerts
            </h4>
            <div className="space-y-1">
              {analysis.alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className={`text-xs p-2 rounded ${
                  highPriorityAlerts.includes(alert) 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-orange-50 text-orange-700'
                }`}>
                  {alert}
                </div>
              ))}
              {analysis.alerts.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{analysis.alerts.length - 3} more alerts
                </div>
              )}
            </div>
          </div>
        )}

        {/* Special Conditions */}
        {analysis.isMyPlayer && (
          <div className="border-t pt-3 space-y-2">
            {analysis.buyoutClause && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-blue-500" />
                  Buyout:
                </span>
                <span className="font-medium">
                  {(analysis.buyoutClause / 1000000).toFixed(1)}M€
                </span>
              </div>
            )}
            
            {analysis.buyoutProtectionHours !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Protection:
                </span>
                <span className={`font-medium ${
                  analysis.buyoutProtectionHours <= 24 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {analysis.buyoutProtectionHours > 0 
                    ? `${Math.ceil(analysis.buyoutProtectionHours / 24)}d left`
                    : 'Expired'
                  }
                </span>
              </div>
            )}
            
            {analysis.saleInfo && (
              <div className="bg-blue-50 p-2 rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">On Sale:</span>
                  <span className="font-medium text-blue-700">
                    {(analysis.saleInfo.salePrice / 1000000).toFixed(1)}M€
                  </span>
                </div>
                {analysis.saleExpirationHours !== null && (
                  <div className="text-xs text-blue-600 mt-1">
                    {analysis.saleExpirationHours > 0 
                      ? `Expires in ${Math.ceil(analysis.saleExpirationHours / 24)}d`
                      : 'Expired'
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalysisPage() {
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const runAnalysis = async () => {
    const token = getAuthToken();
    if (!token) return;

    setAnalyzing(true);
    setError('');
    setProgress({ current: 0, total: 0 });

    try {
      // Get leagues first
      const leaguesResult = await getLeagues(token);
      if (leaguesResult.error || !leaguesResult.data?.length) {
        setError('Could not load league information');
        return;
      }

      const leagueId = leaguesResult.data[0].id;

      // Get both my players and market players
      const [myPlayersResult, marketPlayersResult] = await Promise.all([
        getMyPlayers(token, leagueId),
        getMarketPlayers(token, leagueId)
      ]);

      const myPlayers = myPlayersResult.data || [];
      const marketPlayers = (marketPlayersResult.data || []).slice(0, 10); // Limit market players
      
      const totalPlayers = myPlayers.length + marketPlayers.length;
      setProgress({ current: 0, total: totalPlayers });

      const allAnalyses: PlayerAnalysis[] = [];

      // Analyze my players
      for (let i = 0; i < myPlayers.length; i++) {
        const player = myPlayers[i];
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        
        try {
          const analysis = await analyzePlayer(token, player, true);
          if (analysis) {
            allAnalyses.push(analysis);
          }
        } catch (err) {
          console.error(`Failed to analyze player ${player.name}:`, err);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Analyze market players
      for (let i = 0; i < marketPlayers.length; i++) {
        const player = marketPlayers[i];
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        
        try {
          const analysis = await analyzePlayer(token, player, false);
          if (analysis) {
            allAnalyses.push(analysis);
          }
        } catch (err) {
          console.error(`Failed to analyze market player ${player.playerMaster.name}:`, err);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Sort by alerts (most alerts first), then by trend change
      allAnalyses.sort((a, b) => {
        if (a.alerts.length !== b.alerts.length) {
          return b.alerts.length - a.alerts.length;
        }
        return Math.abs(b.trends.last5Days.changePercent) - Math.abs(a.trends.last5Days.changePercent);
      });

      setAnalyses(allAnalyses);
    } catch (err) {
      setError('Failed to run analysis');
    } finally {
      setAnalyzing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  }, []);

  const exportResults = () => {
    const csvData = analyses.map(analysis => ({
      'Player Name': analysis.name,
      'Type': analysis.isMyPlayer ? 'My Player' : 'Market Player',
      'Current Value (M€)': (analysis.currentValue / 1000000).toFixed(2),
      'Team': analysis.team,
      'Position': analysis.position,
      '5-day Trend': analysis.trends.last5Days.trend,
      '5-day Change %': analysis.trends.last5Days.changePercent,
      '10-day Trend': analysis.trends.last10Days.trend,
      '10-day Change %': analysis.trends.last10Days.changePercent,
      'Alert Count': analysis.alerts.length,
      'Alerts': analysis.alerts.join(' | '),
      'Buyout Clause (M€)': analysis.buyoutClause ? (analysis.buyoutClause / 1000000).toFixed(2) : '',
      'Buyout Protection Hours': analysis.buyoutProtectionHours || '',
      'On Sale': analysis.saleInfo ? 'Yes' : 'No',
      'Sale Price (M€)': analysis.saleInfo ? (analysis.saleInfo.salePrice / 1000000).toFixed(2) : '',
      'Sale Expiration Hours': analysis.saleExpirationHours || ''
    }));

    const csvHeader = Object.keys(csvData[0]).join(',');
    const csvRows = csvData.map(row => 
      Object.values(row).map(value => {
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const playersWithAlerts = analyses.filter(p => p.alerts.length > 0);
  const myPlayersWithAlerts = analyses.filter(p => p.isMyPlayer && p.alerts.length > 0);
  const risingPlayers = analyses.filter(p => p.trends.last5Days.trend === 'rising');
  const fallingPlayers = analyses.filter(p => p.trends.last5Days.trend === 'falling');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Player Analysis</h1>
                <p className="mt-2 text-gray-600">
                  Analyze player trends, alerts, and market opportunities
                </p>
              </div>
              
              <div className="flex gap-3">
                {analyses.length > 0 && (
                  <Button onClick={exportResults} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
                <Button 
                  onClick={runAnalysis} 
                  disabled={analyzing}
                  variant="primary"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress */}
            {analyzing && (
              <div className="mb-8">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Analyzing players...</span>
                    <span className="text-sm text-gray-600">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            {analyses.length > 0 && (
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{analyses.length}</div>
                    <p className="text-sm text-gray-600">Players Analyzed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{playersWithAlerts.length}</div>
                    <p className="text-sm text-gray-600">With Alerts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{risingPlayers.length}</div>
                    <p className="text-sm text-gray-600">Rising Trends</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{fallingPlayers.length}</div>
                    <p className="text-sm text-gray-600">Falling Trends</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Alerts */}
            {myPlayersWithAlerts.length > 0 && (
              <div className="mb-8">
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Your Players Need Attention ({myPlayersWithAlerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {myPlayersWithAlerts.slice(0, 5).map((player) => (
                        <div key={player.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <span className="font-medium">{player.name}</span>
                          <span className="text-sm text-orange-600">{player.alerts.length} alerts</span>
                        </div>
                      ))}
                      {myPlayersWithAlerts.length > 5 && (
                        <div className="text-sm text-gray-500 pt-2">
                          +{myPlayersWithAlerts.length - 5} more players with alerts
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Preparing analysis...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !analyzing && analyses.length === 0 && (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis yet</h3>
                <p className="text-gray-600 mb-6">
                  Click "Run Analysis" to analyze your players and market trends.
                </p>
                <Button onClick={runAnalysis} variant="primary">
                  <Eye className="w-4 h-4 mr-2" />
                  Start Analysis
                </Button>
              </div>
            )}

            {analyses.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analyses.map((analysis) => (
                  <PlayerAnalysisCard key={analysis.id} analysis={analysis} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}