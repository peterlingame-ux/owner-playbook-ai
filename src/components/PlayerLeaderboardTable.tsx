import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Trophy, History, ExternalLink, TrendingUp, TrendingDown, Minus, UserPlus, CheckCircle2, Sparkles, Lock, Users, DollarSign, Clock, ThumbsUp, Search, Loader2, UserX } from "lucide-react";
import { PlayerLeaderboardCard } from "./PlayerLeaderboardCard";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { AnimatedPrize, AnimatedPrizePool } from "./AnimatedPrize";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getUTC8Range } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import grassTexture from "@/assets/grass-texture.jpg";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
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

// 显示完整玩家名字
const maskPlayerName = (name: string): string => {
  return name || '';
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
import { format, differenceInSeconds } from "date-fns";

// 倒计时显示组件
const MatchCountdown = ({ matchDate }: { matchDate: string | Date }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(matchDate);
      const diffInSeconds = differenceInSeconds(target, now);
      
      if (diffInSeconds <= 0) {
        setCountdown(t('match_starting_soon'));
        setIsStarting(true);
        return;
      }
      
      setIsStarting(false);
      const days = Math.floor(diffInSeconds / 86400);
      const hours = Math.floor((diffInSeconds % 86400) / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      
      const d = t('days_short');
      const h = t('hours_short');
      const m = t('minutes_short');
      
      if (days > 0) {
        setCountdown(`${days}${d}${hours}${h}${minutes}${m}`);
      } else if (hours > 0) {
        setCountdown(`${hours}${h}${minutes}${m}`);
      } else {
        setCountdown(`${minutes}${m}`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // 每分钟更新
    
    return () => clearInterval(interval);
  }, [matchDate, t]);
  
  return <span className={`font-medium ${isStarting ? 'text-foreground' : 'text-amber-500'}`}>{countdown}</span>;
};

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
  signature?: string; // 用户个性签名
  isVip?: boolean; // VIP用户标识
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
  const [likedPlayers, setLikedPlayers] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [isLiking, setIsLiking] = useState<Set<string>>(new Set()); // 防止重复点击
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
  
  // 查看全部玩家弹窗状态
  const [showAllHotPlayers, setShowAllHotPlayers] = useState(false);
  const [showAllColdPlayers, setShowAllColdPlayers] = useState(false);
  const [selectedAllPlayer, setSelectedAllPlayer] = useState<{ player: PlayerData; boardType: 'hot' | 'cold' } | null>(null);
  const [hotSearchQuery, setHotSearchQuery] = useState('');
  const [coldSearchQuery, setColdSearchQuery] = useState('');
  const [hotDisplayCount, setHotDisplayCount] = useState(20);
  const [coldDisplayCount, setColdDisplayCount] = useState(20);
  const [isLoadingMoreHot, setIsLoadingMoreHot] = useState(false);
  const [isLoadingMoreCold, setIsLoadingMoreCold] = useState(false);
  const INITIAL_DISPLAY_COUNT = 20;
  const LOAD_MORE_COUNT = 20;
  
  // 玩家跟单用户弹窗状态
  const [isPlayerFollowersDialogOpen, setIsPlayerFollowersDialogOpen] = useState(false);
  const [selectedPlayerFollowers, setSelectedPlayerFollowers] = useState<{ playerId: string; playerName: string; followers: any[] } | null>(null);
  
  // 奖金池配置 - 达标需比赛场次、胜率、金额都严格大于 AI 最佳模型
  const PRIZE_POOL = 1000000; // $1,000,000
  const AI_BENCHMARK_PREDICTIONS = 0; // AI 基准预测场次
  const AI_BENCHMARK_WIN_RATE = 58; // AI 基准胜率 58%
  const AI_BENCHMARK_PROFIT = 0; // AI 基准盈利（猎人币）
  const isEligible = (p: { totalPredictions: number; winRate: number; profit: number }) =>
    p.totalPredictions > AI_BENCHMARK_PREDICTIONS && p.winRate > AI_BENCHMARK_WIN_RATE && p.profit > AI_BENCHMARK_PROFIT;
  
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
  
  // 计算预计奖金 - 仅当玩家达标（场次、胜率、金额都大于 AI）时参与平分
  const calculateEstimatedPrize = (player: { totalPredictions: number; winRate: number; profit: number }, totalEligiblePlayers: number): number => {
    if (!isEligible(player)) return 0;
    return Math.floor(PRIZE_POOL / Math.max(totalEligiblePlayers, 1));
  };
  
  // Get real balance from auth context
  const realBalance = userBalance?.balance ?? 100000;

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
        const INITIAL_BALANCE = 100000;
        
        // 仅使用真实数据：从 users + user_balances + user_predictions 聚合
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url, signature');
        
        if (usersError) throw usersError;
        
        if (!usersData || usersData.length === 0) {
          setAllPlayers([]);
          return;
        }
        
        // 获取所有用户的余额信息
        const { data: balancesData, error: balancesError } = await supabase
          .from('user_balances')
          .select('user_id, balance');
        
        if (balancesError) throw balancesError;
        
        // 获取所有用户的VIP状态
        const { data: vipData, error: vipError } = await supabase
          .from('user_vip')
          .select('user_id, is_active, expires_at')
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString());
        
        if (vipError) console.error('Error fetching VIP data:', vipError);
        
        // 创建VIP用户集合
        const vipUserIds = new Set(vipData?.map(v => v.user_id) || []);
        
        // 获取所有用户的预测统计 - 按 UTC+8 日/周/月时间范围（与 AI 排行榜一致）
        const rangeMode = timeRange === 1 ? "day" : timeRange === 7 ? "week" : "month";
        const { start: rangeStart, end: rangeEnd } = getUTC8Range(rangeMode);
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('user_predictions')
          .select('user_id, result, confidence, created_at, bet_amount, actual_payout')
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString());
        
        if (predictionsError) throw predictionsError;
        
        // 创建映射
        const balancesMap = new Map(balancesData?.map(b => [b.user_id, b.balance]) || []);
        
        // 排行榜最低入榜门槛：至少 N 场预测，避免 1-2 场就上榜
        const MIN_PREDICTIONS_FOR_RANKING = 10;

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
          const rawProfit = balance - INITIAL_BALANCE;
          // 盈利不能低于-初始金额（本金全亏），确保盈利率最低为-100%
          const profit = Math.max(-INITIAL_BALANCE, rawProfit);
          const changePercent = Math.max(-100, (profit / INITIAL_BALANCE) * 100);
          
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
            signature: user.signature || undefined,
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
            isVip: vipUserIds.has(user.id), // VIP状态
          };
        }).filter(player => player.totalPredictions >= MIN_PREDICTIONS_FOR_RANKING); // 只保留预测场次达到门槛的玩家
        
        // 按胜率排序并设置排名（仅真实数据）
        const sortedPlayers = realPlayerStats
          .sort((a, b) => b.winRate - a.winRate)
          .map((player, index) => ({
            ...player,
            rank: index + 1
          }));
        
        setAllPlayers(sortedPlayers);
      } catch (error) {
        console.error('Error fetching all players:', error);
        setAllPlayers([]);
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

  // 使用本地模拟点赞数据（点赞表不存在）
  useEffect(() => {
    if (allPlayers.length === 0) return;
    
    // 初始化模拟点赞数
    const initLikeCounts = new Map<string, number>();
    allPlayers.forEach(player => {
      // 根据玩家ID生成随机但稳定的点赞数
      const seed = player.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      initLikeCounts.set(player.id, Math.floor((seed % 300) + 50));
    });
    setLikeCounts(initLikeCounts);
  }, [allPlayers]);

  // 获取某玩家的跟单用户列表（真实数据：user_follows + users）
  const fetchPlayerFollowers = async (playerId: string, playerName: string): Promise<{ id: string; name: string; avatar: string; days: number; profit: number; copyAmount: number; totalVolume: number }[]> => {
    const { data: followsData, error: followsError } = await supabase
      .from('user_follows')
      .select('follower_id, created_at')
      .eq('following_id', playerId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (followsError || !followsData?.length) return [];
    const followerIds = followsData.map((f) => f.follower_id);
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', followerIds);
    if (usersError || !usersData?.length) return [];
    const userMap = new Map(usersData.map((u) => [u.id, u]));
    return followsData.map((f, i) => {
      const u = userMap.get(f.follower_id);
      const created = f.created_at ? new Date(f.created_at) : new Date();
      const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000)));
      return {
        id: f.follower_id,
        name: u?.display_name ?? '',
        avatar: u?.avatar_url ?? '',
        days,
        profit: 0,
        copyAmount: 0,
        totalVolume: 0,
      };
    });
  };

  // 处理点赞/取消点赞（使用本地状态，不涉及数据库）
  const handleLike = (playerId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!user) {
      toast.error("请先登录", {
        description: "登录后即可点赞",
      });
      return;
    }

    if (isLiking.has(playerId)) {
      return; // 防止重复点击
    }

    const isCurrentlyLiked = likedPlayers.has(playerId);

    if (isCurrentlyLiked) {
      // 取消点赞 - 只更新本地状态
      setLikedPlayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
      setLikeCounts(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(playerId) || 0;
        newMap.set(playerId, Math.max(0, currentCount - 1));
        return newMap;
      });
    } else {
      // 点赞 - 只更新本地状态
      setLikedPlayers(prev => new Set(prev).add(playerId));
      setLikeCounts(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(playerId) || 0;
        newMap.set(playerId, currentCount + 1);
        return newMap;
      });
    }
  };

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
        todayStats.forEach((stats, userId) => {
          const winRate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
          todayWinRatesMap.set(userId, { winRate, total: stats.total, correct: stats.correct });
        });

        setTodayWinRates(todayWinRatesMap);
      } catch (error) {
        console.error('Error fetching today win rates:', error);
      }
    };

    fetchTodayWinRates();
  }, []);

  // 获取指定玩家的今日预测（仅真实数据：user_predictions + daily_matches）
  const fetchTodayHistory = async (playerId: string, playerName: string, _isVirtual: boolean) => {
    setIsLoadingHistory(true);
    setIsHistoryDialogOpen(true);
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
        setSelectedPlayerHistory({ playerId, playerName, predictions: [] });
        return;
      }
      if (!data || data.length === 0) {
        setSelectedPlayerHistory({ playerId, playerName, predictions: [] });
        return;
      }
      const matchIds = [...new Set((data as { match_id: string }[]).map((p) => p.match_id).filter((id) => id && !String(id).startsWith("upcoming-") && !String(id).startsWith("completed-")))];
      const matchesMap: Record<string, { home_team?: string; away_team?: string; home_scores?: number[]; away_scores?: number[] }> = {};
      if (matchIds.length > 0) {
        const { data: matchesData } = await supabase
          .from("daily_matches" as any)
          .select("match_id, home_team, away_team, home_scores, away_scores")
          .in("match_id", matchIds);
        (matchesData || []).forEach((m: { match_id: string; home_team?: string; away_team?: string; home_scores?: number[]; away_scores?: number[] }) => {
          matchesMap[String(m.match_id)] = {
            home_team: m.home_team,
            away_team: m.away_team,
            home_scores: m.home_scores,
            away_scores: m.away_scores,
          };
        });
      }
      const predictionsData: TodayPrediction[] = (data as any[]).map((pred) => {
        const match = matchesMap[String(pred.match_id)];
        const homeScore = match?.home_scores?.[0] ?? null;
        const awayScore = match?.away_scores?.[0] ?? null;
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
          handicap_line: pred.handicap_line,
          over_under_line: pred.over_under_line,
          home_team: match?.home_team,
          away_team: match?.away_team,
          home_score: homeScore,
          away_score: awayScore,
        };
      });
      setSelectedPlayerHistory({ playerId, playerName, predictions: predictionsData });
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

  // 占位符预测（今日推荐无真实数据时的模拟项）不可写入数据库，避免 user_predictions 出现 upcoming-1001 等脏数据
  const isPlaceholderPrediction = (matchId: string) => /^(upcoming-|completed-)/.test(String(matchId ?? ''));

  const confirmCopyTrade = async () => {
    if (!copyTradeDialog) {
      return;
    }
    
    const oldBalance = realBalance;
    
    if (copyBetAmount > realBalance) {
      toast.error(t('insufficient_balance_subscribe'));
      return;
    }

    if (copyBetAmount < 10) {
      toast.error(t('min_subscribe_amount'));
      return;
    }

    if (isPlaceholderPrediction(copyTradeDialog.prediction.match_id)) {
      toast.error(t('subscribe_placeholder_only') || '该条为展示数据，暂不可订阅');
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
          p_prediction: `订阅-${copyTradeDialog.player.displayName}: ${copyTradeDialog.prediction.prediction}`,
          p_bet_amount: copyBetAmount,
          p_potential_payout: potentialPayout,
          p_match_date: matchDate,
        });

        if (error) {
          console.error('Copy trade error:', error);
          toast.error(t('subscribe_failed') + ': ' + error.message);
          return;
        }

        const result = data as { success: boolean; error?: string; new_balance?: number };
        
        if (!result.success) {
          toast.error(result.error || t('subscribe_failed'));
          return;
        }

        // 刷新余额
        await refreshBalance();
        newBalance = result.new_balance || newBalance;
      } else {
        // 演示模式：模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success(t('subscribe_success_demo'));
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
      toast.error('订阅失败，请稍后重试');
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
                    <span>{t('no_change')}</span>
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
                      <p className="text-sm text-muted-foreground">{t('your_current_rank')}</p>
                      {currentUserRankChange !== 0 && (
                        <span className={`text-xs ${currentUserRankChange > 0 ? 'text-success' : 'text-destructive'}`}>
                          ({currentUserRankChange > 0 ? t('rank_up') : t('rank_down')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold font-mono-data text-success">{currentUserRank.winRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">{t('win_rate')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono-data">{currentUserRank.totalPredictions}</p>
                  <p className="text-xs text-muted-foreground">{t('predictions')}</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold font-mono-data ${currentUserRank.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {currentUserRank.changePercent >= 0 ? '+' : ''}{currentUserRank.changePercent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('roi')}</p>
                </div>
                {/* Today's Performance */}
                {todayWinRates.get(currentUserRank.id) && todayWinRates.get(currentUserRank.id)!.total > 0 && (
                  <div className="border-l border-border pl-6">
                    <p className={`text-2xl font-bold font-mono-data ${
                      todayWinRates.get(currentUserRank.id)!.winRate >= 50 ? 'text-success' : 'text-destructive'
                    }`}>
                      {todayWinRates.get(currentUserRank.id)!.correct}/{todayWinRates.get(currentUserRank.id)!.total}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('today')}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Range Filter - Unified for all boards */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-base sm:text-lg font-bold text-foreground">{t('player_recommendation_board')}</h2>
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 self-start sm:self-auto">
          <button
            onClick={() => setTimeRange(1)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
              timeRange === 1
                ? 'bg-foreground text-background shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t('time_filter_1d')}
          </button>
          <button
            onClick={() => setTimeRange(7)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
              timeRange === 7
                ? 'bg-foreground text-background shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t('time_filter_7d')}
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
              timeRange === 30
                ? 'bg-foreground text-background shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t('time_filter_30d')}
          </button>
        </div>
      </div>

      {/* Leaderboard Table - Split into Hot Streak, Profit, and Cold Streak */}
      {/* Mobile: Use Accordion for collapsible sections */}
      <div className="block sm:hidden">
        <Accordion type="single" collapsible defaultValue="hot" className="space-y-2">
          {/* 高胜率榜 */}
          <AccordionItem value="hot" className="border border-border/50 rounded-lg bg-card/50 overflow-hidden">
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-success to-success/50 rounded-full" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-foreground">
                      {t('hot_streak_board')}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{t('highest_win_rate_players')} · <span className="text-foreground font-medium">{t('top_10')}</span></p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllHotPlayers(true);
                  }}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
                >
                  {t('all_players')}
                </button>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-0">
              <div className="space-y-1.5">
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
                      key={`hot-streak-mobile-${timeRange}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      {[...allPlayers]
                        .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
                        .slice(0, 10)
                        .map((player, index) => {
                          const eligiblePlayers = allPlayers.filter(p => isEligible(p)).length;
                          return (
                            <PlayerLeaderboardCard
                              key={player.id}
                              player={player}
                              index={index}
                              isCurrentUser={!!(user && player.id === user.id)}
                              isLiked={likedPlayers.has(player.id)}
                              likeCount={likeCounts.get(player.id) || 0}
                              isLiking={isLiking.has(player.id)}
                              onLike={(e) => handleLike(player.id, e)}
                              onClick={() => navigate(`/player/${player.id}`)}
                              onViewHistory={(e) => {
                                e.stopPropagation();
                                fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                              }}
                              onShowFollowers={async (e, p) => {
                                e.stopPropagation();
                                const followers = await fetchPlayerFollowers(p.id, p.displayName);
                                setSelectedPlayerFollowers({ playerId: p.id, playerName: p.displayName, followers });
                                setIsPlayerFollowersDialogOpen(true);
                              }}
                              maskPlayerName={maskPlayerName}
                              calculateEstimatedPrize={calculateEstimatedPrize}
                              totalEligiblePlayers={eligiblePlayers}
                              aiBenchmarkWinRate={AI_BENCHMARK_WIN_RATE}
                              boardType="hot"
                              todayWinRate={todayWinRates.get(player.id)?.winRate}
                              currentUserId={user?.id || null}
                            />
                          );
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 低胜率榜 */}
          <AccordionItem value="cold" className="border border-border/50 rounded-lg bg-card/50 overflow-hidden">
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-foreground">
                      {t('cold_streak_board')}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{t('worst_lose_streak')} · <span className="text-foreground font-medium">{t('top_10')}</span></p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllColdPlayers(true);
                  }}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
                >
                  {t('all_players')}
                </button>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-0">
              <div className="space-y-1.5">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading-cold-mobile"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-8"
                    >
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`cold-streak-mobile-${timeRange}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      {[...allPlayers]
                        .sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0))
                        .slice(0, 10)
                        .map((player, index) => {
                          const eligiblePlayers = allPlayers.filter(p => isEligible(p)).length;
                          return (
                            <PlayerLeaderboardCard
                              key={player.id}
                              player={player}
                              index={index}
                              isCurrentUser={!!(user && player.id === user.id)}
                              isLiked={likedPlayers.has(player.id)}
                              likeCount={likeCounts.get(player.id) || 0}
                              isLiking={isLiking.has(player.id)}
                              onLike={(e) => handleLike(player.id, e)}
                              onClick={() => navigate(`/player/${player.id}`)}
                              onViewHistory={(e) => {
                                e.stopPropagation();
                                fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                              }}
                              onShowFollowers={async (e, p) => {
                                e.stopPropagation();
                                const followers = await fetchPlayerFollowers(p.id, p.displayName);
                                setSelectedPlayerFollowers({ playerId: p.id, playerName: p.displayName, followers });
                                setIsPlayerFollowersDialogOpen(true);
                              }}
                              maskPlayerName={maskPlayerName}
                              calculateEstimatedPrize={calculateEstimatedPrize}
                              totalEligiblePlayers={eligiblePlayers}
                              aiBenchmarkWinRate={AI_BENCHMARK_WIN_RATE}
                              boardType="cold"
                              todayWinRate={todayWinRates.get(player.id)?.winRate}
                              currentUserId={user?.id || null}
                            />
                          );
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Desktop: Original Card layout */}
      <div className="hidden sm:grid sm:grid-cols-1 gap-4 items-start">
        {/* Column 1: 高胜率榜 */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-success to-success/50 rounded-full" />
                <div>
                  <CardTitle className="text-sm sm:text-lg font-bold text-foreground">
                    {t('hot_streak_board')}
                  </CardTitle>
                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">{t('highest_win_rate_players')} · <span className="text-foreground font-medium">{t('top_10')}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowAllHotPlayers(true)}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
              >
                {t('all_players')}
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3 sm:pb-4 pt-0">
            <div className="space-y-1.5 sm:space-y-2">
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
                      .map((player, index) => {
                        const eligiblePlayers = allPlayers.filter(p => isEligible(p)).length;
                        return (
                          <PlayerLeaderboardCard
                            key={player.id}
                            player={player}
                            index={index}
                            isCurrentUser={!!(user && player.id === user.id)}
                            isLiked={likedPlayers.has(player.id)}
                            likeCount={likeCounts.get(player.id) || 0}
                            isLiking={isLiking.has(player.id)}
                            onLike={(e) => handleLike(player.id, e)}
                            onClick={() => navigate(`/player/${player.id}`)}
                            onViewHistory={(e) => {
                              e.stopPropagation();
                              fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                            }}
                            onShowFollowers={async (e, p) => {
                              e.stopPropagation();
                              const followers = await fetchPlayerFollowers(p.id, p.displayName);
                                setSelectedPlayerFollowers({ playerId: p.id, playerName: p.displayName, followers });
                                setIsPlayerFollowersDialogOpen(true);
                            }}
                            maskPlayerName={maskPlayerName}
                            calculateEstimatedPrize={calculateEstimatedPrize}
                            totalEligiblePlayers={eligiblePlayers}
                            aiBenchmarkWinRate={AI_BENCHMARK_WIN_RATE}
                            boardType="hot"
                            todayWinRate={todayWinRates.get(player.id)?.winRate}
                            currentUserId={user?.id || null}
                          />
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: 低胜率榜 */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-red-400 to-red-600 rounded-full" />
                <div>
                  <CardTitle className="text-sm sm:text-lg font-bold text-foreground">
                    {t('cold_streak_board')}
                  </CardTitle>
                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">{t('worst_lose_streak')} · <span className="text-foreground font-medium">{t('top_10')}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowAllColdPlayers(true)}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
              >
                {t('all_players')}
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3 sm:pb-4 pt-0">
            <div className="space-y-1.5 sm:space-y-2">
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
                      .map((player, index) => {
                        const eligiblePlayers = allPlayers.filter(p => isEligible(p)).length;
                        return (
                          <PlayerLeaderboardCard
                        key={player.id}
                            player={player}
                            index={index}
                            isCurrentUser={!!(user && player.id === user.id)}
                            isLiked={likedPlayers.has(player.id)}
                            likeCount={likeCounts.get(player.id) || 0}
                            isLiking={isLiking.has(player.id)}
                            onLike={(e) => handleLike(player.id, e)}
                        onClick={() => navigate(`/player/${player.id}`)}
                            onViewHistory={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                            onShowFollowers={async (e, p) => {
                              e.stopPropagation();
                              const followers = await fetchPlayerFollowers(p.id, p.displayName);
                                setSelectedPlayerFollowers({ playerId: p.id, playerName: p.displayName, followers });
                                setIsPlayerFollowersDialogOpen(true);
                            }}
                            maskPlayerName={maskPlayerName}
                            calculateEstimatedPrize={calculateEstimatedPrize}
                            totalEligiblePlayers={eligiblePlayers}
                            aiBenchmarkWinRate={AI_BENCHMARK_WIN_RATE}
                            boardType="cold"
                            todayWinRate={todayWinRates.get(player.id)?.winRate}
                            currentUserId={user?.id || null}
                          />
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>


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
                          <span className="text-muted-foreground truncate max-w-[200px]">
                            {player?.signature || '这个人很懒，什么都没写~'}
                          </span>
                          {unlockPrice > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50">
                              <img src={hunterCoinIcon} alt="Hunter Coin" className="w-4 h-4" />
                              <span className="text-[10px] font-semibold text-foreground">{unlockPrice}</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-success/10 text-success font-medium">
                              {t('free')}
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
                                <div className="rounded-lg bg-muted/20 border border-border/30 overflow-hidden">
                                  {/* 比赛信息头部 */}
                                  <div className="px-3 py-3 border-b border-border/20">
                                    {/* 球队对阵 - 居中显示带队标 */}
                                    <div className="flex items-center justify-center gap-4 mb-2">
                                      <div className="flex items-center gap-2">
                                        <img 
                                          src={`/src/assets/team-${(pred.home_team || '').toLowerCase().replace(/\s+/g, '-').replace('曼城', 'manchester-city').replace('利物浦', 'liverpool').replace('曼联', 'manchester-united').replace('巴塞罗那', 'barcelona').replace('皇家马德里', 'real-madrid').replace('皇马', 'real-madrid').replace('拜仁', 'bayern').replace('巴黎', 'psg').replace('阿森纳', 'arsenal').replace('国际米兰', 'inter').replace('AC米兰', 'acmilan').replace('马竞', 'atletico').replace('多特', 'dortmund')}.png`}
                                          alt=""
                                          className="w-6 h-6 object-contain"
                                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                                        />
                                        <span className="text-sm font-semibold text-foreground">{pred.home_team || '主队'}</span>
                                    </div>
                                      <span className="text-muted-foreground/50 text-xs font-normal">vs</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground">{pred.away_team || '客队'}</span>
                                        <img 
                                          src={`/src/assets/team-${(pred.away_team || '').toLowerCase().replace(/\s+/g, '-').replace('曼城', 'manchester-city').replace('利物浦', 'liverpool').replace('曼联', 'manchester-united').replace('巴塞罗那', 'barcelona').replace('皇家马德里', 'real-madrid').replace('皇马', 'real-madrid').replace('拜仁', 'bayern').replace('巴黎', 'psg').replace('阿森纳', 'arsenal').replace('国际米兰', 'inter').replace('AC米兰', 'acmilan').replace('马竞', 'atletico').replace('多特', 'dortmund')}.png`}
                                          alt=""
                                          className="w-6 h-6 object-contain"
                                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                                        />
                                      </div>
                                    </div>
                                    {/* 开赛时间和倒计时 */}
                                    <div className="flex items-center justify-center gap-2 text-[10px]">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">
                                        {pred.match_date ? format(new Date(pred.match_date), 'MM/dd HH:mm') : '待定'}
                                      </span>
                                      {pred.match_date && (
                                        <>
                                          <span className="text-muted-foreground/50">|</span>
                                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10">
                                            <MatchCountdown matchDate={pred.match_date} />
                                      </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* 投注信息 - 四列等宽布局 */}
                                  <div className="grid grid-cols-4 divide-x divide-border/20">
                                    <div className="flex flex-col items-center justify-center py-2.5 px-2">
                                      <span className="text-[10px] text-muted-foreground mb-1">类型</span>
                                      <span className="text-xs font-semibold text-foreground">{recommended.type}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-2.5 px-2">
                                      <span className="text-[10px] text-muted-foreground mb-1">推荐</span>
                                      <span className="text-xs font-bold text-primary">{recommended.label}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-2.5 px-2">
                                      <span className="text-[10px] text-muted-foreground mb-1">下注</span>
                                      <span className="text-xs font-semibold text-foreground flex items-center gap-0.5">{pred.bet_amount}<img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3" /></span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-2.5 px-2">
                                      <span className="text-[10px] text-muted-foreground mb-1">赔率</span>
                                      <span className="text-xs font-semibold text-warning">@{odds}</span>
                                    </div>
                                  </div>
                                  
                                  {/* 已跟单状态 */}
                                  <div className="flex items-center justify-center gap-1.5 py-2 bg-success/5 border-t border-border/20">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                    <span className="text-xs font-medium text-success">已订阅</span>
                                  </div>
                                </div>
                              ) : (
                                // 未跟单 - 隐藏比赛信息，只显示跟单按钮
                                <div className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm text-muted-foreground">订阅后查看比赛详情</span>
                                    <span className="inline-flex items-center gap-0.5">
                                      <img src={hunterCoinIcon} alt="Hunter Coin" className="w-4 h-4" />
                                      <span className="text-xs font-bold text-warning">10</span>
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                    onClick={() => handleCopyTradeFromHistory(pred)}
                                  >
                                    订阅
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
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{unlockDialog.player.signature || '这个人很懒，什么都没写~'}</p>
                  </div>
                </div>
              </div>
              
              {/* 内容 */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('unlock_cost')}</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-5 h-5" />
                    {unlockDialog.player.unlockPrice} {t('hunter_coins_unit')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('current_balance_short')}</span>
                  <span className={`inline-flex items-center gap-1.5 ${usdtBalance >= (unlockDialog.player.unlockPrice ?? 0) ? 'text-foreground' : 'text-destructive'}`}>
                    <img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-5 h-5" />
                    {usdtBalance.toFixed(2)} {t('hunter_coins_unit')}
                  </span>
                </div>
                
                {usdtBalance < (unlockDialog.player.unlockPrice ?? 0) && (
                  <p className="text-xs text-destructive">{t('insufficient_balance_subscribe')}</p>
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
                  {t('cancel')}
                </Button>
                <Button 
                  size="sm"
                  className="flex-1"
                  onClick={confirmUnlock}
                  disabled={isUnlocking || (user && usdtBalance < (unlockDialog.player.unlockPrice ?? 0))}
                >
                  {isUnlocking ? t('processing') : (user ? t('confirm') : t('demo_mode'))}
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
              {t('one_click_copy')}
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
                    {t('win_rate')}: <span className={copyTradeDialog.player.winRate >= 50 ? 'text-success' : 'text-destructive'}>
                      {copyTradeDialog.player.winRate.toFixed(1)}%
                    </span>
                    <span className="mx-2">|</span>
                    {t('consecutive_correct')}: <span className="text-success">{copyTradeDialog.player.bestStreak || 0}{t('matches_unit')}</span>
                  </p>
                </div>
              </div>

              {/* 跟单比赛信息 - 锁定状态 */}
              <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center justify-center gap-3 py-4">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">{t('subscribe_to_view')}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{t('confirm')} {t('one_click_copy')}</p>
                  </div>
                </div>
              </div>

              {/* 跟单金额设置 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('subscribe_amount')}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {t('available_balance')}: <span className="text-foreground font-medium flex items-center gap-0.5">{realBalance.toLocaleString()}<img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-3 h-3" /></span>
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
                      <span className="flex items-center gap-0.5">{amount}<img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-3 h-3" /></span>
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
                    placeholder={t('enter_amount')}
                  />
                </div>
                
                {/* 验证错误提示 */}
                {copyBetAmount > realBalance && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    <span>⚠️</span>
                    <span className="flex items-center gap-0.5">{t('insufficient_balance_short')} {realBalance.toLocaleString()}<img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-3 h-3" /></span>
                  </div>
                )}
                {copyBetAmount > 0 && copyBetAmount < 10 && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    <span>⚠️</span>
                    <span className="flex items-center gap-0.5">{t('min_amount_hint')} 10<img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-3 h-3" /></span>
                  </div>
                )}
              </div>

              {/* 预期收益 */}
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('expected_profit_label')}</span>
                  <span className="font-bold text-success flex items-center gap-0.5">
                    +{(copyBetAmount * 1.8).toFixed(0)}<img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-4 h-4" />
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
                    {t('processing')}
                  </div>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {user ? <span className="flex items-center gap-0.5">{t('confirm')} {copyBetAmount}<img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-4 h-4" /></span> : <span className="flex items-center gap-0.5">{t('demo_mode')} {copyBetAmount}<img src={hunterCoinIcon} alt={t('hunter_coins_unit')} className="w-4 h-4" /></span>}
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

                {/* 追踪人数信息 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50"
                >
                  <Users className="h-4 w-4 text-primary" fill="currentColor" />
                  <span className="text-sm text-muted-foreground">
                    已有 <span className="text-foreground font-bold">{50 + (copySuccess.playerName.charCodeAt(0) % 150)}</span> 人订阅该玩家
                  </span>
                </motion.div>

                {/* 综合跟单信息卡片 */}
                {copySuccess.prediction && (
                  <motion.div
                    initial={{ y: 20, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="w-full rounded-xl bg-gradient-to-b from-muted/30 to-muted/10 border border-border/50 overflow-hidden"
                  >
                    {/* 比赛信息头部 */}
                    <div className="px-4 py-3 border-b border-border/30">
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-xs font-medium text-muted-foreground">英超联赛</span>
                    </div>
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-2">
                          <img 
                            src={`/src/assets/team-${(copySuccess.prediction.home_team || '').toLowerCase().replace(/\s+/g, '-').replace('曼城', 'manchester-city').replace('利物浦', 'liverpool').replace('曼联', 'manchester-united').replace('巴塞罗那', 'barcelona').replace('皇马', 'real-madrid').replace('拜仁', 'bayern').replace('巴黎', 'psg').replace('阿森纳', 'arsenal').replace('国际米兰', 'inter').replace('AC米兰', 'acmilan').replace('马竞', 'atletico').replace('多特', 'dortmund')}.png`}
                            alt=""
                            className="w-6 h-6 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                          <span className="text-primary font-bold">{copySuccess.prediction.home_team || '主队'}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">vs</span>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold">{copySuccess.prediction.away_team || '客队'}</span>
                          <img 
                            src={`/src/assets/team-${(copySuccess.prediction.away_team || '').toLowerCase().replace(/\s+/g, '-').replace('曼城', 'manchester-city').replace('利物浦', 'liverpool').replace('曼联', 'manchester-united').replace('巴塞罗那', 'barcelona').replace('皇马', 'real-madrid').replace('拜仁', 'bayern').replace('巴黎', 'psg').replace('阿森纳', 'arsenal').replace('国际米兰', 'inter').replace('AC米兰', 'acmilan').replace('马竞', 'atletico').replace('多特', 'dortmund')}.png`}
                            alt=""
                            className="w-6 h-6 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* 投注详情 */}
                    <div className="px-4 py-3 border-b border-border/30">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2.5 rounded-lg bg-background/50 border border-border/30">
                          <div className="text-[10px] text-muted-foreground mb-1">类型</div>
                          <div className="text-sm font-semibold">{copySuccess.predictionType}</div>
                      </div>
                        <div className="text-center p-2.5 rounded-lg bg-primary/10 border border-primary/30">
                          <div className="text-[10px] text-muted-foreground mb-1">预测</div>
                          <div className="text-sm font-semibold text-primary">{copySuccess.prediction.prediction}</div>
                      </div>
                        <div className="text-center p-2.5 rounded-lg bg-background/50 border border-border/30">
                          <div className="text-[10px] text-muted-foreground mb-1">赔率</div>
                          <div className="text-sm font-semibold text-warning">{copySuccess.odds}</div>
                      </div>
                    </div>
                    </div>
                    
                    {/* 金额显示 - 一行两列 */}
                    <div className="px-4 py-3 border-b border-border/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">玩家下注</p>
                          <div className="text-lg font-bold font-mono">{copySuccess.prediction.bet_amount}</div>
                        </div>
                        <div className="text-center border-l border-border/30">
                          <p className="text-[10px] text-muted-foreground mb-1">您的跟单金额</p>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                            className="text-lg font-bold font-mono text-primary"
                    >
                            {copySuccess.betAmount.toLocaleString()}
                    </motion.div>
                  </div>
                      </div>
                    </div>
                    
                    {/* 预期收益 */}
                    <div className="px-4 py-3 bg-success/5">
                  <div className="flex items-center justify-between text-sm">
                        <div className="flex flex-col">
                    <span className="text-muted-foreground">预期收益</span>
                          <span className="text-[10px] text-muted-foreground/70">{copySuccess.betAmount} × {copySuccess.odds}</span>
                        </div>
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ delay: 1.5, duration: 0.5 }}
                      className="font-bold text-success"
                    >
                          +{(copySuccess.betAmount * parseFloat(copySuccess.odds)).toFixed(0)}
                    </motion.span>
                      </div>
                  </div>
                </motion.div>
                )}

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

      {/* 查看全部高胜率玩家弹窗 - 简化版 */}
      <Dialog open={showAllHotPlayers} onOpenChange={(open) => {
        setShowAllHotPlayers(open);
        if (!open) {
          setSelectedAllPlayer(null);
          setHotSearchQuery('');
          setHotDisplayCount(INITIAL_DISPLAY_COUNT);
        }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="pb-2 px-6 pt-6 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
              {t('hot_streak_board')} - {t('all_players')}
            </DialogTitle>
          </DialogHeader>
          {/* 搜索框 */}
          <div className="relative mb-2 px-6 flex-shrink-0">
            <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_player')}
              value={hotSearchQuery}
              onChange={(e) => {
                setHotSearchQuery(e.target.value);
                setHotDisplayCount(INITIAL_DISPLAY_COUNT);
              }}
              className="pl-9 h-9 text-sm"
            />
        </div>
          <div 
            className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-y"
            style={{ 
              WebkitOverflowScrolling: 'touch',
            }}
            onScroll={(e) => {
              const target = e.target as HTMLElement;
              if (target.scrollHeight - target.scrollTop - target.clientHeight < 100 && !isLoadingMoreHot) {
                const filteredCount = allPlayers.filter(p => p.displayName.toLowerCase().includes(hotSearchQuery.toLowerCase())).length;
                if (hotDisplayCount < filteredCount) {
                  setIsLoadingMoreHot(true);
                  setTimeout(() => {
                    setHotDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, filteredCount));
                    setIsLoadingMoreHot(false);
                  }, 500);
                }
              }
            }}
          >
            <div className="space-y-1.5 pb-4 px-6">
              {(() => {
                const filtered = [...allPlayers]
                  .filter(player => player.displayName.toLowerCase().includes(hotSearchQuery.toLowerCase()))
                  .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));
                const displayed = filtered.slice(0, hotDisplayCount);
                return (
                  <>
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <UserX className="w-8 h-8 text-muted-foreground" />
        </div>
                        <p className="text-sm font-medium text-foreground mb-1">{t('no_search_results') || '未找到玩家'}</p>
                        <p className="text-xs text-muted-foreground mb-3">{t('no_search_results_hint') || '请尝试其他关键词'}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHotSearchQuery('')}
                          className="text-xs"
                        >
                          {t('clear_search') || '清空搜索'}
                        </Button>
      </div>
                    ) : (
                      <>
                        {displayed.map((player, index) => (
                          <div
                            key={player.id}
                            onClick={() => setSelectedAllPlayer({ player, boardType: 'hot' })}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors border border-transparent hover:border-border/50"
                          >
                            {/* Rank */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index < 3 
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            {/* Avatar */}
                            <Avatar className="w-9 h-9 border border-border/50">
                              <AvatarImage src={player.avatarUrl} />
                              <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {/* Name & Streak */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{maskPlayerName(player.displayName)}</p>
                              <p className="text-xs text-muted-foreground">
                                连续正确 <span className="text-amber-500 font-bold">{player.currentStreak || 0}</span>
                              </p>
                            </div>
                            {/* Win Rate & Profit */}
                            <div className="text-right space-y-0.5">
                              <p className="text-xs">
                                <span className="text-muted-foreground">胜率 </span>
                                <span className="font-bold text-success">{player.winRate.toFixed(1)}%</span>
                              </p>
                              <p className="text-xs flex items-center justify-end gap-0.5">
                                <span className="text-muted-foreground">盈利 </span>
                                <span className={`font-bold flex items-center gap-0.5 ${(player.profitAmount || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {(player.profitAmount || 0) >= 0 ? '+' : ''}{((player.profitAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}<img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3" />
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                        {hotDisplayCount < filtered.length && (
                          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                            {isLoadingMoreHot ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span>{t('loading')}</span>
                              </>
                            ) : (
                              <span>{t('scroll_for_more')} ({displayed.length}/{filtered.length})</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 查看全部低胜率玩家弹窗 - 简化版 */}
      <Dialog open={showAllColdPlayers} onOpenChange={(open) => {
        setShowAllColdPlayers(open);
        if (!open) {
          setSelectedAllPlayer(null);
          setColdSearchQuery('');
          setColdDisplayCount(INITIAL_DISPLAY_COUNT);
        }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="pb-2 px-6 pt-6 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full" />
              {t('cold_streak_board') || '低准确率榜'} - {t('all_players') || '全部预测者'}
            </DialogTitle>
          </DialogHeader>
          {/* 搜索框 */}
          <div className="relative mb-2 px-6 flex-shrink-0">
            <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_player') || '搜索玩家名称...'}
              value={coldSearchQuery}
              onChange={(e) => {
                setColdSearchQuery(e.target.value);
                setColdDisplayCount(INITIAL_DISPLAY_COUNT);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div 
            className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-y"
            style={{ 
              WebkitOverflowScrolling: 'touch',
            }}
            onScroll={(e) => {
              const target = e.target as HTMLElement;
              if (target.scrollHeight - target.scrollTop - target.clientHeight < 100 && !isLoadingMoreCold) {
                const filteredCount = allPlayers.filter(p => p.displayName.toLowerCase().includes(coldSearchQuery.toLowerCase())).length;
                if (coldDisplayCount < filteredCount) {
                  setIsLoadingMoreCold(true);
                  setTimeout(() => {
                    setColdDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, filteredCount));
                    setIsLoadingMoreCold(false);
                  }, 500);
                }
              }
            }}
          >
            <div className="space-y-1.5 pb-4 px-6">
              {(() => {
                const filtered = [...allPlayers]
                  .filter(player => player.displayName.toLowerCase().includes(coldSearchQuery.toLowerCase()))
                  .sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0));
                const displayed = filtered.slice(0, coldDisplayCount);
                return (
                  <>
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <UserX className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">{t('no_search_results')}</p>
                        <p className="text-xs text-muted-foreground mb-3">{t('no_search_results_hint')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setColdSearchQuery('')}
                          className="text-xs"
                        >
                          {t('clear_search')}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {displayed.map((player, index) => (
                          <div
                            key={player.id}
                            onClick={() => setSelectedAllPlayer({ player, boardType: 'cold' })}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors border border-transparent hover:border-border/50"
                          >
                            {/* Rank */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index < 3 
                                ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            {/* Avatar */}
                            <Avatar className="w-9 h-9 border border-border/50">
                              <AvatarImage src={player.avatarUrl} />
                              <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {/* Name & Streak */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{maskPlayerName(player.displayName)}</p>
                              <p className="text-xs text-muted-foreground">
                                连败 <span className="text-red-500 font-bold">{player.worstStreak || 0}</span>
                              </p>
                            </div>
                            {/* Win Rate & Profit */}
                            <div className="text-right space-y-0.5">
                              <p className="text-xs">
                                <span className="text-muted-foreground">胜率 </span>
                                <span className="font-bold text-destructive">{player.winRate.toFixed(1)}%</span>
                              </p>
                              <p className="text-xs flex items-center justify-end gap-0.5">
                                <span className="text-muted-foreground">盈利 </span>
                                <span className={`font-bold flex items-center gap-0.5 ${(player.profitAmount || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {(player.profitAmount || 0) >= 0 ? '+' : ''}{((player.profitAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}<img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3" />
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                        {coldDisplayCount < filtered.length && (
                          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                            {isLoadingMoreCold ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span>{t('loading') || '加载中...'}</span>
                              </>
                            ) : (
                              <span>{t('scroll_for_more') || '下拉加载更多...'} ({displayed.length}/{filtered.length})</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 玩家详情弹窗 */}
      <Dialog open={!!selectedAllPlayer} onOpenChange={(open) => !open && setSelectedAllPlayer(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          {selectedAllPlayer && (
            <>
              <DialogHeader className="pb-2">
                <DialogTitle className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-border/50">
                    <AvatarImage src={selectedAllPlayer.player.avatarUrl} />
                    <AvatarFallback>{selectedAllPlayer.player.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {maskPlayerName(selectedAllPlayer.player.displayName)} - {t('player_detail') || '预测者详情'}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="pb-4">
                  <PlayerLeaderboardCard
                    player={selectedAllPlayer.player}
                    index={allPlayers.findIndex(p => p.id === selectedAllPlayer.player.id)}
                    isCurrentUser={!!(user && selectedAllPlayer.player.id === user.id)}
                    isLiked={likedPlayers.has(selectedAllPlayer.player.id)}
                    likeCount={likeCounts.get(selectedAllPlayer.player.id) || 0}
                    isLiking={isLiking.has(selectedAllPlayer.player.id)}
                    onLike={(e) => handleLike(selectedAllPlayer.player.id, e)}
                    onClick={() => {
                      setSelectedAllPlayer(null);
                      setShowAllHotPlayers(false);
                      setShowAllColdPlayers(false);
                      navigate(`/player/${selectedAllPlayer.player.id}`);
                    }}
                    onViewHistory={(e) => {
                      e.stopPropagation();
                      setSelectedAllPlayer(null);
                      setShowAllHotPlayers(false);
                      setShowAllColdPlayers(false);
                      fetchTodayHistory(selectedAllPlayer.player.id, selectedAllPlayer.player.displayName, selectedAllPlayer.player.isVirtual || false);
                    }}
                    maskPlayerName={maskPlayerName}
                    calculateEstimatedPrize={calculateEstimatedPrize}
                    totalEligiblePlayers={allPlayers.filter(p => isEligible(p)).length}
                    aiBenchmarkWinRate={AI_BENCHMARK_WIN_RATE}
                    boardType={selectedAllPlayer.boardType}
                    todayWinRate={todayWinRates.get(selectedAllPlayer.player.id)?.winRate}
                    currentUserId={user?.id || null}
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* Player Followers Dialog */}
      <Dialog open={isPlayerFollowersDialogOpen} onOpenChange={setIsPlayerFollowersDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {selectedPlayerFollowers?.playerName} - {t('tracking_users')}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('updated_at')} {new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
    </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">{t('profit_rate_label')}</span>
                  <span className={`text-lg font-bold font-mono-data ${
                    (selectedPlayerFollowers?.followers.reduce((sum, f) => sum + f.profit, 0) || 0) >= 0 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    +{Math.abs(15 + Math.random() * 30).toFixed(1)}%
                  </span>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </div>
            </DialogHeader>
          </div>
          
          {/* Table Header */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-5 py-2.5 border-y border-border/50 bg-muted/30">
            <span>{t('rank_header')}</span>
            <span>{t('hunter_coin_and_scale')}</span>
          </div>
          
          {/* Followers List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
            {selectedPlayerFollowers?.followers.map((follower, index) => (
              <div 
                key={follower.id} 
                className="flex items-center justify-between py-3 border-b border-border/30 last:border-b-0"
              >
                {/* Left: Rank + Avatar + Info */}
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className="w-8 h-8 flex items-center justify-center">
                    {index === 0 ? (
                      <span className="text-xl">🥇</span>
                    ) : index === 1 ? (
                      <span className="text-xl">🥈</span>
                    ) : index === 2 ? (
                      <span className="text-xl">🥉</span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 border border-border/50">
                    <AvatarImage src={follower.avatar} />
                    <AvatarFallback className="text-xs">{follower.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* Info */}
                  <div>
                    <p className="font-bold text-sm text-foreground">{follower.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      已追踪{follower.days}次
                    </p>
                  </div>
                </div>
                
                {/* Right: Profit & Copy Amount */}
                <div className="text-right">
                  <p className={`text-sm font-bold tabular-nums flex items-center justify-end gap-1 ${follower.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {follower.profit >= 0 ? '+' : ''}{follower.profit.toFixed(2)}
                    <img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                    <span className="tabular-nums font-medium">{follower.copyAmount.toFixed(2)}</span>
                    <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 opacity-70" />
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsPlayerFollowersDialogOpen(false)}
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerLeaderboardTable;
