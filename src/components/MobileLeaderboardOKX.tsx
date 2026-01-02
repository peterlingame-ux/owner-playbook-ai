import { useState, useEffect, useCallback } from "react";
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
import { virtualPlayers } from "@/data/virtualPlayers";
import { aiModels } from "@/data/mockData";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import ChallengeAIBanner from "@/components/ChallengeAIBanner";
import { GoalIcon } from "@/components/FootballIcons";

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
    case 'hunsoccer-max': return starHunsoccer;
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
    case 'hunsoccer-max': return 'from-[hsl(38,92%,50%)]/80 to-[hsl(38,92%,40%)]/80';
    default: return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
  }
};

const MobileLeaderboardOKX = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [mainTab, setMainTab] = useState<MainTab>('ai');
  const [subTab, setSubTab] = useState<SubTab>('high');
  const [sortType, setSortType] = useState<SortType>('comprehensive');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRulesExpanded, setShowRulesExpanded] = useState(false);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllPredictors, setShowAllPredictors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [selectedModelForFollowers, setSelectedModelForFollowers] = useState<string | null>(null);
  const [showPlayerFollowersDialog, setShowPlayerFollowersDialog] = useState(false);
  const [selectedPlayerForFollowers, setSelectedPlayerForFollowers] = useState<PlayerData | null>(null);
  // Follow player confirmation dialog state
  const [showFollowPlayerDialog, setShowFollowPlayerDialog] = useState(false);
  const [playerToFollow, setPlayerToFollow] = useState<PlayerData | null>(null);
  
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

  // Fetch players data
  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      // 获取真实用户数据
      const { data: predictions } = await supabase
        .from('user_predictions')
        .select('user_id, result, bet_amount, actual_payout')
        .not('result', 'is', null);

      // 获取用户资料
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, avatar_url');

      // 处理真实用户数据
      const userStats = new Map<string, {
        totalPredictions: number;
        correctPredictions: number;
        totalBet: number;
        totalProfit: number;
      }>();

      predictions?.forEach((p) => {
        if (!userStats.has(p.user_id)) {
          userStats.set(p.user_id, {
            totalPredictions: 0,
            correctPredictions: 0,
            totalBet: 0,
            totalProfit: 0
          });
        }
        const stats = userStats.get(p.user_id)!;
        stats.totalPredictions++;
        if (p.result === 'won') stats.correctPredictions++;
        stats.totalBet += p.bet_amount || 0;
        stats.totalProfit += (p.actual_payout || 0) - (p.bet_amount || 0);
      });

      const realPlayers: PlayerData[] = [];
      users?.forEach((u) => {
        const stats = userStats.get(u.id);
        if (stats && stats.totalPredictions >= 3) {
          const winRate = (stats.correctPredictions / stats.totalPredictions) * 100;
          realPlayers.push({
            id: u.id,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            totalPredictions: stats.totalPredictions,
            correctPredictions: stats.correctPredictions,
            winRate: parseFloat(winRate.toFixed(1)),
            balance: 0,
            profit: stats.totalProfit,
            changePercent: stats.totalBet > 0 ? (stats.totalProfit / stats.totalBet) * 100 : 0,
            profitAmount: stats.totalProfit,
            rank: 0,
            currentStreak: Math.floor(Math.random() * 8),
            worstStreak: Math.floor(Math.random() * 5),
            isVirtual: false,
            followers: Math.floor(100 + Math.random() * 500),
            tradingDays: Math.floor(10 + Math.random() * 80),
            tradingVolume: Math.floor(50000 + Math.random() * 2000000),
          });
        }
      });

      // 添加虚拟玩家 - 分为高准确率（赢家）和低准确率（输家）
      const virtualPlayerData: PlayerData[] = virtualPlayers.map((vp, i) => {
        const seed = vp.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        // 一半是高胜率玩家，一半是低胜率玩家
        const isWinner = i < virtualPlayers.length / 2;
        
        // 高准确率玩家：胜率60-85%，正收益，连胜
        // 低准确率玩家：胜率25-45%，负收益，连负
        const winRate = isWinner 
          ? 60 + (seed % 25) // 60-85%
          : 25 + (seed % 20); // 25-45%
        
        const changePercent = isWinner 
          ? 15 + (seed % 35) // +15% to +50%
          : -(10 + (seed % 30)); // -10% to -40%
        
        const profit = isWinner 
          ? 5000 + (seed % 15000) // 正收益
          : -(2000 + (seed % 8000)); // 负收益
        
        const currentStreak = isWinner 
          ? 3 + (seed % 8) // 3-10连胜
          : 0;
        
        const worstStreak = isWinner 
          ? 0
          : 3 + (seed % 7); // 3-9连负
        
        return {
          id: vp.id,
          displayName: vp.displayName,
          avatarUrl: vp.avatarUrl,
          totalPredictions: vp.totalPredictions,
          correctPredictions: Math.round(vp.totalPredictions * (winRate / 100)),
          winRate: parseFloat(winRate.toFixed(1)),
          balance: vp.balance || 0,
          profit: profit,
          changePercent: parseFloat(changePercent.toFixed(1)),
          profitAmount: profit,
          rank: 0,
          currentStreak: currentStreak,
          worstStreak: worstStreak,
          isVirtual: true,
          isWinner: isWinner, // 标记是赢家还是输家
          followers: Math.floor(200 + Math.random() * 800),
          tradingDays: Math.floor(30 + Math.random() * 100),
          tradingVolume: Math.floor(500000 + Math.random() * 5000000),
        };
      });

      const combined = [...realPlayers, ...virtualPlayerData]
        .sort((a, b) => b.winRate - a.winRate)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      setAllPlayers(combined);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Get sorted and filtered players based on current tab and sort
  const getDisplayPlayers = useCallback(() => {
    let filtered = [...allPlayers];
    
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
  }, [allPlayers, subTab, sortType]);

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

  // Open copy trade dialog for AI model
  const openCopyTradeDialog = (modelId: string, modelName: string) => {
    if (!user) {
      toast.warning(t('login_first') || '请先登录', {
        description: t('login_to_subscribe') || '登录后即可订阅AI模型'
      });
      navigate('/auth');
      return;
    }
    setCopyTradeModel({ id: modelId, name: modelName });
    setIsCopyTradeDialogOpen(true);
  };

  // Handle copy trade for AI model
  const handleCopyTrade = async () => {
    if (!user) {
      toast.warning(t('login_first') || '请先登录', {
        description: t('login_to_subscribe') || '登录后即可订阅AI模型'
      });
      return;
    }

    if (!copyTradeModel) return;

    setIsCopyTrading(true);
    try {
      // 检查用户余额
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (balanceError || !balanceData) {
        toast.error(t('fetch_balance_failed') || '获取余额失败', {
          description: t('please_try_later') || '请稍后重试'
        });
        return;
      }

      if (balanceData.balance < copyTradeAmount) {
        toast.error(t('insufficient_balance_title') || '余额不足', {
          description: t('current_balance_need', { current: balanceData.balance.toFixed(2), need: copyTradeAmount }) || `当前余额 ${balanceData.balance.toFixed(2)}，需要 ${copyTradeAmount}`
        });
        return;
      }

      // 扣除余额
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ 
          balance: balanceData.balance - copyTradeAmount,
          total_wagered: (balanceData as any).total_wagered + copyTradeAmount,
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast.success(t('subscribe_success') || '订阅成功', {
        description: t('subscribed_model', { model: copyTradeModel.name, amount: copyTradeAmount }) || `已订阅 ${copyTradeModel.name}，金额 ${copyTradeAmount} 猎人币`
      });

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
    // Multiplier based on time filter to simulate different data
    const timeMultiplier = timeFilter === 'day' ? 0.3 : timeFilter === 'week' ? 0.7 : 1;
    
    const modelsWithStats = aiModels.map(model => {
      const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const baseWinRate = 55 + (seed % 20) + (Math.sin(seed) * 5);
      const winRate = baseWinRate + (timeFilter === 'day' ? (seed % 5) - 2 : timeFilter === 'week' ? (seed % 3) - 1 : 0);
      const changePercent = (10 + (seed % 30) - 5) * timeMultiplier;
      const totalPredictions = Math.round((25 + (seed % 10)) * timeMultiplier);
      const correctPredictions = Math.round(totalPredictions * (winRate / 100));
      const wrongPredictions = totalPredictions - correctPredictions;
      // Calculate profit amount based on changePercent
      const profitAmount = Math.round((changePercent / 100) * (10000 + seed * 10));
      return {
        ...model,
        winRate: Math.round(winRate * 10) / 10,
        changePercent: Math.round(changePercent * 10) / 10,
        followers: Math.round((500 + (seed % 500)) * timeMultiplier),
        likes: Math.round((200 + (seed % 300)) * timeMultiplier), // 点赞数
        tradingDays: 30 + (seed % 60),
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {timeFilter === 'day' ? t('today_data') || '今日数据' : 
             timeFilter === 'week' ? t('weekly_data') || '本周数据' : 
             t('monthly_data') || '本月数据'}
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
                      <span>Premier League</span>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] text-white flex items-center gap-1">
                      <GoalIcon size={10} className="flex-shrink-0" />
                      <span>La Liga</span>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] text-white flex items-center gap-1">
                      <GoalIcon size={10} className="flex-shrink-0" />
                      <span>Bundesliga</span>
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
                      case 'hunsoccer-max': return 'bg-[hsl(38,92%,50%)]';
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {timeFilter === 'day' ? t('today_data') || '今日数据' : 
             timeFilter === 'week' ? t('weekly_data') || '本周数据' : 
             t('monthly_data') || '本月数据'}
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
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <ThumbsUp className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary">{model.likes}</span>
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
                <button 
                  className="px-1.5 py-0.5 text-[9px] font-medium bg-warning hover:bg-warning/90 text-warning-foreground rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCopyTradeDialog(model.id, model.name);
                  }}
                >
                  {t('auto_copy_trade') || '自动跟单'}
                </button>
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
    <div className="min-h-screen bg-background">
      {/* Challenge AI Banner - Auto fit screen - Sticky below header */}
      <div className="sticky top-[69px] sm:top-[70px] z-40 w-full overflow-hidden">
        <ChallengeAIBanner />
      </div>

      {/* Main Tabs - OKX Style - Positioned below banner (header ~69px + banner ~180px) */}
      <div className="sticky top-[249px] sm:top-[290px] z-30 bg-background border-b border-border/30">
        <div className="flex items-center gap-2 px-3 pt-2 overflow-x-auto scrollbar-hide">
          {mainTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setMainTab(tab.value as MainTab)}
              className={`relative py-3 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
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

      {/* Sub Tabs - Show for all tabs - Positioned below main tabs (main tab ~52px height) */}
      <div className="sticky top-[301px] sm:top-[342px] z-20 bg-background">
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
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Time Filter & All Predictors - For accuracy and copyTrade tabs */}
      {(mainTab === 'accuracy' || mainTab === 'copyTrade') && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
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
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-muted/30 text-muted-foreground rounded flex-shrink-0">
              TOP10
            </span>
          </div>
          <button 
            className="px-2 py-1 text-[10px] font-medium bg-muted/50 hover:bg-muted rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0"
            onClick={() => setShowAllPredictors(true)}
          >
            <Users className="h-3 w-3" />
            <span className="hidden xs:inline">{t('all_predictors') || '全部预测者'}</span>
            <span className="xs:hidden">{t('all_short') || '全部'}</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="px-4 py-2 space-y-3 pb-20">
        <AnimatePresence mode="wait">
          {isLoading && mainTab !== 'ai' ? (
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
                    onFollowPlayerClick={(player) => {
                      setPlayerToFollow(player);
                      setShowFollowPlayerDialog(true);
                    }}
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
          
          {/* Predictors List */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[55vh] space-y-2">
            {allPlayers
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
          
          {/* Subscribers List */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[55vh] space-y-3 pt-3">
            {(() => {
              // Generate mock subscribers data
              const mockSubscribers = virtualPlayers.slice(0, 10).map((player, idx) => ({
                id: player.id,
                displayName: player.displayName.length > 5 
                  ? player.displayName.substring(0, 3) + '***' + player.displayName.slice(-4) 
                  : player.displayName,
                avatarUrl: player.avatarUrl,
                subscribeCount: Math.floor(5 + Math.random() * 30),
                profit: Math.round((Math.random() - 0.3) * 300 * 100) / 100,
                volume: Math.round(500 + Math.random() * 1500 * 100) / 100,
              }));
              
              return mockSubscribers.map((sub, index) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3"
                >
                  {/* Rank Medal */}
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
                  
                  {/* Avatar */}
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage src={sub.avatarUrl} alt={sub.displayName} />
                    <AvatarFallback>{sub.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* Name & Subscribe Count */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base text-foreground truncate">{sub.displayName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t('subscribed_count', { count: sub.subscribeCount }) || `已订阅${sub.subscribeCount}次`}
                    </p>
                  </div>
                  
                  {/* Profit & Volume */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold flex items-center justify-end gap-0.5 ${sub.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {sub.profit >= 0 ? '+' : ''}{sub.profit.toFixed(2)}
                      <img src={hunterCoinIcon} alt="HC" className="w-4 h-4" />
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center justify-end gap-0.5">
                      {sub.volume.toFixed(2)}
                      <img src={hunterCoinIcon} alt="HC" className="w-3.5 h-3.5" />
                    </p>
                  </div>
                </motion.div>
              ));
            })()}
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
          
          {/* Followers List */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[55vh] space-y-3 pt-3">
            {(() => {
              // Generate mock followers data
              const mockFollowers = virtualPlayers.slice(0, 10).map((player, idx) => ({
                id: player.id,
                displayName: player.displayName.length > 5 
                  ? player.displayName.substring(0, 3) + '***' + player.displayName.slice(-4) 
                  : player.displayName,
                avatarUrl: player.avatarUrl,
                followCount: Math.floor(5 + Math.random() * 30),
                profit: Math.round((Math.random() - 0.3) * 300 * 100) / 100,
                volume: Math.round(500 + Math.random() * 1500 * 100) / 100,
              }));
              
              return mockFollowers.map((follower, index) => (
                <motion.div
                  key={follower.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3"
                >
                  {/* Rank Medal */}
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
                  
                  {/* Avatar */}
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage src={follower.avatarUrl} alt={follower.displayName} />
                    <AvatarFallback>{follower.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* Name & Follow Count */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base text-foreground truncate">{follower.displayName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t('followed_count', { count: follower.followCount }) || `已跟单${follower.followCount}次`}
                    </p>
                  </div>
                  
                  {/* Profit & Volume */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold flex items-center justify-end gap-0.5 ${follower.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {follower.profit >= 0 ? '+' : ''}{follower.profit.toFixed(2)}
                      <img src={hunterCoinIcon} alt="HC" className="w-4 h-4" />
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center justify-end gap-0.5">
                      {follower.volume.toFixed(2)}
                      <img src={hunterCoinIcon} alt="HC" className="w-3.5 h-3.5" />
                    </p>
                  </div>
                </motion.div>
              ));
            })()}
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
                  toast.success(t('follow_success', { name: playerToFollow.displayName }) || `已关注 ${playerToFollow.displayName}`);
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
                  <AvatarImage src={allPlayers.find(p => p.id === selectedPlayerHistory?.playerId)?.avatarUrl} />
                  <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
                    {selectedPlayerHistory?.playerName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-base font-bold">{(() => {
                    const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
                    return player ? (player.displayName.length > 5 
                      ? player.displayName.substring(0, 3) + '***' + player.displayName.slice(-4) 
                      : player.displayName) : (selectedPlayerHistory?.playerName || '');
                  })()}</span>
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
            
            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">订阅金额 (猎人币)</label>
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
                onChange={(e) => setCopyTradeAmount(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                placeholder="自定义金额"
                min={10}
              />
            </div>
            
            {/* Info Note */}
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-xs text-warning">
                订阅后，系统将在该AI模型下一次预测时，自动为您投注相同的选项
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsCopyTradeDialogOpen(false)}
              className="flex-1 py-2.5 text-sm font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCopyTrade}
              disabled={isCopyTrading || copyTradeAmount < 10}
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
  onFollowPlayerClick: (player: PlayerData) => void;
}

const PlayerCardOKX = ({ player, index, generateChartPath, onClick, subTab, mainTab, onFollowersClick, onHistoryClick, onFollowPlayerClick }: PlayerCardOKXProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPositive = player.changePercent >= 0;
  
  // Check if player qualifies for prize pool (win rate >= 60% AND correct predictions >= 10)
  const isQualified = player.winRate >= 60 && player.correctPredictions >= 10;

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
            {/* Streak Indicators - Like PC version with count */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {Array.from({ length: Math.min(subTab === 'high' ? (player.currentStreak || 0) : (player.worstStreak || 0), 3) }).map((_, i) => (
                <span 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold border ${
                    subTab === 'high' 
                      ? 'border-success/50 text-success bg-success/10' 
                      : 'border-destructive/50 text-destructive bg-destructive/10'
                  }`}
                >
                  {subTab === 'high' ? (t('win_badge') || '胜') : (t('loss_badge') || '败')}
                </span>
              ))}
              {/* Show streak count number */}
              {(subTab === 'high' ? (player.currentStreak || 0) : (player.worstStreak || 0)) > 0 && (
                <span className={`text-[9px] font-bold ml-0.5 ${
                  subTab === 'high' ? 'text-success' : 'text-destructive'
                }`}>
                  ×{subTab === 'high' ? (player.currentStreak || 0) : (player.worstStreak || 0)}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button 
            className="px-1 py-0.5 text-[8px] font-medium bg-muted/50 hover:bg-muted rounded transition-colors whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/history');
            }}
          >
            {mainTab === 'copyTrade' 
              ? (t('history_record') || '历史记录')
              : (t('history_record') || '历史记录')}
          </button>
          <button 
            className="px-1 py-0.5 text-[8px] font-medium bg-success hover:bg-success/90 text-success-foreground rounded transition-colors whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              onHistoryClick(player.id, player.displayName, player.isVirtual || false);
            }}
          >
            {mainTab === 'copyTrade' 
              ? (t('today_copy_trade') || '今日跟单')
              : (t('today_predictions') || '今日预测')}
          </button>
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
              {isPositive ? '+' : ''}{player.changePercent.toFixed(1)}%
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

