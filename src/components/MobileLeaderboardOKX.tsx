import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Filter, TrendingUp, TrendingDown, Users, Clock, DollarSign, Trophy, Loader2, ThumbsUp, Zap, CheckCircle, XCircle, History, UserPlus, Calendar, X, Search, Lock, CheckCircle2, Copy, Sparkles } from "lucide-react";
import { differenceInSeconds } from "date-fns";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { aiModels } from "@/data/mockData";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import ChallengeAIBanner from "@/components/ChallengeAIBanner";
import { GoalIcon } from "@/components/FootballIcons";
import { getUTC8Range, getUTC8RangeLabelWithLocale } from "@/lib/utils";

// AI Model Icons
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";

// Expert Images
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";
import grassTexture from "@/assets/grass-texture.jpg";

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
  isWinner?: boolean;
  followers?: number;
  tradingDays?: number;
  tradingVolume?: number;
  unlockPrice?: number;
  signature?: string;
}

type MainTab = 'ai' | 'accuracy' | 'copyTrade';
type SubTab = 'high' | 'low';
type SortType = 'comprehensive' | 'winRate' | 'profit' | 'followers';
type TimeFilter = 'day' | 'week' | 'month';

// AI Model icon mapping
const getAIIcon = (modelId: string) => {
  const iconMap: Record<string, string> = {
    'deepseek': deepseekIcon,
    'gpt5': gpt5Icon,
    'claude': claudeIcon,
    'gemini': geminiIcon,
    'grok': grokIcon,
    'hunsoccer-max': hunsoccerIcon,
  };
  return iconMap[modelId] || hunsoccerIcon;
};

// Expert images mapping
const getExpertImage = (modelId: string) => {
  switch(modelId) {
    case 'deepseek': return starRonaldo;
    case 'gpt5': return starNeymar;
    case 'claude': return starMessi;
    case 'gemini': return starHaaland;
    case 'grok': return starMbappe;
    case 'hunsoccer-max':
    case 'hunsoccermax': return starHunsoccer;
    default: return starRonaldo;
  }
};

// Color tint mapping
const getColorTint = (modelId: string) => {
  switch(modelId) {
    case 'deepseek': return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
    case 'gpt5': return 'from-[hsl(0,0%,35%)]/80 to-[hsl(0,0%,20%)]/80';
    case 'claude': return 'from-[hsl(14,92%,68%)]/80 to-[hsl(14,92%,50%)]/80';
    case 'gemini': return 'from-[hsl(250,75%,68%)]/80 to-[hsl(250,75%,50%)]/80';
    case 'grok': return 'from-[hsl(158,68%,60%)]/80 to-[hsl(158,68%,45%)]/80';
    case 'hunsoccer-max':
    case 'hunsoccermax': return 'from-[hsl(38,92%,50%)]/80 to-[hsl(38,92%,40%)]/80';
    default: return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
  }
};

const MobileLeaderboardOKX = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [mainTab, setMainTab] = useState<MainTab>('ai');
  const [subTab, setSubTab] = useState<SubTab>('high');
  const [sortType, setSortType] = useState<SortType>('comprehensive');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRulesExpanded, setShowRulesExpanded] = useState(false);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  /** 跟单排行榜专用：仅包含「订阅了自动跟单」的用户，再查其下注信息 */
  const [copyTradePlayers, setCopyTradePlayers] = useState<PlayerData[]>([]);
  const [isLoadingCopyTrade, setIsLoadingCopyTrade] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // AI模型统计数据（根据时间筛选器）
  const [aiModelsStats, setAiModelsStats] = useState<Map<string, {
    winRate: number;
    totalPredictions: number;
    correctPredictions: number;
    profitAmount: number;
    changePercent: number;
    totalBetAmount: number;
  }>>(new Map());
  const [showAllPredictors, setShowAllPredictors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [selectedModelForFollowers, setSelectedModelForFollowers] = useState<string | null>(null);
  const [showPlayerFollowersDialog, setShowPlayerFollowersDialog] = useState(false);
  const [selectedPlayerForFollowers, setSelectedPlayerForFollowers] = useState<PlayerData | null>(null);
  const [playerFollowersList, setPlayerFollowersList] = useState<{ id: string; name: string; avatar: string; days: number; profit: number; copyAmount: number; totalVolume: number }[]>([]);
  const [isLoadingPlayerFollowers, setIsLoadingPlayerFollowers] = useState(false);
  // Follow player confirmation dialog state
  const [showFollowPlayerDialog, setShowFollowPlayerDialog] = useState(false);
  const [playerToFollow, setPlayerToFollow] = useState<PlayerData | null>(null);
  
  // Like states for AI models
  const [likedModels, setLikedModels] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [isLiking, setIsLiking] = useState<Set<string>>(new Set()); // 防止重复点击
  
  // History and Copy Trade states
  interface TodayPrediction {
    id: string;
    match_id: string;
    prediction: string;
    prediction_type: 'over_under' | 'handicap';
    bet_amount: number;
    potential_payout: number | null;
    actual_payout: number | null;
    result: 'win' | 'lose' | null;
    created_at: string;
    home_team: string;
    away_team: string;
    home_logo?: string | null;
    away_logo?: string | null;
    home_score?: number | null;
    away_score?: number | null;
    match_status?: string;
    match_date?: string | Date;
  }
  
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState<{ playerId: string; playerName: string; predictions: TodayPrediction[] } | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copyTradeDialog, setCopyTradeDialog] = useState<{ player: PlayerData; prediction: TodayPrediction } | null>(null);
  const [copyBetAmount, setCopyBetAmount] = useState(100);
  const [isCopying, setIsCopying] = useState(false);
  // 已跟单的预测ID集合 - 跟单后才能看到具体盘口
  const [copiedPredictions, setCopiedPredictions] = useState<Set<string>>(new Set());
  // USDT解锁弹窗状态
  const [unlockDialog, setUnlockDialog] = useState<{ player: PlayerData; prediction: TodayPrediction } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState(0);
  // AI模型自动跟单状态
  const [copyTradeModel, setCopyTradeModel] = useState<{ id: string; name: string } | null>(null);
  const [isCopyTradeDialogOpen, setIsCopyTradeDialogOpen] = useState(false);
  const [copyTradeAmount, setCopyTradeAmount] = useState<number>(100);
  const [isCopyTrading, setIsCopyTrading] = useState(false);
  /** 当前用户已订阅自动跟单的 AI id 集合（用于显示「已订阅」与「取消跟单」） */
  const [subscribedAiIds, setSubscribedAiIds] = useState<Set<string>>(new Set());
  const [isCancellingCopy, setIsCancellingCopy] = useState<string | null>(null);
  // 预测对话框状态（参考首页用户模型的开始预测界面）
  const [showPredictionDialog, setShowPredictionDialog] = useState(false);
  const [selectedMatchForPrediction, setSelectedMatchForPrediction] = useState<any>(null);
  const [predictionMatches, setPredictionMatches] = useState<any[]>([]);
  const [isLoadingPredictionMatches, setIsLoadingPredictionMatches] = useState(false);
  const [manualBetType, setManualBetType] = useState<'handicap' | 'over_under'>('handicap');
  const [manualHandicapLine, setManualHandicapLine] = useState(0);
  const [manualOverUnderLine, setManualOverUnderLine] = useState(2.5);
  const [manualPrediction, setManualPrediction] = useState<string>('');
  const [manualOverUnderPick, setManualOverUnderPick] = useState<'over' | 'under'>('over');
  const [manualBetAmount, setManualBetAmount] = useState<number | ''>('');
  const [isSubmittingBet, setIsSubmittingBet] = useState(false);
  const [marketOdds, setMarketOdds] = useState<any>(null);
  const [isLoadingMarketOdds, setIsLoadingMarketOdds] = useState(false);
  // 跟单成功状态
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

  // AI 最佳模型基准（达标需比赛场次、胜率、金额都严格大于此）
  const aiBenchmark = useMemo(() => {
    if (aiModelsStats.size === 0) return { totalPredictions: 0, winRate: 0, profitAmount: 0 };
    let best = { totalPredictions: 0, winRate: 0, profitAmount: 0 };
    aiModelsStats.forEach((stats) => {
      if (stats.winRate > best.winRate) {
        best = { totalPredictions: stats.totalPredictions, winRate: stats.winRate, profitAmount: stats.profitAmount };
      }
    });
    return best;
  }, [aiModelsStats]);

  // MatchCountdown component
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
          setCountdown(t('match_starting_soon') || '即将开始');
          setIsStarting(true);
          return;
        }
        
        setIsStarting(false);
        const days = Math.floor(diffInSeconds / 86400);
        const hours = Math.floor((diffInSeconds % 86400) / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        
        const d = t('days_short') || '天';
        const h = t('hours_short') || '时';
        const m = t('minutes_short') || '分';
        
        if (days > 0) {
          setCountdown(`${days}${d}${hours}${h}${minutes}${m}`);
        } else if (hours > 0) {
          setCountdown(`${hours}${h}${minutes}${m}`);
        } else {
          setCountdown(`${minutes}${m}`);
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute
      return () => clearInterval(interval);
    }, [matchDate, t]);
    
    return (
      <span className={isStarting ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}>
        {countdown}
      </span>
    );
  };

  // Get USDT balance
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

  // 仅使用真实数据：users + user_balances + user_predictions + user_follows
  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      const INITIAL_BALANCE = 100000;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, avatar_url');
      if (usersError) throw usersError;
      if (!usersData?.length) {
        setAllPlayers([]);
        return;
      }

      const { data: balancesData, error: balancesError } = await supabase
        .from('user_balances')
        .select('user_id, balance');
      if (balancesError) throw balancesError;

      const { data: predictionsData, error: predictionsError } = await supabase
        .from('user_predictions')
        .select('user_id, result, bet_amount, actual_payout');
      if (predictionsError) throw predictionsError;

      const { data: followersData } = await supabase
        .from('user_follows')
        .select('following_id');
      const followerCountMap = new Map<string, number>();
      followersData?.forEach((row: { following_id: string }) => {
        followerCountMap.set(row.following_id, (followerCountMap.get(row.following_id) ?? 0) + 1);
      });

      const balancesMap = new Map(balancesData?.map((b) => [b.user_id, b.balance]) ?? []);

      const realPlayers: PlayerData[] = usersData
        .map((u) => {
          const userPredictions = predictionsData?.filter((p) => p.user_id === u.id) ?? [];
          const totalPredictions = userPredictions.length;
          if (totalPredictions === 0) return null;
          const correctPredictions = userPredictions.filter((p) => p.result === 'win').length;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          const totalBetAmount = userPredictions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);
          const validAmount = userPredictions.reduce((sum, p) => {
            if (p.result === 'win') return sum + (p.actual_payout || p.bet_amount || 0);
            return sum;
          }, 0);
          const profitAmount = validAmount - totalBetAmount;
          const balance = balancesMap.get(u.id) ?? INITIAL_BALANCE;
          const profit = Math.max(-INITIAL_BALANCE, balance - INITIAL_BALANCE);
          const changePercent = Math.max(-100, (profit / INITIAL_BALANCE) * 100);

          let bestStreak = 0,
            tempStreak = 0,
            worstStreak = 0,
            lossStreak = 0,
            currentStreak = 0;
          userPredictions.forEach((pred) => {
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
          for (let i = userPredictions.length - 1; i >= 0; i--) {
            if (userPredictions[i].result === 'win') currentStreak++;
            else break;
          }

          const isWinner = changePercent > 0 && winRate >= 55;
          return {
            id: u.id,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            totalPredictions,
            correctPredictions,
            winRate: parseFloat(winRate.toFixed(1)),
            balance,
            profit,
            changePercent: parseFloat(changePercent.toFixed(2)),
            profitAmount,
            rank: 0,
            bestStreak,
            currentStreak,
            worstStreak,
            isVirtual: false,
            isWinner,
            followers: followerCountMap.get(u.id) ?? 0,
            tradingDays: 0,
            tradingVolume: totalBetAmount,
          };
        })
        .filter(Boolean) as PlayerData[];

      const combined = [...realPlayers]
        .sort((a, b) => b.winRate - a.winRate)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      setAllPlayers(combined);
    } catch (error) {
      console.error('Error fetching players:', error);
      setAllPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // 跟单排行榜：先查订阅自动跟单的用户，再查这些用户的下注信息
  const fetchCopyTradePlayers = useCallback(async () => {
    setIsLoadingCopyTrade(true);
    try {
      const INITIAL_BALANCE = 100000;
      const { data: subsData, error: subsError } = await (supabase as any)
        .from("user_ai_copy_subscriptions")
        .select("user_id")
        .eq("is_active", true);
      if (subsError || !subsData?.length) {
        setCopyTradePlayers([]);
        return;
      }
      const subscriberIds = [...new Set((subsData as { user_id: string }[]).map((r) => r.user_id))];

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .in("id", subscriberIds);
      if (usersError || !usersData?.length) {
        setCopyTradePlayers([]);
        return;
      }

      const { data: balancesData } = await supabase
        .from("user_balances")
        .select("user_id, balance")
        .in("user_id", subscriberIds);

      const { data: predictionsData } = await supabase
        .from("user_predictions")
        .select("user_id, result, bet_amount, actual_payout")
        .in("user_id", subscriberIds);

      const { data: followersData } = await supabase
        .from("user_follows")
        .select("following_id")
        .in("following_id", subscriberIds);
      const followerCountMap = new Map<string, number>();
      followersData?.forEach((row: { following_id: string }) => {
        followerCountMap.set(row.following_id, (followerCountMap.get(row.following_id) ?? 0) + 1);
      });

      const balancesMap = new Map(balancesData?.map((b) => [b.user_id, b.balance]) ?? []);

      const realPlayers: PlayerData[] = usersData
        .map((u) => {
          const userPredictions = predictionsData?.filter((p) => p.user_id === u.id) ?? [];
          const totalPredictions = userPredictions.length;
          const correctPredictions = userPredictions.filter((p) => p.result === "win").length;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          const totalBetAmount = userPredictions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);
          const validAmount = userPredictions.reduce((sum, p) => {
            if (p.result === "win") return sum + (p.actual_payout || p.bet_amount || 0);
            return sum;
          }, 0);
          const profitAmount = validAmount - totalBetAmount;
          const balance = balancesMap.get(u.id) ?? INITIAL_BALANCE;
          const profit = Math.max(-INITIAL_BALANCE, balance - INITIAL_BALANCE);
          const changePercent = Math.max(-100, (profit / INITIAL_BALANCE) * 100);

          let bestStreak = 0,
            tempStreak = 0,
            worstStreak = 0,
            lossStreak = 0,
            currentStreak = 0;
          userPredictions.forEach((pred) => {
            if (pred.result === "win") {
              tempStreak++;
              bestStreak = Math.max(bestStreak, tempStreak);
              lossStreak = 0;
            } else if (pred.result === "loss") {
              tempStreak = 0;
              lossStreak++;
              worstStreak = Math.max(worstStreak, lossStreak);
            }
          });
          for (let i = userPredictions.length - 1; i >= 0; i--) {
            if (userPredictions[i].result === "win") currentStreak++;
            else break;
          }

          const isWinner = changePercent > 0 && winRate >= 55;
          return {
            id: u.id,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            totalPredictions,
            correctPredictions,
            winRate: parseFloat(winRate.toFixed(1)),
            balance,
            profit,
            changePercent: parseFloat(changePercent.toFixed(2)),
            profitAmount,
            rank: 0,
            bestStreak,
            currentStreak,
            worstStreak,
            isVirtual: false,
            isWinner,
            followers: followerCountMap.get(u.id) ?? 0,
            tradingDays: 0,
            tradingVolume: totalBetAmount,
          };
        })
        .filter(Boolean) as PlayerData[];

      const combined = [...realPlayers]
        .sort((a, b) => b.winRate - a.winRate)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      setCopyTradePlayers(combined);
    } catch (error) {
      console.error("Error fetching copy-trade players:", error);
      setCopyTradePlayers([]);
    } finally {
      setIsLoadingCopyTrade(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === "copyTrade") {
      fetchCopyTradePlayers();
    }
  }, [mainTab, fetchCopyTradePlayers]);

  // 拉取当前用户已订阅的 AI 列表（用于展示「已订阅」/「取消跟单」）
  useEffect(() => {
    if (!user) {
      setSubscribedAiIds(new Set());
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .from("user_ai_copy_subscriptions")
        .select("ai_id")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) {
        setSubscribedAiIds(new Set());
        return;
      }
      setSubscribedAiIds(new Set((data || []).map((r: { ai_id: string }) => r.ai_id)));
    })();
  }, [user?.id]);

  // 取消 AI 自动跟单：将 is_active 置为 false
  const handleCancelCopyTrade = useCallback(
    async (aiId: string) => {
      if (!user) return;
      setIsCancellingCopy(aiId);
      try {
        const { error } = await (supabase as any)
          .from("user_ai_copy_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("ai_id", aiId);
        if (error) throw error;
        setSubscribedAiIds((prev) => {
          const next = new Set(prev);
          next.delete(aiId);
          return next;
        });
        if (mainTab === "copyTrade") fetchCopyTradePlayers();
        toast.success(t("cancel_copy_trade_success") || "已取消跟单");
      } catch (e) {
        console.error("Cancel copy trade error:", e);
        toast.error(t("cancel_copy_trade_failed") || "取消失败，请重试");
      } finally {
        setIsCancellingCopy(null);
      }
    },
    [user?.id, mainTab, fetchCopyTradePlayers, t]
  );

  // 从数据库获取AI模型点赞数和用户点赞状态
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        // 获取所有AI模型的点赞数
        const modelIds = aiModels.map(m => m.id);
        const { data: likeCountsData, error: countsError } = await supabase
          .from('like_counts')
          .select('entity_id, like_count')
          .eq('entity_type', 'ai_model')
          .in('entity_id', modelIds);

        if (countsError) {
          console.error('[MobileLeaderboardOKX] 获取点赞数失败:', countsError);
        } else {
          const countsMap = new Map<string, number>();
          if (likeCountsData) {
            likeCountsData.forEach(item => {
              countsMap.set(item.entity_id, item.like_count || 0);
            });
          }
          // 为没有点赞记录的模型设置默认值0
          modelIds.forEach(modelId => {
            if (!countsMap.has(modelId)) {
              countsMap.set(modelId, 0);
            }
          });
          setLikeCounts(countsMap);
        }

        // 如果用户已登录，获取用户的点赞状态
        if (user) {
          const { data: userLikesData, error: userLikesError } = await supabase
            .from('likes')
            .select('entity_id')
            .eq('entity_type', 'ai_model')
            .eq('user_id', user.id)
            .in('entity_id', modelIds);

          if (userLikesError) {
            console.error('[MobileLeaderboardOKX] 获取用户点赞状态失败:', userLikesError);
          } else {
            const likedSet = new Set<string>();
            if (userLikesData) {
              userLikesData.forEach(item => {
                likedSet.add(item.entity_id);
              });
            }
            setLikedModels(likedSet);
          }
        }
      } catch (error) {
        console.error('[MobileLeaderboardOKX] 获取点赞数据失败:', error);
      }
    };

    fetchLikes();
  }, [user]);

  // 处理AI模型点赞/取消点赞
  const handleAIModelLike = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error(t('login_first') || '请先登录', {
        description: t('login_to_like') || '登录后即可点赞',
      });
      return;
    }

    if (isLiking.has(modelId)) {
      return;
    }

    setIsLiking(prev => new Set(prev).add(modelId));

    const isCurrentlyLiked = likedModels.has(modelId);

    try {
      if (isCurrentlyLiked) {
        // 取消点赞 - 删除数据库记录
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('entity_type', 'ai_model')
          .eq('entity_id', modelId);

        if (deleteError) {
          console.error('[MobileLeaderboardOKX] 取消点赞失败:', deleteError);
          toast.error('取消点赞失败，请重试');
          setIsLiking(prev => {
            const newSet = new Set(prev);
            newSet.delete(modelId);
            return newSet;
          });
          return;
        }

        // 更新本地状态
        setLikedModels(prev => {
          const newSet = new Set(prev);
          newSet.delete(modelId);
          return newSet;
        });
        setLikeCounts(prev => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(modelId) || 0;
          newMap.set(modelId, Math.max(0, currentCount - 1));
          return newMap;
        });
      } else {
        // 点赞 - 插入数据库记录
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            entity_type: 'ai_model',
            entity_id: modelId,
          });

        if (insertError) {
          console.error('[MobileLeaderboardOKX] 点赞失败:', insertError);
          toast.error('点赞失败，请重试');
          setIsLiking(prev => {
            const newSet = new Set(prev);
            newSet.delete(modelId);
            return newSet;
          });
          return;
        }

        // 更新本地状态
        setLikedModels(prev => new Set(prev).add(modelId));
        setLikeCounts(prev => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(modelId) || 0;
          newMap.set(modelId, currentCount + 1);
          return newMap;
        });
      }
    } catch (error) {
      console.error('[MobileLeaderboardOKX] 处理点赞时出错:', error);
      toast.error('操作失败，请重试');
    } finally {
      // 清除loading状态
      setIsLiking(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    }
  };

  // 根据时间筛选器获取 AI 模型统计数据（使用与 PC 端相同的计算方式）
  useEffect(() => {
    const fetchAIModelsStats = async () => {
      // 重置统计数据，显示加载状态
      setAiModelsStats(new Map());
      
      try {
        // 按 UTC+8 的日/周/月计算时间范围，再转为 UTC 查询 settled_at（与 PC 端 LeaderboardTable 一致）
        const { start: startDateTime, end: endDateTime } = getUTC8Range(timeFilter);
        
        // 直接从 sim_positions 表查询指定时间范围内的数据（含 stake_amount、pnl 用于盈利率/盈利金额统计）
        const { data: positionsData, error: positionsError } = await supabase
          .from('sim_positions' as any)
          .select('ai_id, metadata, stake_amount, pnl')
          .eq('status', 'settled')
          .not('settled_at', 'is', null)
          .gte('settled_at', startDateTime.toISOString())
          .lte('settled_at', endDateTime.toISOString());

        if (positionsError) {
          console.error('Error fetching AI positions:', positionsError);
        }
        
        // 统计每个AI的胜率数据
        const winRatesMap = new Map<string, { total_predictions: number; correct_predictions: number; win_rate: number }>();
        
        if (positionsData && positionsData.length > 0) {
          // 按 ai_id 分组统计
          const statsByAi = new Map<string, { total: number; wins: number }>();
          
          positionsData.forEach((position: any) => {
            const aiId = String(position.ai_id);
            const metadata = position.metadata;
            
            // 检查结算结果
            if (metadata && metadata.settlement) {
              const result = metadata.settlement.result;
              if (result === 'win' || result === 'loss') {
                // 初始化统计
                if (!statsByAi.has(aiId)) {
                  statsByAi.set(aiId, { total: 0, wins: 0 });
                }
                
                const stats = statsByAi.get(aiId)!;
                stats.total += 1;
                if (result === 'win') {
                  stats.wins += 1;
                }
              }
            }
          });
          
          // 转换为所需格式
          statsByAi.forEach((stats, aiId) => {
            const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
            winRatesMap.set(aiId, {
              total_predictions: stats.total,
              correct_predictions: stats.wins,
              win_rate: Math.round(winRate * 10) / 10
            });
          });
        }

        // 从 sim_positions 聚合每个 AI 的投注总额与盈亏（盈利率、盈利金额均基于表内数据）
        const profitByAi = new Map<string, { totalStake: number; totalPnl: number }>();
        if (positionsData && positionsData.length > 0) {
          positionsData.forEach((position: any) => {
            const aiId = String(position.ai_id);
            const stake = Number(position.stake_amount) || 0;
            const pnl = Number(position.pnl) ?? 0;
            if (!profitByAi.has(aiId)) {
              profitByAi.set(aiId, { totalStake: 0, totalPnl: 0 });
            }
            const agg = profitByAi.get(aiId)!;
            agg.totalStake += stake;
            agg.totalPnl += pnl;
          });
        }
        
        // 如果没有数据，尝试从总体视图获取（作为后备）
        if (winRatesMap.size === 0) {
          const { data: winRatesData, error: winRatesError } = await supabase
            .from('ai_win_rates_overall' as any)
            .select('ai_id, total_predictions, correct_predictions, win_rate');

          if (winRatesError) {
            console.error('Error fetching AI win rates from overall:', winRatesError);
          } else if (winRatesData) {
            winRatesData.forEach((item: any) => {
              winRatesMap.set(String(item.ai_id), {
                total_predictions: Number(item.total_predictions) || 0,
                correct_predictions: Number(item.correct_predictions) || 0,
                win_rate: Number(item.win_rate) || 0
              });
            });
          }
        }

        // 获取所有AI模型的余额数据（用于显示，但不用于计算盈利）
        const { data: balancesData, error: balancesError } = await supabase
          .from('ai_balances' as any)
          .select('ai_id, available_balance, locked_balance');

        if (balancesError) {
          console.error('Error fetching AI balances:', balancesError);
        }


        // 盈利率与盈利金额：从 sim_positions 表聚合；盈利率 = 盈利金额 / 初始金额（与 LeaderboardTable 一致）
        const INITIAL_BALANCE = 100000;
        const finalStatsMap = new Map<string, {
          winRate: number;
          totalPredictions: number;
          correctPredictions: number;
          profitAmount: number;
          changePercent: number;
          totalBetAmount: number;
        }>();
        
        aiModels.forEach(model => {
          const winRateData = winRatesMap.get(model.id);
          const totalPredictions = winRateData?.total_predictions ?? 0;
          const correctPredictions = winRateData?.correct_predictions ?? 0;
          const winRate = winRateData?.win_rate ?? 0;
          
          const profitData = profitByAi.get(model.id);
          const totalBetAmount = profitData?.totalStake ?? 0;
          const profitAmount = profitData?.totalPnl ?? 0;
          const profitRate = INITIAL_BALANCE > 0 ? (profitAmount / INITIAL_BALANCE) * 100 : 0;
          
          finalStatsMap.set(model.id, {
            winRate: Math.round(winRate * 10) / 10,
            totalPredictions,
            correctPredictions,
            profitAmount: Math.round(profitAmount),
            changePercent: profitRate, // 盈利率 = 盈利金额 / 初始金额（不取整）
            totalBetAmount: Math.round(totalBetAmount),
          });
        });
        
        setAiModelsStats(finalStatsMap);
      } catch (error) {
        console.error('Error fetching AI models stats:', error);
        // 如果出错，初始化空统计数据
        const emptyStatsMap = new Map<string, {
          winRate: number;
          totalPredictions: number;
          correctPredictions: number;
          profitAmount: number;
          changePercent: number;
          totalBetAmount: number;
        }>();
        aiModels.forEach(model => {
          emptyStatsMap.set(model.id, {
            winRate: 0,
            totalPredictions: 0,
            correctPredictions: 0,
            profitAmount: 0,
            changePercent: 0,
            totalBetAmount: 0,
          });
        });
        setAiModelsStats(emptyStatsMap);
      }
    };
    
    fetchAIModelsStats();
  }, [timeFilter]);

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

  // 打开玩家跟单者弹窗时拉取真实跟单列表
  useEffect(() => {
    if (!showPlayerFollowersDialog || !selectedPlayerForFollowers) {
      setPlayerFollowersList([]);
      return;
    }
    let cancelled = false;
    setIsLoadingPlayerFollowers(true);
    fetchPlayerFollowers(selectedPlayerForFollowers.id, selectedPlayerForFollowers.displayName).then((list) => {
      if (!cancelled) {
        setPlayerFollowersList(list);
      }
    }).finally(() => {
      if (!cancelled) setIsLoadingPlayerFollowers(false);
    });
    return () => { cancelled = true; };
  }, [showPlayerFollowersDialog, selectedPlayerForFollowers?.id]);

  // Get sorted and filtered players based on current tab and sort（跟单榜用订阅自动跟单用户+下注信息）
  const getDisplayPlayers = useCallback(() => {
    const source = mainTab === "copyTrade" ? copyTradePlayers : allPlayers;
    let filtered = [...source];
    
    // Filter by sub tab - 高准确率榜显示赢家，低准确率榜显示输家
    if (subTab === 'high') {
      // 高准确率榜：只显示赢家（高胜率、正收益、有连胜）
      filtered = filtered
        .filter(p => p.isWinner === true || (p.winRate >= 55 && p.changePercent > 0))
        .sort((a, b) => {
          // 按连胜数排序，然后按胜率
          const streakDiff = (b.currentStreak || 0) - (a.currentStreak || 0);
          if (streakDiff !== 0) return streakDiff;
          return b.winRate - a.winRate;
        });
    } else {
      // 低准确率榜：只显示输家（低胜率、负收益、有连负）
      filtered = filtered
        .filter(p => p.isWinner === false || (p.winRate < 50 && p.changePercent < 0))
        .sort((a, b) => {
          // 按连负数排序，然后按胜率（从低到高）
          const streakDiff = (b.worstStreak || 0) - (a.worstStreak || 0);
          if (streakDiff !== 0) return streakDiff;
          return a.winRate - b.winRate;
        });
    }

    // Apply additional sort if specified
    switch (sortType) {
      case 'winRate':
        if (subTab === 'high') {
          filtered = filtered.sort((a, b) => b.winRate - a.winRate);
        } else {
          filtered = filtered.sort((a, b) => a.winRate - b.winRate);
        }
        break;
      case 'profit':
        if (subTab === 'high') {
          filtered = filtered.sort((a, b) => b.changePercent - a.changePercent);
        } else {
          filtered = filtered.sort((a, b) => a.changePercent - b.changePercent);
        }
        break;
      case 'followers':
        filtered = filtered.sort((a, b) => (b.followers || 0) - (a.followers || 0));
        break;
      default:
        // comprehensive - use default sorting from above
        break;
    }

    return filtered.slice(0, 20);
  }, [mainTab, allPlayers, copyTradePlayers, subTab, sortType]);

  // Fetch today history for a player
  const fetchTodayHistory = async (playerId: string, playerName: string, isVirtual: boolean) => {
    setIsLoadingHistory(true);
    setIsHistoryDialogOpen(true);
    
    const upcomingMatches = [
      { home: '皇家马德里', away: '巴塞罗那', matchTime: '21:00' },
      { home: '曼城', away: '利物浦', matchTime: '22:30' },
      { home: '拜仁慕尼黑', away: '多特蒙德', matchTime: '21:30' },
      { home: '巴黎圣日耳曼', away: '马赛', matchTime: '23:00' },
    ];
    
    const completedMatches = [
      { home: '曼联', away: '热刺', homeScore: 2, awayScore: 1 },
      { home: '阿森纳', away: '纽卡斯尔', homeScore: 3, awayScore: 0 },
    ];

    if (isVirtual) {
      const upcomingCount = Math.floor(Math.random() * 3) + 2;
      const completedCount = Math.floor(Math.random() * 2) + 1;
      
      const mockPredictions: TodayPrediction[] = [];
      
      for (let i = 0; i < upcomingCount; i++) {
        const match = upcomingMatches[i % upcomingMatches.length];
        const betAmount = Math.floor(Math.random() * 400) + 100;
        const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
        const isOverUnder = Math.random() > 0.5;
        const prediction = isOverUnder ? '大 2.5球' : '让分主胜 -0.5';
        mockPredictions.push({
          id: `upcoming-${playerId}-${i}`,
          match_id: `upcoming-${1000 + i}`,
          prediction: prediction,
          prediction_type: isOverUnder ? 'over_under' : 'handicap',
          bet_amount: betAmount,
          potential_payout: potentialPayout,
          result: null,
          actual_payout: null,
          created_at: new Date().toISOString(),
          home_team: match.home,
          away_team: match.away,
          home_logo: null,
          away_logo: null,
          home_score: null,
          away_score: null,
          match_status: 'NS'
        });
      }
      
      for (let i = 0; i < completedCount; i++) {
        const match = completedMatches[i % completedMatches.length];
        const isWin = Math.random() > 0.4;
        const betAmount = Math.floor(Math.random() * 400) + 100;
        const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
        const isOverUnder = Math.random() > 0.5;
        const prediction = isOverUnder ? '大 2.5球' : '让分主胜 -0.5';
        mockPredictions.push({
          id: `completed-${playerId}-${i}`,
          match_id: `completed-${2000 + i}`,
          prediction: prediction,
          prediction_type: isOverUnder ? 'over_under' : 'handicap',
          bet_amount: betAmount,
          potential_payout: potentialPayout,
          result: isWin ? 'win' : 'lose',
          actual_payout: isWin ? potentialPayout : 0,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          home_team: match.home,
          away_team: match.away,
          home_logo: null,
          away_logo: null,
          home_score: match.homeScore,
          away_score: match.awayScore,
          match_status: 'FT'
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

      if (!data || data.length === 0) {
        const upcomingCount = Math.floor(Math.random() * 3) + 2;
        const completedCount = Math.floor(Math.random() * 2) + 1;
        
        const mockPredictions: TodayPrediction[] = [];
        for (let i = 0; i < upcomingCount; i++) {
          const match = upcomingMatches[i % upcomingMatches.length];
          const betAmount = Math.floor(Math.random() * 400) + 100;
          const potentialPayout = betAmount * (Math.random() * 0.8 + 1.5);
          const isOverUnder = Math.random() > 0.5;
          const prediction = isOverUnder ? '大 2.5球' : '让分主胜 -0.5';
          mockPredictions.push({
            id: `upcoming-${playerId}-${i}`,
            match_id: `upcoming-${1000 + i}`,
            prediction: prediction,
            prediction_type: isOverUnder ? 'over_under' : 'handicap',
            bet_amount: betAmount,
            potential_payout: potentialPayout,
            result: null,
            actual_payout: null,
            created_at: new Date().toISOString(),
            home_team: match.home,
            away_team: match.away,
            home_logo: null,
            away_logo: null,
            home_score: null,
            away_score: null,
            match_status: 'NS'
          });
        }
        setSelectedPlayerHistory({ playerId, playerName, predictions: mockPredictions });
      } else {
        const predictionsData: TodayPrediction[] = data.map((pred: any) => ({
          id: pred.id,
          match_id: pred.match_id || '',
          prediction: pred.prediction || '',
          prediction_type: pred.prediction_type || 'over_under',
          bet_amount: pred.bet_amount || 0,
          potential_payout: pred.potential_payout || null,
          result: pred.result || null,
          actual_payout: pred.actual_payout || null,
          created_at: pred.created_at,
          home_team: pred.home_team || '',
          away_team: pred.away_team || '',
          home_logo: null,
          away_logo: null,
          home_score: pred.home_score || null,
          away_score: pred.away_score || null,
          match_status: pred.match_status || 'NS'
        }));
        setSelectedPlayerHistory({ playerId, playerName, predictions: predictionsData });
      }
    } catch (error) {
      console.error('Error fetching today history:', error);
      setSelectedPlayerHistory({ playerId, playerName, predictions: [] });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle copy trade from history
  const handleCopyTradeFromHistory = (pred: TodayPrediction) => {
    const player = (mainTab === "copyTrade" ? copyTradePlayers : allPlayers).find(p => p.id === selectedPlayerHistory?.playerId);
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

  // Confirm unlock
  const confirmUnlock = async () => {
    if (!unlockDialog) return;
    
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

  // Open prediction dialog (参考首页用户模型的开始预测界面)
  const openPredictionDialog = async () => {
    if (!user) {
      toast.warning(t('login_first') || '请先登录', {
        description: t('login_to_subscribe') || '登录后即可进行预测'
      });
      navigate('/auth');
      return;
    }
    
    setShowPredictionDialog(true);
    setSelectedMatchForPrediction(null);
    setIsLoadingPredictionMatches(true);
    
    try {
      // 获取今日比赛（带 odds_info）
      const today = new Date().toISOString().split('T')[0];
      const { data: matchesData, error } = await supabase
        .from('daily_matches')
        .select('*')
        .eq('date', today)
        .in('status_id', [1]) // 只获取未开始的比赛
        .not('odds_info', 'is', null) // 必须有赔率信息
        .order('match_time', { ascending: true })
        .limit(20);
      
      if (error) {
        console.error('Error fetching matches:', error);
        toast.error('获取比赛列表失败');
        setPredictionMatches([]);
      } else {
        setPredictionMatches(matchesData || []);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('获取比赛列表失败');
      setPredictionMatches([]);
    } finally {
      setIsLoadingPredictionMatches(false);
    }
  };

  // Open copy trade dialog for AI model（订阅后该 AI 新下注会自动以设定金额跟单）
  const openCopyTradeDialog = (modelId: string, modelName: string) => {
    if (!user) {
      toast.warning(t('login_first') || '请先登录', {
        description: t('login_to_subscribe') || '登录后即可订阅AI模型'
      });
      navigate('/auth');
      return;
    }
    // 仅支持同时跟单一个模型，已有订阅时仅提示
    if (subscribedAiIds.size >= 1 && !subscribedAiIds.has(modelId)) {
      toast.info(t('only_one_copy_trade_model') || '仅支持同时跟单一个模型，请先取消当前跟单后再选择其他。');
      return;
    }
    setCopyTradeModel({ id: modelId, name: modelName });
    setIsCopyTradeDialogOpen(true);
  };

  // 获取市场赔率（当选择比赛时）
  useEffect(() => {
    const fetchMarketOdds = async () => {
      if (!showPredictionDialog || !selectedMatchForPrediction) {
        setMarketOdds(null);
        return;
      }

      setIsLoadingMarketOdds(true);
      try {
        const matchId = selectedMatchForPrediction.match_id || selectedMatchForPrediction.mid;
        if (!matchId) {
          setMarketOdds(null);
          return;
        }

        const { data: analysesData, error } = await supabase
          .from('ai_match_analyses' as any)
          .select('bet_snapshot')
          .eq('match_id', matchId)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching market odds:', error);
          setMarketOdds(null);
          return;
        }

        if (analysesData) {
          const betSnapshot = (analysesData as any)?.bet_snapshot;
          if (betSnapshot?.allMarketOdds) {
            setMarketOdds(betSnapshot.allMarketOdds);
          } else {
            setMarketOdds(null);
          }
        } else {
          setMarketOdds(null);
        }
      } catch (error) {
        console.error('Unexpected error fetching market odds:', error);
        setMarketOdds(null);
      } finally {
        setIsLoadingMarketOdds(false);
      }
    };

    fetchMarketOdds();
  }, [showPredictionDialog, selectedMatchForPrediction]);

  // 提交预测
  const handleSubmitPrediction = async () => {
    if (!user || !selectedMatchForPrediction) return;
    
    if (manualBetType === 'handicap' && !manualPrediction) {
      toast.error('请选择预测选项');
      return;
    }
    
    if (!manualBetAmount || manualBetAmount <= 0) {
      toast.error('请输入投注金额');
      return;
    }

    setIsSubmittingBet(true);
    try {
      // 获取用户余额
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance, available_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceError || !balanceData) {
        toast.error('获取余额失败');
        return;
      }

      if (balanceData.available_balance < manualBetAmount) {
        toast.error('余额不足');
        return;
      }

      // 计算赔率
      let odds = 1.9;
      if (manualBetType === 'handicap') {
        const handicapOdds = marketOdds?.handicap?.find((h: any) => {
          const line = typeof h.line === 'number' ? h.line : parseFloat(String(h.line)) || 0;
          return line === manualHandicapLine;
        });
        if (handicapOdds) {
          odds = manualPrediction === 'HOME' ? handicapOdds.home : handicapOdds.away;
        }
      } else {
        const overUnderOdds = marketOdds?.overUnder?.find((ou: any) => {
          const line = typeof ou.line === 'number' ? ou.line : parseFloat(String(ou.line)) || 2.5;
          return line === manualOverUnderLine;
        });
        if (overUnderOdds) {
          odds = manualOverUnderPick === 'over' ? overUnderOdds.over : overUnderOdds.under;
        }
      }

      // 创建预测记录
      const matchId = selectedMatchForPrediction.match_id || selectedMatchForPrediction.mid;
      const { error: insertError } = await supabase
        .from('user_predictions')
        .insert({
          user_id: user.id,
          match_id: matchId,
          bet_type: manualBetType,
          prediction: manualBetType === 'handicap' 
            ? `${manualPrediction === 'HOME' ? '主胜' : '客胜'} ${manualHandicapLine >= 0 ? '+' : ''}${manualHandicapLine}`
            : `${manualOverUnderPick === 'over' ? '大' : '小'} ${manualOverUnderLine}`,
          bet_amount: manualBetAmount,
          odds: odds - 1, // 存储亚洲盘赔率
          handicap_line: manualBetType === 'handicap' ? manualHandicapLine : null,
          over_under_line: manualBetType === 'over_under' ? manualOverUnderLine : null,
          over_under_pick: manualBetType === 'over_under' ? manualOverUnderPick : null,
          result: 'pending',
        });

      if (insertError) {
        console.error('Error creating prediction:', insertError);
        toast.error('提交预测失败');
        return;
      }

      // 扣除余额
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          available_balance: balanceData.available_balance - manualBetAmount,
          locked_balance: (balanceData.locked_balance || 0) + manualBetAmount,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        toast.error('扣除余额失败');
        return;
      }

      toast.success('预测提交成功');
      setShowPredictionDialog(false);
      setSelectedMatchForPrediction(null);
      setManualPrediction('');
      setManualBetAmount('');
    } catch (error) {
      console.error('Error submitting prediction:', error);
      toast.error('提交预测失败');
    } finally {
      setIsSubmittingBet(false);
    }
  };

  // 辅助函数：安全获取队伍名称
  const safeGetTeamName = (match: any, side: 'home' | 'away'): string => {
    if (side === 'home') {
      return match.mhn || match.home_team_name || match.homeTeamName || '主队';
    } else {
      return match.man || match.away_team_name || match.awayTeamName || '客队';
    }
  };

  // 辅助函数：安全获取联赛名称
  const safeGetLeagueName = (match: any): string => {
    return match.tn || match.league_name || match.competition_name || '未知联赛';
  };

  // Handle copy trade for AI model：写入订阅表，后续由 Edge Function 按该 AI 新下注自动跟单（每笔使用此处设定的金额）
  const handleCopyTrade = async () => {
    if (!user) {
      toast.warning(t('login_first') || '请先登录', {
        description: t('login_to_subscribe') || '登录后即可订阅AI模型'
      });
      return;
    }

    if (!copyTradeModel) return;

    const stake = Math.round(Number(copyTradeAmount)) || 100;
    if (stake < 10 || stake > 10000) {
      toast.error(t('invalid_amount') || '金额无效', {
        description: t('stake_range_hint') || '每笔跟单金额须在 10～10000 猎人币之间'
      });
      return;
    }

    setIsCopyTrading(true);
    try {
      // 表 user_ai_copy_subscriptions 在迁移中新增，若类型未生成可用 as any
      const { error: upsertError } = await (supabase as any)
        .from("user_ai_copy_subscriptions")
        .upsert(
          {
            user_id: user.id,
            ai_id: copyTradeModel.id,
            stake_amount: stake,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,ai_id' }
        );

      if (upsertError) {
        throw upsertError;
      }

      toast.success(t('subscribe_success') || '订阅成功', {
        description: t('subscribed_model', { model: copyTradeModel.name, amount: stake }) || `已开启 ${copyTradeModel.name} 自动跟单，每笔 ${stake} 猎人币`
      });

      setSubscribedAiIds((prev) => new Set(prev).add(copyTradeModel.id));
      setIsCopyTradeDialogOpen(false);
      setCopyTradeModel(null);
      setCopyTradeAmount(100);
    } catch (error) {
      console.error('Copy trade error:', error);
      toast.error(t('subscribe_failed') || '订阅失败', {
        description: t('please_try_later') || '请稍后重试'
      });
    } finally {
      setIsCopyTrading(false);
    }
  };

  // 占位符预测（今日推荐无真实数据时的模拟项）不可写入数据库，避免 user_predictions 出现 upcoming-1001 等脏数据
  const isPlaceholderPrediction = (matchId: string) => /^(upcoming-|completed-)/.test(String(matchId ?? ''));

  // Confirm copy trade
  const confirmCopyTrade = async () => {
    if (!copyTradeDialog) return;
    
    const oldBalance = usdtBalance;
    
    if (copyBetAmount > usdtBalance) {
      toast.error('余额不足，无法订阅');
      return;
    }

    if (copyBetAmount < 10) {
      toast.error('最低订阅金额为 10 猎人币');
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
        const potentialPayout = copyBetAmount * parseFloat(odds);
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
          toast.error('订阅失败：' + error.message);
          return;
        }

        const result = data as { success: boolean; error?: string; new_balance?: number };
        
        if (!result.success) {
          toast.error(result.error || '订阅失败');
          return;
        }

        // 更新余额
        if (result.new_balance !== undefined) {
          setUsdtBalance(result.new_balance);
          newBalance = result.new_balance;
        }
      } else {
        // 演示模式：模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success('演示模式：订阅成功');
        setUsdtBalance(newBalance);
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

  // Generate mini chart path - more realistic profit curve
  const generateChartPath = (id: string, changePercent: number) => {
    const width = 100;
    const height = 32;
    const numPoints = 12;
    const seed = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const isPositive = changePercent >= 0;
    
    // Create more realistic price movements with momentum
    const points: number[] = [];
    let currentY = height / 2;
    let momentum = 0;
    
    for (let i = 0; i < numPoints; i++) {
      // Seeded random for consistency
      const rand1 = Math.sin(seed * (i + 1) * 0.1) * 0.5 + 0.5;
      const rand2 = Math.cos(seed * (i + 2) * 0.15) * 0.5 + 0.5;
      
      // Add trend direction
      const trendForce = isPositive ? -0.8 : 0.6;
      
      // Random walk with momentum
      const randomChange = (rand1 - 0.5) * 6;
      momentum = momentum * 0.3 + randomChange + trendForce;
      currentY += momentum;
      
      // Occasional larger moves (volatility)
      if (rand2 > 0.85) {
        currentY += (rand1 - 0.5) * 4;
      }
      
      // Clamp to bounds
      currentY = Math.max(6, Math.min(height - 6, currentY));
      points.push(currentY);
    }
    
    // Ensure end point reflects overall trend
    if (isPositive) {
      points[points.length - 1] = Math.min(points[points.length - 1], height * 0.25);
    } else {
      points[points.length - 1] = Math.max(points[points.length - 1], height * 0.75);
    }
    
    // Generate smooth curve path
    const pathPoints = points.map((y, i) => {
      const x = (i / (numPoints - 1)) * width;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    return pathPoints.join(' ');
  };

  const sortOptions = [
    { value: 'comprehensive', label: t('sort_comprehensive') || '综合排序' },
    { value: 'winRate', label: t('sort_win_rate') || '胜率排序' },
    { value: 'profit', label: t('sort_profit') || '收益排序' },
    { value: 'followers', label: t('sort_followers') || '跟单人数' },
  ];

  const mainTabs = [
    { value: 'ai', label: t('ai_prediction_board') || 'AI预测排行榜' },
    { value: 'accuracy', label: t('accuracy_board') || '预测者准确率' },
    { value: 'copyTrade', label: t('copy_trading_board') || '预测者跟单' },
  ];

  const getSubTabs = () => {
    if (mainTab === 'ai') {
      return [
        { value: 'high', label: t('all_participating_models') || '所有参赛模型' },
        { value: 'low', label: t('best_winning_model') || '最佳获胜模型' },
      ];
    }
    if (mainTab === 'copyTrade') {
      return [
        { value: 'high', label: t('hot_streak_predictor') || '预测者连红榜' },
        { value: 'low', label: t('cold_streak_predictor') || '预测者连黑榜' },
      ];
    }
    return [
      { value: 'high', label: t('hot_streak_board') || '高准确率榜' },
      { value: 'low', label: t('cold_streak_board') || '低准确率榜' },
    ];
  };

  const subTabs = getSubTabs();

  const timeFilters = [
    { value: 'day', label: t('time_day') || '日' },
    { value: 'week', label: t('time_week') || '周' },
    { value: 'month', label: t('time_month') || '月' },
  ];

  const renderAIModels = () => {
    // 使用从数据库获取的真实数据
    const modelsWithStats = aiModels.map(model => {
      const stats = aiModelsStats.get(model.id);
      
      // 如果有真实数据，使用真实数据；否则使用默认值
      const winRate = stats?.winRate ?? model.winRate ?? 0;
      const totalPredictions = stats?.totalPredictions ?? model.totalPredictions ?? 0;
      const correctPredictions = stats?.correctPredictions ?? model.correctPredictions ?? 0;
      const wrongPredictions = totalPredictions - correctPredictions;
      const profitAmount = stats?.profitAmount ?? 0;
      const changePercent = stats?.changePercent ?? model.changePercent ?? 0;
      
      // 计算粉丝数和点赞数（基于预测数，使用合理的比例）
      const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const baseFollowers = 500 + (seed % 500);
      const followers = totalPredictions > 0 
        ? Math.round(baseFollowers * (totalPredictions / 30)) // 根据预测数调整
        : Math.round(baseFollowers * 0.3);
      const likes = Math.round(followers * 0.4); // 点赞数约为粉丝数的40%
      
      return {
        ...model,
        winRate: Math.round(winRate * 10) / 10,
        changePercent,
        followers: Math.max(0, followers),
        likes: Math.max(0, likes),
        tradingDays: 30 + (seed % 60), // 保持稳定的交易天数
        totalPredictions,
        correctPredictions,
        wrongPredictions,
        profitAmount,
      };
    }).sort((a, b) => b.winRate - a.winRate);

    const winningModel = modelsWithStats[0];

    // 渲染"最佳获胜模型"子页面
    const renderBestWinningModel = () => (
      <div className="space-y-4">
        {/* Time Filter Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value as TimeFilter)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                  timeFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={t('time_range_utc8')}>
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t('stats_range')}：{getUTC8RangeLabelWithLocale(timeFilter, i18n.language)}</span>
          </div>
        </div>

        {/* Winning Model Section - Responsive layout */}
        <div className="space-y-3">
          {/* Top: Winning Model Card - Full width */}
          <Card className="relative overflow-hidden">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${getExpertImage(winningModel.id)})` }}
            />
            
            {/* Color Tint Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getColorTint(winningModel.id)}`} />
            
            {/* Dark gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            
            <CardContent className="p-4 relative z-10">
              <h3 className="text-xs font-bold mb-3 text-white/80">{t('winning_model') || '获胜模型'}</h3>
              
              <div className="flex items-start gap-4">
                {/* Left: Model Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <img 
                      src={getAIIcon(winningModel.id)} 
                      alt={winningModel.name} 
                      className="h-8 w-8"
                      style={winningModel.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                    />
                    <span className="text-lg font-bold text-white">{winningModel.displayName.split(' ')[0]}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-white/70">{t('win_rate_label') || '胜率'}</p>
                      <p className="text-3xl font-bold font-mono text-white">
                        {winningModel.winRate}%
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-[10px] text-white/70">{t('correct_predictions_label') || '正确预测'}</p>
                      <p className="text-lg font-bold font-mono text-success">
                        {winningModel.correctPredictions} / {winningModel.totalPredictions}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Right: Active Leagues */}
                <div className="flex-shrink-0">
                  <p className="text-[10px] text-white/70 mb-2">{t('active_matches') || '活跃比赛'}</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] text-white flex items-center gap-1">
                      <GoalIcon size={10} className="flex-shrink-0" />
                      <span>{t('league_premier_league') || 'Premier League'}</span>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] text-white flex items-center gap-1">
                      <GoalIcon size={10} className="flex-shrink-0" />
                      <span>{t('league_la_liga') || 'La Liga'}</span>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] text-white flex items-center gap-1">
                      <GoalIcon size={10} className="flex-shrink-0" />
                      <span>{t('league_bundesliga') || 'Bundesliga'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom: Model Bar Cards - Horizontal scroll with animation */}
          <Card className="relative overflow-hidden bg-card/50 border-border/30">
            <CardContent className="p-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-end min-h-[140px]">
                {modelsWithStats.map((model, index) => {
                  // Get model specific colors for bars
                  const getModelBarColor = (modelId: string) => {
                    switch(modelId) {
                      case 'deepseek': return 'bg-[hsl(217,91%,60%)]';
                      case 'hunsoccer-max':
                      case 'hunsoccermax': return 'bg-[hsl(38,92%,50%)]';
                      case 'grok': return 'bg-[hsl(210,15%,55%)]';
                      case 'gemini': return 'bg-[hsl(250,75%,60%)]';
                      case 'gpt5': return 'bg-[hsl(158,68%,50%)]';
                      case 'claude': return 'bg-[hsl(14,92%,60%)]';
                      default: return 'bg-primary';
                    }
                  };
                  
                  const maxHeight = 100;
                  const minHeight = 35;
                  const heightRatio = Math.min(model.winRate / 100, 1);
                  const heightPx = heightRatio * (maxHeight - minHeight) + minHeight;
                  
                  return (
                    <motion.div 
                      key={model.id} 
                      className="flex flex-col items-center gap-1 flex-1 min-w-[50px]"
                      onClick={() => navigate(`/models?model=${model.id}`)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <motion.div 
                        className="text-[10px] font-mono font-bold text-foreground"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.3 }}
                      >
                        {model.winRate.toFixed(1)}%
                      </motion.div>
                      <motion.div 
                        className={`w-full rounded-md relative flex items-end justify-center pb-2 cursor-pointer hover:opacity-90 ${getModelBarColor(model.id)}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: heightPx, opacity: 1 }}
                        transition={{ 
                          delay: index * 0.1, 
                          duration: 0.5, 
                          ease: [0.34, 1.56, 0.64, 1] // Spring-like easing
                        }}
                      >
                        <motion.img 
                          src={getAIIcon(model.id)} 
                          alt={model.name}
                          className="h-5 w-5 object-contain"
                          style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.4, duration: 0.3 }}
                        />
                      </motion.div>
                      <motion.div 
                        className="text-[8px] text-center font-medium text-muted-foreground truncate w-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                      >
                        {model.displayName.split(' ')[0].substring(0, 6)}...
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Note */}
        <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/30">
          <p className="text-[10px] text-muted-foreground">
            <span className="font-bold text-foreground">{t('note') || '注意'}：</span>
            {t('stats_note') || '所有统计数据仅反映已完成的比赛预测。直播比赛预测在比赛结束前不计入统计。'}
          </p>
        </div>
      </div>
    );

    // 渲染"所有参赛模型"子页面
    const renderAllModels = () => (
      <div className="space-y-4">
        {/* Time Filter Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value as TimeFilter)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                  timeFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={t('time_range_utc8')}>
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t('stats_range')}：{getUTC8RangeLabelWithLocale(timeFilter, i18n.language)}</span>
          </div>
        </div>

        {/* AI Model Cards List */}
        {modelsWithStats.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card/50 rounded-lg px-3 pt-3 pb-2 border border-border/30"
          >
            {/* Top: Icon + Name + Like Button + Action Buttons */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="relative flex-shrink-0">
                <div 
                  className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/models?model=${model.id}`)}
                >
                  <img src={getAIIcon(model.id)} alt={model.name} className="w-6 h-6 object-contain" />
                </div>
                {index < 3 && (
                  <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    index === 0 ? 'bg-yellow-500 text-yellow-950' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    'bg-amber-600 text-amber-950'
                  }`}>
                    {index + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-bold text-sm text-foreground truncate flex items-center gap-1 cursor-pointer"
                  onClick={() => navigate(`/models?model=${model.id}`)}
                >
                  {model.name}
                  <button 
                    className={`flex items-center gap-0.5 px-1 py-0.5 transition-colors ${
                      likedModels.has(model.id)
                        ? 'text-primary hover:text-primary/80'
                        : 'text-muted-foreground hover:text-primary'
                    } ${isLiking.has(model.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={(e) => handleAIModelLike(model.id, e)}
                    disabled={isLiking.has(model.id)}
                    title={likedModels.has(model.id) ? '取消点赞' : '点赞'}
                  >
                    <ThumbsUp className={`h-3 w-3 ${likedModels.has(model.id) ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">{likeCounts.get(model.id) ?? 0}</span>
                  </button>
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {t('predicted_matches', { count: model.totalPredictions }) || `预测${model.totalPredictions}场`}
                </p>
              </div>
              {/* Top Right Action Buttons */}
              <div className="flex items-center gap-1">
                <button 
                  className="px-1.5 py-0.5 text-[9px] font-medium bg-muted/50 hover:bg-muted rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/model/${model.id}`);
                  }}
                >
                  {t('history_predictions') || '历史预测'}
                </button>
                {subscribedAiIds.has(model.id) ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">{t('subscribed') || '已订阅'}</span>
                    <button
                      className="px-1.5 py-0.5 text-[9px] font-medium bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelCopyTrade(model.id);
                      }}
                      disabled={isCancellingCopy === model.id}
                    >
                      {isCancellingCopy === model.id ? (t('cancelling') || '取消中…') : (t('cancel_copy_trade') || '取消跟单')}
                    </button>
                  </div>
                ) : (
                  <button
                    className="px-1.5 py-0.5 text-[9px] font-medium bg-warning hover:bg-warning/90 text-warning-foreground rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCopyTradeDialog(model.id, model.name);
                    }}
                  >
                    {t('auto_copy_trade') || '自动跟单'}
                  </button>
                )}
              </div>
            </div>

            {/* Middle: Profit Rate + Profit Amount + Chart */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                {/* Profit Rate - Same Line */}
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap w-10">
                    {t('profit_rate_label') || '盈利率'}
                  </span>
                  <span className={`text-lg font-bold tracking-tight ${model.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {model.changePercent >= 0 ? '+' : ''}{model.changePercent.toFixed(2)}%
                  </span>
                </div>
                {/* Profit Amount - Same Line */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap w-10">
                    {t('profit_amount_label') || '盈利金额'}
                  </span>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${model.profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {model.profitAmount >= 0 ? '+' : ''}{model.profitAmount.toLocaleString()}
                    <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3 h-3" />
                  </span>
                </div>
              </div>
              
              {/* Mini Chart + Win Rate */}
              <div className="w-16 flex-shrink-0 flex flex-col items-end">
                <div className="w-16 h-8">
                <svg width="100" height="32" viewBox="0 0 100 32" className="w-full h-full">
                  <path
                    d={generateChartPath(model.id, model.changePercent)}
                    fill="none"
                    stroke={model.changePercent >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                </div>
                {/* Win Rate below chart */}
                <div className="text-[9px] text-success font-medium mt-0.5">
                  {model.winRate}%
                </div>
              </div>
            </div>

            {/* Bottom Stats: Correct, Wrong, Followers */}
            <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1.5 pb-0 border-t border-border/20">
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                <span className="flex items-center gap-0.5 text-success flex-shrink-0">
                  <CheckCircle className="h-2.5 w-2.5" />
                  <span className="truncate">{model.correctPredictions}</span>
                </span>
                <span className="flex items-center gap-0.5 text-destructive flex-shrink-0">
                  <XCircle className="h-2.5 w-2.5" />
                  <span className="truncate">{model.wrongPredictions}</span>
                </span>
              </div>
              <button 
                className="flex items-center gap-0.5 flex-shrink-0 text-[9px] font-medium hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModelForFollowers(model.id);
                  setShowFollowersDialog(true);
                }}
              >
                <Users className="h-2.5 w-2.5" />
                <span className="truncate">{model.followers || 0}</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    );

    // 根据subTab返回不同内容
    return subTab === 'high' ? renderAllModels() : renderBestWinningModel();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Challenge AI Banner - Compact on mobile with proper spacing */}
      <div className="w-full px-2 pt-4 sm:pt-6">
        <ChallengeAIBanner />
      </div>

      {/* Main Tabs - OKX Style */}
      <div className="sticky top-[50px] z-30 bg-background border-b border-border/30">
        <div className="flex items-center gap-2 px-3 pt-2 pb-1.5 overflow-x-auto scrollbar-hide">
          {mainTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setMainTab(tab.value as MainTab)}
              className={`relative py-2 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                mainTab === tab.value
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.label}
              {mainTab === tab.value && (
                <motion.div
                  layoutId="mainTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs - Show for all tabs */}
      <div className="sticky top-[90px] z-20 bg-background">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
          {subTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSubTab(tab.value as SubTab)}
              className={`relative text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                subTab === tab.value
                  ? 'text-foreground font-bold'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.label}
              {subTab === tab.value && (
                <motion.div
                  layoutId="subTabIndicator"
                  className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Time Filter & All Predictors - For accuracy and copyTrade tabs */}
      {(mainTab === 'accuracy' || mainTab === 'copyTrade') && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink flex-wrap">
            <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
              {timeFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value as TimeFilter)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
                    timeFilter === filter.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-muted/30 text-muted-foreground rounded flex-shrink-0">
              TOP10
            </span>
            <span className="text-[9px] text-muted-foreground" title={t('time_range_utc8')}>
              {t('stats_range')}：{getUTC8RangeLabelWithLocale(timeFilter, i18n.language)}
            </span>
          </div>
          <button 
            className="px-2 py-0.5 text-[10px] font-medium bg-muted/50 hover:bg-muted rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0"
            onClick={() => setShowAllPredictors(true)}
          >
            <Users className="h-3 w-3" />
            <span className="hidden xs:inline">{t('all_predictors') || '全部预测者'}</span>
            <span className="xs:hidden">{t('all_short') || '全部'}</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="px-3 py-1.5 space-y-2 pb-24">
        <AnimatePresence mode="wait">
          {mainTab !== 'ai' && (mainTab === 'copyTrade' ? isLoadingCopyTrade : isLoading) ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key={`${mainTab}-${subTab}-${sortType}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {mainTab === 'ai' ? (
                renderAIModels()
              ) : mainTab === 'copyTrade' && getDisplayPlayers().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">{t('no_copy_trade_subscribers') || '暂无订阅自动跟单的用户'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('no_copy_trade_subscribers_hint') || '在 AI 预测排行榜中点击「自动跟单」订阅后，将显示在此'}</p>
                </div>
              ) : (
                getDisplayPlayers().map((player, index) => (
                  <PlayerCardOKX
                    key={player.id}
                    player={player}
                    index={index}
                    generateChartPath={generateChartPath}
                    onClick={() => navigate(`/player/${player.id}`)}
                    subTab={subTab}
                    mainTab={mainTab}
                    onFollowersClick={(player) => {
                      setSelectedPlayerForFollowers(player);
                      setShowPlayerFollowersDialog(true);
                    }}
                    onHistoryClick={fetchTodayHistory}
                    onPredictionClick={openPredictionDialog}
                    onFollowPlayerClick={(player) => {
                      setPlayerToFollow(player);
                      setShowFollowPlayerDialog(true);
                    }}
                    aiBenchmark={aiBenchmark}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* All Predictors Dialog */}
      <Dialog open={showAllPredictors} onOpenChange={setShowAllPredictors}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] p-0 bg-card border-primary/30 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/30">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-1 h-5 bg-primary rounded-full" />
              {subTab === 'high' 
                ? (t('high_accuracy_all_predictors') || '高准确率榜 - 全部预测者')
                : (t('low_accuracy_all_predictors') || '低准确率榜 - 全部预测者')}
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('search_predictor_name') || '搜索预测者名称...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-primary/30 focus:border-primary"
              />
            </div>
          </div>
          
          {/* Predictors List（跟单榜时仅显示订阅自动跟单的用户） */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[55vh] space-y-2">
            {(mainTab === 'copyTrade' ? copyTradePlayers : allPlayers)
              .filter(player => 
                player.displayName.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .sort((a, b) => subTab === 'high' 
                ? (b.currentStreak || 0) - (a.currentStreak || 0)
                : (b.worstStreak || 0) - (a.worstStreak || 0)
              )
              .map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => {
                    setShowAllPredictors(false);
                    navigate(`/player/${player.id}`);
                  }}
                  className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/40 cursor-pointer transition-all"
                >
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-500 text-yellow-950' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    index === 2 ? 'bg-amber-600 text-amber-950' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                    <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* Name & Streak */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">{player.displayName}</h4>
                    <p className={`text-xs ${subTab === 'high' ? 'text-success' : 'text-destructive'}`}>
                      {subTab === 'high' 
                        ? (t('consecutive_correct') || '连续正确') + ' '
                        : (t('consecutive_wrong') || '连续错误') + ' '}
                      <span className="font-bold">
                        {subTab === 'high' ? (player.currentStreak || 0) : (player.worstStreak || 0)}
                      </span>
                    </p>
                  </div>
                  
                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {t('win_rate_prefix') || '胜率'} <span className="text-success font-bold">{player.winRate}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-0.5">
                      {t('profit_label') || '盈利'} <span className={`font-bold ${player.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {player.changePercent >= 0 ? '+' : ''}{Math.round(player.profitAmount || 0)}
                      </span>
                      <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3.5 h-3.5" />
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Model Followers/Subscribers Dialog */}
      <Dialog open={showFollowersDialog} onOpenChange={setShowFollowersDialog}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] p-0 bg-card border-primary/30 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/30">
            <DialogTitle className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold">
                  {selectedModelForFollowers && (
                    <>
                      <img 
                        src={getAIIcon(selectedModelForFollowers)} 
                        alt="" 
                        className="h-5 w-5"
                      />
                      {aiModels.find(m => m.id === selectedModelForFollowers)?.name || selectedModelForFollowers.toUpperCase()} - {t('subscribers') || '订阅用户'}
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('updated_at') || '更新于'} {new Date().toLocaleString('zh-CN', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1 text-success">
                <span className="text-xs text-muted-foreground">{t('total_profit_rate') || '总收益率'}</span>
                <span className="text-lg font-bold">+85.0%</span>
                <TrendingUp className="h-4 w-4" />
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Table Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-b border-border/30">
            <span>{t('rank') || '排名'}</span>
            <span>{t('player_profit_volume') || '玩家收益 | 带单规模'}</span>
          </div>
          
          {/* Subscribers List - 暂无真实数据 */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[55vh] space-y-3 pt-3">
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('no_followers') || '暂无跟单者'}
            </div>
          </div>
          
          {/* Close Button */}
          <div className="p-4 border-t border-border/30">
            <button 
              onClick={() => setShowFollowersDialog(false)}
              className="w-full py-3 bg-muted/50 hover:bg-muted rounded-lg text-foreground font-medium transition-colors"
            >
              {t('close') || '关闭'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Player Followers Dialog */}
      <Dialog open={showPlayerFollowersDialog} onOpenChange={setShowPlayerFollowersDialog}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] p-0 bg-card border-primary/30 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/30">
            <DialogTitle className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold">
                  {selectedPlayerForFollowers && (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={selectedPlayerForFollowers.avatarUrl} alt={selectedPlayerForFollowers.displayName} />
                        <AvatarFallback className="text-xs">{selectedPlayerForFollowers.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {selectedPlayerForFollowers.displayName} - {t('followers') || '跟单者'}
                    </>
                  )}
    </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('updated_at') || '更新于'} {new Date().toLocaleString('zh-CN', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {selectedPlayerForFollowers && (
                <div className="flex items-center gap-1 text-success">
                  <span className="text-xs text-muted-foreground">{t('win_rate_prefix') || '胜率'}</span>
                  <span className="text-lg font-bold">{selectedPlayerForFollowers.winRate}%</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Table Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-b border-border/30">
            <span>{t('rank') || '排名'}</span>
            <span>{t('player_profit_volume') || '玩家收益 | 带单规模'}</span>
          </div>
          
          {/* Followers List - 真实数据 */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[55vh] space-y-3 pt-3">
            {isLoadingPlayerFollowers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : playerFollowersList.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('no_followers') || '暂无跟单者'}
              </div>
            ) : (
              playerFollowersList.map((follower, index) => (
                <motion.div
                  key={follower.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 flex-shrink-0 flex justify-center">
                    {index === 0 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                        <Trophy className="h-4 w-4 text-yellow-900" />
                      </div>
                    ) : index === 1 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
                        <Trophy className="h-4 w-4 text-gray-700" />
                      </div>
                    ) : index === 2 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
                        <Trophy className="h-4 w-4 text-amber-900" />
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage src={follower.avatar} alt={follower.name} />
                    <AvatarFallback>{follower.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base text-foreground truncate">{follower.name || t('anonymous')}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t('followed_days', { count: follower.days }) || `跟单${follower.days}天`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold flex items-center justify-end gap-0.5 ${follower.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {follower.profit >= 0 ? '+' : ''}{follower.profit.toFixed(2)}
                      <img src={hunterCoinIcon} alt="HC" className="w-4 h-4" />
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center justify-end gap-0.5">
                      {follower.totalVolume.toFixed(2)}
                      <img src={hunterCoinIcon} alt="HC" className="w-3.5 h-3.5" />
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          
          {/* Close Button */}
          <div className="p-4 border-t border-border/30">
            <button 
              onClick={() => setShowPlayerFollowersDialog(false)}
              className="w-full py-3 bg-muted/50 hover:bg-muted rounded-lg text-foreground font-medium transition-colors"
            >
              {t('close') || '关闭'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow Player Confirmation Dialog */}
      <Dialog open={showFollowPlayerDialog} onOpenChange={setShowFollowPlayerDialog}>
        <DialogContent className="max-w-[280px] p-4 gap-4">
          <DialogHeader className="text-center">
            <DialogTitle className="text-base font-bold text-center">
              {t('follow_player_title') || '关注玩家'}
            </DialogTitle>
          </DialogHeader>
          
          {playerToFollow && (
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-14 h-14 border-2 border-border">
                <AvatarImage src={playerToFollow.avatarUrl} alt={playerToFollow.displayName} />
                <AvatarFallback className="text-lg">{playerToFollow.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground text-center">
                {t('follow_player_confirm', { name: playerToFollow.displayName }) || `确定要关注 ${playerToFollow.displayName} 吗？`}
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowFollowPlayerDialog(false)}
            >
              {t('cancel') || '取消'}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (playerToFollow) {
                  const displayName = playerToFollow.displayName || t('prediction_player') || '该玩家';
                  toast.success(t('follow_success', { name: displayName }) || `已关注 ${displayName}`);
                }
                setShowFollowPlayerDialog(false);
                setPlayerToFollow(null);
              }}
            >
              {t('confirm') || '确定'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-sm p-0 gap-0">
          {/* Header - Clean & Simple */}
          <div className="px-4 py-3 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src={(mainTab === "copyTrade" ? copyTradePlayers : allPlayers).find(p => p.id === selectedPlayerHistory?.playerId)?.avatarUrl} />
                  <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
                    {selectedPlayerHistory?.playerName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-base font-bold">{(() => {
                    const player = (mainTab === "copyTrade" ? copyTradePlayers : allPlayers).find(p => p.id === selectedPlayerHistory?.playerId);
                    return player ? (player.displayName.length > 5 
                      ? player.displayName.substring(0, 3) + '***' + player.displayName.slice(-4) 
                      : player.displayName) : (selectedPlayerHistory?.playerName || '');
                  })()}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {(() => {
                      const player = (mainTab === "copyTrade" ? copyTradePlayers : allPlayers).find(p => p.id === selectedPlayerHistory?.playerId);
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
                              {t('free') || '免费'}
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

      {/* Copy Trade Dialog */}
      <Dialog open={!!copyTradeDialog} onOpenChange={() => setCopyTradeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {t('one_click_copy') || '一键跟单'}
            </DialogTitle>
          </DialogHeader>
          
          {copyTradeDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10 border-2 border-primary/30">
                  <AvatarImage src={copyTradeDialog.player.avatarUrl} />
                  <AvatarFallback>{copyTradeDialog.player.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{copyTradeDialog.player.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('win_rate')}: <span className="text-success font-medium">{copyTradeDialog.player.winRate.toFixed(1)}%</span>
                  </p>
                </div>
              </div>
              
              {copyTradeDialog.prediction && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-sm font-semibold mb-2">{copyTradeDialog.prediction.home_team} vs {copyTradeDialog.prediction.away_team}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('prediction')}: <span className="font-medium text-foreground">{copyTradeDialog.prediction.prediction}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('copy_amount') || '跟单金额'}</label>
                <div className="flex gap-2">
                  {[100, 200, 500, 1000].map((amount) => (
                    <Button
                      key={amount}
                      variant={copyBetAmount === amount ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCopyBetAmount(amount)}
                      className="flex-1"
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCopyTradeDialog(null)}
                >
                  {t('cancel') || '取消'}
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmCopyTrade}
                  disabled={isCopying}
                >
                  {isCopying ? (t('copying') || '跟单中...') : (t('confirm_copy') || '确认跟单')}
                </Button>
              </div>
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
                  <Avatar className="w-12 h-12 border-2 border-primary/30">
                    <AvatarImage src={unlockDialog.player.avatarUrl} />
                    <AvatarFallback>{unlockDialog.player.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-base">{unlockDialog.player.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('win_rate')}: <span className="text-success font-medium">{unlockDialog.player.winRate.toFixed(1)}%</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 内容 */}
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <Lock className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold mb-1">{t('unlock_prediction') || '解锁预测'}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('unlock_prediction_desc') || '支付猎人币后即可查看完整预测信息'}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">{t('unlock_price') || '解锁价格'}</div>
                  <div className="flex items-center gap-2">
                    <img src={hunterCoinIcon} alt="Hunter Coin" className="w-6 h-6" />
                    <span className="text-xl font-bold text-foreground">{unlockDialog.player.unlockPrice ?? 0}</span>
                    <span className="text-xs text-muted-foreground">猎人币</span>
                  </div>
                  {user && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {t('current_balance') || '当前余额'}: <span className="font-medium text-foreground">{usdtBalance}</span> 猎人币
                    </div>
                  )}
                </div>
                
                {unlockDialog.prediction && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="text-xs text-muted-foreground mb-1">{t('match') || '比赛'}</div>
                    <div className="text-sm font-semibold">
                      {unlockDialog.prediction.home_team} vs {unlockDialog.prediction.away_team}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 底部按钮 */}
              <div className="p-4 border-t border-border/50 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setUnlockDialog(null)}
                >
                  {t('cancel') || '取消'}
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmUnlock}
                  disabled={isUnlocking || (user && usdtBalance < (unlockDialog.player.unlockPrice ?? 0))}
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('unlocking') || '解锁中...'}
                    </>
                  ) : (
                    t('confirm_unlock') || '确认解锁'
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Model Copy Trade Dialog */}
      <Dialog open={isCopyTradeDialogOpen} onOpenChange={setIsCopyTradeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-warning" />
              订阅 {copyTradeModel?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Model Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-background p-1.5 border border-border/40">
                <img 
                  src={copyTradeModel ? (() => {
                    const model = aiModels.find(m => m.id === copyTradeModel.id);
                    if (!model) return '';
                    switch(model.id) {
                      case 'deepseek': return deepseekIcon;
                      case 'gpt5': return gpt5Icon;
                      case 'claude': return claudeIcon;
                      case 'gemini': return geminiIcon;
                      case 'grok': return grokIcon;
                      case 'hunsoccermax': return hunsoccerIcon;
                      default: return deepseekIcon;
                    }
                  })() : ''} 
                  alt={copyTradeModel?.name || ''} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="font-semibold text-sm">{copyTradeModel?.name}</p>
                <p className="text-xs text-muted-foreground">跟随AI模型的下一场预测</p>
              </div>
            </div>
            
            {/* Amount Input - 每笔跟单金额，由定时任务在该 AI 新下注时自动使用 */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('stake_per_bet_label') || '每笔跟单金额'} (猎人币)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[50, 100, 200, 500].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCopyTradeAmount(amount)}
                    className={`py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                      copyTradeAmount === amount
                        ? 'bg-warning text-warning-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {amount}<img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={copyTradeAmount}
                onChange={(e) => setCopyTradeAmount(Math.min(10000, Math.max(10, parseInt(e.target.value) || 0)))}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                placeholder="10～10000"
                min={10}
                max={10000}
              />
            </div>
            
            {/* Info Note */}
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-xs text-warning">
                {t('ai_copy_trade_note') || '订阅后，该 AI 每次新下注时系统将自动以您设置的金额跟单（仅让球/大小球）'}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsCopyTradeDialogOpen(false)}
              className="flex-1 py-2.5 text-sm font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              {t('cancel') || '取消'}
            </button>
            <button
              onClick={handleCopyTrade}
              disabled={isCopyTrading || copyTradeAmount < 10 || copyTradeAmount > 10000}
              className="flex-1 py-2.5 text-sm font-medium rounded-md bg-warning text-warning-foreground hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCopyTrading ? (
                <>
                  <div className="w-4 h-4 border-2 border-warning-foreground/30 border-t-warning-foreground rounded-full animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  确认订阅
                </>
              )}
            </button>
          </div>
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
                    <AvatarImage src={(mainTab === "copyTrade" ? copyTradePlayers : allPlayers).find(p => p.displayName === copySuccess.playerName)?.avatarUrl} />
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
                          +{(copySuccess.betAmount * parseFloat(copySuccess.odds || '1')).toFixed(0)}
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

      {/* 预测对话框（参考首页用户模型的开始预测界面） */}
      <Dialog open={showPredictionDialog} onOpenChange={(open) => {
        setShowPredictionDialog(open);
        if (!open) {
          setSelectedMatchForPrediction(null);
          setManualPrediction('');
          setManualBetAmount('');
        }
      }}>
        <DialogContent className="sm:max-w-md w-[calc(100%-24px)] max-w-[360px] max-h-[80vh] p-0 gap-0 bg-background border-border rounded-xl overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-sm font-medium text-foreground">
              {selectedMatchForPrediction ? '人工下注' : '选择比赛'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-60px)] overscroll-contain">
            {/* Step 1: Match Selection */}
            {!selectedMatchForPrediction ? (
              <div className="p-3 space-y-2">
                {isLoadingPredictionMatches ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    加载中...
                  </div>
                ) : predictionMatches.length > 0 ? (
                  predictionMatches.map((match: any) => (
                    <div
                      key={match.match_id || match.mid}
                      className="p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors border border-border hover:border-primary/30"
                      onClick={() => {
                        setSelectedMatchForPrediction(match);
                        setManualPrediction('');
                      }}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                          {safeGetTeamName(match, 'home')}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">vs</span>
                        <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                          {safeGetTeamName(match, 'away')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {safeGetLeagueName(match)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('no_matches_available') || '暂无可用比赛'}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Betting Options */
              <div className="p-4 space-y-3">
                {/* Match Header */}
                <div className="text-center pb-3 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">{safeGetLeagueName(selectedMatchForPrediction)}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{safeGetTeamName(selectedMatchForPrediction, 'home')}</span>
                    <span className="text-xs text-muted-foreground shrink-0">vs</span>
                    <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{safeGetTeamName(selectedMatchForPrediction, 'away')}</span>
                  </div>
                </div>

                {/* Handicap Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">让分</span>
                  {(() => {
                    if (isLoadingMarketOdds) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          加载中...
                        </div>
                      );
                    }

                    if (!marketOdds?.handicap || marketOdds.handicap.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无让分赔率数据
                        </div>
                      );
                    }

                    const firstHandicap = marketOdds.handicap[0];
                    const handicapLine = typeof firstHandicap.line === 'number' ? firstHandicap.line : parseFloat(String(firstHandicap.line)) || 0;
                    const homeOdds = firstHandicap.home;
                    const awayOdds = firstHandicap.away;
                    const formatLine = (line: number | string): string => {
                      if (typeof line === 'number') {
                        return line < 0 ? line.toString() : line > 0 ? `+${line}` : '0';
                      }
                      return String(line);
                    };

                    return (
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === handicapLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('handicap'); 
                            setManualPrediction('HOME'); 
                            setManualHandicapLine(handicapLine); 
                          }}
                          disabled={!homeOdds || homeOdds <= 0}
                        >
                          {manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === handicapLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium truncate">{safeGetTeamName(selectedMatchForPrediction, 'home')}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{formatLine(firstHandicap.line)}</span>
                          </div>
                          {homeOdds && homeOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === handicapLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, homeOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === handicapLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('handicap'); 
                            setManualPrediction('AWAY'); 
                            setManualHandicapLine(handicapLine); 
                          }}
                          disabled={!awayOdds || awayOdds <= 0}
                        >
                          {manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === handicapLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium truncate">{safeGetTeamName(selectedMatchForPrediction, 'away')}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{formatLine(typeof firstHandicap.line === 'number' ? -firstHandicap.line : `-${firstHandicap.line}`)}</span>
                          </div>
                          {awayOdds && awayOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === handicapLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, awayOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Over/Under Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">大小球</span>
                  {(() => {
                    if (isLoadingMarketOdds) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          加载中...
                        </div>
                      );
                    }

                    if (!marketOdds?.overUnder || marketOdds.overUnder.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无大小球赔率数据
                        </div>
                      );
                    }

                    const firstOverUnder = marketOdds.overUnder[0];
                    const overUnderLine = typeof firstOverUnder.line === 'number' ? firstOverUnder.line : parseFloat(String(firstOverUnder.line)) || 2.5;
                    const overOdds = firstOverUnder.over;
                    const underOdds = firstOverUnder.under;

                    return (
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('over_under'); 
                            setManualOverUnderPick('over'); 
                            setManualOverUnderLine(overUnderLine); 
                          }}
                          disabled={!overOdds || overOdds <= 0}
                        >
                          {manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium">大球 {overUnderLine}</span>
                          {overOdds && overOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, overOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('over_under'); 
                            setManualOverUnderPick('under'); 
                            setManualOverUnderLine(overUnderLine); 
                          }}
                          disabled={!underOdds || underOdds <= 0}
                        >
                          {manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium">小球 {overUnderLine}</span>
                          {underOdds && underOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, underOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Bet Amount Input */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">投注猎人币</span>
                  <div className="flex items-center gap-1.5">
                    <img src={hunterCoinIcon} alt="" className="w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      type="number"
                      min={1}
                      value={manualBetAmount === '' ? '' : manualBetAmount}
                      placeholder="输入金额"
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === '') {
                          setManualBetAmount('');
                          return;
                        }
                        const value = parseInt(inputValue);
                        if (isNaN(value)) {
                          return;
                        }
                        setManualBetAmount(Math.max(1, value));
                      }}
                      className="w-20 sm:w-24 h-8 sm:h-9 px-2 rounded bg-secondary/50 border border-border text-right text-sm font-mono focus:outline-none focus:border-primary transition-colors placeholder:text-xs placeholder:sm:text-sm placeholder:text-muted-foreground placeholder:font-sans"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium"
                  onClick={handleSubmitPrediction}
                  disabled={isSubmittingBet || (manualBetType === 'handicap' && !manualPrediction)}
                >
                  {isSubmittingBet ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  确认预测{manualBetAmount !== '' ? ` · ${manualBetAmount}` : ''}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// OKX-style Player Card Component - Matching AI card layout
interface PlayerCardOKXProps {
  player: PlayerData;
  index: number;
  generateChartPath: (id: string, changePercent: number) => string;
  onClick: () => void;
  subTab: SubTab;
  mainTab: MainTab;
  onFollowersClick: (player: PlayerData) => void;
  onHistoryClick: (playerId: string, playerName: string, isVirtual: boolean) => void;
  onPredictionClick?: () => void; // 预测按钮点击处理
  onFollowPlayerClick: (player: PlayerData) => void;
  aiBenchmark: { totalPredictions: number; winRate: number; profitAmount: number };
}

const PlayerCardOKX = ({ player, index, generateChartPath, onClick, subTab, mainTab, onFollowersClick, onHistoryClick, onPredictionClick, onFollowPlayerClick, aiBenchmark }: PlayerCardOKXProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPositive = player.changePercent >= 0;
  // 达标：比赛场次、胜率、金额都严格大于 AI 最佳模型
  const isQualified = player.totalPredictions > aiBenchmark.totalPredictions && player.winRate > aiBenchmark.winRate && (player.profitAmount ?? 0) > aiBenchmark.profitAmount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="bg-card/50 rounded-lg p-3 border border-border/30 cursor-pointer active:scale-[0.99] transition-transform relative overflow-hidden"
    >
      {/* Qualified Stamp - 已达标 */}
      {isQualified && (
        <div className="absolute top-1/2 right-24 -translate-y-1/2 rotate-[-12deg] pointer-events-none z-10">
          <div className="relative">
            {/* Outer glow effect */}
            <div className="absolute inset-0 blur-[2px] bg-success/30 rounded scale-110" />
            {/* Stamp container */}
            <div className="relative px-2 py-0.5 border-2 border-success rounded bg-success/15 backdrop-blur-[1px]">
              <span className="text-success font-black text-[10px] tracking-wide whitespace-nowrap" style={{ textShadow: '0 0 4px hsl(var(--success) / 0.6)' }}>
                {t('qualified_stamp') || '已达标'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top: Avatar + Name + Streak Badge + Action Buttons */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-shrink-0">
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src={player.avatarUrl} alt={player.displayName} />
            <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          {index < 3 && (
            <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              index === 0 ? 'bg-yellow-500 text-yellow-950' :
              index === 1 ? 'bg-gray-400 text-gray-900' :
              'bg-amber-600 text-amber-950'
            }`}>
              {index + 1}
            </div>
          )}
          {/* Follow Player Button - simple + icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFollowPlayerClick(player);
            }}
            className="absolute -top-1 right-0.5 text-primary text-sm font-bold leading-none"
          >
            +
          </button>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-bold text-xs text-foreground truncate">
            {player.displayName}
          </h3>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className="truncate">{t('predicted_matches', { count: player.totalPredictions }) || `预测${player.totalPredictions}场`}</span>
          </div>
        </div>
      </div>

      {/* Middle: Profit Rate + Profit Amount + Chart */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Profit Rate - Same Line */}
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[8px] text-muted-foreground whitespace-nowrap w-8 truncate">
              {mainTab === 'copyTrade' 
                ? (t('copy_short') || '收益')
                : (t('profit_short') || '盈利率')}
            </span>
            <span className={`text-base font-bold tracking-tight ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{player.changePercent.toFixed(2)}%
            </span>
          </div>
          {/* Profit Amount - Same Line */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-muted-foreground whitespace-nowrap w-8 truncate">
              {t('amount_short') || '金额'}
            </span>
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{(player.profitAmount || 0).toLocaleString()}
              <img src={hunterCoinIcon} alt="Hunter Coin" className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>
        
        {/* Mini Chart + Win Rate */}
        <div className="w-14 flex-shrink-0 flex flex-col items-end">
          <div className="w-14 h-7">
          <svg width="100" height="32" viewBox="0 0 100 32" className="w-full h-full">
            <path
              d={generateChartPath(player.id, player.changePercent)}
              fill="none"
              stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          </div>
          {/* Win Rate below chart */}
          <div className="text-[9px] text-success font-medium mt-0.5">
            {player.winRate}%
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-2 border-t border-border/20">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <span className="flex items-center gap-0.5 text-success flex-shrink-0">
            <CheckCircle className="h-2.5 w-2.5" />
            <span className="truncate">{player.correctPredictions}</span>
          </span>
          <span className="flex items-center gap-0.5 text-destructive flex-shrink-0">
            <XCircle className="h-2.5 w-2.5" />
            <span className="truncate">{player.totalPredictions - player.correctPredictions}</span>
          </span>
        </div>
        <button 
          className="flex items-center gap-0.5 flex-shrink-0 text-[9px] font-medium hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onFollowersClick(player);
          }}
        >
            <Users className="h-2.5 w-2.5" />
            <span className="truncate">{player.followers || 0}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default MobileLeaderboardOKX;

