import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Flame, Skull, UserPlus, Calendar, X, Trophy, TrendingUp, TrendingDown, Lock, CheckCircle2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AnimatedAmount } from "@/components/AnimatedAmount";
// 球队Logo导入
import teamRealMadrid from "@/assets/team-real-madrid.png";
import teamBarcelona from "@/assets/team-barcelona.png";
import teamManchesterCity from "@/assets/team-manchester-city.png";
import teamLiverpool from "@/assets/team-liverpool.png";
import teamBayern from "@/assets/team-bayern.png";
import teamDortmund from "@/assets/team-dortmund.png";
import teamPsg from "@/assets/team-psg.png";
import teamMarseille from "@/assets/team-marseille.png";
import teamAcmilan from "@/assets/team-acmilan.png";
import teamArsenal from "@/assets/team-arsenal.png";
import teamInter from "@/assets/team-inter.png";
import teamAtletico from "@/assets/team-atletico.png";
import teamManchesterUnited from "@/assets/team-manchester-united.png";

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
  totalBetAmount?: number;
  profitAmount?: number;
  bestStreak: number;
  worstStreak: number;
  currentStreak: number;
  isVirtual?: boolean;
  todayTotal?: number;
  todayCorrect?: number;
  todayWinRate?: number;
  allowCopyTrade?: boolean;
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
  home_logo?: string | null;
  away_logo?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  match_status?: string;
  league?: string;
  match_time?: string;
}

interface CopyTradeData {
  player: PlayerData;
  prediction: TodayPrediction;
  betAmount: number;
}

// 球队Logo映射
const teamLogoMap: Record<string, string> = {
  '皇家马德里': teamRealMadrid,
  '巴塞罗那': teamBarcelona,
  '曼城': teamManchesterCity,
  '利物浦': teamLiverpool,
  '拜仁慕尼黑': teamBayern,
  '多特蒙德': teamDortmund,
  '巴黎圣日耳曼': teamPsg,
  '马赛': teamMarseille,
  'AC米兰': teamAcmilan,
  '尤文图斯': teamInter, // 使用国米logo暂代
  '切尔西': teamManchesterCity, // 暂代
  '阿森纳': teamArsenal,
  '国际米兰': teamInter,
  '那不勒斯': teamAcmilan, // 暂代
  '马德里竞技': teamAtletico,
  '塞维利亚': teamAtletico, // 暂代
  '曼联': teamManchesterUnited,
  '热刺': teamArsenal, // 暂代
  '纽卡斯尔': teamLiverpool, // 暂代
};

// 获取球队Logo
const getTeamLogo = (teamName: string): string | null => {
  return teamLogoMap[teamName] || null;
};

// 隐藏玩家名字中间部分
const maskPlayerName = (name: string): string => {
  if (!name || name.length <= 2) return name;
  if (name.length <= 4) {
    return name.charAt(0) + '*'.repeat(name.length - 1);
  }
  const firstChar = name.charAt(0);
  const lastTwoChars = name.slice(-2);
  const middleLength = Math.min(name.length - 3, 4);
  return firstChar + '*'.repeat(middleLength) + lastTwoChars;
};

const PlayerCopyTradingBoard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<Map<string, { total: number; correct: number; winRate: number }>>(new Map());
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: PlayerData; predictions: TodayPrediction[] } | null>(null);
  const [copyTradeDialog, setCopyTradeDialog] = useState<CopyTradeData | null>(null);
  const [copySuccess, setCopySuccess] = useState<{
    show: boolean;
    playerName: string;
    betAmount: number;
    prediction: TodayPrediction;
    predictionType: string;
    odds: string;
  } | null>(null);
  const [userBalance, setUserBalance] = useState(10000);
  const [copyBetAmount, setCopyBetAmount] = useState(100);
  const [isCopying, setIsCopying] = useState(false);
  const [timeRange, setTimeRange] = useState<1 | 7 | 30>(7);

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;
        
        // 将虚拟玩家转换为 PlayerData 格式（只选择允许跟单的玩家）
        const virtualPlayersData: PlayerData[] = virtualPlayers
          .filter(player => player.allowCopyTrade !== false) // 只选择允许跟单的玩家
          .map((player) => {
            // 为虚拟玩家计算投注金额和盈利金额
            // 虚拟玩家的profit数据是以分为单位（与真实玩家一致）
            // 假设平均每次投注200元（20000分），总投注金额 = totalPredictions * 20000
            const totalBetAmount = player.totalPredictions * 20000; // 每次投注200元 = 20000分
            const profitAmount = player.profit; // profit已经是盈利金额（以分为单位）
            
            return {
              ...player,
              totalBetAmount,
              profitAmount,
              bestStreak: player.bestStreak || 0,
              worstStreak: player.worstStreak || 0,
              currentStreak: 0,
              isVirtual: true,
              allowCopyTrade: player.allowCopyTrade ?? true,
            };
          });
        
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
          .select('user_id, result, bet_amount, actual_payout');
        
        if (predictionsError) throw predictionsError;
        
        // 创建映射
        const balancesMap = new Map(balancesData?.map(b => [b.user_id, b.balance]) || []);
        
        // 计算每个用户的统计数据
        const realPlayerStats = usersData.map(user => {
          const userPredictions = predictionsData?.filter(p => p.user_id === user.id) || [];
          const totalPredictions = userPredictions.length;
          const correctPredictions = userPredictions.filter(p => p.result === 'win').length;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          
          // 计算投注金额和盈利金额
          const totalBetAmount = userPredictions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);
          const validAmount = userPredictions.reduce((sum, p) => {
            if (p.result === 'win') {
              return sum + (p.actual_payout || p.bet_amount || 0);
            }
            return sum;
          }, 0);
          const profitAmount = validAmount - totalBetAmount;
          
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
            totalBetAmount,
            profitAmount,
            bestStreak,
            worstStreak,
            currentStreak,
            isVirtual: false,
            allowCopyTrade: true, // 真实玩家默认允许跟单
          };
        }).filter(player => player.totalPredictions > 0);
        
        // 合并真实玩家和虚拟玩家
        const combined = [...virtualPlayersData, ...realPlayerStats];
        setAllPlayers(combined);
      } catch (error) {
        console.error('Error fetching all players:', error);
        const virtualPlayersData: PlayerData[] = virtualPlayers
          .filter(player => player.allowCopyTrade !== false)
          .map((player) => {
            // 为虚拟玩家计算投注金额和盈利金额
            // 虚拟玩家的profit数据是以分为单位（与真实玩家一致）
            // 假设平均每次投注200元（20000分），总投注金额 = totalPredictions * 20000
            const totalBetAmount = player.totalPredictions * 20000; // 每次投注200元 = 20000分
            const profitAmount = player.profit; // profit已经是盈利金额（以分为单位）
            
            return {
              ...player,
              totalBetAmount,
              profitAmount,
              bestStreak: player.bestStreak || 0,
              worstStreak: player.worstStreak || 0,
              currentStreak: 0,
              isVirtual: true,
              allowCopyTrade: player.allowCopyTrade ?? true,
            };
          });
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
    // 模拟球队名称和联赛信息
    const mockTeams = [
      { home: '皇家马德里', away: '巴塞罗那', homeScore: 2, awayScore: 1, league: '西甲', time: '03:00' },
      { home: '曼城', away: '利物浦', homeScore: 3, awayScore: 2, league: '英超', time: '23:30' },
      { home: '拜仁慕尼黑', away: '多特蒙德', homeScore: 1, awayScore: 1, league: '德甲', time: '21:30' },
      { home: '巴黎圣日耳曼', away: '马赛', homeScore: 2, awayScore: 0, league: '法甲', time: '03:45' },
      { home: '尤文图斯', away: 'AC米兰', homeScore: 0, awayScore: 1, league: '意甲', time: '02:45' },
      { home: '切尔西', away: '阿森纳', homeScore: 2, awayScore: 2, league: '英超', time: '20:00' },
      { home: '国际米兰', away: '那不勒斯', homeScore: 3, awayScore: 1, league: '意甲', time: '00:30' },
      { home: '马德里竞技', away: '塞维利亚', homeScore: 1, awayScore: 0, league: '西甲', time: '01:00' },
    ];

    if (player.isVirtual) {
      // 为虚拟玩家生成模拟数据
      const stats = todayStats.get(player.id);
      const mockPredictions: TodayPrediction[] = [];
      const total = stats?.total || 5;
      const correct = stats?.correct || 3;
      
      for (let i = 0; i < total; i++) {
        const teamInfo = mockTeams[i % mockTeams.length];
        const predType = Math.random() > 0.5 ? 'over_under' : 'handicap';
        const overUnderLine = [2.0, 2.5, 3.0, 3.5][Math.floor(Math.random() * 4)];
        const handicapLine = [-0.5, -1, -1.5, 0.5, 1][Math.floor(Math.random() * 5)];
        mockPredictions.push({
          id: `mock-${i}`,
          match_id: `match-${1000 + i}`,
          prediction: predType === 'over_under' 
            ? (Math.random() > 0.5 ? `大${overUnderLine}` : `小${overUnderLine}`)
            : (Math.random() > 0.5 ? `主让${Math.abs(handicapLine)}` : `客让${Math.abs(handicapLine)}`),
          prediction_type: predType,
          bet_amount: Math.floor(Math.random() * 500) + 100,
          potential_payout: Math.floor(Math.random() * 800) + 200,
          actual_payout: i < correct ? Math.floor(Math.random() * 800) + 200 : 0,
          result: i < correct ? 'win' : 'loss',
          created_at: new Date().toISOString(),
          home_team: teamInfo.home,
          away_team: teamInfo.away,
          home_score: teamInfo.homeScore,
          away_score: teamInfo.awayScore,
          match_status: 'FT',
          league: teamInfo.league,
          match_time: teamInfo.time
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
      toast.error(t('fetch_today_failed'));
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
        match_status: pred.result ? 'FT' : 'NS',
        league: teamInfo.league,
        match_time: teamInfo.time
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
      home_logo: getTeamLogo(randomMatch.home),
      away_logo: getTeamLogo(randomMatch.away),
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
      toast.error(t('insufficient_balance'));
      return;
    }

    if (copyBetAmount < 10) {
      toast.error(t('min_copy_amount'));
      return;
    }

    setIsCopying(true);
    
    // 模拟跟单过程
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 更新虚拟余额
    setUserBalance(prev => prev - copyBetAmount);
    
    const odds = copyTradeDialog.prediction.potential_payout && copyTradeDialog.prediction.bet_amount
      ? (copyTradeDialog.prediction.potential_payout / copyTradeDialog.prediction.bet_amount).toFixed(2)
      : '1.80';
    
    // 显示成功对话框
    setCopySuccess({
      show: true,
      playerName: copyTradeDialog.player.displayName,
      betAmount: copyBetAmount,
      prediction: copyTradeDialog.prediction,
      predictionType: copyTradeDialog.prediction.prediction_type === 'over_under' ? '大小球' : '让分',
      odds
    });
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
      className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/player/${player.id}`)}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {rank !== undefined && (
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
            rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
            rank === 2 ? 'bg-gray-400/20 text-gray-400' :
            rank === 3 ? 'bg-orange-600/20 text-orange-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {rank}
          </div>
        )}
        <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-border/40 flex-shrink-0">
          <AvatarImage src={player.avatarUrl} alt={player.displayName} />
          <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-xs sm:text-sm truncate">{maskPlayerName(player.displayName)}</p>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            {/* 盈利金额和投注金额 - 在胜率和盈利率上面 */}
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-muted-foreground/70 hidden sm:inline">{t('profit_amount') || '盈利金额'}:</span>
                <span className="text-muted-foreground/70 sm:hidden">盈:</span>
                <span className={`font-medium ${(player.profitAmount || 0) >= 0 ? (streakType === 'best' ? 'text-destructive' : 'text-success') : (streakType === 'best' ? 'text-destructive/60' : 'text-success/60')}`}>
                  {(player.profitAmount || 0) >= 0 ? '+' : ''}${((player.profitAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </span>
              <span className="text-border hidden sm:inline">|</span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-muted-foreground/70 hidden sm:inline">{t('bet_amount') || '投注金额'}:</span>
                <span className="text-muted-foreground/70 sm:hidden">投:</span>
                <span className={streakType === 'best' ? 'text-destructive font-medium' : 'text-success font-medium'}>
                  ${((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </span>
            </div>
            {/* 预测场数、正确、错误、胜率和盈利率 */}
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-muted-foreground/70 hidden sm:inline">{t('total_predictions') || '预测'}:</span>
                <span className="text-muted-foreground/70 sm:hidden">预:</span>
                <span className="text-foreground font-medium">{player.totalPredictions}</span>
              </span>
              <span className="text-border hidden sm:inline">|</span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-muted-foreground/70 hidden sm:inline">{t('correct') || '正确'}:</span>
                <span className="text-muted-foreground/70 sm:hidden">对:</span>
                <span className="text-success font-medium">{player.correctPredictions}</span>
              </span>
              <span className="text-border hidden sm:inline">|</span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-muted-foreground/70 hidden sm:inline">{t('incorrect') || '错误'}:</span>
                <span className="text-muted-foreground/70 sm:hidden">错:</span>
                <span className="text-destructive font-medium">{player.totalPredictions - player.correctPredictions}</span>
              </span>
              <span className="text-border hidden sm:inline">|</span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-muted-foreground/70 hidden sm:inline">{t('win_rate')}:</span>
                <span className="text-muted-foreground/70 sm:hidden">胜:</span>
                <span className={streakType === 'best' ? 'text-destructive font-medium' : 'text-success font-medium'}>
                  {player.winRate.toFixed(1)}%
                </span>
              </span>
              <span className="text-border hidden sm:inline">|</span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-muted-foreground/70 hidden sm:inline">{t('profit_label')}:</span>
                <span className="text-muted-foreground/70 sm:hidden">盈:</span>
                <span className={streakType === 'best' ? 'text-destructive font-medium' : 'text-success font-medium'}>
                  {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
                </span>
              </span>
              {showStreak && (
                <>
                  <span className="text-border hidden sm:inline">|</span>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <span className="text-muted-foreground/70 hidden sm:inline">{streakType === 'best' ? t('best_streak') : t('worst_streak')}:</span>
                    <span className="text-muted-foreground/70 sm:hidden">{streakType === 'best' ? '连' : '黑'}:</span>
                    <span className={streakType === 'best' ? 'text-destructive font-medium' : 'text-success font-medium'}>
                      {streakType === 'best' ? player.bestStreak : player.worstStreak}{t('matches_unit')}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {/* 今日预测按钮 - 手机端隐藏文字，只显示图标 */}
        <Button
          size="sm"
          variant="ghost"
          className="text-xs gap-1 px-2 sm:px-2"
          onClick={(e) => {
            e.stopPropagation();
            fetchTodayPredictions(player);
          }}
        >
          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline text-muted-foreground">{t('yesterday_predictions')}:</span>
          {(() => {
            const stats = todayStats.get(player.id);
            if (!stats || stats.total === 0) return <span className="hidden sm:inline">-</span>;
            return (
              <span className={`${streakType === 'best' ? 'text-destructive font-medium' : 'text-success font-medium'} hidden sm:inline`}>
                {stats.correct}/{stats.total} {stats.winRate.toFixed(0)}%
              </span>
            );
          })()}
        </Button>
        {/* 跟单按钮 - 手机端只显示图标 */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1 px-2 sm:px-3"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyTrade(player);
          }}
        >
          <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{t('copy_trade_btn') || '跟单'}</span>
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
      {/* Leaderboard Table - Split into Hot Streak and Cold Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 连红榜 - Winning Streak */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">玩家连红榜</h3>
                <p className="text-xs text-muted-foreground">最佳连胜纪录</p>
              </div>
              {/* Time Range Filter */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
                <button
                  onClick={() => setTimeRange(1)}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                    timeRange === 1
                      ? 'bg-foreground text-background shadow-sm scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t('time_filter_1d') || '日'}
                </button>
                <button
                  onClick={() => setTimeRange(7)}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                    timeRange === 7
                      ? 'bg-foreground text-background shadow-sm scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t('time_filter_7d') || '周'}
                </button>
                <button
                  onClick={() => setTimeRange(30)}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                    timeRange === 30
                      ? 'bg-foreground text-background shadow-sm scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t('time_filter_30d') || '月'}
                </button>
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
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">玩家连黑榜</h3>
                <p className="text-xs text-muted-foreground">最差连败纪录</p>
              </div>
              {/* Time Range Filter */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
                <button
                  onClick={() => setTimeRange(1)}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                    timeRange === 1
                      ? 'bg-foreground text-background shadow-sm scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t('time_filter_1d') || '日'}
                </button>
                <button
                  onClick={() => setTimeRange(7)}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                    timeRange === 7
                      ? 'bg-foreground text-background shadow-sm scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t('time_filter_7d') || '周'}
                </button>
                <button
                  onClick={() => setTimeRange(30)}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                    timeRange === 30
                      ? 'bg-foreground text-background shadow-sm scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {t('time_filter_30d') || '月'}
                </button>
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
          <Card className="relative overflow-hidden border-destructive/30 animate-fade-in hover:scale-[1.02] transition-transform duration-300" style={{ animationDelay: '100ms' }}>
            {/* Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${topStreakPlayers[0]?.avatarUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/60 via-red-600/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-destructive/30 animate-pulse">
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
                <span className="text-lg sm:text-xl font-bold text-white">{maskPlayerName(topStreakPlayers[0]?.displayName || '')}</span>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-[10px] sm:text-xs text-white/70 mb-0.5">{t('best_streak') || '最佳连胜'}</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold font-mono text-destructive">
                    {topStreakPlayers[0]?.bestStreak || 0} {t('matches_unit') || '场'}
                  </p>
                </div>
                
                <div>
                  <p className="text-[10px] sm:text-xs text-white/70 mb-0.5">{t('total_profit') || '总盈利'}</p>
                  <p className="text-sm sm:text-lg lg:text-xl font-bold font-mono text-destructive flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    +¥{Math.abs(topStreakPlayers[0]?.profit || 0).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-[10px] sm:text-xs text-white/70 mb-0.5">{t('win_rate') || '胜率'}</p>
                  <p className="text-sm sm:text-base lg:text-lg font-bold text-white">
                    {topStreakPlayers[0]?.winRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Bar Chart */}
          <Card className="lg:col-span-1 relative overflow-hidden animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent" />
            
            <CardContent className="p-3 sm:p-4 lg:p-6 relative z-10">
              <h3 className="text-xs sm:text-sm lg:text-base font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary animate-pulse" />
                {t('profit_comparison') || '盈亏对比'}
              </h3>
              <ResponsiveContainer width="100%" height={200} className="!h-[120px] sm:!h-[150px] lg:!h-[200px]">
                <BarChart 
                  data={[
                    { 
                      name: maskPlayerName(topStreakPlayers[0]?.displayName || '').slice(0, 6) || '连红冠军', 
                      value: Math.abs(topStreakPlayers[0]?.profit || 1500),
                      type: 'profit'
                    },
                    { 
                      name: maskPlayerName(worstStreakPlayers[0]?.displayName || '').slice(0, 6) || '连黑冠军', 
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
                    formatter={(value: number) => [`¥${Math.abs(value).toLocaleString()}`, value >= 0 ? t('profit_tooltip') : t('loss_tooltip')]}
                    animationDuration={300}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationBegin={200}
                    animationEasing="ease-out"
                  >
                    {[
                      { type: 'profit' },
                      { type: 'loss' },
                    ].map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.type === 'profit' ? 'hsl(var(--destructive))' : 'hsl(var(--success))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Summary Stats */}
              <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2 text-center">
                <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t('total_earned') || '总赚取'}</p>
                  <p className="text-xs sm:text-sm font-bold text-destructive">
                    <AnimatedAmount value={topStreakPlayers[0]?.profit || 1500} prefix="+" duration={1800} />
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t('total_lost') || '总亏损'}</p>
                  <p className="text-xs sm:text-sm font-bold text-success">
                    <AnimatedAmount value={worstStreakPlayers[0]?.profit < 0 ? worstStreakPlayers[0]?.profit : 1200} prefix="" duration={1800} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Loser Card - 连黑榜第一名 */}
          <Card className="relative overflow-hidden border-success/30 animate-fade-in hover:scale-[1.02] transition-transform duration-300" style={{ animationDelay: '500ms' }}>
            {/* Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${worstStreakPlayers[0]?.avatarUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-success/60 via-green-600/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-success/30 animate-pulse">
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
                <span className="text-lg sm:text-xl font-bold text-white">{maskPlayerName(worstStreakPlayers[0]?.displayName || '')}</span>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-[10px] sm:text-xs text-white/70 mb-0.5">{t('worst_streak') || '最差连败'}</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold font-mono text-success">
                    {worstStreakPlayers[0]?.worstStreak || 0} {t('matches_unit') || '场'}
                  </p>
                </div>
                
                <div>
                  <p className="text-[10px] sm:text-xs text-white/70 mb-0.5">{t('total_loss') || '总亏损'}</p>
                  <p className="text-sm sm:text-lg lg:text-xl font-bold font-mono text-success flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    ¥{Math.abs(worstStreakPlayers[0]?.profit < 0 ? worstStreakPlayers[0]?.profit : 1200).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-[10px] sm:text-xs text-white/70 mb-0.5">{t('win_rate') || '胜率'}</p>
                  <p className="text-sm sm:text-base lg:text-lg font-bold text-white">
                    {worstStreakPlayers[0]?.winRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0">
          {selectedPlayer && (() => {
            const totalBet = selectedPlayer.predictions.reduce((sum, p) => sum + p.bet_amount, 0);
            const totalProfitLoss = selectedPlayer.predictions.reduce((sum, p) => {
              if (p.result === 'win') return sum + ((p.actual_payout || p.potential_payout || 0) - p.bet_amount);
              if (p.result === 'loss') return sum - p.bet_amount;
              return sum;
            }, 0);
            const winCount = selectedPlayer.predictions.filter(p => p.result === 'win').length;
            const settledCount = selectedPlayer.predictions.filter(p => p.result && p.result !== 'pending').length;
            const winRate = settledCount > 0 ? (winCount / settledCount) * 100 : 0;

            return (
              <>
                {/* 头部 - 玩家信息 + 统计数据 */}
                <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8 border border-border/50">
                        <AvatarImage src={selectedPlayer.player.avatarUrl} />
                        <AvatarFallback className="text-xs bg-muted">{selectedPlayer.player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{maskPlayerName(selectedPlayer.player.displayName)}</span>
                    </div>
                  </div>
                  
                  {/* 统计数据行 */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="py-1.5 px-2 rounded bg-background/50 border border-border/30">
                      <div className="text-[10px] text-muted-foreground mb-0.5">预测场数</div>
                      <div className="text-sm font-bold font-mono text-foreground">{selectedPlayer.predictions.length}</div>
                    </div>
                    <div className="py-1.5 px-2 rounded bg-background/50 border border-border/30">
                      <div className="text-[10px] text-muted-foreground mb-0.5">胜率</div>
                      <div className="text-sm font-bold font-mono text-foreground">{winRate.toFixed(0)}%</div>
                    </div>
                    <div className="py-1.5 px-2 rounded bg-background/50 border border-border/30">
                      <div className="text-[10px] text-muted-foreground mb-0.5">总投注</div>
                      <div className="text-sm font-bold font-mono text-foreground">¥{totalBet}</div>
                    </div>
                    <div className="py-1.5 px-2 rounded bg-background/50 border border-border/30">
                      <div className="text-[10px] text-muted-foreground mb-0.5">总盈亏</div>
                      <div className={`text-sm font-bold font-mono ${totalProfitLoss >= 0 ? 'text-foreground' : 'text-foreground'}`}>
                        {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 预测列表 */}
                <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
                  {selectedPlayer.predictions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      {t('no_predictions_today')}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {/* 表头 */}
                      <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted/20 text-[10px] font-medium text-muted-foreground sticky top-0 border-b border-border/20">
                        <div className="col-span-3">比赛</div>
                        <div className="col-span-2 text-center">类型</div>
                        <div className="col-span-2 text-center">预测</div>
                        <div className="col-span-2 text-center">投注</div>
                        <div className="col-span-1 text-center hidden sm:block">赔率</div>
                        <div className="col-span-2 text-right">盈亏</div>
                      </div>
                      
                      {/* 数据行 */}
                      {selectedPlayer.predictions.map((pred, index) => {
                        const odds = pred.potential_payout && pred.bet_amount 
                          ? (pred.potential_payout / pred.bet_amount).toFixed(2) 
                          : '1.80';
                        const profitLoss = pred.result === 'win' 
                          ? (pred.actual_payout || pred.potential_payout || 0) - pred.bet_amount
                          : pred.result === 'loss' 
                            ? -pred.bet_amount 
                            : 0;
                        
                        return (
                          <div 
                            key={pred.id} 
                            className={`grid grid-cols-12 gap-1 px-3 py-2.5 text-xs items-center hover:bg-muted/10 transition-colors ${
                              index % 2 === 0 ? 'bg-transparent' : 'bg-muted/5'
                            }`}
                          >
                            {/* 比赛 - 包含联赛和时间 */}
                            <div className="col-span-3">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground font-medium truncate">
                                  {pred.league || '联赛'}
                                </span>
                                <span className="text-[9px] text-muted-foreground font-mono">
                                  {pred.match_time || '00:00'}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0">
                                <span className="font-medium truncate text-[11px] text-foreground">
                                  {pred.home_team || '-'}
                                </span>
                                <span className="text-muted-foreground truncate text-[11px]">
                                  {pred.away_team || '-'}
                                </span>
                              </div>
                              {(pred.match_status === 'FT' || pred.result) && (
                                <span className="text-[10px] font-mono font-bold text-foreground">
                                  {pred.home_score ?? 0} - {pred.away_score ?? 0}
                                </span>
                              )}
                            </div>
                        
                            {/* 类型 */}
                            <div className="col-span-2 text-center">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/50 text-muted-foreground">
                                {pred.prediction_type === 'over_under' ? '大小球' : '让分'}
                              </span>
                            </div>
                            
                            {/* 预测详情 */}
                            <div className="col-span-2 text-center">
                              <div className="font-medium text-[11px] text-foreground">{pred.prediction}</div>
                            </div>
                            
                            {/* 投注金额 */}
                            <div className="col-span-2 text-center font-mono text-[11px] text-foreground">
                              ¥{pred.bet_amount}
                            </div>

                            {/* 赔率 - 桌面显示 */}
                            <div className="col-span-1 text-center font-mono text-[10px] text-muted-foreground hidden sm:block">
                              @{odds}
                            </div>
                            
                            {/* 盈亏 */}
                            <div className="col-span-2 text-right">
                              {pred.result === 'pending' || !pred.result ? (
                                <span className="text-[10px] text-muted-foreground">
                                  待结算
                                </span>
                              ) : (
                                <span className={`font-bold font-mono text-[11px] ${
                                  pred.result === 'win' ? 'text-success' : 'text-destructive'
                                }`}>
                                  {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(0)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 跟单确认弹窗 */}
      <Dialog open={!!copyTradeDialog} onOpenChange={() => setCopyTradeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              {t('one_click_copy')}
            </DialogTitle>
          </DialogHeader>
          
          {copyTradeDialog && (
            <div className="space-y-4">
              {/* 跟单目标玩家 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                <Avatar className="w-10 h-10 border border-border/50">
                  <AvatarImage src={copyTradeDialog.player.avatarUrl} />
                  <AvatarFallback className="bg-muted">{copyTradeDialog.player.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{maskPlayerName(copyTradeDialog.player.displayName)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('win_rate')}: <span className="text-foreground font-medium">{copyTradeDialog.player.winRate.toFixed(1)}%</span>
                    <span className="mx-2 text-border">|</span>
                    {t('best_streak')}: <span className="text-foreground font-medium">{copyTradeDialog.player.bestStreak}{t('matches_unit')}</span>
                  </p>
                </div>
              </div>

              {/* 跟单比赛信息 - 锁定状态 */}
              <div className="p-4 rounded-lg border border-border/30 bg-muted/20">
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">比赛详情已锁定</p>
                    <p className="text-xs text-muted-foreground mt-1">确认跟单后解锁查看完整信息</p>
                  </div>
                </div>
              </div>

              {/* 跟单金额设置 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('copy_amount')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('available_balance_label')}: <span className="text-foreground font-medium">¥{userBalance.toLocaleString()}</span>
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                <span className="text-sm text-muted-foreground">{t('expected_profit')}</span>
                <span className="font-bold text-foreground font-mono">
                  +¥{(copyBetAmount * 0.8).toFixed(0)} ~ +¥{(copyBetAmount * 1.2).toFixed(0)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCopyTradeDialog(null)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmCopyTrade}
                  disabled={isCopying || copyBetAmount > userBalance}
                >
                  {isCopying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t('copying')}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-1" />
                      确认跟单解锁
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                {t('copy_disclaimer')}
              </p>
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
                {/* 跟随玩家头像 */}
                <motion.div 
                  className="mx-auto w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center relative border-2 border-border"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={allPlayers.find(p => p.displayName === copySuccess.playerName)?.avatarUrl} />
                    <AvatarFallback className="text-xl">{copySuccess.playerName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* 成功勾选标记 */}
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.5, duration: 0.4 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-white" />
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
                    已跟随 <span className="text-foreground font-medium">{maskPlayerName(copySuccess.playerName)}</span>
                  </p>
                </motion.div>

                {/* 跟单人数信息 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/30"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    已有 <span className="text-foreground font-bold">{Math.floor(Math.random() * 200) + 50}</span> 人跟单该玩家
                  </span>
                </motion.div>

                {/* 解锁的比赛信息 */}
                {copySuccess.prediction && (
                  <motion.div
                    initial={{ y: 20, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="p-3 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ delay: 0.6, type: "spring" }}
                      >
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </motion.div>
                      <span className="text-xs font-medium text-success">比赛详情已解锁</span>
                    </div>
                    
                    <div className="text-sm font-medium text-center mb-2">
                      {copySuccess.prediction.home_team || '主队'} 
                      <span className="text-muted-foreground mx-2">vs</span> 
                      {copySuccess.prediction.away_team || '客队'}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 rounded bg-muted/30">
                        <div className="text-muted-foreground mb-0.5">类型</div>
                        <div className="font-medium">{copySuccess.predictionType}</div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/30">
                        <div className="text-muted-foreground mb-0.5">预测</div>
                        <div className="font-medium text-foreground">{copySuccess.prediction.prediction}</div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/30">
                        <div className="text-muted-foreground mb-0.5">赔率</div>
                        <div className="font-medium">{copySuccess.odds}</div>
                      </div>
                    </div>
                    
                    <div className="text-center text-xs text-muted-foreground mt-2">
                      玩家下注: <span className="text-foreground font-medium">¥{copySuccess.prediction.bet_amount}</span>
                    </div>
                  </motion.div>
                )}

                {/* 跟单金额显示 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="p-4 rounded-lg bg-muted/20 border border-border/30"
                >
                  <p className="text-xs text-muted-foreground mb-2">您的跟单金额</p>
                  <div className="flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                      className="text-2xl font-bold font-mono text-foreground"
                    >
                      ¥{copySuccess.betAmount.toLocaleString()}
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

                {/* 操作按钮 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setCopySuccess(null);
                      navigate('/my-predictions');
                    }}
                  >
                    查看我的跟单记录
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

export default PlayerCopyTradingBoard;