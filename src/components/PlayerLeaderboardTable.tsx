import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Trophy, History } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import grassTexture from "@/assets/grass-texture.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface PlayerData {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  changePercent: number;
  rank: number;
  bestStreak?: number;
  currentStreak?: number;
  worstStreak?: number;
  isVirtual?: boolean;
}

interface TodayPrediction {
  id: string;
  match_id: string;
  prediction: string;
  prediction_type: string;
  bet_amount: number;
  potential_payout: number | null;
  result: string | null;
  actual_payout: number | null;
  created_at: string;
  match_date: string;
  // 比赛详情
  home_team?: string;
  away_team?: string;
  home_score?: number | null;
  away_score?: number | null;
}

const PlayerLeaderboardTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayWinRates, setTodayWinRates] = useState<Map<string, { winRate: number; total: number; correct: number }>>(new Map());
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState<{ playerId: string; playerName: string; predictions: TodayPrediction[] } | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;
        
        // 将虚拟玩家转换为 PlayerData 格式
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player, index) => ({
          ...player,
          rank: index + 1,
          isVirtual: true
        }));
        
        // 获取所有用户的基本信息
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url');
        
        if (usersError) throw usersError;
        
        // 如果没有真实用户或获取失败，只使用虚拟玩家
        if (!usersData || usersData.length === 0) {
          setAllPlayers(virtualPlayersData);
          return;
        }
        
        // 获取所有用户的余额信息
        const { data: balancesData, error: balancesError } = await supabase
          .from('user_balances')
          .select('user_id, balance');
        
        if (balancesError) throw balancesError;
        
        // 获取所有用户的预测统计
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('user_predictions')
          .select('user_id, result, confidence');
        
        if (predictionsError) throw predictionsError;
        
        // 创建映射
        const balancesMap = new Map(balancesData?.map(b => [b.user_id, b.balance]) || []);
        
        // 计算每个用户的统计数据
        const realPlayerStats = usersData.map(user => {
          const userPredictions = predictionsData?.filter(p => p.user_id === user.id) || [];
          const totalPredictions = userPredictions.length;
          const correctPredictions = userPredictions.filter(p => p.result === 'win').length;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          
          const balance = balancesMap.get(user.id) || INITIAL_BALANCE;
          const profit = balance - INITIAL_BALANCE;
          const changePercent = (profit / INITIAL_BALANCE) * 100;
          
          // 计算连胜和平均信心度
          let currentStreak = 0;
          let bestStreak = 0;
          let tempStreak = 0;
          let worstStreak = 0;
          let lossStreak = 0;
          
          userPredictions.forEach(pred => {
            if (pred.result === 'win') {
              tempStreak++;
              bestStreak = Math.max(bestStreak, tempStreak);
              lossStreak = 0;
            } else if (pred.result === 'loss') {
              tempStreak = 0;
              lossStreak++;
              worstStreak = Math.max(worstStreak, lossStreak);
            }
          });
          
          // 最后一次连胜
          for (let i = userPredictions.length - 1; i >= 0; i--) {
            if (userPredictions[i].result === 'win') {
              currentStreak++;
            } else {
              break;
            }
          }
          
          return {
            id: user.id,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            totalPredictions,
            correctPredictions,
            winRate,
            balance,
            profit,
            changePercent,
            rank: 0,
            bestStreak,
            currentStreak,
            worstStreak,
            isVirtual: false
          };
        }).filter(player => player.totalPredictions > 0); // 只保留有预测记录的玩家
        
        // 合并真实玩家和虚拟玩家
        const combined = [...virtualPlayersData, ...realPlayerStats];
        
        // 按胜率排序并设置排名
        const sortedPlayers = combined
          .sort((a, b) => b.winRate - a.winRate)
          .map((player, index) => ({
            ...player,
            rank: index + 1
          }));
        
        setAllPlayers(sortedPlayers);
      } catch (error) {
        console.error('Error fetching all players:', error);
        // 出错时使用虚拟玩家
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player, index) => ({
          ...player,
          rank: index + 1,
          isVirtual: true
        }));
        setAllPlayers(virtualPlayersData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllPlayers();
    
    // 订阅用户预测和余额变化，实时更新排名
    const predictionsChannel = supabase
      .channel('all-players-predictions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_predictions',
        },
        () => {
          console.log('User predictions changed, refreshing all players');
          fetchAllPlayers();
        }
      )
      .subscribe();
    
    const balancesChannel = supabase
      .channel('all-players-balances')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
        },
        () => {
          console.log('User balances changed, refreshing all players');
          fetchAllPlayers();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(predictionsChannel);
      supabase.removeChannel(balancesChannel);
    };
  }, []);

  // 获取今日胜率数据
  useEffect(() => {
    const fetchTodayWinRates = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        // 查询今日的 user_predictions
        const { data, error } = await supabase
          .from('user_predictions')
          .select('user_id, result')
          .gte('created_at', todayStr);

        if (error) {
          console.error('Error fetching today predictions:', error);
          return;
        }

        // 计算每个用户的今日胜率
        const todayStats = new Map<string, { total: number; correct: number }>();
        
        if (data) {
          data.forEach((pred: any) => {
            const userId = pred.user_id;
            if (!todayStats.has(userId)) {
              todayStats.set(userId, { total: 0, correct: 0 });
            }
            const stats = todayStats.get(userId)!;
            if (pred.result === 'win' || pred.result === 'loss') {
              stats.total++;
              if (pred.result === 'win') {
                stats.correct++;
              }
            }
          });
        }

        const todayWinRatesMap = new Map<string, { winRate: number; total: number; correct: number }>();
        todayStats.forEach((stats, odayStr) => {
          const winRate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
          todayWinRatesMap.set(odayStr, { winRate, total: stats.total, correct: stats.correct });
        });

        setTodayWinRates(todayWinRatesMap);
      } catch (error) {
        console.error('Error fetching today win rates:', error);
      }
    };

    fetchTodayWinRates();
  }, []);

  // 获取指定玩家的今日历史记录
  const fetchTodayHistory = async (playerId: string, playerName: string, isVirtual: boolean) => {
    setIsLoadingHistory(true);
    setIsHistoryDialogOpen(true);
    
    // 模拟比赛数据
    const mockMatches = [
      { home: '皇家马德里', away: '巴塞罗那', homeScore: 2, awayScore: 1 },
      { home: '曼城', away: '利物浦', homeScore: 3, awayScore: 2 },
      { home: '拜仁慕尼黑', away: '多特蒙德', homeScore: 1, awayScore: 1 },
      { home: '巴黎圣日耳曼', away: '马赛', homeScore: 2, awayScore: 0 },
      { home: '尤文图斯', away: 'AC米兰', homeScore: 0, awayScore: 1 },
      { home: '切尔西', away: '阿森纳', homeScore: 2, awayScore: 2 },
    ];

    // 为虚拟玩家生成模拟数据
    if (isVirtual) {
      const todayData = todayWinRates.get(playerId);
      const total = todayData?.total || Math.floor(Math.random() * 5) + 3;
      const correct = todayData?.correct || Math.floor(total * 0.6);
      
      const mockPredictions: TodayPrediction[] = [];
      for (let i = 0; i < total; i++) {
        const match = mockMatches[i % mockMatches.length];
        const isWin = i < correct;
        const betAmount = Math.floor(Math.random() * 400) + 100;
        const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
        mockPredictions.push({
          id: `mock-${playerId}-${i}`,
          match_id: `${1000 + i}`,
          prediction: Math.random() > 0.5 ? 'Over 2.5' : 'Under 2.5',
          prediction_type: Math.random() > 0.5 ? 'over_under' : 'handicap',
          bet_amount: betAmount,
          potential_payout: potentialPayout,
          result: isWin ? 'win' : 'loss',
          actual_payout: isWin ? potentialPayout : 0,
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
          match_date: new Date().toISOString(),
          home_team: match.home,
          away_team: match.away,
          home_score: match.homeScore,
          away_score: match.awayScore,
        });
      }
      setSelectedPlayerHistory({ playerId, playerName, predictions: mockPredictions });
      setIsLoadingHistory(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const { data, error } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', playerId)
        .gte('created_at', todayStr)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching today history:', error);
      }

      // 如果没有真实数据，生成虚拟数据
      if (!data || data.length === 0) {
        const todayData = todayWinRates.get(playerId);
        const total = todayData?.total || Math.floor(Math.random() * 4) + 2;
        const correct = todayData?.correct || Math.floor(total * 0.5);
        
        const mockPredictions: TodayPrediction[] = [];
        for (let i = 0; i < total; i++) {
          const match = mockMatches[i % mockMatches.length];
          const isWin = i < correct;
          const betAmount = Math.floor(Math.random() * 400) + 100;
          const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
          mockPredictions.push({
            id: `mock-${playerId}-${i}`,
            match_id: `${1000 + i}`,
            prediction: Math.random() > 0.5 ? 'Over 2.5' : 'Under 2.5',
            prediction_type: Math.random() > 0.5 ? 'over_under' : 'handicap',
            bet_amount: betAmount,
            potential_payout: potentialPayout,
            result: isWin ? 'win' : 'loss',
            actual_payout: isWin ? potentialPayout : 0,
            created_at: new Date(Date.now() - i * 3600000).toISOString(),
            match_date: new Date().toISOString(),
            home_team: match.home,
            away_team: match.away,
            home_score: match.homeScore,
            away_score: match.awayScore,
          });
        }
        setSelectedPlayerHistory({ playerId, playerName, predictions: mockPredictions });
      } else {
        const predictions: TodayPrediction[] = data.map((pred: any, index: number) => {
          const match = mockMatches[index % mockMatches.length];
          return {
            id: pred.id,
            match_id: pred.match_id,
            prediction: pred.prediction,
            prediction_type: pred.prediction_type,
            bet_amount: pred.bet_amount,
            potential_payout: pred.potential_payout,
            result: pred.result,
            actual_payout: pred.actual_payout,
            created_at: pred.created_at,
            match_date: pred.match_date,
            home_team: match.home,
            away_team: match.away,
            home_score: pred.result ? match.homeScore : null,
            away_score: pred.result ? match.awayScore : null,
          };
        });
        setSelectedPlayerHistory({ playerId, playerName, predictions });
      }
    } catch (error) {
      console.error('Error fetching today history:', error);
      setSelectedPlayerHistory({ playerId, playerName, predictions: [] });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getRankColor = (rank: number) => {
    switch(rank) {
      case 1:
        return 'hsl(45 100% 51%)'; // Gold
      case 2:
        return 'hsl(0 0% 75%)'; // Silver
      case 3:
        return 'hsl(30 60% 50%)'; // Bronze
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const formatProfit = (profit: number) => {
    return profit >= 0 
      ? `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 获取前6名玩家数据用于条形图
  const top6Players = allPlayers.slice(0, 6);
  const winner = allPlayers[0];

  const chartData = top6Players.map(player => ({
    name: player.displayName,
    winRate: player.winRate,
    profit: player.profit,
    rank: player.rank,
  }));

  return (
    <div className="space-y-6">
      {/* Leaderboard Table - Split into two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Rank 1-10 */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('top_10') || '前10名'}</h3>
                <p className="text-xs text-muted-foreground">{t('highest_win_rate') || '最高胜率玩家'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                allPlayers.slice(0, 10).map((player, index) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/player/${player.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        player.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                        player.rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                        player.rank === 3 ? 'bg-orange-600/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {player.rank <= 3 ? (
                          <Trophy className="h-3.5 w-3.5" style={{ color: getRankColor(player.rank) }} />
                        ) : (
                          player.rank
                        )}
                      </div>
                      <Avatar className="w-10 h-10 border-2 border-border/40 flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{player.displayName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('win_rate')}:</span>
                            <span className={player.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.winRate.toFixed(1)}%
                            </span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('predictions')}:</span>
                            <span className="font-medium">{player.totalPredictions}</span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">ROI:</span>
                            <span className={player.changePercent >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-xs gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-primary/20 transition-colors flex-shrink-0 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      <span className="text-muted-foreground">{t('today_prediction_win_rate') || '今日胜率'}:</span>
                      {(() => {
                        const todayData = todayWinRates.get(player.id);
                        if (!todayData || todayData.total === 0) return <span className="ml-1">-</span>;
                        return (
                          <span className={`ml-1 ${todayData.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}`}>
                            {todayData.correct}/{todayData.total} {todayData.winRate.toFixed(0)}%
                          </span>
                        );
                      })()}
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Rank 11-20 */}
        <Card className="border-muted-foreground/30 bg-gradient-to-br from-muted/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-muted-foreground/20">
                <Trophy className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('rank_11_20') || '11-20名'}</h3>
                <p className="text-xs text-muted-foreground">{t('rising_players') || '潜力玩家'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : allPlayers.length <= 10 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('no_more_players') || '暂无更多玩家'}
                </div>
              ) : (
                allPlayers.slice(10, 20).map((player, index) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/player/${player.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-muted text-muted-foreground">
                        {player.rank}
                      </div>
                      <Avatar className="w-10 h-10 border-2 border-border/40 flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{player.displayName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('win_rate')}:</span>
                            <span className={player.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.winRate.toFixed(1)}%
                            </span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('predictions')}:</span>
                            <span className="font-medium">{player.totalPredictions}</span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">ROI:</span>
                            <span className={player.changePercent >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-xs gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-primary/20 transition-colors flex-shrink-0 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      <span className="text-muted-foreground">{t('today_prediction_win_rate') || '今日胜率'}:</span>
                      {(() => {
                        const todayData = todayWinRates.get(player.id);
                        if (!todayData || todayData.total === 0) return <span className="ml-1">-</span>;
                        return (
                          <span className={`ml-1 ${todayData.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}`}>
                            {todayData.correct}/{todayData.total} {todayData.winRate.toFixed(0)}%
                          </span>
                        );
                      })()}
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Leading Player + Bar Chart */}
      {!isLoading && allPlayers.length >= 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Leading Player Card */}
          <Card className="relative overflow-hidden">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${winner?.avatarUrl})` }}
            />
            
            {/* Color Tint Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(45,100%,55%)]/80 to-[hsl(45,100%,40%)]/80" />
            
            {/* Dark gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            
            <CardContent className="p-4 sm:p-6 relative z-10">
              <h3 className="text-xs sm:text-sm font-bold mb-3 sm:mb-4 text-white/80">{t('leading_player')?.toUpperCase() || 'LEADING PLAYER'}</h3>
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 cursor-pointer"
                onClick={() => winner && navigate(`/player/${winner.id}`)}
              >
                <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white/50">
                  <AvatarImage src={winner?.avatarUrl} alt={winner?.displayName} />
                  <AvatarFallback>{winner?.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-lg sm:text-xl font-bold text-white">{winner?.displayName}</span>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <p className="text-xs sm:text-sm text-white/70 mb-1">{t('win_rate_label').toUpperCase()}</p>
                  <p className="text-xl sm:text-2xl font-bold font-mono-data text-white">
                    <AnimatedWinRate 
                      value={winner?.winRate || 0}
                      className="text-xl sm:text-2xl font-bold font-mono-data text-white"
                    />
                  </p>
                </div>
                
                <div>
                  <p className="text-xs sm:text-sm text-white/70 mb-1">{t('correct_predictions_label').toUpperCase()}</p>
                  <p className="text-lg sm:text-xl font-bold font-mono-data text-success">
                    {winner?.correctPredictions || 0} / {winner?.totalPredictions || 0}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs sm:text-sm text-white/70 mb-1">{t('profit').toUpperCase()}</p>
                  <p className={`text-lg sm:text-xl font-bold font-mono-data ${(winner?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatProfit(winner?.profit || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card className="lg:col-span-2 relative overflow-hidden">
            {/* Grass texture background */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{ 
                backgroundImage: `url(${grassTexture})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/60" />
            
            <CardContent className="p-4 sm:p-6 relative z-10">
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                {t('top_players_comparison')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '11px' }}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, t('win_rate')]}
                  />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getRankColor(entry.rank)}
                        opacity={0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {selectedPlayerHistory?.playerName} - {t('today_history') || '今日记录'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : selectedPlayerHistory?.predictions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('no_history_today') || '今日暂无记录'}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPlayerHistory?.predictions.map((pred) => (
                  <div 
                    key={pred.id}
                    className={`p-3 rounded-lg border ${
                      pred.result === 'win' 
                        ? 'bg-success/10 border-success/30' 
                        : pred.result === 'loss'
                          ? 'bg-destructive/10 border-destructive/30'
                          : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    {/* 比赛信息 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                          <span className="text-right flex-1 truncate">{pred.home_team || '主队'}</span>
                          <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/50 min-w-[60px] justify-center">
                            {pred.result ? (
                              <span className="font-bold text-base">
                                {pred.home_score ?? '-'} : {pred.away_score ?? '-'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">未开始</span>
                            )}
                          </div>
                          <span className="text-left flex-1 truncate">{pred.away_team || '客队'}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        pred.result === 'win'
                          ? 'bg-success/20 text-success'
                          : pred.result === 'loss'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {pred.result === 'win' 
                          ? t('win') || '胜' 
                          : pred.result === 'loss' 
                            ? t('loss') || '负'
                            : t('pending') || '进行中'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t('bet_type') || '类型'}:</span>
                        <span className="ml-1 font-medium">{pred.prediction_type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('prediction') || '预测'}:</span>
                        <span className="ml-1 font-medium">{pred.prediction}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('bet_amount') || '金额'}:</span>
                        <span className="ml-1 font-medium">${pred.bet_amount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('potential_return') || '预期回报'}:</span>
                        <span className="ml-1 font-medium">${pred.potential_payout?.toFixed(2) || '-'}</span>
                      </div>
                    </div>
                    
                    {pred.result && pred.actual_payout !== null && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">{t('profit_loss') || '盈亏'}:</span>
                        <span className={`ml-1 font-bold ${(pred.actual_payout - pred.bet_amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {(pred.actual_payout - pred.bet_amount) >= 0 ? '+' : ''}${(pred.actual_payout - pred.bet_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(pred.created_at), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerLeaderboardTable;
