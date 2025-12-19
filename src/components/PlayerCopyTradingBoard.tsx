import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Flame, Skull, UserPlus, Calendar, X, Trophy, TrendingUp, TrendingDown, Lock, CheckCircle2, Sparkles, Users, ThumbsUp, Search, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import hunterCoinIcon from "@/assets/hunter-coin-icon.png";
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

// Mock follower data for each player
const generatePlayerMockFollowers = (playerId: string, playerName: string, count: number) => {
  const names = ['田雨', '慢慢扛', '小明', '阿杰', '球迷王', '预测达人', '足彩老手', '胜率之王', '稳赚不赔', '神预测'];
  const avatars = ['/avatars/avatar-1.png', '/avatars/avatar-2.png', '/avatars/avatar-3.png', '/avatars/avatar-4.png', '/avatars/avatar-5.png', '/avatars/avatar-6.png'];
  
  return Array.from({ length: Math.min(count, 20) }, (_, i) => {
    const isTop3 = i < 3;
    const baseCopyAmount = isTop3 ? 800 + Math.random() * 600 : 200 + Math.random() * 500;
    const profit = (Math.random() - 0.3) * baseCopyAmount * 0.3;
    
    return {
      id: `${playerId}-follower-${i}`,
      rank: i + 1,
      name: Math.random() > 0.5 
        ? names[Math.floor(Math.random() * names.length)] 
        : `${Math.floor(100 + Math.random() * 900)}***${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      days: Math.floor(1 + Math.random() * 30),
      profit: profit,
      copyAmount: baseCopyAmount,
      totalVolume: baseCopyAmount * (1 + Math.random()),
    };
  });
};

const PlayerCopyTradingBoard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [likedPlayers, setLikedPlayers] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [isLiking, setIsLiking] = useState<Set<string>>(new Set()); // 防止重复点击
  
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
  
  // 获取用户USDT余额
  const [usdtBalance, setUsdtBalance] = useState(0);

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
            unlockPrice: 0, // 真实玩家默认免费，可以根据需要从数据库获取
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

  // 获取点赞数和用户点赞状态
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        // 获取所有玩家的ID列表
        const playerIds = allPlayers.map(p => p.id);

        if (playerIds.length === 0) return;

        // 获取所有玩家的点赞数
        const { data: countsData, error: countsError } = await supabase
          .from('like_counts' as any)
          .select('entity_id, like_count')
          .eq('entity_type', 'player')
          .in('entity_id', playerIds);

        if (!countsError && countsData) {
          const countsMap = new Map<string, number>();
          countsData.forEach((item: any) => {
            countsMap.set(item.entity_id, item.like_count || 0);
          });
          setLikeCounts(countsMap);
        }

        // 获取用户已点赞的玩家
        if (user) {
          const { data: userLikesData, error: userLikesError } = await supabase
            .from('likes' as any)
            .select('entity_id')
            .eq('user_id', user.id)
            .eq('entity_type', 'player')
            .in('entity_id', playerIds);

          if (!userLikesError && userLikesData) {
            const likedSet = new Set<string>();
            userLikesData.forEach((item: any) => {
              likedSet.add(item.entity_id);
            });
            setLikedPlayers(likedSet);
          }
        }
      } catch (error) {
        console.error('Error fetching likes:', error);
      }
    };

    if (allPlayers.length > 0) {
      fetchLikes();
    }

    // 订阅点赞表的变化，实时更新点赞数
    const likesChannel = supabase
      .channel('copy-trading-likes-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes' as any,
          filter: 'entity_type=eq.player',
        },
        () => {
          fetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [allPlayers, user]);

  // 处理点赞/取消点赞
  const handleLike = async (playerId: string, e?: React.MouseEvent) => {
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

    setIsLiking(prev => new Set(prev).add(playerId));

    try {
      const isCurrentlyLiked = likedPlayers.has(playerId);

      if (isCurrentlyLiked) {
        // 取消点赞
        const { error } = await supabase
          .from('likes' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('entity_type', 'player')
          .eq('entity_id', playerId);

        if (error) throw error;

        // 更新本地状态
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
        // 点赞
        const { error } = await supabase
          .from('likes' as any)
          .insert({
            user_id: user.id,
            entity_type: 'player',
            entity_id: playerId,
          });

        if (error) throw error;

        // 更新本地状态
        setLikedPlayers(prev => new Set(prev).add(playerId));
        setLikeCounts(prev => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(playerId) || 0;
          newMap.set(playerId, currentCount + 1);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error("操作失败", {
        description: "请稍后重试",
      });
    } finally {
      setIsLiking(prev => {
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
    
    // 检查是否需要付费解锁
    const unlockPrice = player.unlockPrice ?? 0;
    if (unlockPrice > 0) {
      // 需要付费，显示解锁弹窗
      setUnlockDialog({ player, prediction });
    } else {
      // 免费，直接进入跟单流程
      setCopyTradeDialog({ player, prediction, betAmount: 100 });
      setCopyBetAmount(100);
    }
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
    const isLiked = likedPlayers.has(player.id);
    const likeCount = likeCounts.get(player.id) || 0;
    const isLikingPlayer = isLiking.has(player.id);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ 
          scale: 1.02, 
          y: -2,
          boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.2)"
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, delay: (rank || 0) * 0.03 }}
        className="rounded-lg border bg-muted/20 border-border/30 p-3 sm:p-4 cursor-pointer"
        onClick={() => navigate(`/player/${player.id}`)}
      >
        {/* Top Row: Rank, Avatar, Name, Buttons */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Rank Badge */}
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
            {/* Avatar with Like Button */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border border-border">
                <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              {/* Like Button on Avatar */}
              <div className="absolute -bottom-1 -right-1">
                <button
                  onClick={(e) => handleLike(player.id, e)}
                  disabled={isLikingPlayer}
                  className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full transition-all text-[10px] border ${
                    isLikingPlayer ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    isLiked 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
                  title={isLiked ? '取消点赞' : '点赞'}
                >
                  <ThumbsUp className={`h-2.5 w-2.5 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="font-medium">{likeCount}</span>
                </button>
              </div>
            </div>
            {/* Name & Streak Stats */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm sm:text-base text-foreground">{maskPlayerName(player.displayName)}</span>
                {/* Profit Rate Badge */}
                <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium ${
                  profitRate >= 0 
                    ? 'bg-success/20 text-success' 
                    : 'bg-destructive/20 text-destructive'
                }`}>
                  {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                {streakType === 'worst' ? (
                  <>
                    连败 <span className="text-foreground font-bold">{player.worstStreak || 0}</span>
                    <span className="flex items-center gap-0.5 ml-1">
                      {Array.from({ length: Math.min(player.worstStreak || 0, 5) }).map((_, i) => (
                        <span key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-foreground/20 border border-foreground/50 flex items-center justify-center text-[8px] sm:text-[9px] text-foreground font-bold">
                          败
                        </span>
                      ))}
                      {(player.worstStreak || 0) > 5 && (
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-foreground/10 border border-dashed border-foreground/40 flex items-center justify-center text-[8px] sm:text-[9px] text-foreground/70 font-medium">
                          …
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    连胜 <span className="text-destructive font-bold">{player.currentStreak || player.bestStreak || 0}</span>
                    <span className="flex items-center gap-0.5 ml-1">
                      {Array.from({ length: Math.min(player.currentStreak || player.bestStreak || 0, 5) }).map((_, i) => (
                        <span key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center text-[8px] sm:text-[9px] text-destructive font-bold">
                          胜
                        </span>
                      ))}
                      {(player.currentStreak || player.bestStreak || 0) > 5 && (
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive/10 border border-dashed border-destructive/40 flex items-center justify-center text-[8px] sm:text-[9px] text-destructive/70 font-medium">
                          …
                        </span>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Action Buttons & Prize */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Estimated Prize Badge */}
            {prize > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-warning/25 to-warning/15 border border-warning/40 text-warning text-[10px] sm:text-xs font-bold shadow-sm">
                <span className="text-warning/80 font-medium hidden sm:inline">预期奖金:</span>
                <span className="text-warning font-bold">$</span>
                <AnimatedPrize value={prize} className="text-[10px] sm:text-xs font-bold text-warning" duration={600} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 border border-border/50 text-muted-foreground text-[10px] sm:text-xs">
                <span className="font-medium hidden sm:inline">预期奖金:</span>
                <span>未达标</span>
              </span>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/history');
              }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
            >
              历史记录
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                fetchTodayPredictions(player);
              }}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-md bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:from-warning/90 hover:to-warning transition-all duration-300 shadow-md shadow-warning/30 hover:shadow-lg hover:shadow-warning/40 hover:scale-105 active:scale-95"
            >
              今日跟单
            </button>
          </div>
        </div>
        
        {/* Stats Grid - Row 1: 预测, 正确, 错误, 胜率 */}
        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {/* Total Predictions */}
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">预测</p>
            <p className="text-sm sm:text-lg font-bold font-mono-data text-foreground">
              {player.totalPredictions}场
            </p>
          </div>
          
          {/* Correct Predictions */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">正确</p>
            <p className="text-sm sm:text-lg font-bold font-mono-data text-success">
              {player.correctPredictions}场
            </p>
          </div>
          
          {/* Incorrect Predictions */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">错误</p>
            <p className="text-sm sm:text-lg font-bold font-mono-data text-destructive">
              {player.totalPredictions - player.correctPredictions}场
            </p>
          </div>
          
          {/* Win Rate */}
          <div className="text-right">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">胜率</p>
            <p className="text-sm sm:text-lg font-bold font-mono-data text-success inline-flex items-center">
              {player.winRate.toFixed(0)}%
              {(() => {
                const todayData = todayStats.get(player.id);
                if (todayData && todayData.total > 0) {
                  const trendValue = todayData.winRate - player.winRate;
                  if (trendValue > 2) {
                    return (
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex ml-1"
                      >
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success drop-shadow-[0_0_4px_hsl(var(--success))]" />
                      </motion.span>
                    );
                  } else if (trendValue < -2) {
                    return (
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex ml-1"
                      >
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive drop-shadow-[0_0_4px_hsl(var(--destructive))]" />
                      </motion.span>
                    );
                  }
                }
                return null;
              })()}
            </p>
          </div>
        </div>
        
        {/* Stats Grid - Row 2: 投注金额, 盈利金额, 盈利率, 跟单人数 */}
        <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-3 pt-3 border-t border-border/50">
          {/* Bet Amount */}
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">投注金额</p>
            <p className="text-sm sm:text-base font-bold font-mono-data text-foreground">
              ¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          
          {/* Profit Amount */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">盈利金额</p>
            <p className={`text-sm sm:text-base font-bold font-mono-data ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
              {profitAmount >= 0 ? '+' : ''}¥{(profitAmount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          
          {/* Profit Rate */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">盈利率</p>
            <p className={`text-sm sm:text-base font-bold font-mono-data ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
              {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%
            </p>
          </div>
          
          {/* Copy Traders - Clickable */}
          <div 
            className="text-right cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
              const variance = (seed % 50) - 25;
              const followerCount = Math.max(0, baseCount + variance);
              const followers = generatePlayerMockFollowers(player.id, player.displayName, followerCount);
              setSelectedPlayerFollowers({ playerId: player.id, playerName: player.displayName, followers });
              setIsPlayerFollowersDialogOpen(true);
            }}
          >
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center justify-end gap-1"><Users className="h-3 w-3" fill="currentColor" />跟单人数</p>
            <p className="text-sm sm:text-base font-bold font-mono-data text-primary hover:underline">
              {(() => {
                const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
                const variance = (seed % 50) - 25;
                return Math.max(0, baseCount + variance);
              })()}人
            </p>
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
    <div className="space-y-6">
      {/* Leaderboard Table - Split into Hot Streak and Cold Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 连红榜 - Winning Streak */}
        <Card className="border-border/50 bg-card/50 relative overflow-hidden">
          {/* 背景图片 */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
            style={{ backgroundImage: `url(${winningStreakBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/98 via-card/90 to-card/80" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">玩家连红榜</h3>
                <p className="text-xs text-muted-foreground">
                  胜率最高玩家
                  <span className="ml-1.5 text-[10px] text-muted-foreground/70">· 仅显示前10名</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View All Button */}
                <button
                  onClick={() => setShowAllHotPlayers(true)}
                  className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
                >
                  {t('all_players') || '全部玩家'}
                </button>
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
            </div>
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
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">玩家连黑榜</h3>
                <p className="text-xs text-muted-foreground">
                  胜率最低玩家
                  <span className="ml-1.5 text-[10px] text-muted-foreground/70">· 仅显示前10名</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View All Button */}
                <button
                  onClick={() => setShowAllColdPlayers(true)}
                  className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
                >
                  {t('all_players') || '全部玩家'}
                </button>
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
            </div>
            <div className="space-y-2">
              {worstStreakPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} showStreak streakType="worst" rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


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
                      <div className="text-sm font-bold font-mono text-success inline-flex items-center justify-center">
                        {winRate.toFixed(0)}%
                        {(() => {
                          const todayData = todayStats.get(selectedPlayer.player.id);
                          if (todayData && todayData.total > 0) {
                            const trendValue = todayData.winRate - selectedPlayer.player.winRate;
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
                      </div>
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
                    <p className="text-xs text-muted-foreground inline-flex items-center">胜率 <span className="text-success font-medium ml-1">{unlockDialog.player.winRate.toFixed(1)}%</span>
                      {(() => {
                        const todayData = todayStats.get(unlockDialog.player.id);
                        if (todayData && todayData.total > 0) {
                          const trendValue = todayData.winRate - unlockDialog.player.winRate;
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
                    </p>
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
                  <Users className="h-4 w-4 text-muted-foreground" fill="currentColor" />
                  <span className="text-sm text-muted-foreground">
                    已有 <span className="text-foreground font-bold">{Math.floor(Math.random() * 200) + 50}</span> 人跟单该玩家
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
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <motion.div
                          initial={{ rotate: -180, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ delay: 0.6, type: "spring" }}
                        >
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </motion.div>
                        <span className="text-xs font-medium text-success">比赛详情已解锁</span>
                      </div>
                      <div className="text-base font-bold text-center">
                        <span className="text-primary">{copySuccess.prediction.home_team || '主队'}</span>
                        <span className="text-muted-foreground mx-3 text-sm">vs</span>
                        <span className="text-primary">{copySuccess.prediction.away_team || '客队'}</span>
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
                    <div className="px-4 py-3 bg-gradient-to-b from-transparent to-primary/5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">玩家下注</p>
                          <div className="text-lg font-bold font-mono">¥{copySuccess.prediction.bet_amount}</div>
                        </div>
                        <div className="text-center border-l border-border/30">
                          <p className="text-[10px] text-muted-foreground mb-1">您的跟单金额</p>
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.8, type: "spring" }}
                            className="text-lg font-bold font-mono text-primary"
                          >
                            ¥{copySuccess.betAmount.toLocaleString()}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

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

      {/* 查看全部连红玩家弹窗 - 简化版 */}
      <Dialog open={showAllHotPlayers} onOpenChange={(open) => {
        setShowAllHotPlayers(open);
        if (!open) {
          setSelectedAllPlayer(null);
          setHotSearchQuery('');
          setHotDisplayCount(INITIAL_DISPLAY_COUNT);
        }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
              玩家连红榜 - {t('all_players') || '全部玩家'}
            </DialogTitle>
          </DialogHeader>
          {/* 搜索框 */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <ScrollArea 
            className="flex-1 -mx-6 px-6"
            onScrollCapture={(e) => {
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
            <div className="space-y-1.5 pb-4">
              {(() => {
                const filtered = [...allPlayers]
                  .filter(player => player.displayName.toLowerCase().includes(hotSearchQuery.toLowerCase()))
                  .sort((a, b) => b.bestStreak - a.bestStreak);
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
                                连胜 <span className="text-amber-500 font-bold">{player.bestStreak || 0}</span>
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
          </ScrollArea>
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
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full" />
              玩家连黑榜 - {t('all_players') || '全部玩家'}
            </DialogTitle>
          </DialogHeader>
          {/* 搜索框 */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <ScrollArea 
            className="flex-1 -mx-6 px-6"
            onScrollCapture={(e) => {
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
            <div className="space-y-1.5 pb-4">
              {(() => {
                const filtered = [...allPlayers]
                  .filter(player => player.displayName.toLowerCase().includes(coldSearchQuery.toLowerCase()))
                  .sort((a, b) => b.worstStreak - a.worstStreak);
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
          </ScrollArea>
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
                  {maskPlayerName(selectedAllPlayer.player.displayName)} - {t('player_detail') || '玩家详情'}
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
                  <DialogTitle className="text-lg font-bold">{selectedPlayerFollowers?.playerName} - 跟单用户</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">更新于 {new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">总收益率</span>
                  <span className="text-lg font-bold text-success">+{(15 + Math.random() * 30).toFixed(1)}%</span>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-5 py-2.5 border-y border-border/50 bg-muted/30">
            <span>排名</span>
            <span>玩家收益 | 带单规模</span>
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
                    <p className="text-xs text-muted-foreground">已跟单{follower.days}次</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${follower.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{follower.profit >= 0 ? '+' : ''}{follower.profit.toFixed(2)}</p>
                  <p className="text-xs text-warning font-medium">{follower.copyAmount.toFixed(2)}</p>
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