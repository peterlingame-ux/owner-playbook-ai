import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Trophy, History, ExternalLink, TrendingUp, TrendingDown, Minus, UserPlus, CheckCircle2, Sparkles, Lock, Users, DollarSign, Clock } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { AnimatedPrize, AnimatedPrizePool } from "./AnimatedPrize";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import grassTexture from "@/assets/grass-texture.jpg";
import hunterCoinIcon from "@/assets/hunter-coin-icon.png";
import bitcoinIcon from "@/assets/bitcoin-icon.png";
import prizeBannerBg from "@/assets/prize-banner-bg.jpg";
import hunsoccerAiIcon from "@/assets/hunsoccer-ai-icon.png";
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
  totalBetAmount?: number;
  profitAmount?: number;
  rank: number;
  bestStreak?: number;
  currentStreak?: number;
  worstStreak?: number;
  isVirtual?: boolean;
  isRecommender?: boolean;
  unlockPrice?: number; // USDT解锁价格，0或undefined表示免费
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
  handicap_line?: number | null;
  over_under_line?: number | null;
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
  const [timeRange, setTimeRange] = useState<1 | 7 | 30>(7);
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
    prediction?: TodayPrediction;
    predictionType?: string;
    odds?: string;
  } | null>(null);
  
  // 已跟单的预测ID集合 - 跟单后才能看到具体盘口
  const [copiedPredictions, setCopiedPredictions] = useState<Set<string>>(new Set());
  
  // USDT解锁弹窗状态
  const [unlockDialog, setUnlockDialog] = useState<{ player: PlayerData; prediction: TodayPrediction } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  // 奖金池配置
  const PRIZE_POOL = 1000000; // $1,000,000
  const AI_BENCHMARK_WIN_RATE = 58; // AI基准胜率 58%
  
  // 倒计时状态
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // 计算倒计时 - 每30天为一个周期
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      // 假设第一轮从2025年1月1日开始，每30天一轮
      const startDate = new Date('2025-01-01T00:00:00');
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / msPerDay);
      const currentRoundDay = daysSinceStart % 30;
      const daysRemaining = 30 - currentRoundDay - 1;
      
      // 计算到当天结束的剩余时间
      const endOfDay = new Date(now);
      endOfDay.setDate(endOfDay.getDate() + daysRemaining + 1);
      endOfDay.setHours(0, 0, 0, 0);
      
      const diff = endOfDay.getTime() - now.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };
    
    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // 计算预计奖金
  const calculateEstimatedPrize = (playerWinRate: number, playerRank: number, totalEligiblePlayers: number): number => {
    // 只有胜率超过AI的玩家才能获得奖金
    if (playerWinRate <= AI_BENCHMARK_WIN_RATE) return 0;
    
    // 胜率超出AI的部分
    const winRateSurplus = playerWinRate - AI_BENCHMARK_WIN_RATE;
    
    // 基础奖金计算：根据排名和胜率超出部分
    // 排名越高，奖金越多；胜率超出越多，奖金越多
    const rankMultiplier = Math.max(1 - (playerRank - 1) * 0.08, 0.1); // 排名1=100%, 排名10=28%
    const surplusMultiplier = Math.min(winRateSurplus / 20, 1.5); // 胜率超出20%以上获得最高倍数
    
    // 基础奖金池份额
    const baseShare = PRIZE_POOL * 0.6 / Math.max(totalEligiblePlayers, 1); // 60%奖池均分
    const bonusShare = PRIZE_POOL * 0.4 * rankMultiplier * surplusMultiplier / 10; // 40%奖池根据表现分配
    
    return Math.floor(baseShare + bonusShare);
  };
  
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
        
        // 将虚拟玩家转换为 PlayerData 格式（只选择推荐者）
        const virtualPlayersData: PlayerData[] = virtualPlayers
          .filter(player => player.isRecommender !== false) // 只选择推荐者
          .map((player, index) => {
            // 为虚拟玩家计算投注金额和盈利金额
            // 虚拟玩家的profit数据是以分为单位（与真实玩家一致）
            // 假设平均每次投注200元（20000分），总投注金额 = totalPredictions * 20000
            const totalBetAmount = player.totalPredictions * 20000; // 每次投注200元 = 20000分
            const profitAmount = player.profit; // profit已经是盈利金额（以分为单位）
            
            return {
              ...player,
              totalBetAmount,
              profitAmount,
              rank: index + 1,
              isVirtual: true,
              isRecommender: player.isRecommender ?? true,
              unlockPrice: player.unlockPrice,
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
        
        // 获取所有用户的预测统计 - 根据时间范围筛选
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeRange);
        startDate.setHours(0, 0, 0, 0);
        
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('user_predictions')
          .select('user_id, result, confidence, created_at, bet_amount, actual_payout')
          .gte('created_at', startDate.toISOString());
        
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
            totalBetAmount,
            profitAmount,
            rank: 0,
            bestStreak,
            currentStreak,
            worstStreak,
            isVirtual: false,
            isRecommender: true, // 真实玩家默认都是推荐者
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
        // 出错时使用虚拟玩家（只选择推荐者）
        const virtualPlayersData: PlayerData[] = virtualPlayers
          .filter(player => player.isRecommender !== false)
          .map((player, index) => {
            // 为虚拟玩家计算投注金额和盈利金额
            // 虚拟玩家的profit数据是以分为单位（与真实玩家一致）
            // 假设平均每次投注200元（20000分），总投注金额 = totalPredictions * 20000
            const totalBetAmount = player.totalPredictions * 20000; // 每次投注200元 = 20000分
            const profitAmount = player.profit; // profit已经是盈利金额（以分为单位）
            
            return {
              ...player,
              totalBetAmount,
              profitAmount,
              rank: index + 1,
              isVirtual: true,
              isRecommender: player.isRecommender ?? true,
            };
          });
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
  }, [timeRange]);

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

  // 获取指定玩家的今日推荐比赛
  const fetchTodayHistory = async (playerId: string, playerName: string, isVirtual: boolean) => {
    setIsLoadingHistory(true);
    setIsHistoryDialogOpen(true);
    
    // 今日推荐的比赛（未开始的比赛）
    const upcomingMatches = [
      { home: '皇家马德里', away: '巴塞罗那', matchTime: '21:00' },
      { home: '曼城', away: '利物浦', matchTime: '22:30' },
      { home: '拜仁慕尼黑', away: '多特蒙德', matchTime: '21:30' },
      { home: '巴黎圣日耳曼', away: '马赛', matchTime: '23:00' },
      { home: '尤文图斯', away: 'AC米兰', matchTime: '20:45' },
      { home: '切尔西', away: '阿森纳', matchTime: '22:00' },
      { home: '国际米兰', away: '那不勒斯', matchTime: '21:45' },
      { home: '马德里竞技', away: '塞维利亚', matchTime: '20:00' },
    ];
    
    // 已完成的比赛（用于显示历史战绩）
    const completedMatches = [
      { home: '曼联', away: '热刺', homeScore: 2, awayScore: 1 },
      { home: '阿森纳', away: '纽卡斯尔', homeScore: 3, awayScore: 0 },
    ];

    // 为虚拟玩家生成模拟数据
    if (isVirtual) {
      const todayData = todayWinRates.get(playerId);
      // 生成2-4场未开始的推荐比赛
      const upcomingCount = Math.floor(Math.random() * 3) + 2;
      // 生成1-2场已完成的比赛
      const completedCount = Math.floor(Math.random() * 2) + 1;
      
      const mockPredictions: TodayPrediction[] = [];
      
      // 添加未开始的推荐比赛
      for (let i = 0; i < upcomingCount; i++) {
        const match = upcomingMatches[i % upcomingMatches.length];
        const betAmount = Math.floor(Math.random() * 400) + 100;
        const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
        // 只有大小球和让分胜负两种类型
        const isOverUnder = Math.random() > 0.5;
        const overUnderPredictions = ['大 2.5球', '小 2.5球', '大 1.5球', '小 1.5球', '大 3.5球', '小 3.5球'];
        const handicapPredictions = ['让分主胜 -0.5', '让分客胜 +0.5', '让分主胜 -1', '让分客胜 +1', '让分主胜 -1.5', '让分客胜 +1.5'];
        const prediction = isOverUnder 
          ? overUnderPredictions[Math.floor(Math.random() * overUnderPredictions.length)]
          : handicapPredictions[Math.floor(Math.random() * handicapPredictions.length)];
        mockPredictions.push({
          id: `upcoming-${playerId}-${i}`,
          match_id: `upcoming-${1000 + i}`,
          prediction: prediction,
          prediction_type: isOverUnder ? 'over_under' : 'handicap',
          bet_amount: betAmount,
          potential_payout: potentialPayout,
          result: null, // 未开始
          actual_payout: null,
          created_at: new Date().toISOString(),
          match_date: new Date().toISOString(),
          home_team: match.home,
          away_team: match.away,
          home_score: null,
          away_score: null,
        });
      }
      
      // 添加已完成的比赛
      for (let i = 0; i < completedCount; i++) {
        const match = completedMatches[i % completedMatches.length];
        const isWin = Math.random() > 0.4;
        const betAmount = Math.floor(Math.random() * 400) + 100;
        const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
        const isOverUnder = Math.random() > 0.5;
        const overUnderPredictions = ['大 2.5球', '小 2.5球', '大 1.5球', '小 1.5球'];
        const handicapPredictions = ['让分主胜 -0.5', '让分客胜 +0.5', '让分主胜 -1', '让分客胜 +1'];
        const prediction = isOverUnder 
          ? overUnderPredictions[Math.floor(Math.random() * overUnderPredictions.length)]
          : handicapPredictions[Math.floor(Math.random() * handicapPredictions.length)];
        mockPredictions.push({
          id: `completed-${playerId}-${i}`,
          match_id: `completed-${2000 + i}`,
          prediction: prediction,
          prediction_type: isOverUnder ? 'over_under' : 'handicap',
          bet_amount: betAmount,
          potential_payout: potentialPayout,
          result: isWin ? 'win' : 'loss',
          actual_payout: isWin ? potentialPayout : 0,
          created_at: new Date(Date.now() - 3600000).toISOString(),
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

      // 如果没有真实数据，生成虚拟数据（包含未开始的推荐比赛）
      if (!data || data.length === 0) {
        const upcomingCount = Math.floor(Math.random() * 3) + 2;
        const completedCount = Math.floor(Math.random() * 2) + 1;
        
        const mockPredictions: TodayPrediction[] = [];
        // 只有大小球和让分胜负两种类型
        const overUnderPredictions = ['大 2.5球', '小 2.5球', '大 1.5球', '小 1.5球', '大 3.5球', '小 3.5球'];
        const handicapPredictions = ['让分主胜 -0.5', '让分客胜 +0.5', '让分主胜 -1', '让分客胜 +1', '让分主胜 -1.5', '让分客胜 +1.5'];
        
        // 添加未开始的推荐比赛
        for (let i = 0; i < upcomingCount; i++) {
          const match = upcomingMatches[i % upcomingMatches.length];
          const betAmount = Math.floor(Math.random() * 400) + 100;
          const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
          const isOverUnder = Math.random() > 0.5;
          const prediction = isOverUnder 
            ? overUnderPredictions[Math.floor(Math.random() * overUnderPredictions.length)]
            : handicapPredictions[Math.floor(Math.random() * handicapPredictions.length)];
          mockPredictions.push({
            id: `upcoming-real-${playerId}-${i}`,
            match_id: `upcoming-${3000 + i}`,
            prediction: prediction,
            prediction_type: isOverUnder ? 'over_under' : 'handicap',
            bet_amount: betAmount,
            potential_payout: potentialPayout,
            result: null,
            actual_payout: null,
            created_at: new Date().toISOString(),
            match_date: new Date().toISOString(),
            home_team: match.home,
            away_team: match.away,
            home_score: null,
            away_score: null,
          });
        }
        
        // 添加已完成的比赛
        for (let i = 0; i < completedCount; i++) {
          const match = completedMatches[i % completedMatches.length];
          const isWin = Math.random() > 0.4;
          const betAmount = Math.floor(Math.random() * 400) + 100;
          const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
          const isOverUnder = Math.random() > 0.5;
          const prediction = isOverUnder 
            ? overUnderPredictions[Math.floor(Math.random() * overUnderPredictions.length)]
            : handicapPredictions[Math.floor(Math.random() * handicapPredictions.length)];
          mockPredictions.push({
            id: `completed-real-${playerId}-${i}`,
            match_id: `completed-${4000 + i}`,
            prediction: prediction,
            prediction_type: isOverUnder ? 'over_under' : 'handicap',
            bet_amount: betAmount,
            potential_payout: potentialPayout,
            result: isWin ? 'win' : 'loss',
            actual_payout: isWin ? potentialPayout : 0,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            match_date: new Date().toISOString(),
            home_team: match.home,
            away_team: match.away,
            home_score: match.homeScore,
            away_score: match.awayScore,
          });
        }
        
        setSelectedPlayerHistory({ playerId, playerName, predictions: mockPredictions });
      } else {
        const predictionsData: TodayPrediction[] = data.map((pred: any, index: number) => {
          const match = upcomingMatches[index % upcomingMatches.length];
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
            home_score: pred.result ? 2 : null,
            away_score: pred.result ? 1 : null,
          };
        });
        setSelectedPlayerHistory({ playerId, playerName, predictions: predictionsData });
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
    if (!copyTradeDialog) {
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
      // 计算赔率和预测类型
      const odds = copyTradeDialog.prediction.potential_payout && copyTradeDialog.prediction.bet_amount 
        ? (copyTradeDialog.prediction.potential_payout / copyTradeDialog.prediction.bet_amount).toFixed(2) 
        : '1.85';
      const predictionType = copyTradeDialog.prediction.prediction_type === 'over_under' ? '大小球' : '让球';
      
      let newBalance = oldBalance - copyBetAmount;
      
      // 如果用户已登录，使用真实数据库操作
      if (user) {
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
        newBalance = result.new_balance || newBalance;
      } else {
        // 演示模式：模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success('演示模式：跟单成功');
      }
      
      // 将该预测添加到已跟单列表，解锁显示
      setCopiedPredictions(prev => {
        const newSet = new Set(prev);
        newSet.add(copyTradeDialog.prediction.id);
        return newSet;
      });
      
      // 显示成功动画 - 不自动关闭，由用户手动关闭
      setCopySuccess({
        show: true,
        oldBalance,
        newBalance,
        betAmount: copyBetAmount,
        playerName: copyTradeDialog.player.displayName,
        prediction: copyTradeDialog.prediction,
        predictionType,
        odds,
      });
      
      setCopyTradeDialog(null);
      
    } catch (error) {
      console.error('Copy trade error:', error);
      toast.error('跟单失败，请稍后重试');
    } finally {
      setIsCopying(false);
    }
  };

  // 从今日推荐跟单
  const handleCopyTradeFromHistory = (pred: TodayPrediction) => {
    const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
    if (!player) return;
    
    // 检查是否需要付费解锁
    const unlockPrice = player.unlockPrice ?? 0;
    if (unlockPrice > 0) {
      // 需要付费，显示解锁弹窗
      setUnlockDialog({ player, prediction: pred });
    } else {
      // 免费，直接进入跟单流程
      setCopyTradeDialog({ player, prediction: pred });
      setCopyBetAmount(100);
    }
  };
  
  // 获取用户USDT余额
  const [usdtBalance, setUsdtBalance] = useState(0);
  
  useEffect(() => {
    const fetchUsdtBalance = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('usdt_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setUsdtBalance(data.balance);
      }
    };
    fetchUsdtBalance();
  }, [user]);
  
  // 确认猎人币解锁
  const confirmUnlock = async () => {
    if (!unlockDialog) {
      return;
    }
    
    const unlockPrice = unlockDialog.player.unlockPrice ?? 0;
    
    setIsUnlocking(true);
    
    try {
      // 如果用户已登录，使用真实数据库操作
      if (user) {
        if (usdtBalance < unlockPrice) {
          toast.error(`猎人币余额不足，需要 ${unlockPrice} 猎人币，当前余额 ${usdtBalance} 猎人币`);
          setIsUnlocking(false);
          return;
        }
        
        // 扣除猎人币
        const { error } = await supabase
          .from('usdt_wallets')
          .update({ balance: usdtBalance - unlockPrice })
          .eq('user_id', user.id);
        
        if (error) {
          toast.error('扣款失败：' + error.message);
          setIsUnlocking(false);
          return;
        }
        
        // 更新本地猎人币余额
        setUsdtBalance(prev => prev - unlockPrice);
        toast.success(`已扣除 ${unlockPrice} 猎人币，预测已解锁`);
      } else {
        // 演示模式：模拟延迟
        await new Promise(resolve => setTimeout(resolve, 300));
        toast.success('演示模式：预测已解锁');
      }
      
      // 将预测添加到已解锁列表
      setCopiedPredictions(prev => {
        const newSet = new Set(prev);
        newSet.add(unlockDialog.prediction.id);
        return newSet;
      });
      
      // 关闭解锁弹窗，进入跟单流程
      setUnlockDialog(null);
      setCopyTradeDialog({ player: unlockDialog.player, prediction: unlockDialog.prediction });
      setCopyBetAmount(100);
      
    } catch (error) {
      console.error('Unlock error:', error);
      toast.error('解锁失败，请稍后重试');
    } finally {
      setIsUnlocking(false);
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
    name: maskPlayerName(player.displayName),
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

      {/* Prize Pool Banner - 整合玩家专属模型 */}
      <Card className="border-border/50 overflow-hidden relative">
        {/* 背景图 */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${prizeBannerBg})` }}
        />
        <div className="absolute inset-0 bg-background/85" />
        <CardContent className="p-5 sm:p-6 relative">
          <div className="flex flex-col gap-5">
            {/* 主标题 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <span className="text-lg sm:text-xl font-bold text-foreground">挑战AI</span>
                <span className="text-2xl sm:text-4xl font-black text-foreground">$1,000,000</span>
                <span className="text-lg sm:text-xl font-bold text-foreground">大奖等你来拿</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                玩家预测的比赛场次、比赛胜率、盈利金额都超过当前排名最高的AI，即可领取奖金
              </p>
            </div>
            
            {/* AI vs 玩家数据对比 */}
            <div className="w-full max-w-3xl mx-auto space-y-2">
              {/* AI数据 */}
              <div className="bg-muted/30 rounded-lg px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-warning/50">
                        <AvatarImage src={hunsoccerAiIcon} />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-warning flex items-center justify-center text-[10px] font-bold text-warning-foreground">
                        #1
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm">HUNSOCCER MAX</p>
                      <p className="text-xs text-muted-foreground">AI基准</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 text-sm">
                    <span className="text-muted-foreground">预测场次：<span className="font-bold text-foreground">247场</span></span>
                    <span className="text-muted-foreground">预测胜率：<span className="font-bold text-foreground">78.95%</span></span>
                    <span className="text-muted-foreground">盈利：<span className="font-bold text-foreground">$24,789</span></span>
                  </div>
                </div>
              </div>
              
              {/* 玩家专属模型数据 */}
              {user ? (
                (() => {
                  const currentPlayer = allPlayers.find(p => p.id === user.id);
                  const playerPredictions = currentPlayer?.totalPredictions || 0;
                  const playerWinRate = currentPlayer?.winRate || 0;
                  const playerProfit = currentPlayer?.profitAmount || 0;
                  const meetsRequirements = playerPredictions >= 247 && playerWinRate >= 78.95 && playerProfit >= 2478900;
                  
                  return (
                    <div className={`rounded-lg px-4 py-3 ${meetsRequirements ? 'bg-success/10' : 'bg-muted/30'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10 border-2 border-primary/50">
                              <AvatarImage src={currentPlayer?.avatarUrl || '/avatars/avatar-1.png'} />
                              <AvatarFallback>{currentPlayer?.displayName?.charAt(0) || '玩'}</AvatarFallback>
                            </Avatar>
                            {currentPlayer && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                                #{currentPlayer.rank}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{currentPlayer?.displayName || '我的专属模型'}</p>
                            <p className="text-xs text-muted-foreground">
                              {meetsRequirements ? <span className="text-success">✓ 已达标</span> : '继续努力'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 text-sm">
                          <span className="text-muted-foreground">
                            预测场次：<span className={`font-bold ${playerPredictions >= 247 ? 'text-success' : 'text-foreground'}`}>{playerPredictions}场</span>
                          </span>
                          <span className="text-muted-foreground">
                            预测胜率：<span className={`font-bold ${playerWinRate >= 78.95 ? 'text-success' : 'text-foreground'}`}>{playerWinRate.toFixed(2)}%</span>
                          </span>
                          <span className="text-muted-foreground">
                            盈利：<span className={`font-bold ${playerProfit >= 2478900 ? 'text-success' : 'text-foreground'}`}>${(playerProfit / 100).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="rounded-lg px-4 py-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-muted/40">
                        <AvatarImage src="/avatars/avatar-1.png" />
                        <AvatarFallback>玩</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm">玩家专属模型</p>
                        <p className="text-xs text-muted-foreground">登录后查看您的排名和数据</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/auth')}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      登录
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* 倒计时和统计 */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-foreground">
                  {countdown.days}天 {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-bold text-foreground">{allPlayers.filter(p => p.winRate > AI_BENCHMARK_WIN_RATE).length}</span> 人已达标</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Leaderboard Table - Split into Hot Streak, Profit, and Cold Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* Left Column: 高胜率榜 (Hot Streak) */}
        <Card className="border-border/50 bg-card/50 h-full flex flex-col">
          <CardContent className="p-4 sm:p-6 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg text-foreground">{t('hot_streak_board') || '高胜率榜'}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('best_win_streak') || '最佳连胜玩家'}
                    <span className="ml-1.5 text-[10px] text-muted-foreground/70">· 仅显示前10名</span>
                  </p>
                </div>
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
            <div className="space-y-2 flex-1">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`hot-streak-${timeRange}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    {[...allPlayers]
                      .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
                      .slice(0, 10)
                      .map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors cursor-pointer ${
                          user && player.id === user.id 
                            ? 'bg-primary/10 border border-primary/30 hover:bg-primary/15' 
                            : 'bg-muted/20 hover:bg-muted/40'
                        }`}
                        onClick={() => navigate(`/player/${player.id}`)}
                      >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20' :
                        index === 1 ? 'bg-gray-400/20' :
                        index === 2 ? 'bg-amber-600/20' :
                        'bg-muted/50 text-muted-foreground'
                      }`}>
                        {index < 3 ? (
                          <Trophy className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            'text-amber-600'
                          }`} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-border flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="font-semibold text-xs sm:text-sm truncate text-foreground">{maskPlayerName(player.displayName)}</p>
                          {(() => {
                            const todayData = todayWinRates.get(player.id);
                            if (todayData && todayData.total > 0) {
                              const trend = todayData.winRate - player.winRate;
                              if (trend > 3) {
                                return <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
                              } else if (trend < -3) {
                                return <TrendingDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
                              }
                            }
                            return null;
                          })()}
                        </div>
                        {/* 统计数据网格 - 更整齐的布局 */}
                        <div className="text-[10px] sm:text-xs space-y-1">
                          {/* 第一行：核心数据 */}
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>预测 <span className="text-foreground font-medium">{player.totalPredictions}</span></span>
                            <span className="text-border">|</span>
                            <span>胜率 <span className={`font-medium ${player.winRate > AI_BENCHMARK_WIN_RATE ? 'text-success' : 'text-foreground'}`}>{player.winRate.toFixed(0)}%</span></span>
                            <span className="text-border">|</span>
                            <span>连胜 <span className="text-primary font-bold">{player.currentStreak || 0}</span></span>
                          </div>
                          {/* 第二行：胜负与投注 */}
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>战绩 <span className="text-success">{player.correctPredictions}</span><span className="text-muted-foreground/50">/</span><span className="text-destructive">{player.totalPredictions - player.correctPredictions}</span></span>
                            <span className="text-border">|</span>
                            <span>投注 <span className="text-foreground font-medium">¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span></span>
                          </div>
                          {/* 第三行：预计奖金 */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
                            <span className="text-muted-foreground">预计奖金</span>
                            {(() => {
                              const eligiblePlayers = allPlayers.filter(p => p.winRate > AI_BENCHMARK_WIN_RATE).length;
                              const prize = calculateEstimatedPrize(player.winRate, index + 1, eligiblePlayers);
                              return prize > 0 ? (
                                <AnimatedPrize value={prize} className="text-warning font-bold" duration={600} />
                              ) : (
                                <span className="text-muted-foreground/50 text-[9px]">需超过AI胜率{AI_BENCHMARK_WIN_RATE}%</span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-[10px] sm:text-xs px-2 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors flex-shrink-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      今日推荐
                    </button>
                  </motion.div>
                ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Middle Column: 高盈利榜 (Profit Board) */}
        <Card className="border-border/50 bg-card/50 h-full flex flex-col">
          <CardContent className="p-4 sm:p-6 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg text-foreground">{t('profit_board') || '高盈利榜'}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('highest_profit_players') || '最高盈利玩家'}
                    <span className="ml-1.5 text-[10px] text-muted-foreground/70">· 仅显示前10名</span>
                  </p>
                </div>
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
            <div className="space-y-2 flex-1">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading-profit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`profit-${timeRange}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    {[...allPlayers]
                      .sort((a, b) => (b.profitAmount || 0) - (a.profitAmount || 0))
                      .slice(0, 10)
                      .map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors cursor-pointer ${
                          user && player.id === user.id 
                            ? 'bg-primary/10 border border-primary/30 hover:bg-primary/15' 
                            : 'bg-muted/20 hover:bg-muted/40'
                        }`}
                        onClick={() => navigate(`/player/${player.id}`)}
                      >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20' :
                        index === 1 ? 'bg-gray-400/20' :
                        index === 2 ? 'bg-amber-600/20' :
                        'bg-muted/50 text-muted-foreground'
                      }`}>
                        {index < 3 ? (
                          <Trophy className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            'text-amber-600'
                          }`} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-border flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="font-semibold text-xs sm:text-sm truncate text-foreground">{maskPlayerName(player.displayName)}</p>
                          {(() => {
                            const todayData = todayWinRates.get(player.id);
                            if (todayData && todayData.total > 0) {
                              const trend = todayData.winRate - player.winRate;
                              if (trend > 3) {
                                return <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
                              } else if (trend < -3) {
                                return <TrendingDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
                              }
                            }
                            return null;
                          })()}
                        </div>
                        {/* 统计数据网格 - 更整齐的布局 */}
                        <div className="text-[10px] sm:text-xs space-y-1">
                          {/* 第一行：核心数据 */}
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>预测 <span className="text-foreground font-medium">{player.totalPredictions}</span></span>
                            <span className="text-border">|</span>
                            <span>胜率 <span className={`font-medium ${player.winRate > AI_BENCHMARK_WIN_RATE ? 'text-success' : 'text-foreground'}`}>{player.winRate.toFixed(0)}%</span></span>
                            <span className="text-border">|</span>
                            <span>盈利 <span className={`font-bold ${(player.profitAmount || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>{((player.profitAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0, signDisplay: 'always' })}</span></span>
                          </div>
                          {/* 第二行：胜负与投注 */}
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>战绩 <span className="text-success">{player.correctPredictions}</span><span className="text-muted-foreground/50">/</span><span className="text-destructive">{player.totalPredictions - player.correctPredictions}</span></span>
                            <span className="text-border">|</span>
                            <span>投注 <span className="text-foreground font-medium">¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span></span>
                          </div>
                          {/* 第三行：预计奖金 */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
                            <span className="text-muted-foreground">预计奖金</span>
                            {(() => {
                              const eligiblePlayers = allPlayers.filter(p => p.winRate > AI_BENCHMARK_WIN_RATE).length;
                              const sortedByProfit = [...allPlayers].sort((a, b) => (b.profitAmount || 0) - (a.profitAmount || 0));
                              const profitRank = sortedByProfit.findIndex(p => p.id === player.id) + 1;
                              const prize = calculateEstimatedPrize(player.winRate, profitRank, eligiblePlayers);
                              return prize > 0 ? (
                                <AnimatedPrize value={prize} className="text-warning font-bold" duration={600} />
                              ) : (
                                <span className="text-muted-foreground/50 text-[9px]">需超过AI胜率{AI_BENCHMARK_WIN_RATE}%</span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-[10px] sm:text-xs px-2 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors flex-shrink-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      今日推荐
                    </button>
                  </motion.div>
                ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: 低胜率榜 (Cold Streak) */}
        <Card className="border-border/50 bg-card/50 h-full flex flex-col">
          <CardContent className="p-4 sm:p-6 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg text-foreground">{t('cold_streak_board') || '低胜率榜'}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('worst_lose_streak') || '最差连黑玩家'}
                    <span className="ml-1.5 text-[10px] text-muted-foreground/70">· 仅显示前10名</span>
                  </p>
                </div>
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
            <div className="space-y-2 flex-1">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading-cold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`cold-streak-${timeRange}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    {[...allPlayers]
                      .sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0))
                      .slice(0, 10)
                      .map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors cursor-pointer ${
                          user && player.id === user.id 
                            ? 'bg-primary/10 border border-primary/30 hover:bg-primary/15' 
                            : 'bg-muted/20 hover:bg-muted/40'
                        }`}
                        onClick={() => navigate(`/player/${player.id}`)}
                      >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20' :
                        index === 1 ? 'bg-gray-400/20' :
                        index === 2 ? 'bg-amber-600/20' :
                        'bg-muted/50 text-muted-foreground'
                      }`}>
                        {index < 3 ? (
                          <Trophy className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            'text-amber-600'
                          }`} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-border flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="font-semibold text-xs sm:text-sm truncate text-foreground">{maskPlayerName(player.displayName)}</p>
                          {(() => {
                            const todayData = todayWinRates.get(player.id);
                            if (todayData && todayData.total > 0) {
                              const trend = todayData.winRate - player.winRate;
                              if (trend > 3) {
                                return <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
                              } else if (trend < -3) {
                                return <TrendingDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
                              }
                            }
                            return null;
                          })()}
                        </div>
                        {/* 统计数据网格 - 更整齐的布局 */}
                        <div className="text-[10px] sm:text-xs space-y-1">
                          {/* 第一行：核心数据 */}
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>预测 <span className="text-foreground font-medium">{player.totalPredictions}</span></span>
                            <span className="text-border">|</span>
                            <span>胜率 <span className={`font-medium ${player.winRate > AI_BENCHMARK_WIN_RATE ? 'text-success' : 'text-foreground'}`}>{player.winRate.toFixed(0)}%</span></span>
                            <span className="text-border">|</span>
                            <span>连黑 <span className="text-destructive font-bold">{player.worstStreak || 0}</span></span>
                          </div>
                          {/* 第二行：胜负与投注 */}
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>战绩 <span className="text-success">{player.correctPredictions}</span><span className="text-muted-foreground/50">/</span><span className="text-destructive">{player.totalPredictions - player.correctPredictions}</span></span>
                            <span className="text-border">|</span>
                            <span>投注 <span className="text-foreground font-medium">¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span></span>
                          </div>
                          {/* 第三行：预计奖金 */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
                            <span className="text-muted-foreground">预计奖金</span>
                            {(() => {
                              const eligiblePlayers = allPlayers.filter(p => p.winRate > AI_BENCHMARK_WIN_RATE).length;
                              const sortedByWorstStreak = [...allPlayers].sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0));
                              const coldRank = sortedByWorstStreak.findIndex(p => p.id === player.id) + 1;
                              const prize = calculateEstimatedPrize(player.winRate, coldRank, eligiblePlayers);
                              return prize > 0 ? (
                                <AnimatedPrize value={prize} className="text-warning font-bold" duration={600} />
                              ) : (
                                <span className="text-muted-foreground/50 text-[9px]">需超过AI胜率{AI_BENCHMARK_WIN_RATE}%</span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-[10px] sm:text-xs px-2 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors flex-shrink-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      今日推荐
                    </button>
                  </motion.div>
                ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Three Champions Cards */}
      {!isLoading && allPlayers.length >= 3 && (() => {
        // 计算三个榜单的冠军
        const hotStreakChampion = [...allPlayers].sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))[0];
        const profitChampion = [...allPlayers].sort((a, b) => (b.profitAmount || 0) - (a.profitAmount || 0))[0];
        const coldStreakChampion = [...allPlayers].sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0))[0];
        
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* 高胜率榜冠军 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 100 }}
            >
              <Card className="relative overflow-hidden border-border/50 bg-card h-full">
                <CardContent className="p-4 sm:p-5 relative z-10">
                  <motion.div 
                    className="flex items-center gap-2 mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">高胜率榜冠军</h3>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => hotStreakChampion && navigate(`/player/${hotStreakChampion.id}`)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Avatar className="w-12 h-12 border border-border shadow-sm">
                      <AvatarImage src={hotStreakChampion?.avatarUrl} alt={hotStreakChampion?.displayName} />
                      <AvatarFallback className="bg-muted text-foreground">{hotStreakChampion?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-bold text-foreground">{maskPlayerName(hotStreakChampion?.displayName || '')}</p>
                      <p className="text-xs text-muted-foreground">最佳连胜玩家</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-4 gap-2 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-primary font-mono-data">{hotStreakChampion?.currentStreak || 0}</p>
                      <p className="text-[10px] text-muted-foreground">连胜</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">{hotStreakChampion?.winRate?.toFixed(1) || 0}%</p>
                      <p className="text-[10px] text-muted-foreground">胜率</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">{hotStreakChampion?.totalPredictions || 0}</p>
                      <p className="text-[10px] text-muted-foreground">预测</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">¥{((hotStreakChampion?.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">投注</p>
                    </div>
                  </motion.div>
                  
                  <motion.button
                    className="w-full mt-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground text-xs font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hotStreakChampion) fetchTodayHistory(hotStreakChampion.id, hotStreakChampion.displayName, hotStreakChampion.isVirtual || false);
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    查看今日推荐
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* 高盈利榜冠军 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.25, type: "spring", stiffness: 100 }}
            >
              <Card className="relative overflow-hidden border-border/50 bg-card h-full">
                <CardContent className="p-4 sm:p-5 relative z-10">
                  <motion.div 
                    className="flex items-center gap-2 mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">高盈利榜冠军</h3>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => profitChampion && navigate(`/player/${profitChampion.id}`)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Avatar className="w-12 h-12 border border-border shadow-sm">
                      <AvatarImage src={profitChampion?.avatarUrl} alt={profitChampion?.displayName} />
                      <AvatarFallback className="bg-muted text-foreground">{profitChampion?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-bold text-foreground">{maskPlayerName(profitChampion?.displayName || '')}</p>
                      <p className="text-xs text-muted-foreground">最高盈利玩家</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-4 gap-2 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                  >
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className={`text-lg font-bold font-mono-data ${(profitChampion?.profitAmount || 0) >= 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {(profitChampion?.profitAmount || 0) >= 0 ? '+' : ''}¥{((profitChampion?.profitAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">盈利</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">{profitChampion?.winRate?.toFixed(1) || 0}%</p>
                      <p className="text-[10px] text-muted-foreground">胜率</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">{profitChampion?.totalPredictions || 0}</p>
                      <p className="text-[10px] text-muted-foreground">预测</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">¥{((profitChampion?.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">投注</p>
                    </div>
                  </motion.div>
                  
                  <motion.button
                    className="w-full mt-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground text-xs font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (profitChampion) fetchTodayHistory(profitChampion.id, profitChampion.displayName, profitChampion.isVirtual || false);
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.75 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    查看今日推荐
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* 低胜率榜冠军 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 100 }}
            >
              <Card className="relative overflow-hidden border-border/50 bg-card h-full">
                <CardContent className="p-4 sm:p-5 relative z-10">
                  <motion.div 
                    className="flex items-center gap-2 mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">低胜率榜冠军</h3>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => coldStreakChampion && navigate(`/player/${coldStreakChampion.id}`)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Avatar className="w-12 h-12 border border-border shadow-sm">
                      <AvatarImage src={coldStreakChampion?.avatarUrl} alt={coldStreakChampion?.displayName} />
                      <AvatarFallback className="bg-muted text-foreground">{coldStreakChampion?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-bold text-foreground">{maskPlayerName(coldStreakChampion?.displayName || '')}</p>
                      <p className="text-xs text-muted-foreground">最差连黑玩家</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-4 gap-2 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-primary font-mono-data">{coldStreakChampion?.worstStreak || 0}</p>
                      <p className="text-[10px] text-muted-foreground">连黑</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">{coldStreakChampion?.winRate?.toFixed(1) || 0}%</p>
                      <p className="text-[10px] text-muted-foreground">胜率</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">{coldStreakChampion?.totalPredictions || 0}</p>
                      <p className="text-[10px] text-muted-foreground">预测</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground font-mono-data">¥{((coldStreakChampion?.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-muted-foreground">投注</p>
                    </div>
                  </motion.div>
                  
                  <motion.button
                    className="w-full mt-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground text-xs font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (coldStreakChampion) fetchTodayHistory(coldStreakChampion.id, coldStreakChampion.displayName, coldStreakChampion.isVirtual || false);
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    查看今日推荐
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        );
      })()}

      {/* Today Recommendations Dialog - Professional Betting Style */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-sm p-0 gap-0">
          {/* Header - Clean & Simple */}
          <div className="px-4 py-3 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src={allPlayers.find(p => p.id === selectedPlayerHistory?.playerId)?.avatarUrl} />
                  <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
                    {selectedPlayerHistory?.playerName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-base font-bold">{maskPlayerName(selectedPlayerHistory?.playerName || '')}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {(() => {
                      const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
                      const unlockPrice = player?.unlockPrice ?? 0;
                      return (
                        <>
                          <span>胜率 <span className="text-foreground font-semibold">{player?.winRate.toFixed(0)}%</span></span>
                          <span>连胜 <span className="text-foreground font-semibold">{player?.currentStreak || 0}</span></span>
                          {unlockPrice > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50">
                              <img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
                              <span className="text-[10px] font-semibold text-foreground">{unlockPrice}</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-success/10 text-success font-medium">
                              免费
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : selectedPlayerHistory && (
            <div className="max-h-[60vh] overflow-y-auto">
              {(() => {
                const upcomingPredictions = selectedPlayerHistory.predictions.filter(p => !p.result);
                const completedPredictions = selectedPlayerHistory.predictions.filter(p => p.result);
                
                return (
                  <>
                    {/* 待开赛推荐 - Betting Style List */}
                    {upcomingPredictions.length > 0 && (
                      <div className="divide-y divide-border/30">
                        {upcomingPredictions.map((pred) => {
                          const getRecommendedInfo = () => {
                            const prediction = pred.prediction;
                            if (prediction.includes('大') || prediction.toLowerCase().includes('over')) {
                              const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                              return { label: `大${line}`, type: '大小' };
                            } else if (prediction.includes('小') || prediction.toLowerCase().includes('under')) {
                              const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                              return { label: `小${line}`, type: '大小' };
                            } else if (prediction.includes('让分主胜') || prediction.includes('主让')) {
                              const line = prediction.match(/-?[\d.]+/)?.[0] || '-0.5';
                              return { label: `主队${line}`, type: '让球' };
                            } else if (prediction.includes('让分客胜') || prediction.includes('客让')) {
                              const line = prediction.match(/\+?[\d.]+/)?.[0] || '+0.5';
                              return { label: `客队+${line.replace('+', '')}`, type: '让球' };
                            }
                            return { label: prediction, type: '-' };
                          };
                          const recommended = getRecommendedInfo();
                          
                          // 计算赔率
                          const odds = pred.potential_payout && pred.bet_amount 
                            ? (pred.potential_payout / pred.bet_amount).toFixed(2) 
                            : '1.85';
                          
                          return (
                            <div key={pred.id} className="px-4 py-3">
                              {copiedPredictions.has(pred.id) ? (
                                // 已跟单 - 显示完整比赛信息
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <span>{pred.home_team || '主队'}</span>
                                      <span className="text-muted-foreground text-xs">vs</span>
                                      <span>{pred.away_team || '客队'}</span>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                                      未开赛
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                        {recommended.type}
                                      </span>
                                      <span className="text-sm font-bold text-primary">
                                        {recommended.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-success">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      已跟单
                                    </div>
                                  </div>
                                  
                                  {/* 跟单详情 */}
                                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                                    <span>玩家下注: <span className="text-foreground font-medium">¥{pred.bet_amount}</span></span>
                                    <span>赔率: <span className="text-foreground font-medium">{odds}</span></span>
                                  </div>
                                </>
                              ) : (
                                // 未跟单 - 隐藏比赛信息，只显示跟单按钮
                                <div className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">跟单后查看比赛详情</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                    onClick={() => handleCopyTradeFromHistory(pred)}
                                  >
                                    跟单
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {upcomingPredictions.length === 0 && (
                      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                        暂无待开赛推荐
                      </div>
                    )}
                    
                    {/* 已完成比赛 - Simple Results */}
                    {completedPredictions.length > 0 && (
                      <div className="border-t border-border/50">
                        <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">历史战绩</span>
                          <span className="text-xs">
                            <span className="text-success font-medium">{completedPredictions.filter(p => p.result === 'win').length}</span>
                            <span className="text-muted-foreground"> / {completedPredictions.length}</span>
                          </span>
                        </div>
                        <div className="divide-y divide-border/30">
                          {completedPredictions.slice(0, 5).map((pred) => {
                            // 解析预测类型和具体盘口
                            const isOverUnder = pred.prediction_type === 'over_under';
                            const typeLabel = isOverUnder ? '大小球' : '让球';
                            const odds = pred.potential_payout && pred.bet_amount 
                              ? (pred.potential_payout / pred.bet_amount).toFixed(2) 
                              : '1.85';
                            
                            // 解析具体预测内容
                            let predictionDetail = '';
                            const prediction = pred.prediction;
                            if (isOverUnder) {
                              // 大小球：解析大/小和盘口
                              if (prediction.includes('大') || prediction.toLowerCase().includes('over')) {
                                const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                                predictionDetail = `大${line}球`;
                              } else if (prediction.includes('小') || prediction.toLowerCase().includes('under')) {
                                const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                                predictionDetail = `小${line}球`;
                              } else {
                                predictionDetail = prediction;
                              }
                            } else {
                              // 让球：解析让球方和让球数
                              if (prediction.includes('主') || prediction.includes('home')) {
                                const line = prediction.match(/-?[\d.]+/)?.[0] || '-0.5';
                                predictionDetail = `${pred.home_team}${line}`;
                              } else if (prediction.includes('客') || prediction.includes('away')) {
                                const line = prediction.match(/\+?[\d.]+/)?.[0] || '+0.5';
                                predictionDetail = `${pred.away_team}+${line.replace('+', '')}`;
                              } else {
                                // 从handicap_line获取
                                const line = pred.handicap_line ?? 0;
                                predictionDetail = line < 0 ? `${pred.home_team}${line}` : `${pred.away_team}+${Math.abs(line)}`;
                              }
                            }
                            
                            return (
                              <div key={pred.id} className="px-4 py-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      pred.result === 'win' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                                    }`}>
                                      {pred.result === 'win' ? '✓' : '✗'}
                                    </span>
                                    <div className="text-xs">
                                      <span className="font-medium">{pred.home_team}</span>
                                      <span className="text-muted-foreground mx-1">{pred.home_score ?? 0}-{pred.away_score ?? 0}</span>
                                      <span className="font-medium">{pred.away_team}</span>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-semibold ${pred.result === 'win' ? 'text-success' : 'text-destructive'}`}>
                                    {pred.result === 'win' ? '+' : '-'}¥{pred.bet_amount}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 ml-7 text-[10px] text-muted-foreground flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-muted/50">{typeLabel}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{predictionDetail}</span>
                                  <span>赔率: <span className="text-foreground font-medium">{odds}</span></span>
                                  <span>下注: <span className="text-foreground font-medium">¥{pred.bet_amount}</span></span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 猎人币解锁确认弹窗 */}
      <Dialog open={!!unlockDialog} onOpenChange={() => setUnlockDialog(null)}>
        <DialogContent className="max-w-xs p-0 gap-0">
          {unlockDialog && (
            <>
              {/* 头部 */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={unlockDialog.player.avatarUrl} />
                    <AvatarFallback>{unlockDialog.player.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{maskPlayerName(unlockDialog.player.displayName)}</p>
                    <p className="text-xs text-muted-foreground">胜率 {unlockDialog.player.winRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              
              {/* 内容 */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">解锁费用</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <img src={hunterCoinIcon} alt="猎人币" className="w-5 h-5" />
                    {unlockDialog.player.unlockPrice} 猎人币
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">当前余额</span>
                  <span className={`inline-flex items-center gap-1.5 ${usdtBalance >= (unlockDialog.player.unlockPrice ?? 0) ? 'text-foreground' : 'text-destructive'}`}>
                    <img src={hunterCoinIcon} alt="猎人币" className="w-5 h-5" />
                    {usdtBalance.toFixed(2)} 猎人币
                  </span>
                </div>
                
                {usdtBalance < (unlockDialog.player.unlockPrice ?? 0) && (
                  <p className="text-xs text-destructive">余额不足，请先充值</p>
                )}
              </div>
              
              {/* 按钮 */}
              <div className="p-4 pt-0 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={() => setUnlockDialog(null)}
                >
                  取消
                </Button>
                <Button 
                  size="sm"
                  className="flex-1"
                  onClick={confirmUnlock}
                  disabled={isUnlocking || (user && usdtBalance < (unlockDialog.player.unlockPrice ?? 0))}
                >
                  {isUnlocking ? '处理中...' : (user ? '确认' : '演示解锁')}
                </Button>
              </div>
            </>
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
                  <p className="font-semibold">{maskPlayerName(copyTradeDialog.player.displayName)}</p>
                  <p className="text-xs text-muted-foreground">
                    胜率: <span className={copyTradeDialog.player.winRate >= 50 ? 'text-success' : 'text-destructive'}>
                      {copyTradeDialog.player.winRate.toFixed(1)}%
                    </span>
                    <span className="mx-2">|</span>
                    连胜: <span className="text-success">{copyTradeDialog.player.bestStreak || 0}场</span>
                  </p>
                </div>
              </div>

              {/* 跟单比赛信息 - 锁定状态 */}
              <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center justify-center gap-3 py-4">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">比赛详情已锁定</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">确认跟单后解锁查看完整信息</p>
                  </div>
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
                    value={copyBetAmount || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setCopyBetAmount(0);
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num >= 0) {
                          setCopyBetAmount(num);
                        }
                      }
                    }}
                    className="flex-1 h-8"
                    min={10}
                    max={realBalance}
                    placeholder="输入金额"
                  />
                </div>
                
                {/* 验证错误提示 */}
                {copyBetAmount > realBalance && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    <span>⚠️</span>
                    <span>余额不足，当前可用余额为 ¥{realBalance.toLocaleString()}</span>
                  </div>
                )}
                {copyBetAmount > 0 && copyBetAmount < 10 && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    <span>⚠️</span>
                    <span>最低跟单金额为 ¥10</span>
                  </div>
                )}
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
                disabled={isCopying || copyBetAmount > realBalance || copyBetAmount < 10}
              >
                {isCopying ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    跟单中...
                  </div>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {user ? `确认跟单 ¥${copyBetAmount}` : `演示跟单 ¥${copyBetAmount}`}
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
                {/* 跟随玩家头像 */}
                <motion.div 
                  className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center relative border-2 border-primary"
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
                    已跟随 <span className="text-foreground font-medium">{copySuccess.playerName}</span>
                  </p>
                </motion.div>

                {/* 跟单人数信息 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50"
                >
                  <Users className="h-4 w-4 text-primary" />
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
                    className="p-3 rounded-lg bg-primary/5 border border-primary/20"
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
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-muted-foreground mb-0.5">类型</div>
                        <div className="font-medium">{copySuccess.predictionType}</div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-muted-foreground mb-0.5">预测</div>
                        <div className="font-medium text-primary">{copySuccess.prediction.prediction}</div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/50">
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
                  className="p-4 rounded-lg bg-muted/50 border border-border/50"
                >
                  <p className="text-xs text-muted-foreground mb-2">您的跟单金额</p>
                  <div className="flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                      className="text-2xl font-bold font-mono text-primary"
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

      {/* Total Players Count */}
      <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>平台总玩家数: <AnimatedPlayerCount count={allPlayers.length} /> 人</span>
        </div>
        <span className="text-muted-foreground/50">|</span>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          <span>今日新增: <span className="font-mono font-medium text-green-500">+{Math.floor(allPlayers.length * 0.08)}</span> 人</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {t('leaderboard_disclaimer') || '注意: 所有统计数据仅反映已完成的比赛预测。直播比赛预测在比赛结束前不计入统计。HUNSOCCER 所有内容均为模拟分析结果，仅供 AI 技术研究与赛事分析展示使用，不提供、不引导任何形式的投注或博彩活动。'}
        </p>
      </div>
    </div>
  );
};

// 玩家数量动画组件
const AnimatedPlayerCount = ({ count }: { count: number }) => {
  const animatedCount = useCountAnimation(count, { duration: 1200, startValue: 0 });
  
  return (
    <motion.span 
      className="font-mono font-medium text-foreground"
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 0.3 }}
      key={Math.round(animatedCount)}
    >
      {Math.round(animatedCount).toLocaleString()}
    </motion.span>
  );
};

export default PlayerLeaderboardTable;
