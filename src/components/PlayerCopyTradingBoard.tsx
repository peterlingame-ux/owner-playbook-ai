import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Flame, Skull, UserPlus, Calendar, X, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

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
  bestStreak: number;
  worstStreak: number;
  currentStreak: number;
  isVirtual?: boolean;
  todayTotal?: number;
  todayCorrect?: number;
  todayWinRate?: number;
}

interface TodayPrediction {
  id: string;
  match_id: string;
  prediction: string;
  prediction_type: string;
  bet_amount: number;
  potential_payout: number | null;
  actual_payout: number | null;
  result: string | null;
  created_at: string;
  // 比赛详情
  home_team?: string;
  away_team?: string;
  home_score?: number | null;
  away_score?: number | null;
  match_status?: string;
}

interface CopyTradeData {
  player: PlayerData;
  prediction: TodayPrediction;
  betAmount: number;
}

const PlayerCopyTradingBoard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<Map<string, { total: number; correct: number; winRate: number }>>(new Map());
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: PlayerData; predictions: TodayPrediction[] } | null>(null);
  const [copyTradeDialog, setCopyTradeDialog] = useState<CopyTradeData | null>(null);
  const [userBalance, setUserBalance] = useState(10000);
  const [copyBetAmount, setCopyBetAmount] = useState(100);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;
        
        // 将虚拟玩家转换为 PlayerData 格式
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player) => ({
          ...player,
          bestStreak: player.bestStreak || 0,
          worstStreak: player.worstStreak || 0,
          currentStreak: 0,
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
          .select('user_id, result');
        
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
          
          // 计算连胜/连败
          let bestStreak = 0;
          let tempStreak = 0;
          let worstStreak = 0;
          let lossStreak = 0;
          let currentStreak = 0;
          
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
          
          // 计算当前连胜
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
            bestStreak,
            worstStreak,
            currentStreak,
            isVirtual: false
          };
        }).filter(player => player.totalPredictions > 0);
        
        // 合并真实玩家和虚拟玩家
        const combined = [...virtualPlayersData, ...realPlayerStats];
        setAllPlayers(combined);
      } catch (error) {
        console.error('Error fetching all players:', error);
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player) => ({
          ...player,
          bestStreak: player.bestStreak || 0,
          worstStreak: player.worstStreak || 0,
          currentStreak: 0,
          isVirtual: true
        }));
        setAllPlayers(virtualPlayersData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllPlayers();
  }, []);

  // 获取今日预测统计
  useEffect(() => {
    const fetchTodayStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayPredictions, error } = await supabase
        .from('user_predictions')
        .select('user_id, result')
        .gte('created_at', today.toISOString());
      
      if (error || !todayPredictions) return;
      
      const statsMap = new Map<string, { total: number; correct: number; winRate: number }>();
      
      todayPredictions.forEach(pred => {
        const current = statsMap.get(pred.user_id) || { total: 0, correct: 0, winRate: 0 };
        current.total++;
        if (pred.result === 'win') current.correct++;
        current.winRate = current.total > 0 ? (current.correct / current.total) * 100 : 0;
        statsMap.set(pred.user_id, current);
      });
      
      // 为虚拟玩家生成模拟今日数据
      virtualPlayers.forEach(player => {
        const total = Math.floor(Math.random() * 8) + 3;
        const correct = Math.floor(total * (player.winRate / 100) + (Math.random() - 0.5) * 2);
        const actualCorrect = Math.max(0, Math.min(total, correct));
        statsMap.set(player.id, {
          total,
          correct: actualCorrect,
          winRate: total > 0 ? (actualCorrect / total) * 100 : 0
        });
      });
      
      setTodayStats(statsMap);
    };
    
    fetchTodayStats();
  }, []);

  const fetchTodayPredictions = async (player: PlayerData) => {
    // 模拟球队名称
    const mockTeams = [
      { home: '皇家马德里', away: '巴塞罗那', homeScore: 2, awayScore: 1 },
      { home: '曼城', away: '利物浦', homeScore: 3, awayScore: 2 },
      { home: '拜仁慕尼黑', away: '多特蒙德', homeScore: 1, awayScore: 1 },
      { home: '巴黎圣日耳曼', away: '马赛', homeScore: 2, awayScore: 0 },
      { home: '尤文图斯', away: 'AC米兰', homeScore: 0, awayScore: 1 },
      { home: '切尔西', away: '阿森纳', homeScore: 2, awayScore: 2 },
      { home: '国际米兰', away: '那不勒斯', homeScore: 3, awayScore: 1 },
      { home: '马德里竞技', away: '塞维利亚', homeScore: 1, awayScore: 0 },
    ];

    if (player.isVirtual) {
      // 为虚拟玩家生成模拟数据
      const stats = todayStats.get(player.id);
      const mockPredictions: TodayPrediction[] = [];
      const total = stats?.total || 5;
      const correct = stats?.correct || 3;
      
      for (let i = 0; i < total; i++) {
        const teamInfo = mockTeams[i % mockTeams.length];
        mockPredictions.push({
          id: `mock-${i}`,
          match_id: `match-${1000 + i}`,
          prediction: Math.random() > 0.5 ? 'over' : 'under',
          prediction_type: 'over_under',
          bet_amount: Math.floor(Math.random() * 500) + 100,
          potential_payout: Math.floor(Math.random() * 800) + 200,
          actual_payout: i < correct ? Math.floor(Math.random() * 800) + 200 : 0,
          result: i < correct ? 'win' : 'loss',
          created_at: new Date().toISOString(),
          home_team: teamInfo.home,
          away_team: teamInfo.away,
          home_score: teamInfo.homeScore,
          away_score: teamInfo.awayScore,
          match_status: 'FT'
        });
      }
      
      setSelectedPlayer({ player, predictions: mockPredictions });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('user_predictions')
      .select('*')
      .eq('user_id', player.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('获取今日记录失败');
      return;
    }

    // 为真实玩家的预测添加模拟比赛信息（实际应从API获取）
    const predictionsWithDetails: TodayPrediction[] = (data || []).map((pred, index) => {
      const teamInfo = mockTeams[index % mockTeams.length];
      return {
        ...pred,
        home_team: teamInfo.home,
        away_team: teamInfo.away,
        home_score: pred.result ? teamInfo.homeScore : null,
        away_score: pred.result ? teamInfo.awayScore : null,
        match_status: pred.result ? 'FT' : 'NS'
      };
    });
    
    setSelectedPlayer({ player, predictions: predictionsWithDetails });
  };

  // 按最佳连胜排序
  const topStreakPlayers = [...allPlayers]
    .sort((a, b) => b.bestStreak - a.bestStreak)
    .slice(0, 10);

  // 按最差连败排序
  const worstStreakPlayers = [...allPlayers]
    .sort((a, b) => b.worstStreak - a.worstStreak)
    .slice(0, 10);

  // 模拟比赛数据用于跟单
  const mockUpcomingMatches = [
    { home: '皇家马德里', away: '巴塞罗那', matchId: 'upcoming-1001' },
    { home: '曼城', away: '利物浦', matchId: 'upcoming-1002' },
    { home: '拜仁慕尼黑', away: '多特蒙德', matchId: 'upcoming-1003' },
    { home: '巴黎圣日耳曼', away: '马赛', matchId: 'upcoming-1004' },
  ];

  const handleCopyTrade = (player: PlayerData) => {
    // 生成一个虚拟的待跟单预测
    const randomMatch = mockUpcomingMatches[Math.floor(Math.random() * mockUpcomingMatches.length)];
    const prediction: TodayPrediction = {
      id: `copy-${Date.now()}`,
      match_id: randomMatch.matchId,
      prediction: Math.random() > 0.5 ? 'Over 2.5' : 'Under 2.5',
      prediction_type: Math.random() > 0.5 ? 'over_under' : 'handicap',
      bet_amount: 200,
      potential_payout: 360,
      actual_payout: null,
      result: null,
      created_at: new Date().toISOString(),
      home_team: randomMatch.home,
      away_team: randomMatch.away,
      home_score: null,
      away_score: null,
      match_status: 'NS'
    };
    
    setCopyTradeDialog({ player, prediction, betAmount: 100 });
    setCopyBetAmount(100);
  };

  const confirmCopyTrade = async () => {
    if (!copyTradeDialog) return;
    
    if (copyBetAmount > userBalance) {
      toast.error('余额不足，无法跟单');
      return;
    }

    if (copyBetAmount < 10) {
      toast.error('最低跟单金额为 ¥10');
      return;
    }

    setIsCopying(true);
    
    // 模拟跟单过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 更新虚拟余额
    setUserBalance(prev => prev - copyBetAmount);
    
    toast.success(
      <div className="space-y-1">
        <p className="font-medium">跟单成功！</p>
        <p className="text-xs text-muted-foreground">
          已跟随 {copyTradeDialog.player.displayName} 下注 ¥{copyBetAmount}
        </p>
        <p className="text-xs">
          {copyTradeDialog.prediction.home_team} vs {copyTradeDialog.prediction.away_team}
        </p>
        <p className="text-xs text-primary">
          预测: {copyTradeDialog.prediction.prediction}
        </p>
      </div>
    );
    
    setIsCopying(false);
    setCopyTradeDialog(null);
  };

  const PlayerCard = ({ 
    player, 
    showStreak = false, 
    streakType = 'best',
    rank
  }: { 
    player: PlayerData; 
    showStreak?: boolean; 
    streakType?: 'best' | 'worst';
    rank?: number;
  }) => (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/player/${player.id}`)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {rank !== undefined && (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
            rank === 2 ? 'bg-gray-400/20 text-gray-400' :
            rank === 3 ? 'bg-orange-600/20 text-orange-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {rank}
          </div>
        )}
        <Avatar className="w-10 h-10 border-2 border-border/40 flex-shrink-0">
          <AvatarImage src={player.avatarUrl} alt={player.displayName} />
          <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{player.displayName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70">胜率:</span>
              <span className={player.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {player.winRate.toFixed(1)}%
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70">盈利:</span>
              <span className={player.changePercent >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
              </span>
            </span>
            {showStreak && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground/70">{streakType === 'best' ? '连胜:' : '连败:'}</span>
                  <span className={streakType === 'best' ? 'text-success font-medium' : 'text-destructive font-medium'}>
                    {streakType === 'best' ? player.bestStreak : player.worstStreak}场
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {/* 今日预测按钮 */}
        <Button
          size="sm"
          variant="ghost"
          className="text-xs gap-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            fetchTodayPredictions(player);
          }}
        >
          <Calendar className="h-3 w-3" />
          <span className="text-muted-foreground">昨日预测:</span>
          {(() => {
            const stats = todayStats.get(player.id);
            if (!stats || stats.total === 0) return '-';
            return (
              <span className={stats.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {stats.correct}/{stats.total} {stats.winRate.toFixed(0)}%
              </span>
            );
          })()}
        </Button>
        {/* 跟单按钮 */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyTrade(player);
          }}
        >
          <UserPlus className="h-3 w-3" />
          {t('view') || '查看'}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Section: Win Rate Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 连红榜 - Winning Streak */}
        <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-destructive/20">
                <Flame className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('hot_streak_board') || '连红榜'}</h3>
                <p className="text-xs text-muted-foreground">{t('best_win_streak') || '最佳连胜纪录'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {topStreakPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} showStreak streakType="best" rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 连黑榜 - Losing Streak */}
        <Card className="border-success/30 bg-gradient-to-br from-success/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-success/20">
                <Skull className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('cold_streak_board') || '连黑榜'}</h3>
                <p className="text-xs text-muted-foreground">{t('worst_lose_streak') || '最差连败纪录'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {worstStreakPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} showStreak streakType="worst" rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Top Winner & Top Loser + Comparison Chart */}
      {!isLoading && topStreakPlayers.length > 0 && worstStreakPlayers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Top Winner Card - 连红榜第一名 */}
          <Card className="relative overflow-hidden border-destructive/30">
            {/* Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${topStreakPlayers[0]?.avatarUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/60 via-red-600/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-destructive/30">
                  <Flame className="h-4 w-4 text-destructive" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white/80">{t('hot_streak_champion') || '连红冠军'}</h3>
              </div>
              
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 cursor-pointer"
                onClick={() => topStreakPlayers[0] && navigate(`/player/${topStreakPlayers[0].id}`)}
              >
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-destructive/50">
                  <AvatarImage src={topStreakPlayers[0]?.avatarUrl} alt={topStreakPlayers[0]?.displayName} />
                  <AvatarFallback>{topStreakPlayers[0]?.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-lg sm:text-xl font-bold text-white">{topStreakPlayers[0]?.displayName}</span>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs text-white/70 mb-0.5">{t('best_streak') || '最佳连胜'}</p>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-destructive">
                    {topStreakPlayers[0]?.bestStreak || 0} {t('matches_unit') || '场'}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-white/70 mb-0.5">{t('total_profit') || '总盈利'}</p>
                  <p className="text-lg sm:text-xl font-bold font-mono text-success flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +¥{Math.abs(topStreakPlayers[0]?.profit || 0).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-white/70 mb-0.5">{t('win_rate') || '胜率'}</p>
                  <p className="text-base sm:text-lg font-bold text-white">
                    {topStreakPlayers[0]?.winRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Bar Chart */}
          <Card className="lg:col-span-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent" />
            
            <CardContent className="p-4 sm:p-6 relative z-10">
              <h3 className="text-sm sm:text-base font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                {t('profit_comparison') || '盈亏对比'}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart 
                  data={[
                    { 
                      name: topStreakPlayers[0]?.displayName?.slice(0, 6) || '连红冠军', 
                      value: Math.abs(topStreakPlayers[0]?.profit || 1500),
                      type: 'profit'
                    },
                    { 
                      name: worstStreakPlayers[0]?.displayName?.slice(0, 6) || '连黑冠军', 
                      value: -Math.abs(worstStreakPlayers[0]?.profit < 0 ? worstStreakPlayers[0]?.profit : -1200),
                      type: 'loss'
                    },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '10px' }}
                    tickFormatter={(value) => `¥${Math.abs(value)}`}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '10px' }}
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`¥${Math.abs(value).toLocaleString()}`, value >= 0 ? '盈利' : '亏损']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[
                      { type: 'profit' },
                      { type: 'loss' },
                    ].map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.type === 'profit' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Summary Stats */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-[10px] text-muted-foreground">{t('total_earned') || '总赚取'}</p>
                  <p className="text-sm font-bold text-success">+¥{Math.abs(topStreakPlayers[0]?.profit || 1500).toLocaleString()}</p>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-[10px] text-muted-foreground">{t('total_lost') || '总亏损'}</p>
                  <p className="text-sm font-bold text-destructive">-¥{Math.abs(worstStreakPlayers[0]?.profit < 0 ? worstStreakPlayers[0]?.profit : 1200).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Loser Card - 连黑榜第一名 */}
          <Card className="relative overflow-hidden border-success/30">
            {/* Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${worstStreakPlayers[0]?.avatarUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-success/60 via-green-600/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-success/30">
                  <Skull className="h-4 w-4 text-success" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white/80">{t('cold_streak_champion') || '连黑冠军'}</h3>
              </div>
              
              <div 
                className="flex items-center gap-2 sm:gap-3 mb-4 cursor-pointer"
                onClick={() => worstStreakPlayers[0] && navigate(`/player/${worstStreakPlayers[0].id}`)}
              >
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-success/50">
                  <AvatarImage src={worstStreakPlayers[0]?.avatarUrl} alt={worstStreakPlayers[0]?.displayName} />
                  <AvatarFallback>{worstStreakPlayers[0]?.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-lg sm:text-xl font-bold text-white">{worstStreakPlayers[0]?.displayName}</span>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs text-white/70 mb-0.5">{t('worst_streak') || '最差连败'}</p>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-success">
                    {worstStreakPlayers[0]?.worstStreak || 0} {t('matches_unit') || '场'}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-white/70 mb-0.5">{t('total_loss') || '总亏损'}</p>
                  <p className="text-lg sm:text-xl font-bold font-mono text-destructive flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    -¥{Math.abs(worstStreakPlayers[0]?.profit < 0 ? worstStreakPlayers[0]?.profit : 1200).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-white/70 mb-0.5">{t('win_rate') || '胜率'}</p>
                  <p className="text-base sm:text-lg font-bold text-white">
                    {worstStreakPlayers[0]?.winRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={selectedPlayer?.player.avatarUrl} />
                <AvatarFallback>{selectedPlayer?.player.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{selectedPlayer?.player.displayName} - 今日预测</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlayer && (
            <div className="space-y-3">
              {/* 今日统计 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">今日战绩</span>
                <span className="font-bold">
                  {todayStats.get(selectedPlayer.player.id)?.correct || 0}/
                  {todayStats.get(selectedPlayer.player.id)?.total || 0}
                  <span className={`ml-2 ${(todayStats.get(selectedPlayer.player.id)?.winRate || 0) >= 50 ? 'text-success' : 'text-destructive'}`}>
                    ({(todayStats.get(selectedPlayer.player.id)?.winRate || 0).toFixed(0)}%)
                  </span>
                </span>
              </div>
              
              {/* 预测列表 */}
              {selectedPlayer.predictions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  今日暂无预测记录
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPlayer.predictions.map((pred) => (
                    <div key={pred.id} className="p-3 rounded-lg bg-muted/30 space-y-3 border border-border/30">
                      {/* 比赛信息 */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-center gap-2 text-sm font-medium">
                            <span className="text-right flex-1 truncate">{pred.home_team || '主队'}</span>
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/50 min-w-[60px] justify-center">
                              {pred.match_status === 'FT' || pred.result ? (
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
                      <div className="flex items-center justify-between text-sm border-t border-border/20 pt-2">
                        <span className="text-muted-foreground">
                          {pred.prediction_type === 'over_under' ? '大小球' : '让球'}: 
                          <span className="font-medium ml-1 text-foreground">{pred.prediction}</span>
                        </span>
                        <span className="text-muted-foreground">
                          下注: <span className="text-foreground font-medium">¥{pred.bet_amount}</span>
                        </span>
                      </div>
                      
                      {/* 盈亏结果 */}
                      {pred.result && pred.result !== 'pending' && (
                        <div className="text-sm text-right border-t border-border/20 pt-2">
                          <span className={`font-bold ${pred.result === 'win' ? 'text-success' : 'text-destructive'}`}>
                            {pred.result === 'win' ? `+¥${pred.actual_payout || pred.potential_payout}` : `-¥${pred.bet_amount}`}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                    连胜: <span className="text-success">{copyTradeDialog.player.bestStreak}场</span>
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
                    可用余额: <span className="text-foreground font-medium">¥{userBalance.toLocaleString()}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {[50, 100, 200, 500].map((amount) => (
                    <Button
                      key={amount}
                      variant={copyBetAmount === amount ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setCopyBetAmount(amount)}
                    >
                      ¥{amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 预期收益 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                <span className="text-sm text-muted-foreground">预期收益</span>
                <span className="font-bold text-success">
                  +¥{(copyBetAmount * 0.8).toFixed(0)} ~ +¥{(copyBetAmount * 1.2).toFixed(0)}
                </span>
              </div>

              {/* 确认按钮 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCopyTradeDialog(null)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmCopyTrade}
                  disabled={isCopying || copyBetAmount > userBalance}
                >
                  {isCopying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      跟单中...
                    </>
                  ) : (
                    <>确认跟单 ¥{copyBetAmount}</>
                  )}
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                * 跟单即表示您同意使用虚拟资金复制该玩家的预测策略
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerCopyTradingBoard;