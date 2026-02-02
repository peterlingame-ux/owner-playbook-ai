import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Skull, UserPlus, Calendar, X, Trophy, TrendingUp, TrendingDown, Lock, CheckCircle2, Sparkles, Users, ThumbsUp, Search, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AnimatedAmount } from "@/components/AnimatedAmount";
import { AnimatedPrize } from "@/components/AnimatedPrize";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import winningStreakBg from "@/assets/winning-streak-bg.png";
import losingStreakBg from "@/assets/losing-streak-bg.png";

// 奖金池配置
const PRIZE_POOL = 1000000;
const AI_BENCHMARK_WIN_RATE = 58;

// 计算预计奖金 - 奖金池平均分配给所有达标玩家
const calculateEstimatedPrize = (winRate: number, _rank: number, eligiblePlayers: number): number => {
  if (winRate <= AI_BENCHMARK_WIN_RATE) return 0;
  if (eligiblePlayers === 0) return 0;
  
  // 奖金池平均分配给所有达标玩家
  return Math.floor(PRIZE_POOL / eligiblePlayers);
};
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
  unlockPrice?: number; // USDT解锁价格，0或undefined表示免费
  signature?: string; // 用户个性签名
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

// 显示完整玩家名字（不隐藏）
const maskPlayerName = (name: string): string => {
  return name || '';
};

const PlayerCopyTradingBoard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userBalance, refreshBalance } = useAuth();
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
  const [copyBetAmount, setCopyBetAmount] = useState(100);
  const realBalance = userBalance?.balance ?? 100000;
  const [isCopying, setIsCopying] = useState(false);
  const [timeRange, setTimeRange] = useState<1 | 7 | 30>(7);
  const [followedPlayers, setFollowedPlayers] = useState<Set<string>>(new Set());
  const [followerCounts, setFollowerCounts] = useState<Map<string, number>>(new Map());
  const [isFollowing, setIsFollowing] = useState<Set<string>>(new Set()); // 防止重复点击
  
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
  
  // 已跟单的预测ID集合 - 跟单后才能看到具体盘口
  const [copiedPredictions, setCopiedPredictions] = useState<Set<string>>(new Set());
  
  // 获取用户USDT余额
  const [usdtBalance, setUsdtBalance] = useState(0);

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 100000;
        
        // 仅使用真实数据：从 users + user_balances + user_predictions 聚合
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url');
        
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
          const rawProfit = balance - INITIAL_BALANCE;
          // 盈利不能低于-初始金额（本金全亏），确保盈利率最低为-100%
          const profit = Math.max(-INITIAL_BALANCE, rawProfit);
          const changePercent = Math.max(-100, (profit / INITIAL_BALANCE) * 100);
          
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
            unlockPrice: 0, // 真实玩家默认免费，可以根据需要从数据库获取
          };
        }).filter(player => player.totalPredictions > 0);
        
        setAllPlayers(realPlayerStats);
      } catch (error) {
        console.error('Error fetching all players:', error);
        setAllPlayers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllPlayers();
  }, []);

  // 获取点赞数和用户点赞状态
  useEffect(() => {
    const fetchFollows = async () => {
      try {
        // 获取所有玩家的ID列表
        const playerIds = allPlayers.map(p => p.id);

        if (playerIds.length === 0) return;

        // 获取所有玩家的关注数
        const { data: followersData, error: followersError } = await supabase
          .from('user_follows')
          .select('following_id')
          .in('following_id', playerIds);

        if (!followersError && followersData) {
          const countsMap = new Map<string, number>();
          followersData.forEach((item: any) => {
            const currentCount = countsMap.get(item.following_id) || 0;
            countsMap.set(item.following_id, currentCount + 1);
          });
          setFollowerCounts(countsMap);
        }

        // 获取用户已关注的玩家
        if (user) {
          const { data: userFollowsData, error: userFollowsError } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', playerIds);

          if (!userFollowsError && userFollowsData) {
            const followedSet = new Set<string>();
            userFollowsData.forEach((item: any) => {
              followedSet.add(item.following_id);
            });
            setFollowedPlayers(followedSet);
          }
        }
      } catch (error) {
        console.error('Error fetching follows:', error);
      }
    };

    if (allPlayers.length > 0) {
      fetchFollows();
    }

    // 订阅关注表的变化，实时更新关注数
    const followsChannel = supabase
      .channel('copy-trading-follows-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
        },
        () => {
          fetchFollows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
    };
  }, [allPlayers, user]);

  // 处理关注/取消关注
  const handleFollow = async (playerId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!user) {
      toast.error("请先登录", {
        description: "登录后即可关注",
      });
      return;
    }

    if (isFollowing.has(playerId)) {
      return; // 防止重复点击
    }

    setIsFollowing(prev => new Set(prev).add(playerId));

    try {
      const isCurrentlyFollowed = followedPlayers.has(playerId);

      if (isCurrentlyFollowed) {
        // 取消关注
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', playerId);

        if (error) throw error;

        // 更新本地状态
        setFollowedPlayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
        setFollowerCounts(prev => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(playerId) || 0;
          newMap.set(playerId, Math.max(0, currentCount - 1));
          return newMap;
        });
        toast.success("已取消关注");
      } else {
        // 关注
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: playerId,
          });

        if (error) throw error;

        // 更新本地状态
        setFollowedPlayers(prev => new Set(prev).add(playerId));
        setFollowerCounts(prev => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(playerId) || 0;
          newMap.set(playerId, currentCount + 1);
          return newMap;
        });
        toast.success("关注成功");
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error("操作失败", {
        description: "请稍后重试",
      });
    } finally {
      setIsFollowing(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }
  };

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
      
      setTodayStats(statsMap);
    };
    
    fetchTodayStats();
  }, []);

  // 获取用户USDT余额
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

  const fetchTodayPredictions = async (player: PlayerData) => {
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
    if (!data || data.length === 0) {
      setSelectedPlayer({ player, predictions: [] });
      return;
    }
    const matchIds = [...new Set((data as { match_id: string }[]).map((p) => p.match_id).filter((id) => id && !String(id).startsWith("upcoming-") && !String(id).startsWith("completed-")))];
    const matchesMap: Record<string, { home_team?: string; away_team?: string; home_scores?: number[]; away_scores?: number[]; league?: string; match_time?: number }> = {};
    if (matchIds.length > 0) {
      const { data: matchesData } = await supabase
        .from("daily_matches" as any)
        .select("match_id, home_team, away_team, home_scores, away_scores, league, match_time")
        .in("match_id", matchIds);
      (matchesData || []).forEach((m: any) => {
        matchesMap[String(m.match_id)] = {
          home_team: m.home_team,
          away_team: m.away_team,
          home_scores: m.home_scores,
          away_scores: m.away_scores,
          league: m.league,
          match_time: m.match_time,
        };
      });
    }
    const predictionsWithDetails: TodayPrediction[] = (data as any[]).map((pred) => {
      const match = matchesMap[String(pred.match_id)];
      const homeScore = match?.home_scores?.[0] ?? null;
      const awayScore = match?.away_scores?.[0] ?? null;
      return {
        ...pred,
        home_team: match?.home_team,
        away_team: match?.away_team,
        home_score: homeScore,
        away_score: awayScore,
        match_status: pred.result ? "FT" : "NS",
        league: match?.league,
        match_time: match?.match_time != null ? String(match.match_time) : undefined,
      };
    });
    setSelectedPlayer({ player, predictions: predictionsWithDetails });
  };

  // 获取某玩家的跟单用户列表（真实数据：user_follows + users）
  const fetchPlayerFollowers = async (playerId: string, _playerName: string): Promise<{ id: string; name: string; avatar: string; days: number; profit: number; copyAmount: number; totalVolume: number }[]> => {
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
    return followsData.map((f) => {
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

  // 占位符预测不可写入数据库
  const isPlaceholderPrediction = (matchId: string) => /^(upcoming-|completed-)/.test(String(matchId ?? ''));

  // 按最佳连胜排序
  const topStreakPlayers = [...allPlayers]
    .sort((a, b) => b.bestStreak - a.bestStreak)
    .slice(0, 10);

  // 按最差连败排序
  const worstStreakPlayers = [...allPlayers]
    .sort((a, b) => b.worstStreak - a.worstStreak)
    .slice(0, 10);

  const handleCopyTrade = async (player: PlayerData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('user_predictions')
      .select('*')
      .eq('user_id', player.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
    if (error || !data?.length) {
      toast.error(t('player_no_today_recommend') || '该玩家今日暂无推荐');
      return;
    }
    const matchIds = [...new Set((data as { match_id: string }[]).map((p) => p.match_id).filter((id) => id && !isPlaceholderPrediction(id)))];
    if (matchIds.length === 0) {
      toast.error(t('player_no_today_recommend') || '该玩家今日暂无推荐');
      return;
    }
    const matchesMap: Record<string, { home_team?: string; away_team?: string; home_scores?: number[]; away_scores?: number[]; league?: string; match_time?: number }> = {};
    const { data: matchesData } = await supabase
      .from('daily_matches' as any)
      .select('match_id, home_team, away_team, home_scores, away_scores, league, match_time')
      .in('match_id', matchIds);
    (matchesData || []).forEach((m: any) => {
      matchesMap[String(m.match_id)] = {
        home_team: m.home_team,
        away_team: m.away_team,
        home_scores: m.home_scores,
        away_scores: m.away_scores,
        league: m.league,
        match_time: m.match_time,
      };
    });
    const firstRow = data[0] as any;
    const match = matchesMap[String(firstRow.match_id)];
    const homeScore = match?.home_scores?.[0] ?? null;
    const awayScore = match?.away_scores?.[0] ?? null;
    const prediction: TodayPrediction = {
      ...firstRow,
      home_team: match?.home_team,
      away_team: match?.away_team,
      home_score: homeScore,
      away_score: awayScore,
      match_status: firstRow.result ? 'FT' : 'NS',
      league: match?.league,
      match_time: match?.match_time != null ? String(match.match_time) : undefined,
      home_logo: match?.home_team ? getTeamLogo(match.home_team) : null,
      away_logo: match?.away_team ? getTeamLogo(match.away_team) : null,
    };
    const unlockPrice = player.unlockPrice ?? 0;
    if (unlockPrice > 0) {
      setUnlockDialog({ player, prediction });
    } else {
      setCopyTradeDialog({ player, prediction, betAmount: 100 });
      setCopyBetAmount(100);
    }
  };

  const confirmCopyTrade = async () => {
    if (!copyTradeDialog) return;
    if (copyBetAmount > realBalance) {
      toast.error(t('insufficient_balance') || t('insufficient_balance_subscribe'));
      return;
    }
    if (copyBetAmount < 10) {
      toast.error(t('min_copy_amount') || t('min_subscribe_amount'));
      return;
    }
    if (isPlaceholderPrediction(copyTradeDialog.prediction.match_id)) {
      toast.error(t('subscribe_placeholder_only') || '该条为展示数据，暂不可订阅');
      return;
    }
    setIsCopying(true);
    const oldBalance = realBalance;
    const odds = copyTradeDialog.prediction.potential_payout && copyTradeDialog.prediction.bet_amount
      ? (copyTradeDialog.prediction.potential_payout / copyTradeDialog.prediction.bet_amount).toFixed(2)
      : '1.80';
    const predictionType = copyTradeDialog.prediction.prediction_type === 'over_under' ? '大小球' : '让分';
    try {
      let newBalance = oldBalance - copyBetAmount;
      if (user) {
        const potentialPayout = copyBetAmount * (copyTradeDialog.prediction.potential_payout && copyTradeDialog.prediction.bet_amount
          ? copyTradeDialog.prediction.potential_payout / copyTradeDialog.prediction.bet_amount
          : 1.8);
        const matchDate = (copyTradeDialog.prediction as any).match_date ?? new Date().toISOString();
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
          toast.error((t('subscribe_failed') || '订阅失败') + ': ' + error.message);
          return;
        }
        const result = data as { success: boolean; error?: string; new_balance?: number };
        if (!result.success) {
          toast.error(result.error || (t('subscribe_failed') || '订阅失败'));
          return;
        }
        await refreshBalance();
        newBalance = result.new_balance ?? newBalance;
      } else {
        await new Promise((r) => setTimeout(r, 500));
        toast.success(t('subscribe_success_demo') || '演示模式：订阅成功');
      }
      setCopiedPredictions((prev) => {
        const next = new Set(prev);
        next.add(copyTradeDialog.prediction.id);
        return next;
      });
      setCopySuccess({
        show: true,
        playerName: copyTradeDialog.player.displayName,
        betAmount: copyBetAmount,
        prediction: copyTradeDialog.prediction,
        predictionType,
        odds,
      });
      setCopyTradeDialog(null);
    } catch (err) {
      console.error(err);
      toast.error(t('subscribe_failed') || '订阅失败，请稍后重试');
    } finally {
      setIsCopying(false);
    }
  };

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
      
      // 关闭解锁弹窗，进入跟单流程
      setUnlockDialog(null);
      setCopyTradeDialog({ player: unlockDialog.player, prediction: unlockDialog.prediction, betAmount: 100 });
      setCopyBetAmount(100);
      
    } catch (error) {
      console.error('Unlock error:', error);
      toast.error('解锁失败，请稍后重试');
    } finally {
      setIsUnlocking(false);
    }
  };

  // 从今日跟单弹窗中跟单
  const handleCopyTradeFromPrediction = (pred: TodayPrediction) => {
    if (!selectedPlayer) return;
    if (isPlaceholderPrediction(pred.match_id)) {
      toast.error(t('subscribe_placeholder_only') || '该条为展示数据，暂不可订阅');
      return;
    }
    const unlockPrice = selectedPlayer.player.unlockPrice ?? 0;
    if (unlockPrice > 0) {
      setUnlockDialog({ player: selectedPlayer.player, prediction: pred });
    } else {
      setCopyTradeDialog({ player: selectedPlayer.player, prediction: pred, betAmount: 100 });
      setCopyBetAmount(100);
    }
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
  }) => {
    const profitAmount = player.profitAmount || 0;
    const profitRate = player.changePercent || 0;
    
    // Generate mini chart path
    const generateChartPath = () => {
      const points = [];
      const width = 80;
      const height = 24;
      const numPoints = 8;
      const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      
      for (let i = 0; i < numPoints; i++) {
        const x = (i / (numPoints - 1)) * width;
        const variance = ((seed * (i + 1)) % 16) - 8;
        const trend = profitAmount >= 0 ? (i / numPoints) * 12 : -(i / numPoints) * 8;
        const y = height / 2 - trend + variance;
        points.push(`${i === 0 ? 'M' : 'L'}${x},${Math.max(2, Math.min(height - 2, y))}`);
      }
      return points.join(' ');
    };

    const eligiblePlayers = allPlayers.filter(p => p.winRate > AI_BENCHMARK_WIN_RATE).length;
    const prize = calculateEstimatedPrize(player.winRate, rank || 1, eligiblePlayers);
    const isFollowed = followedPlayers.has(player.id);
    const followerCount = followerCounts.get(player.id) || 0;
    const isFollowingPlayer = isFollowing.has(player.id);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.2, delay: (rank || 0) * 0.02 }}
        className="rounded-lg border bg-muted/20 border-border/30 p-2 sm:p-4 cursor-pointer"
        onClick={() => navigate(`/player/${player.id}`)}
      >
        {/* Mobile Layout */}
        <div className="sm:hidden">
          {/* Row 1: Rank + Avatar + Name + Win Rate */}
          <div className="flex items-center gap-2 mb-2">
            {rank !== undefined && (
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                rank === 1 ? 'bg-yellow-500/20' :
                rank === 2 ? 'bg-gray-400/20' :
                rank === 3 ? 'bg-amber-600/20' :
                'bg-muted'
              }`}>
                {rank <= 3 ? (
                  <Trophy className={`h-3 w-3 ${
                    rank === 1 ? 'text-yellow-500' :
                    rank === 2 ? 'text-gray-400' :
                    'text-amber-600'
                  }`} />
                ) : (
                  <span className="text-[11px] font-bold text-muted-foreground">{rank}</span>
                )}
              </div>
            )}
            <Avatar className="w-9 h-9 border border-border flex-shrink-0">
              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
              <AvatarFallback className="text-[10px]">{player.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-foreground truncate block">{maskPlayerName(player.displayName)}</span>
              <div className="text-[9px] text-muted-foreground">
                {streakType === 'worst' ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Skull className="w-2.5 h-2.5 text-destructive" />
                    连败 <span className="text-foreground font-bold">{player.worstStreak || 0}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-destructive" />
                    连胜 <span className="text-destructive font-bold">{player.currentStreak || player.bestStreak || 0}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold font-mono-data text-success">{player.winRate.toFixed(0)}%</p>
            </div>
          </div>
          
          {/* Row 2: Stats - 4 columns */}
          <div className="grid grid-cols-4 gap-1 text-center mb-2 py-2 px-1 bg-muted/30 rounded-lg">
            <div>
              <p className="text-[8px] text-muted-foreground mb-0.5">预测</p>
              <p className="text-xs font-bold text-foreground">{player.totalPredictions}</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground mb-0.5">正确</p>
              <p className="text-xs font-bold text-success">{player.correctPredictions}</p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground mb-0.5">盈利</p>
              <p className={`text-xs font-bold inline-flex items-center gap-0.5 justify-center ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitAmount >= 0 ? '+' : ''}{Math.abs(profitAmount).toLocaleString()}
                <img src={hunterCoinIcon} alt="" className="w-3 h-3" />
              </p>
            </div>
            <div>
              <p className="text-[8px] text-muted-foreground mb-0.5">盈利率</p>
              <p className={`text-xs font-bold ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
              </p>
            </div>
          </div>
          
          {/* Row 3: Prize + Buttons */}
          <div className="flex items-center justify-between gap-2">
            {prize > 0 ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning/20 border border-warning/40 text-warning text-[9px] font-bold">
                <AnimatedPrize value={prize} className="text-[9px] font-bold text-warning" duration={600} showLabel={true} />
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground">未达标</span>
            )}
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/history');
                }}
                className="px-2 py-1 text-[9px] font-medium rounded bg-muted/60 text-muted-foreground border border-border/40"
              >
                历史
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  fetchTodayPredictions(player);
                }}
                className="px-2.5 py-1 text-[9px] font-bold rounded bg-warning text-warning-foreground"
              >
                今日跟单
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:block">
          {/* Top Row: Rank, Avatar, Name, Buttons */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {rank !== undefined && (
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  rank === 1 ? 'bg-yellow-500/20' :
                  rank === 2 ? 'bg-gray-400/20' :
                  rank === 3 ? 'bg-amber-600/20' :
                  'bg-muted'
                }`}>
                  {rank <= 3 ? (
                    <Trophy className={`h-3 w-3 ${
                      rank === 1 ? 'text-yellow-500' :
                      rank === 2 ? 'text-gray-400' :
                      'text-amber-600'
                    }`} />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">{rank}</span>
                  )}
                </div>
              )}
              <div className="relative flex-shrink-0">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                  <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <button
                    onClick={(e) => handleFollow(player.id, e)}
                    disabled={isFollowingPlayer}
                    className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full transition-all text-[10px] border ${
                      isFollowingPlayer ? 'opacity-50' : ''
                    } ${
                      isFollowed 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background text-muted-foreground border-border'
                    }`}
                  >
                    <UserPlus className={`h-2.5 w-2.5 ${isFollowed ? 'fill-current' : ''}`} />
                    <span className="font-medium">{followerCount}</span>
                  </button>
                </div>
              </div>
              <div>
                <span className="font-semibold text-base text-foreground">{maskPlayerName(player.displayName)}</span>
                <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                  {streakType === 'worst' ? (
                    <span>连败 <span className="text-foreground font-bold">{player.worstStreak || 0}</span></span>
                  ) : (
                    <span>连续正确 <span className="text-destructive font-bold">{player.currentStreak || player.bestStreak || 0}</span></span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {prize > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/20 border border-warning/40 text-warning text-xs font-bold">
                  <AnimatedPrize value={prize} className="text-xs font-bold text-warning" duration={600} showLabel={true} />
                </span>
              ) : (
                <span className="px-2 py-1 rounded-md bg-muted/40 border border-border/50 text-muted-foreground text-xs">未达标</span>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('/history'); }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted/60 text-muted-foreground border border-border/40"
              >
                历史预测
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); fetchTodayPredictions(player); }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-warning text-warning-foreground"
              >
                今日跟单
              </button>
            </div>
          </div>
          
          {/* Stats Grid - Row 1 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">预测</p>
              <p className="text-lg font-bold font-mono-data text-foreground">{player.totalPredictions}场</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">正确</p>
              <p className="text-lg font-bold font-mono-data text-success">{player.correctPredictions}场</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">错误</p>
              <p className="text-lg font-bold font-mono-data text-destructive">{player.totalPredictions - player.correctPredictions}场</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">胜率</p>
              <p className="text-lg font-bold font-mono-data text-success">{player.winRate.toFixed(0)}%</p>
            </div>
          </div>
          
          {/* Stats Grid - Row 2 */}
          <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('virtual_bet_label')}</p>
              <p className="text-base font-bold font-mono-data text-foreground flex items-center gap-1">
                {((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <img src={hunterCoinIcon} alt="猎人币" className="w-5 h-5" />
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('profit_amount_label')}</p>
              <p className={`text-base font-bold font-mono-data ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                <span className="inline-flex items-center gap-1">
                  {profitAmount >= 0 ? '+' : '-'}{Math.abs(profitAmount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  <img src={hunterCoinIcon} alt="猎人币" className="h-5 w-5" />
                </span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('profit_rate_label')}</p>
              <p className={`text-base font-bold font-mono-data ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
              </p>
            </div>
            <div 
              className="text-right cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
              onClick={async (e) => {
                e.stopPropagation();
                const followers = await fetchPlayerFollowers(player.id, player.displayName);
                setSelectedPlayerFollowers({ playerId: player.id, playerName: player.displayName, followers });
                setIsPlayerFollowersDialogOpen(true);
              }}
            >
              <p className="text-xs text-muted-foreground mb-1 flex items-center justify-end gap-1"><Users className="h-3 w-3" fill="currentColor" />{t('followers_count')}</p>
              <p className="text-base font-bold font-mono-data text-primary hover:underline">
                {followerCounts.get(player.id) ?? 0}{t('people_suffix')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Time Range Filter - Unified for all boards */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-base sm:text-lg font-bold text-foreground">{t('copy_trading_board') || '预测者跟单排行榜'}</h2>
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

      {/* Leaderboard Table - Split into Hot Streak and Cold Streak */}
      {/* Mobile: Use Accordion for collapsible sections */}
      <div className="block sm:hidden">
        <Accordion type="single" collapsible defaultValue="hot" className="space-y-2">
          {/* 连红榜 - Winning Streak */}
          <AccordionItem value="hot" className="border border-border/50 rounded-lg bg-card/50 overflow-hidden relative">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
              style={{ backgroundImage: `url(${winningStreakBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card/98 via-card/90 to-card/80" />
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/30 relative z-10">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-foreground">{t('hot_streak_predictor')}</div>
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
            <AccordionContent className="px-2 pb-3 pt-0 relative z-10">
              <div className="space-y-1.5">
                {topStreakPlayers.map((player, index) => (
                  <PlayerCard key={player.id} player={player} showStreak streakType="best" rank={index + 1} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 连黑榜 - Losing Streak */}
          <AccordionItem value="cold" className="border border-border/50 rounded-lg bg-card/50 overflow-hidden relative">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
              style={{ backgroundImage: `url(${losingStreakBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card/98 via-card/90 to-card/80" />
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/30 relative z-10">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-foreground">{t('cold_streak_predictor')}</div>
                    <p className="text-[10px] text-muted-foreground">{t('needs_improvement')} · <span className="text-foreground font-medium">{t('top_10')}</span></p>
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
            <AccordionContent className="px-2 pb-3 pt-0 relative z-10">
              <div className="space-y-1.5">
                {worstStreakPlayers.map((player, index) => (
                  <PlayerCard key={player.id} player={player} showStreak streakType="worst" rank={index + 1} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Desktop: Original Card layout */}
      <div className="hidden sm:grid sm:grid-cols-1 gap-4">
        {/* 连红榜 - Winning Streak */}
        <Card className="border-border/50 bg-card/50 relative overflow-hidden">
          {/* 背景图片 */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
            style={{ backgroundImage: `url(${winningStreakBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/98 via-card/90 to-card/80" />
          <div className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-foreground">{t('hot_streak_predictor')}</h3>
                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">{t('highest_win_rate_players')} · <span className="text-foreground font-medium">{t('top_10')}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowAllHotPlayers(true)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
              >
                {t('all_players')}
              </button>
            </div>
          </div>
          <CardContent className="px-4 pb-4 pt-0 relative z-10">
            <div className="space-y-2">
              {topStreakPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} showStreak streakType="best" rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 连黑榜 - Losing Streak */}
        <Card className="border-border/50 bg-card/50 relative overflow-hidden">
          {/* 背景图片 */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
            style={{ backgroundImage: `url(${losingStreakBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/98 via-card/90 to-card/80" />
          <div className="pb-3 pt-4 px-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-8 bg-gradient-to-b from-red-400 to-red-600 rounded-full" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">{t('cold_streak_predictor')}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('needs_improvement')} · <span className="text-foreground font-medium">{t('top_10')}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowAllColdPlayers(true)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
              >
                {t('all_players')}
              </button>
            </div>
          </div>
          <CardContent className="px-4 pb-4 pt-0 relative z-10">
            <div className="space-y-2">
              {worstStreakPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} showStreak streakType="worst" rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Today Copy Trading Dialog - Professional Betting Style (Same as PlayerLeaderboardTable) */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-sm p-0 gap-0">
          {/* Header - Clean & Simple */}
          <div className="px-4 py-3 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src={selectedPlayer?.player.avatarUrl} />
                  <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
                    {selectedPlayer?.player.displayName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-base font-bold">{maskPlayerName(selectedPlayer?.player.displayName || '')}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {(() => {
                      const unlockPrice = selectedPlayer?.player.unlockPrice ?? 0;
                      return (
                        <>
                          <span className="text-muted-foreground truncate max-w-[200px]">
                            {selectedPlayer?.player.signature || "这个人很懒，什么都没写~"}
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
          
          {selectedPlayer && (
            <div className="max-h-[60vh] overflow-y-auto">
              {(() => {
                const upcomingPredictions = selectedPlayer.predictions.filter(p => !p.result);
                
                return (
                  <>
                    {/* 待开赛跟单 - Betting Style List */}
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
                          
                          // 检查是否已跟单
                          const isCopied = copiedPredictions.has(pred.id);
                          
                          return (
                            <div key={pred.id} className="px-4 py-3">
                              {isCopied ? (
                                // 已跟单 - 显示完整比赛信息
                                <div className="rounded-lg bg-muted/20 border border-border/30 overflow-hidden">
                                  {/* 比赛信息头部 */}
                                  <div className="px-3 py-3 border-b border-border/20">
                                    {/* 球队对阵 - 居中显示带队标 */}
                                    <div className="flex items-center justify-center gap-4 mb-2">
                                      <div className="flex items-center gap-2">
                                        {getTeamLogo(pred.home_team || '') && (
                                          <img 
                                            src={getTeamLogo(pred.home_team || '') || ''}
                                            alt=""
                                            className="w-6 h-6 object-contain"
                                          />
                                        )}
                                        <span className="text-sm font-semibold text-foreground">{pred.home_team || '主队'}</span>
                                      </div>
                                      <span className="text-muted-foreground/50 text-xs font-normal">vs</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground">{pred.away_team || '客队'}</span>
                                        {getTeamLogo(pred.away_team || '') && (
                                          <img 
                                            src={getTeamLogo(pred.away_team || '') || ''}
                                            alt=""
                                            className="w-6 h-6 object-contain"
                                          />
                                        )}
                                      </div>
                                    </div>
                                    {/* 开赛时间 */}
                                    <div className="flex items-center justify-center gap-2 text-[10px]">
                                      <Calendar className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">
                                        {pred.match_time || '待定'}
                                      </span>
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
                                    onClick={() => handleCopyTradeFromPrediction(pred)}
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
                        今日暂无订阅记录
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
                  <p className="text-xs text-muted-foreground inline-flex items-center flex-wrap">
                    {t('win_rate')}: <span className="text-success font-medium ml-1 inline-flex items-center">{copyTradeDialog.player.winRate.toFixed(1)}%
                      {(() => {
                        const todayData = todayStats.get(copyTradeDialog.player.id);
                        if (todayData && todayData.total > 0) {
                          const trendValue = todayData.winRate - copyTradeDialog.player.winRate;
                          if (trendValue > 2) {
                            return (
                              <motion.span
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                className="inline-flex ml-0.5"
                              >
                                <TrendingUp className="h-3 w-3 text-success drop-shadow-[0_0_4px_hsl(var(--success))]" />
                              </motion.span>
                            );
                          } else if (trendValue < -2) {
                            return (
                              <motion.span
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                className="inline-flex ml-0.5"
                              >
                                <TrendingDown className="h-3 w-3 text-destructive drop-shadow-[0_0_4px_hsl(var(--destructive))]" />
                              </motion.span>
                            );
                          }
                        }
                        return null;
                      })()}
                    </span>
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
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {t('available_balance_label')}: <span className="text-foreground font-medium flex items-center gap-0.5">{realBalance.toLocaleString()}<img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3" /></span>
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
                      <span className="flex items-center gap-0.5">{amount}<img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3" /></span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 预期收益 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                <span className="text-sm text-muted-foreground">{t('expected_profit')}</span>
                <span className="font-bold text-foreground font-mono flex items-center gap-0.5">
                  +{(copyBetAmount * 0.8).toFixed(0)} ~ +{(copyBetAmount * 1.2).toFixed(0)}<img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
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
                  disabled={isCopying || copyBetAmount > realBalance || copyBetAmount < 10}
                >
                  {isCopying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t('copying')}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-1" />
                      确认订阅解锁
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
                  <Users className="h-4 w-4 text-muted-foreground" fill="currentColor" />
                  <span className="text-sm text-muted-foreground">
                    已有 <span className="text-foreground font-bold">{50 + (copySuccess.playerName.charCodeAt(0) % 150)}</span> 人跟单该玩家
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

      {/* 查看全部连红玩家弹窗 - 简化版 */}
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
              {t('hot_streak_predictor')} - {t('all_players')}
            </DialogTitle>
          </DialogHeader>
          {/* 搜索框 */}
          <div className="relative mb-2 px-6 flex-shrink-0">
            <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_player') || '搜索玩家名称...'}
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
                const filteredCount = allPlayers.filter(p => 
                  p.displayName.toLowerCase().includes(hotSearchQuery.toLowerCase()) &&
                  (p.bestStreak || 0) > 0
                ).length;
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
                  .filter(player => 
                    player.displayName.toLowerCase().includes(hotSearchQuery.toLowerCase()) &&
                    (player.bestStreak || 0) > 0
                  )
                  .sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0));
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
                                连续正确 <span className="text-amber-500 font-bold">{player.bestStreak || 0}</span>
                              </p>
                            </div>
                            {/* Win Rate */}
                            <div className="text-right">
                              <p className="text-sm font-bold text-success">{player.winRate.toFixed(1)}%</p>
                              <p className="text-[10px] text-muted-foreground">{player.totalPredictions}场</p>
                            </div>
                          </div>
                        ))}
                        {hotDisplayCount < filtered.length && (
                          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                            {isLoadingMoreHot ? (
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

      {/* 查看全部连黑玩家弹窗 - 简化版 */}
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
              {t('cold_streak_predictor')} - {t('all_players')}
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
                const filteredCount = allPlayers.filter(p => 
                  p.displayName.toLowerCase().includes(coldSearchQuery.toLowerCase()) &&
                  (p.worstStreak || 0) > 0
                ).length;
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
                  .filter(player => 
                    player.displayName.toLowerCase().includes(coldSearchQuery.toLowerCase()) &&
                    (player.worstStreak || 0) > 0
                  )
                  .sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0));
                const displayed = filtered.slice(0, coldDisplayCount);
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
                          onClick={() => setColdSearchQuery('')}
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
                            {/* Win Rate */}
                            <div className="text-right">
                              <p className="text-sm font-bold text-destructive">{player.winRate.toFixed(1)}%</p>
                              <p className="text-[10px] text-muted-foreground">{player.totalPredictions}场</p>
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
                  <PlayerCard 
                    player={selectedAllPlayer.player} 
                    showStreak 
                    streakType={selectedAllPlayer.boardType === 'hot' ? 'best' : 'worst'} 
                    rank={allPlayers.findIndex(p => p.id === selectedAllPlayer.player.id) + 1} 
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
          <div className="px-5 pt-5 pb-3">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold">{selectedPlayerFollowers?.playerName} - {t('tracking_users')}</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">{t('updated_at')} {new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">{t('profit_rate_label')}</span>
                  <span className="text-lg font-bold text-success">+{(15 + Math.random() * 30).toFixed(1)}%</span>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-5 py-2.5 border-y border-border/50 bg-muted/30">
            <span>{t('rank_header')}</span>
            <span>{t('profit_and_scale')}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
            {selectedPlayerFollowers?.followers.map((follower, index) => (
              <div key={follower.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {index === 0 ? <span className="text-xl">🥇</span> : index === 1 ? <span className="text-xl">🥈</span> : index === 2 ? <span className="text-xl">🥉</span> : <span className="text-sm text-muted-foreground">{index + 1}</span>}
                  </div>
                  <Avatar className="w-10 h-10 border border-border/50"><AvatarImage src={follower.avatar} /><AvatarFallback>{follower.name.charAt(0)}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-bold text-sm">{follower.name}</p>
                    <p className="text-xs text-muted-foreground">{t('followed_times', { count: follower.days })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold flex items-center justify-end gap-1 ${follower.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{follower.profit >= 0 ? '+' : ''}{follower.profit.toFixed(2)}<img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" /></p>
                  <p className="text-xs text-muted-foreground font-medium flex items-center justify-end gap-1">{follower.copyAmount.toFixed(2)}<img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 opacity-70" /></p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-border/50"><Button variant="outline" className="w-full" onClick={() => setIsPlayerFollowersDialogOpen(false)}>关闭</Button></div>
        </DialogContent>
      </Dialog>

      {/* Disclaimer */}
      <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {t('leaderboard_disclaimer') || '注意: 所有统计数据仅反映已完成的比赛预测。直播比赛预测在比赛结束前不计入统计。HUNSOCCER 所有内容均为模拟分析结果，仅供 AI 技术研究与赛事分析展示使用，不提供、不引导任何形式的投注或博彩活动。'}
        </p>
      </div>
    </div>
  );
};

export default PlayerCopyTradingBoard;