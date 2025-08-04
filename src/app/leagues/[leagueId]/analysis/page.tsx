'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  getMyPlayers, 
  getMarketPlayers, 
  analyzePlayer,
  getLeagueTeam,
  getLeagueRanking
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
  Download,
  Filter,
  Users
} from 'lucide-react';

interface ActionRecommendation {
  icon: string;
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
}

function getActionRecommendation(analysis: PlayerAnalysis): ActionRecommendation | null {
  const trend5d = analysis.trends.last5Days.changePercent;
  const trend10d = analysis.trends.last10Days.changePercent;
  const portfolioScore = (analysis as any).portfolioScore;
  const marketScore = (analysis as any).marketScore;
  const buyoutScore = (analysis as any).worthItScore;

  // My Players (Portfolio Management)
  if (analysis.isMyPlayer) {
    if (portfolioScore >= 80) {
      return {
        icon: '🌟',
        title: 'Star Performer',
        description: 'Excellent growth. Consider increasing buyout protection.',
        bgColor: 'bg-green-50 border border-green-200',
        textColor: 'text-green-700'
      };
    }
    if (trend5d < -8 && trend10d < -15) {
      return {
        icon: '⚠️',
        title: 'Sell Candidate',
        description: 'Declining value. Consider selling soon.',
        bgColor: 'bg-red-50 border border-red-200',
        textColor: 'text-red-700'
      };
    }
    if (analysis.buyoutProtectionHours !== null && analysis.buyoutProtectionHours <= 24) {
      return {
        icon: '🛡️',
        title: 'Protection Expiring',
        description: 'Increase buyout clause to protect this player.',
        bgColor: 'bg-orange-50 border border-orange-200',
        textColor: 'text-orange-700'
      };
    }
    if (trend5d > 10 || trend10d > 20) {
      return {
        icon: '🚀',
        title: 'Rising Star',
        description: 'Strong growth trend. Hold and protect.',
        bgColor: 'bg-blue-50 border border-blue-200',
        textColor: 'text-blue-700'
      };
    }
  }
  
  // Market Players
  else if (!analysis.isMyPlayer && (!analysis.playerType || analysis.playerType === 'market')) {
    if (marketScore >= 80) {
      return {
        icon: '🔥',
        title: 'Hot Buy',
        description: 'Excellent market opportunity. Buy now!',
        bgColor: 'bg-green-50 border border-green-200',
        textColor: 'text-green-700'
      };
    }
    if (marketScore >= 60) {
      return {
        icon: '👍',
        title: 'Good Buy',
        description: 'Solid investment with growth potential.',
        bgColor: 'bg-blue-50 border border-blue-200',
        textColor: 'text-blue-700'
      };
    }
    if (trend5d < -10 && trend10d < -20) {
      return {
        icon: '🚫',
        title: 'Avoid',
        description: 'Poor trend. Look for better options.',
        bgColor: 'bg-red-50 border border-red-200',
        textColor: 'text-red-700'
      };
    }
  }
  
  // Other Managers (Buyout Opportunities)
  else if (analysis.playerType === 'other-manager') {
    if (buyoutScore >= 80) {
      return {
        icon: '💎',
        title: 'Premium Buyout',
        description: 'Excellent opportunity. Consider buyout immediately.',
        bgColor: 'bg-green-50 border border-green-200',
        textColor: 'text-green-700'
      };
    }
    if (buyoutScore >= 60 && analysis.buyoutProtectionHours !== null && analysis.buyoutProtectionHours <= 72) {
      return {
        icon: '⚡',
        title: 'Act Fast',
        description: 'Good opportunity expiring soon. Decide quickly.',
        bgColor: 'bg-yellow-50 border border-yellow-200',
        textColor: 'text-yellow-700'
      };
    }
    if (buyoutScore >= 60) {
      return {
        icon: '🎯',
        title: 'Good Opportunity',
        description: 'Solid buyout candidate. Consider your budget.',
        bgColor: 'bg-blue-50 border border-blue-200',
        textColor: 'text-blue-700'
      };
    }
    if (analysis.buyoutClause && analysis.buyoutClause < analysis.currentValue * 0.8) {
      return {
        icon: '💰',
        title: 'Value Deal',
        description: 'Buyout below market value. Great deal!',
        bgColor: 'bg-purple-50 border border-purple-200',
        textColor: 'text-purple-700'
      };
    }
  }

  return null;
}

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
              analysis.isMyPlayer ? 'bg-blue-100 text-blue-700' : 
              analysis.playerType === 'other-manager' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {analysis.isMyPlayer ? 'My Player' : 
               analysis.playerType === 'other-manager' ? 'Other Manager' : 'Market'}
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
          <span className="text-sm text-gray-800 font-medium">Current Value:</span>
          <span className="font-medium text-green-600">{analysis.currentValueFormatted}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-800 font-medium">Team:</span>
          <span className="font-medium text-slate-800">{analysis.team}</span>
        </div>

        {/* Trends */}
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Price Trends</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-800 font-medium">
                {getTrendIcon(analysis.trends.last5Days.trend)}
                5 days:
              </span>
              <span className={getTrendColor(analysis.trends.last5Days.trend)}>
                {analysis.trends.last5Days.changePercent > 0 ? '+' : ''}{analysis.trends.last5Days.changePercent}%
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-800 font-medium">
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
        {(analysis.buyoutClause || analysis.buyoutProtectionHours !== null || (analysis.isMyPlayer && analysis.saleInfo)) && (
          <div className="border-t pt-3 space-y-2">
            {analysis.buyoutClause && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-800 font-medium">
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
                <span className="flex items-center gap-1 text-gray-800 font-medium">
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
            
            {/* Show appropriate score based on player type */}
            {analysis.isMyPlayer && (analysis as any).portfolioScore > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-800 font-medium">
                  📊 Portfolio Score:
                </span>
                <span className={`font-bold ${
                  (analysis as any).portfolioScore >= 80 ? 'text-green-600' : 
                  (analysis as any).portfolioScore >= 60 ? 'text-yellow-600' : 
                  (analysis as any).portfolioScore >= 40 ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {(analysis as any).portfolioScore}/100
                </span>
              </div>
            )}
            
            {!analysis.isMyPlayer && analysis.playerType === 'other-manager' && (analysis as any).worthItScore && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-800 font-medium">
                  ⚡ Buyout Score:
                </span>
                <span className={`font-bold ${
                  (analysis as any).worthItScore >= 80 ? 'text-green-600' : 
                  (analysis as any).worthItScore >= 60 ? 'text-yellow-600' : 
                  (analysis as any).worthItScore >= 40 ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {(analysis as any).worthItScore}/100
                </span>
              </div>
            )}
            
            {!analysis.isMyPlayer && (!analysis.playerType || analysis.playerType === 'market') && (analysis as any).marketScore && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-800 font-medium">
                  🛒 Market Score:
                </span>
                <span className={`font-bold ${
                  (analysis as any).marketScore >= 80 ? 'text-green-600' : 
                  (analysis as any).marketScore >= 60 ? 'text-yellow-600' : 
                  (analysis as any).marketScore >= 40 ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {(analysis as any).marketScore}/100
                </span>
              </div>
            )}
            
            {/* Action Recommendations */}
            {getActionRecommendation(analysis) && (
              <div className={`p-2 rounded text-sm ${getActionRecommendation(analysis)?.bgColor}`}>
                <div className="flex items-center gap-2">
                  <span>{getActionRecommendation(analysis)?.icon}</span>
                  <span className={`font-medium ${getActionRecommendation(analysis)?.textColor}`}>
                    {getActionRecommendation(analysis)?.title}
                  </span>
                </div>
                <div className={`text-xs mt-1 ${getActionRecommendation(analysis)?.textColor}`}>
                  {getActionRecommendation(analysis)?.description}
                </div>
              </div>
            )}
            
            {analysis.isMyPlayer && analysis.saleInfo && (
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

export default function LeagueAnalysisPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<PlayerAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Analysis mode states
  const [analysisMode, setAnalysisMode] = useState<'portfolio' | 'market' | 'buyout'>('portfolio');
  
  // Filter states
  const [selectedPlayerTypes, setSelectedPlayerTypes] = useState<string[]>(['my', 'market', 'other-manager']);
  const [selectedTrends, setSelectedTrends] = useState<string[]>(['rising', 'falling', 'stable', 'insufficient_data', 'unknown']);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(['GK', 'DEF', 'MID', 'FWD', 'CH']);
  const [minAlerts, setMinAlerts] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pre-analysis filters
  const [analyzeMyPlayers, setAnalyzeMyPlayers] = useState(true);
  const [analyzeMarketPlayers, setAnalyzeMarketPlayers] = useState(true);
  const [analyzeOtherManagers, setAnalyzeOtherManagers] = useState(true);
  const [maxMarketPlayers, setMaxMarketPlayers] = useState(500);
  
  // Sorting
  const [sortBy, setSortBy] = useState<string>('mode-default');

  const runAnalysis = async () => {
    const token = getAuthToken();
    if (!token) return;

    setAnalyzing(true);
    setError('');
    setProgress({ current: 0, total: 0 });

    try {
      // Get both my players and market players using the leagueId parameter
      const [myPlayersResult, marketPlayersResult] = await Promise.all([
        getMyPlayers(token, leagueId),
        getMarketPlayers(token, leagueId)
      ]);

      const myPlayers = analyzeMyPlayers ? (myPlayersResult.data || []) : [];
      const allMarketPlayers = (marketPlayersResult.data || []).slice(0, maxMarketPlayers);
      
      // Separate market players by type
      const officialMarketPlayers = analyzeMarketPlayers ? allMarketPlayers.filter(p => p.discr === 'marketPlayerLeague') : [];
      const otherManagerPlayers = analyzeOtherManagers ? allMarketPlayers.filter(p => p.discr === 'marketPlayerTeam') : [];
      
      const totalPlayers = myPlayers.length + officialMarketPlayers.length + otherManagerPlayers.length;
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

      // Get my player IDs for deduplication
      const myPlayerIds = new Set(myPlayers.map(p => p.id));

      // Analyze official market players (excluding my own players)
      for (let i = 0; i < officialMarketPlayers.length; i++) {
        const player = officialMarketPlayers[i];
        const playerId = player.playerMaster?.id || player.id;
        
        // Skip if this player is already in my squad
        if (myPlayerIds.has(playerId)) {
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          continue;
        }
        
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        
        try {
          const analysis = await analyzePlayer(token, player, false);
          if (analysis) {
            analysis.playerType = 'market';
            allAnalyses.push(analysis);
          }
        } catch (err) {
          console.error(`Failed to analyze market player ${player.playerMaster.name}:`, err);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // For other managers' players, we need to fetch all team data to get buyout information

      // Get all team IDs from league ranking
      const rankingResponse = await getLeagueRanking(token, leagueId);
      const allTeams = rankingResponse.data || [];
      const teamBuyoutData = new Map<string, any>();

      // Fetch team data for all teams to get buyout information
      for (const teamRanking of allTeams) {
        try {
          const teamResponse = await getLeagueTeam(token, leagueId, teamRanking.team.id);
          if (teamResponse.data) {
            teamBuyoutData.set(teamRanking.team.id, teamResponse.data);
          }
        } catch (err) {
          console.error(`Failed to fetch team ${teamRanking.team.id}:`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Analyze other managers' players (excluding my own players)
      for (let i = 0; i < otherManagerPlayers.length; i++) {
        const player = otherManagerPlayers[i];
        const playerId = player.playerMaster?.id || player.id;
        
        // Skip if this player is already in my squad
        if (myPlayerIds.has(playerId)) {
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          continue;
        }
        
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        
        try {
          const analysis = await analyzePlayer(token, player, false);
          if (analysis) {
            analysis.playerType = 'other-manager';
            
            // Find buyout data from team data
            for (const teamData of teamBuyoutData.values()) {
              const teamPlayer = teamData.players?.find((p: any) => p.playerMaster?.id === playerId);
              if (teamPlayer) {
                analysis.buyoutClause = teamPlayer.buyoutClause;
                if (teamPlayer.buyoutClauseLockedEndTime) {
                  const protectionEnd = new Date(teamPlayer.buyoutClauseLockedEndTime);
                  const now = new Date();
                  analysis.buyoutProtectionHours = Math.ceil((protectionEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
                }
                
                // Now that we have buyout clause, calculate worthItScore
                if (analysis.buyoutClause) {
                  const { calculateWorthItScore } = await import('@/lib/api');
                  (analysis as any).worthItScore = calculateWorthItScore(analysis);
                }
                
                break;
              }
            }
            
            allAnalyses.push(analysis);
          }
        } catch (err) {
          console.error(`Failed to analyze other manager player ${player.playerMaster.name}:`, err);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Sort by worthItScore to prioritize best buyout opportunities
      allAnalyses.sort((a, b) => {
        return (b.worthItScore || 0) - (a.worthItScore || 0);
      });

      setAnalyses(allAnalyses);
      setFilteredAnalyses(allAnalyses);
    } catch (err) {
      setError('Failed to run analysis');
    } finally {
      setAnalyzing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // Filter and sort analyses based on selected criteria and analysis mode
  useEffect(() => {
    let filtered = analyses.filter(analysis => {
      const playerType = analysis.isMyPlayer ? 'my' : (analysis.playerType || 'market');
      
      // Mode-specific filtering first
      switch (analysisMode) {
        case 'portfolio':
          if (!analysis.isMyPlayer) return false;
          break;
        case 'market':
          if (analysis.isMyPlayer || analysis.playerType === 'other-manager') return false;
          break;
        case 'buyout':
          if (analysis.isMyPlayer || analysis.playerType !== 'other-manager' || !analysis.buyoutClause || !(analysis as any).worthItScore) return false;
          break;
      }
      
      // Then apply regular filters
      if (!selectedPlayerTypes.includes(playerType)) return false;
      if (!selectedTrends.includes(analysis.trends.last5Days.trend)) return false;
      if (!selectedPositions.includes(analysis.position)) return false;
      if (analysis.alerts.length < minAlerts) return false;
      
      return true;
    });
    
    // Apply mode-specific sorting
    filtered.sort((a, b) => {
      // Mode-specific default sorting
      if (sortBy === 'mode-default') {
        switch (analysisMode) {
          case 'portfolio':
            const portfolioScoreA = (a as any).portfolioScore || 0;
            const portfolioScoreB = (b as any).portfolioScore || 0;
            return portfolioScoreB - portfolioScoreA;
          case 'market':
            const marketScoreA = (a as any).marketScore || 0;
            const marketScoreB = (b as any).marketScore || 0;
            return marketScoreB - marketScoreA;
          case 'buyout':
            const buyoutScoreA = (a as any).worthItScore || 0;
            const buyoutScoreB = (b as any).worthItScore || 0;
            return buyoutScoreB - buyoutScoreA;
          default:
            return 0;
        }
      }
      
      // Regular sorting options
      switch (sortBy) {
        case 'alerts':
          if (a.alerts.length !== b.alerts.length) {
            return b.alerts.length - a.alerts.length;
          }
          return Math.abs(b.trends.last5Days.changePercent) - Math.abs(a.trends.last5Days.changePercent);
        
        case 'value':
          return b.currentValue - a.currentValue;
        
        case 'trend-5d':
          return b.trends.last5Days.changePercent - a.trends.last5Days.changePercent;
        
        case 'trend-10d':
          return b.trends.last10Days.changePercent - a.trends.last10Days.changePercent;
        
        case 'best-opportunities':
          // Sort by worth it score (highest first), players without score go to end
          const scoreA = (a as any).worthItScore || 0;
          const scoreB = (b as any).worthItScore || 0;
          return scoreB - scoreA;
        
        case 'buyout-low':
          // Sort by buyout clause (lowest first), players without buyout go to end
          if (!a.buyoutClause && !b.buyoutClause) return 0;
          if (!a.buyoutClause) return 1;
          if (!b.buyoutClause) return -1;
          return a.buyoutClause - b.buyoutClause;
        
        case 'buyout-high':
          // Sort by buyout clause (highest first), players without buyout go to end
          if (!a.buyoutClause && !b.buyoutClause) return 0;
          if (!a.buyoutClause) return 1;
          if (!b.buyoutClause) return -1;
          return b.buyoutClause - a.buyoutClause;
        
        case 'protection':
          // Sort by protection time remaining (expiring first)
          if (a.buyoutProtectionHours === null && b.buyoutProtectionHours === null) return 0;
          if (a.buyoutProtectionHours === null) return 1;
          if (b.buyoutProtectionHours === null) return -1;
          return a.buyoutProtectionHours - b.buyoutProtectionHours;
        
        default:
          return 0;
      }
    });
    
    setFilteredAnalyses(filtered);
  }, [analyses, selectedPlayerTypes, selectedTrends, selectedPositions, minAlerts, sortBy, analysisMode]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  }, []);

  // Reset sort to mode default when analysis mode changes
  useEffect(() => {
    setSortBy('mode-default');
  }, [analysisMode]);

  const handlePlayerTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedPlayerTypes(prev => [...prev, type]);
    } else {
      setSelectedPlayerTypes(prev => prev.filter(t => t !== type));
    }
  };

  const handleTrendChange = (trend: string, checked: boolean) => {
    if (checked) {
      setSelectedTrends(prev => [...prev, trend]);
    } else {
      setSelectedTrends(prev => prev.filter(t => t !== trend));
    }
  };

  const handlePositionChange = (position: string, checked: boolean) => {
    if (checked) {
      setSelectedPositions(prev => [...prev, position]);
    } else {
      setSelectedPositions(prev => prev.filter(p => p !== position));
    }
  };

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

  // Use filtered analyses for all stats
  const playersWithAlerts = filteredAnalyses.filter(p => p.alerts.length > 0);
  const myPlayersWithAlerts = filteredAnalyses.filter(p => p.isMyPlayer && p.alerts.length > 0);
  const risingPlayers = filteredAnalyses.filter(p => p.trends.last5Days.trend === 'rising');
  const fallingPlayers = filteredAnalyses.filter(p => p.trends.last5Days.trend === 'falling');
  const otherManagerPlayers = filteredAnalyses.filter(p => p.playerType === 'other-manager');

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
                  <>
                    <Button 
                      onClick={() => setShowFilters(!showFilters)} 
                      variant="outline" 
                      size="sm"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                    </Button>
                    <Button onClick={exportResults} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </>
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

            {/* Analysis Mode Tabs */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setAnalysisMode('portfolio')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      analysisMode === 'portfolio'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📊 My Portfolio
                  </button>
                  <button
                    onClick={() => setAnalysisMode('market')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      analysisMode === 'market'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🛒 Market Analysis
                  </button>
                  <button
                    onClick={() => setAnalysisMode('buyout')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      analysisMode === 'buyout'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    ⚡ Buyout Opportunities
                  </button>
                </nav>
              </div>
            </div>

            {/* Pre-Analysis Settings */}
            {!analyzing && analyses.length === 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Analysis Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="analyze-my-players"
                        checked={analyzeMyPlayers}
                        onCheckedChange={setAnalyzeMyPlayers}
                      />
                      <label htmlFor="analyze-my-players" className="text-sm font-medium">My Players</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="analyze-market-players"
                        checked={analyzeMarketPlayers}
                        onCheckedChange={setAnalyzeMarketPlayers}
                      />
                      <label htmlFor="analyze-market-players" className="text-sm font-medium">Official Market</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="analyze-other-managers"
                        checked={analyzeOtherManagers}
                        onCheckedChange={setAnalyzeOtherManagers}
                      />
                      <label htmlFor="analyze-other-managers" className="text-sm font-medium">Other Managers</label>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Max Market Players</label>
                      <Select value={maxMarketPlayers.toString()} onValueChange={(value) => setMaxMarketPlayers(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 players</SelectItem>
                          <SelectItem value="25">25 players</SelectItem>
                          <SelectItem value="50">50 players</SelectItem>
                          <SelectItem value="100">100 players</SelectItem>
                          <SelectItem value="500">500 players</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Choose what to analyze. More players = longer analysis time. Market players are analyzed in order of availability.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Progress */}
            {analyzing && (
              <div className="mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
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

            {/* Filters */}
            {showFilters && analyses.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Analysis Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                    {/* Player Type Filter */}
                    <div>
                      <h4 className="font-medium mb-3">Player Type</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="my-players"
                            checked={selectedPlayerTypes.includes('my')}
                            onCheckedChange={(checked) => handlePlayerTypeChange('my', checked)}
                          />
                          <label htmlFor="my-players" className="text-sm">My Players</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="market-players"
                            checked={selectedPlayerTypes.includes('market')}
                            onCheckedChange={(checked) => handlePlayerTypeChange('market', checked)}
                          />
                          <label htmlFor="market-players" className="text-sm">Official Market</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="other-manager-players"
                            checked={selectedPlayerTypes.includes('other-manager')}
                            onCheckedChange={(checked) => handlePlayerTypeChange('other-manager', checked)}
                          />
                          <label htmlFor="other-manager-players" className="text-sm">Other Managers</label>
                        </div>
                      </div>
                    </div>

                    {/* Trend Filter */}
                    <div>
                      <h4 className="font-medium mb-3">Price Trends</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="rising-trend"
                            checked={selectedTrends.includes('rising')}
                            onCheckedChange={(checked) => handleTrendChange('rising', checked)}
                          />
                          <label htmlFor="rising-trend" className="text-sm">Rising</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="falling-trend"
                            checked={selectedTrends.includes('falling')}
                            onCheckedChange={(checked) => handleTrendChange('falling', checked)}
                          />
                          <label htmlFor="falling-trend" className="text-sm">Falling</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="stable-trend"
                            checked={selectedTrends.includes('stable')}
                            onCheckedChange={(checked) => handleTrendChange('stable', checked)}
                          />
                          <label htmlFor="stable-trend" className="text-sm">Stable</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="insufficient-data-trend"
                            checked={selectedTrends.includes('insufficient_data')}
                            onCheckedChange={(checked) => handleTrendChange('insufficient_data', checked)}
                          />
                          <label htmlFor="insufficient-data-trend" className="text-sm">Insufficient Data</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="unknown-trend"
                            checked={selectedTrends.includes('unknown')}
                            onCheckedChange={(checked) => handleTrendChange('unknown', checked)}
                          />
                          <label htmlFor="unknown-trend" className="text-sm">Unknown</label>
                        </div>
                      </div>
                    </div>

                    {/* Position Filter */}
                    <div>
                      <h4 className="font-medium mb-3">Position</h4>
                      <div className="space-y-2">
                        {['GK', 'DEF', 'MID', 'FWD', 'CH'].map(position => (
                          <div key={position} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`position-${position}`}
                              checked={selectedPositions.includes(position)}
                              onCheckedChange={(checked) => handlePositionChange(position, checked)}
                            />
                            <label htmlFor={`position-${position}`} className="text-sm">{position}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alerts Filter */}
                    <div>
                      <h4 className="font-medium mb-3">Minimum Alerts</h4>
                      <Select value={minAlerts.toString()} onValueChange={(value) => setMinAlerts(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0+ alerts</SelectItem>
                          <SelectItem value="1">1+ alerts</SelectItem>
                          <SelectItem value="2">2+ alerts</SelectItem>
                          <SelectItem value="3">3+ alerts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <h4 className="font-medium mb-3">Sort By</h4>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mode-default">Mode Default (Recommended)</SelectItem>
                          <SelectItem value="alerts">Most Alerts</SelectItem>
                          <SelectItem value="value">Highest Value</SelectItem>
                          <SelectItem value="trend-5d">Best 5-day Trend</SelectItem>
                          <SelectItem value="trend-10d">Best 10-day Trend</SelectItem>
                          <SelectItem value="best-opportunities">Best Opportunities</SelectItem>
                          <SelectItem value="buyout-low">Lowest Buyout</SelectItem>
                          <SelectItem value="buyout-high">Highest Buyout</SelectItem>
                          <SelectItem value="protection">Protection Expiring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <span className="text-sm font-medium">Active Filters:</span>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{filteredAnalyses.length} of {analyses.length} players</Badge>
                      {selectedPlayerTypes.length < 3 && (
                        <Badge variant="outline">Player Types: {selectedPlayerTypes.join(', ')}</Badge>
                      )}
                      {selectedTrends.length < 3 && (
                        <Badge variant="outline">Trends: {selectedTrends.join(', ')}</Badge>
                      )}
                      {selectedPositions.length < 4 && (
                        <Badge variant="outline">Positions: {selectedPositions.join(', ')}</Badge>
                      )}
                      {minAlerts > 0 && (
                        <Badge variant="outline">Min Alerts: {minAlerts}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Stats */}
            {analyses.length > 0 && (
              <div className="grid gap-4 md:grid-cols-5 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{filteredAnalyses.length}</div>
                    <p className="text-sm text-gray-600">Players Shown</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{otherManagerPlayers.length}</div>
                    <p className="text-sm text-gray-600">Other Managers</p>
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

            {filteredAnalyses.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAnalyses.map((analysis) => (
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