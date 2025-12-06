import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Trophy, History, ExternalLink, TrendingUp, TrendingDown, Minus, UserPlus, CheckCircle2, Sparkles } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import grassTexture from "@/assets/grass-texture.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  const { user, userBalance, refreshBalance } = useAuth();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayWinRates, setTodayWinRates] = useState<Map<string, { winRate: number; total: number; correct: number }>>(new Map());
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState<{ playerId: string; playerName: string; predictions: TodayPrediction[] } | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Copy trade state
  const [copyTradeDialog, setCopyTradeDialog] = useState<{ player: PlayerData; prediction: TodayPrediction } | null>(null);
  const [copyBetAmount, setCopyBetAmount] = useState(100);
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<{
    show: boolean;
    oldBalance: number;
    newBalance: number;
    betAmount: number;
    playerName: string;
  } | null>(null);
  
  // Get real balance from auth context
  const realBalance = userBalance?.balance ?? 10000;

  // Get current user's rank
  const currentUserRank = user ? allPlayers.find(p => p.id === user.id) : null;

  // Calculate rank change based on today's performance
  // Positive todayWinRate > overall winRate = rank likely improved
  const getRankChange = (playerId: string, winRate: number): number => {
    const todayData = todayWinRates.get(playerId);
    if (!todayData || todayData.total === 0) return 0;
    
    // If today's win rate is better than overall, assume rank improved
    const todayWinRate = todayData.winRate;
    if (todayWinRate > winRate + 5) {
      // Significant improvement, estimate rank went up
      return Math.min(Math.floor((todayWinRate - winRate) / 5), 5);
    } else if (todayWinRate < winRate - 5) {
      // Significant drop, estimate rank went down
      return -Math.min(Math.floor((winRate - todayWinRate) / 5), 5);
    }
    return 0;
  };

  const currentUserRankChange = currentUserRank ? getRankChange(currentUserRank.id, currentUserRank.winRate) : 0;

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

  // Handle copy trade - 跟单功能
  const handleCopyTrade = (prediction: TodayPrediction) => {
    const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
    if (!player) return;
    
    setCopyTradeDialog({ player, prediction });
    setCopyBetAmount(100);
  };

  const confirmCopyTrade = async () => {
    if (!copyTradeDialog || !user) {
      toast.error('请先登录');
      return;
    }
    
    const oldBalance = realBalance;
    
    if (copyBetAmount > realBalance) {
      toast.error('余额不足，无法跟单');
      return;
    }

    if (copyBetAmount < 10) {
      toast.error('最低跟单金额为 ¥10');
      return;
    }

    setIsCopying(true);
    
    try {
      // 使用 place_bet 函数进行跟单下注
      const potentialPayout = copyBetAmount * 1.8;
      const matchDate = new Date().toISOString();
      
      const { data, error } = await supabase.rpc('place_bet', {
        p_user_id: user.id,
        p_match_id: copyTradeDialog.prediction.match_id,
        p_prediction_type: copyTradeDialog.prediction.prediction_type,
        p_prediction: `跟单-${copyTradeDialog.player.displayName}: ${copyTradeDialog.prediction.prediction}`,
        p_bet_amount: copyBetAmount,
        p_potential_payout: potentialPayout,
        p_match_date: matchDate,
      });

      if (error) {
        console.error('Copy trade error:', error);
        toast.error('跟单失败：' + error.message);
        return;
      }

      const result = data as { success: boolean; error?: string; new_balance?: number };
      
      if (!result.success) {
        toast.error(result.error || '跟单失败');
        return;
      }

      // 刷新余额
      await refreshBalance();
      
      // 显示成功动画
      setCopySuccess({
        show: true,
        oldBalance,
        newBalance: result.new_balance || (oldBalance - copyBetAmount),
        betAmount: copyBetAmount,
        playerName: copyTradeDialog.player.displayName,
      });
      
      setCopyTradeDialog(null);
      
      // 3秒后自动关闭成功动画
      setTimeout(() => {
        setCopySuccess(null);
      }, 3500);
      
    } catch (error) {
      console.error('Copy trade error:', error);
      toast.error('跟单失败，请稍后重试');
    } finally {
      setIsCopying(false);
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
      {/* Current User Rank Card - Only show when logged in */}
      {user && currentUserRank && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  currentUserRank.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                  currentUserRank.rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                  currentUserRank.rank === 3 ? 'bg-orange-600/20 text-orange-600' :
                  'bg-primary/20 text-primary'
                }`}>
                  {currentUserRank.rank <= 3 ? (
                    <Trophy className="h-6 w-6" style={{ color: getRankColor(currentUserRank.rank) }} />
                  ) : (
                    `#${currentUserRank.rank}`
                  )}
                </div>
                {/* Rank Change Indicator */}
                {currentUserRankChange !== 0 && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                    currentUserRankChange > 0 
                      ? 'bg-success/20 text-success' 
                      : 'bg-destructive/20 text-destructive'
                  }`}>
                    {currentUserRankChange > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        <span>+{currentUserRankChange}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        <span>{currentUserRankChange}</span>
                      </>
                    )}
                  </div>
                )}
                {currentUserRankChange === 0 && todayWinRates.get(currentUserRank.id)?.total === 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted/30 text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    <span>{t('no_change') || '无变化'}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/40">
                    <AvatarImage src={currentUserRank.avatarUrl} alt={currentUserRank.displayName} />
                    <AvatarFallback>{currentUserRank.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">{currentUserRank.displayName}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{t('your_current_rank') || '您当前的排名'}</p>
                      {currentUserRankChange !== 0 && (
                        <span className={`text-xs ${currentUserRankChange > 0 ? 'text-success' : 'text-destructive'}`}>
                          ({currentUserRankChange > 0 ? t('rank_up') || '排名上升' : t('rank_down') || '排名下降'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold font-mono-data text-primary">{currentUserRank.winRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">{t('win_rate')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono-data">{currentUserRank.totalPredictions}</p>
                  <p className="text-xs text-muted-foreground">{t('predictions')}</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold font-mono-data ${currentUserRank.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {currentUserRank.changePercent >= 0 ? '+' : ''}{currentUserRank.changePercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('roi') || 'ROI'}</p>
                </div>
                {/* Today's Performance */}
                {todayWinRates.get(currentUserRank.id) && todayWinRates.get(currentUserRank.id)!.total > 0 && (
                  <div className="border-l border-border pl-6">
                    <p className={`text-2xl font-bold font-mono-data ${
                      todayWinRates.get(currentUserRank.id)!.winRate >= 50 ? 'text-success' : 'text-destructive'
                    }`}>
                      {todayWinRates.get(currentUserRank.id)!.correct}/{todayWinRates.get(currentUserRank.id)!.total}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('today') || '今日'}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Player Card - Show when not logged in or no predictions */}
      {!user && (
        <Card className="border-muted/40 bg-gradient-to-br from-muted/10 via-muted/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-muted/20 text-muted-foreground">
                  ?
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-muted/40">
                    <AvatarFallback>体</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">{t('demo_player') || '体验玩家'}</p>
                    <p className="text-sm text-muted-foreground">{t('login_to_see_rank') || '登录后查看您的排名'}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {t('login') || '登录'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Leaderboard Table - Split into Hot Streak vs Cold Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: 连红榜 (Hot Streak) */}
        <Card className="border-destructive/40 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-destructive/30 to-destructive/20">
                <TrendingUp className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-lg bg-gradient-to-r from-destructive to-red-500 bg-clip-text text-transparent">{t('hot_streak_board') || '连红榜'}</h3>
                <p className="text-xs text-muted-foreground">{t('best_win_streak') || '最佳连胜玩家'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive" />
                </div>
              ) : (
                [...allPlayers]
                  .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
                  .slice(0, 10)
                  .map((player, index) => (
                  <div 
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                      user && player.id === user.id 
                        ? 'bg-destructive/20 border-2 border-destructive/40 hover:bg-destructive/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    onClick={() => navigate(`/player/${player.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-600/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? (
                          <Trophy className="h-3.5 w-3.5" style={{ color: getRankColor(index + 1) }} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <Avatar className="w-10 h-10 border-2 border-destructive/40 flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{player.displayName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="text-destructive font-bold">🔥 {player.currentStreak || 0}</span>
                            <span className="text-muted-foreground/70">{t('current_streak') || '连红'}</span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('win_rate')}:</span>
                            <span className={player.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.winRate.toFixed(1)}%
                            </span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('roi') || '盈利率'}:</span>
                            <span className={player.changePercent >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-xs px-3 py-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium transition-colors flex-shrink-0 ml-2 border border-destructive/20 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/history?tab=player&player=${player.id}`);
                      }}
                    >
                      {t('today_prediction') || '今日预测'}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: 连黑榜 (Cold Streak) */}
        <Card className="border-success/40 bg-gradient-to-br from-success/10 via-success/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-success/30 to-success/20">
                <TrendingDown className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-lg bg-gradient-to-r from-success to-emerald-500 bg-clip-text text-transparent">{t('cold_streak_board') || '连黑榜'}</h3>
                <p className="text-xs text-muted-foreground">{t('worst_lose_streak') || '最差连黑玩家'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success" />
                </div>
              ) : (
                [...allPlayers]
                  .sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0))
                  .slice(0, 10)
                  .map((player, index) => (
                  <div 
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                      user && player.id === user.id 
                        ? 'bg-success/20 border-2 border-success/40 hover:bg-success/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    onClick={() => navigate(`/player/${player.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-success/30 text-success' :
                        index === 1 ? 'bg-success/20 text-success/80' :
                        index === 2 ? 'bg-success/10 text-success/60' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <Avatar className="w-10 h-10 border-2 border-success/40 flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{player.displayName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="text-success font-bold">💀 {player.worstStreak || 0}</span>
                            <span className="text-muted-foreground/70">{t('worst_streak') || '连黑'}</span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('win_rate')}:</span>
                            <span className={player.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.winRate.toFixed(1)}%
                            </span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">{t('roi') || '盈利率'}:</span>
                            <span className={player.changePercent >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                              {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-xs px-3 py-1.5 rounded-md bg-success/10 hover:bg-success/20 text-success font-medium transition-colors flex-shrink-0 ml-2 border border-success/20 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/history?tab=player&player=${player.id}`);
                      }}
                    >
                      {t('today_prediction') || '今日预测'}
                      <ExternalLink className="h-3 w-3" />
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

      {/* Today History Dialog - styled like PlayerCopyTradingBoard */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={allPlayers.find(p => p.id === selectedPlayerHistory?.playerId)?.avatarUrl} />
                <AvatarFallback>{selectedPlayerHistory?.playerName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{selectedPlayerHistory?.playerName} - {t('today_history') || '今日预测'}</span>
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : selectedPlayerHistory && (
            <div className="space-y-4">
              {/* 今日统计 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">今日战绩</span>
                <span className="font-bold">
                  {selectedPlayerHistory.predictions.filter(p => p.result === 'win').length}/
                  {selectedPlayerHistory.predictions.length}
                  <span className={`ml-2 ${
                    selectedPlayerHistory.predictions.length > 0 && 
                    (selectedPlayerHistory.predictions.filter(p => p.result === 'win').length / selectedPlayerHistory.predictions.length * 100) >= 50 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    ({selectedPlayerHistory.predictions.length > 0 
                      ? (selectedPlayerHistory.predictions.filter(p => p.result === 'win').length / selectedPlayerHistory.predictions.length * 100).toFixed(0) 
                      : 0}%)
                  </span>
                </span>
              </div>
              
              {/* 历史战绩趋势图 */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    近7日胜率趋势
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
                      return player ? `总胜率: ${player.winRate.toFixed(1)}%` : '';
                    })()}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart
                    data={(() => {
                      // 生成近7天的模拟趋势数据
                      const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
                      const baseWinRate = player?.winRate || 50;
                      const days = [];
                      for (let i = 6; i >= 0; i--) {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        // 模拟波动的胜率
                        const variance = (Math.random() - 0.5) * 20;
                        const winRate = Math.max(20, Math.min(95, baseWinRate + variance));
                        const predictions = Math.floor(Math.random() * 6) + 3;
                        const wins = Math.round(predictions * (winRate / 100));
                        days.push({
                          date: format(date, 'MM/dd'),
                          winRate: Math.round(winRate),
                          predictions,
                          wins
                        });
                      }
                      return days;
                    })()}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      style={{ fontSize: '10px' }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      stroke="hsl(var(--muted-foreground))" 
                      style={{ fontSize: '10px' }}
                      tickLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'winRate') return [`${value}%`, '胜率'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="winRate" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#winRateGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                
                {/* 历史统计摘要 */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/30">
                  {(() => {
                    const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
                    return (
                      <>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">总预测</p>
                          <p className="text-sm font-bold">{player?.totalPredictions || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">最佳连胜</p>
                          <p className="text-sm font-bold text-success">{player?.bestStreak || 0}场</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">盈亏</p>
                          <p className={`text-sm font-bold ${(player?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {(player?.profit || 0) >= 0 ? '+' : ''}¥{(player?.profit || 0).toFixed(0)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* 预测列表 */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  今日预测记录
                </h4>
                {selectedPlayerHistory.predictions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg">
                    今日暂无预测记录
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {selectedPlayerHistory.predictions.map((pred) => (
                      <div key={pred.id} className="p-3 rounded-lg bg-muted/30 space-y-2 border border-border/30">
                        {/* 比赛信息 */}
                        <div className="flex items-center justify-between">
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
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                            pred.result === 'win' ? 'bg-success/20 text-success' :
                            pred.result === 'loss' ? 'bg-destructive/20 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {pred.result === 'win' ? '赢' : pred.result === 'loss' ? '输' : '待定'}
                          </span>
                        </div>
                        
                        {/* 预测详情 */}
                        <div className="flex items-center justify-between text-xs border-t border-border/20 pt-2">
                          <span className="text-muted-foreground">
                            {pred.prediction_type === 'over_under' ? '大小球' : '让球'}: 
                            <span className="font-medium ml-1 text-foreground">{pred.prediction}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              下注: <span className="text-foreground font-medium">¥{pred.bet_amount}</span>
                              {pred.result && pred.result !== 'pending' && (
                                <span className={`ml-2 font-bold ${pred.result === 'win' ? 'text-success' : 'text-destructive'}`}>
                                  {pred.result === 'win' ? `+¥${pred.actual_payout || pred.potential_payout}` : `-¥${pred.bet_amount}`}
                                </span>
                              )}
                            </span>
                            {/* 跟单按钮 - 只显示在未结束的比赛 */}
                            {!pred.result && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs gap-1 px-2"
                                onClick={() => handleCopyTrade(pred)}
                              >
                                <UserPlus className="h-3 w-3" />
                                跟单
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 跟单确认弹窗 */}
      <Dialog open={!!copyTradeDialog} onOpenChange={() => setCopyTradeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              一键跟单
            </DialogTitle>
          </DialogHeader>
          
          {copyTradeDialog && (
            <div className="space-y-4">
              {/* 跟单目标玩家 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10 border-2 border-primary/30">
                  <AvatarImage src={copyTradeDialog.player.avatarUrl} />
                  <AvatarFallback>{copyTradeDialog.player.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{copyTradeDialog.player.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    胜率: <span className={copyTradeDialog.player.winRate >= 50 ? 'text-success' : 'text-destructive'}>
                      {copyTradeDialog.player.winRate.toFixed(1)}%
                    </span>
                    <span className="mx-2">|</span>
                    连胜: <span className="text-success">{copyTradeDialog.player.bestStreak || 0}场</span>
                  </p>
                </div>
              </div>

              {/* 跟单比赛信息 */}
              <div className="p-3 rounded-lg border border-border/50 space-y-2">
                <div className="text-xs text-muted-foreground mb-2">跟单比赛</div>
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  <span className="text-right flex-1">{copyTradeDialog.prediction.home_team}</span>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">VS</span>
                  <span className="text-left flex-1">{copyTradeDialog.prediction.away_team}</span>
                </div>
                <div className="text-center text-xs text-muted-foreground mt-2">
                  预测: <span className="text-primary font-medium">{copyTradeDialog.prediction.prediction}</span>
                  <span className="mx-2">|</span>
                  类型: {copyTradeDialog.prediction.prediction_type === 'over_under' ? '大小球' : '让球'}
                </div>
              </div>

              {/* 跟单金额设置 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">跟单金额</span>
                  <span className="text-xs text-muted-foreground">
                    可用余额: <span className="text-foreground font-medium">¥{realBalance.toLocaleString()}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {[50, 100, 200, 500].map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant={copyBetAmount === amount ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setCopyBetAmount(amount)}
                    >
                      ¥{amount}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">自定义:</span>
                  <Input
                    type="number"
                    value={copyBetAmount}
                    onChange={(e) => setCopyBetAmount(Number(e.target.value))}
                    className="flex-1 h-8"
                    min={10}
                    max={realBalance}
                  />
                </div>
              </div>

              {/* 预期收益 */}
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">预期收益</span>
                  <span className="font-bold text-success">
                    +¥{(copyBetAmount * 1.8).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* 确认按钮 */}
              <Button 
                className="w-full" 
                onClick={confirmCopyTrade}
                disabled={isCopying || copyBetAmount > realBalance || copyBetAmount < 10 || !user}
              >
                {isCopying ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    跟单中...
                  </div>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    确认跟单 ¥{copyBetAmount}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 跟单成功动画弹窗 */}
      <AnimatePresence>
        {copySuccess?.show && (
          <Dialog open={true} onOpenChange={() => setCopySuccess(null)}>
            <DialogContent className="max-w-sm overflow-hidden">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="text-center space-y-4"
              >
                {/* 成功图标动画 */}
                <motion.div 
                  className="mx-auto w-20 h-20 rounded-full bg-success/20 flex items-center justify-center relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.4, duration: 0.6 }}
                  >
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </motion.div>
                  
                  {/* 闪烁星星效果 */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        x: [0, (i % 2 === 0 ? 1 : -1) * (30 + Math.random() * 20)],
                        y: [0, (i < 3 ? -1 : 1) * (20 + Math.random() * 20)],
                      }}
                      transition={{ 
                        delay: 0.5 + i * 0.1,
                        duration: 0.8,
                        ease: "easeOut"
                      }}
                    >
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* 成功文字 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-xl font-bold text-success">跟单成功!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    已跟随 <span className="text-foreground font-medium">{copySuccess.playerName}</span>
                  </p>
                </motion.div>

                {/* 余额变化动画 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="p-4 rounded-lg bg-muted/50 border border-border/50"
                >
                  <p className="text-xs text-muted-foreground mb-2">账户余额变化</p>
                  <div className="flex items-center justify-center gap-3">
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ delay: 1 }}
                      className="text-lg font-mono"
                    >
                      ¥{copySuccess.oldBalance.toLocaleString()}
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20"
                    >
                      <TrendingDown className="h-3 w-3 text-destructive" />
                      <span className="text-xs font-bold text-destructive">-¥{copySuccess.betAmount}</span>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 }}
                      className="text-lg font-mono font-bold text-primary"
                    >
                      ¥{copySuccess.newBalance.toLocaleString()}
                    </motion.div>
                  </div>
                </motion.div>

                {/* 预期收益提示 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="p-3 rounded-lg bg-success/10 border border-success/20"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">预期收益</span>
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ delay: 1.5, duration: 0.5 }}
                      className="font-bold text-success"
                    >
                      +¥{(copySuccess.betAmount * 1.8).toFixed(0)}
                    </motion.span>
                  </div>
                </motion.div>

                {/* 关闭按钮 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setCopySuccess(null)}
                  >
                    确定
                  </Button>
                </motion.div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {t('leaderboard_disclaimer') || '注意: 所有统计数据仅反映已完成的比赛预测。直播比赛预测在比赛结束前不计入统计。HUNSOCCER 所有内容均为模拟分析结果，仅供 AI 技术研究与赛事分析展示使用，不提供、不引导任何形式的投注或博彩活动。'}
        </p>
      </div>
    </div>
  );
};

export default PlayerLeaderboardTable;
