import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Trophy, History, ExternalLink, TrendingUp, TrendingDown, Minus, UserPlus, CheckCircle2, Sparkles, Lock } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import grassTexture from "@/assets/grass-texture.jpg";
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
  } | null>(null);
  
  // 已跟单的预测ID集合 - 跟单后才能看到具体盘口
  const [copiedPredictions, setCopiedPredictions] = useState<Set<string>>(new Set());
  
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
      
      // 将该预测添加到已跟单列表，解锁显示
      setCopiedPredictions(prev => {
        const newSet = new Set(prev);
        newSet.add(copyTradeDialog.prediction.id);
        return newSet;
      });
      
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

  // 从今日推荐跟单
  const handleCopyTradeFromHistory = (pred: TodayPrediction) => {
    const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
    if (!player) return;
    
    setCopyTradeDialog({ player, prediction: pred });
    setCopyBetAmount(100);
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
      {/* Leaderboard Table - Split into Hot Streak, Profit, and Cold Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: 连红榜 (Hot Streak) */}
        <Card className="border-destructive/40 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg bg-gradient-to-r from-destructive to-red-500 bg-clip-text text-transparent">{t('hot_streak_board') || '连红榜'}</h3>
                  <p className="text-xs text-muted-foreground">{t('best_win_streak') || '最佳连胜玩家'}</p>
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
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive" />
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
                            ? 'bg-destructive/20 border-2 border-destructive/40 hover:bg-destructive/30' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => navigate(`/player/${player.id}`)}
                      >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-600/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? (
                          <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: getRankColor(index + 1) }} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-destructive/40 flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs sm:text-sm truncate">{maskPlayerName(player.displayName)}</p>
                          {/* 胜率趋势图标 */}
                          {(() => {
                            const todayData = todayWinRates.get(player.id);
                            if (todayData && todayData.total > 0) {
                              const trend = todayData.winRate - player.winRate;
                              if (trend > 3) {
                                return (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-success/20 text-success text-[9px] font-bold">
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    <span className="hidden sm:inline">↑</span>
                                  </span>
                                );
                              } else if (trend < -3) {
                                return (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-destructive/20 text-destructive text-[9px] font-bold">
                                    <TrendingDown className="h-2.5 w-2.5" />
                                    <span className="hidden sm:inline">↓</span>
                                  </span>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                          {/* 总预测、正确、错误 */}
                          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('total_predictions_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('total_predictions_count').charAt(0)}:</span>
                              <span className="text-foreground font-medium">{player.totalPredictions}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('correct_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('correct_count').charAt(0)}:</span>
                              <span className="text-success font-medium">{player.correctPredictions}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('wrong_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('wrong_count').charAt(0)}:</span>
                              <span className="text-destructive font-medium">{player.totalPredictions - player.correctPredictions}</span>
                            </span>
                          </div>
                          {/* 连红和胜率 */}
                          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-destructive font-bold">{player.currentStreak || 0}</span>
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('current_streak')}</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('streak_label').charAt(0)}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('win_rate')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('win_rate').charAt(0)}:</span>
                              <span className="text-destructive font-medium">
                                {player.winRate.toFixed(1)}%
                              </span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('bet_amount') || '投注'}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">投:</span>
                              <span className="text-foreground font-medium">
                                ¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-xs px-2 sm:px-3 py-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium transition-colors flex-shrink-0 ml-2 border border-destructive/20 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      <span className="hidden sm:inline">{t('today_prediction') || '今日预测'}</span>
                      <History className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:hidden" />
                    </button>
                  </motion.div>
                ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Middle Column: 盈利榜 (Profit Board) */}
        <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">{t('profit_board') || '盈利榜'}</h3>
                  <p className="text-xs text-muted-foreground">{t('highest_profit_players') || '最高盈利玩家'}</p>
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
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading-profit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
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
                            ? 'bg-amber-500/20 border-2 border-amber-500/40 hover:bg-amber-500/30' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => navigate(`/player/${player.id}`)}
                      >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-600/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? (
                          <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: getRankColor(index + 1) }} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-amber-500/40 flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs sm:text-sm truncate">{maskPlayerName(player.displayName)}</p>
                          {/* 胜率趋势图标 */}
                          {(() => {
                            const todayData = todayWinRates.get(player.id);
                            if (todayData && todayData.total > 0) {
                              const trend = todayData.winRate - player.winRate;
                              if (trend > 3) {
                                return (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-success/20 text-success text-[9px] font-bold">
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    <span className="hidden sm:inline">↑</span>
                                  </span>
                                );
                              } else if (trend < -3) {
                                return (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-destructive/20 text-destructive text-[9px] font-bold">
                                    <TrendingDown className="h-2.5 w-2.5" />
                                    <span className="hidden sm:inline">↓</span>
                                  </span>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                          {/* 总预测、正确、错误 */}
                          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('total_predictions_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('total_predictions_count').charAt(0)}:</span>
                              <span className="text-foreground font-medium">{player.totalPredictions}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('correct_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('correct_count').charAt(0)}:</span>
                              <span className="text-success font-medium">{player.correctPredictions}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('wrong_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('wrong_count').charAt(0)}:</span>
                              <span className="text-destructive font-medium">{player.totalPredictions - player.correctPredictions}</span>
                            </span>
                          </div>
                          {/* 盈利金额和胜率 */}
                          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('profit_label')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('profit_label').charAt(0)}:</span>
                              <span className={`font-bold ${(player.profitAmount || 0) >= 0 ? 'text-amber-500' : 'text-amber-500/60'}`}>
                                {(player.profitAmount || 0) >= 0 ? '+' : ''}¥{((player.profitAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('win_rate')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('win_rate').charAt(0)}:</span>
                              <span className="text-amber-500 font-medium">
                                {player.winRate.toFixed(1)}%
                              </span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('bet_amount') || '投注'}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">投:</span>
                              <span className="text-foreground font-medium">
                                ¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-xs px-2 sm:px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-medium transition-colors flex-shrink-0 ml-2 border border-amber-500/20 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      <span className="hidden sm:inline">{t('today_prediction') || '今日预测'}</span>
                      <History className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:hidden" />
                    </button>
                  </motion.div>
                ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: 连黑榜 (Cold Streak) */}
        <Card className="border-success/40 bg-gradient-to-br from-success/10 via-success/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg bg-gradient-to-r from-success to-emerald-500 bg-clip-text text-transparent">{t('cold_streak_board') || '连黑榜'}</h3>
                  <p className="text-xs text-muted-foreground">{t('worst_lose_streak') || '最差连黑玩家'}</p>
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
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading-cold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success" />
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
                            ? 'bg-success/20 border-2 border-success/40 hover:bg-success/30' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => navigate(`/player/${player.id}`)}
                      >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-success/30 text-success' :
                        index === 1 ? 'bg-success/20 text-success/80' :
                        index === 2 ? 'bg-success/10 text-success/60' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-success/40 flex-shrink-0">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs sm:text-sm truncate">{maskPlayerName(player.displayName)}</p>
                          {/* 胜率趋势图标 */}
                          {(() => {
                            const todayData = todayWinRates.get(player.id);
                            if (todayData && todayData.total > 0) {
                              const trend = todayData.winRate - player.winRate;
                              if (trend > 3) {
                                return (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-success/20 text-success text-[9px] font-bold">
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    <span className="hidden sm:inline">↑</span>
                                  </span>
                                );
                              } else if (trend < -3) {
                                return (
                                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-destructive/20 text-destructive text-[9px] font-bold">
                                    <TrendingDown className="h-2.5 w-2.5" />
                                    <span className="hidden sm:inline">↓</span>
                                  </span>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                          {/* 总预测、正确、错误 */}
                          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('total_predictions_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('total_predictions_count').charAt(0)}:</span>
                              <span className="text-foreground font-medium">{player.totalPredictions}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('correct_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('correct_count').charAt(0)}:</span>
                              <span className="text-success font-medium">{player.correctPredictions}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('wrong_count')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('wrong_count').charAt(0)}:</span>
                              <span className="text-destructive font-medium">{player.totalPredictions - player.correctPredictions}</span>
                            </span>
                          </div>
                          {/* 连黑和胜率 */}
                          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-success font-bold">{player.worstStreak || 0}</span>
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('worst_streak')}</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('worst_streak').charAt(0)}</span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('win_rate')}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">{t('win_rate').charAt(0)}:</span>
                              <span className="text-success font-medium">
                                {player.winRate.toFixed(1)}%
                              </span>
                            </span>
                            <span className="text-border hidden sm:inline">|</span>
                            <span className="flex items-center gap-0.5 sm:gap-1">
                              <span className="text-muted-foreground/70 hidden sm:inline">{t('bet_amount') || '投注'}:</span>
                              <span className="text-muted-foreground/70 sm:hidden">投:</span>
                              <span className="text-foreground font-medium">
                                ¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-xs px-2 sm:px-3 py-1.5 rounded-md bg-success/10 hover:bg-success/20 text-success font-medium transition-colors flex-shrink-0 ml-2 border border-success/20 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(player.id, player.displayName, player.isVirtual || false);
                      }}
                    >
                      <span className="hidden sm:inline">{t('today_prediction') || '今日预测'}</span>
                      <History className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:hidden" />
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
            {/* 连红榜冠军 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 100 }}
            >
              <Card className="relative overflow-hidden border-destructive/40 h-full">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${hotStreakChampion?.avatarUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/60 to-red-600/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                <CardContent className="p-4 sm:p-5 relative z-10">
                  <motion.div 
                    className="flex items-center gap-2 mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.div 
                      className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    </motion.div>
                    <h3 className="text-xs font-bold text-white/90 uppercase tracking-wide">连红榜冠军</h3>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => hotStreakChampion && navigate(`/player/${hotStreakChampion.id}`)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div
                      animate={{ boxShadow: ["0 0 0 0 rgba(239,68,68,0)", "0 0 0 8px rgba(239,68,68,0.3)", "0 0 0 0 rgba(239,68,68,0)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="rounded-full"
                    >
                      <Avatar className="w-12 h-12 border-2 border-white/50 shadow-lg">
                        <AvatarImage src={hotStreakChampion?.avatarUrl} alt={hotStreakChampion?.displayName} />
                        <AvatarFallback className="bg-destructive text-white">{hotStreakChampion?.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div>
                      <p className="text-lg font-bold text-white">{maskPlayerName(hotStreakChampion?.displayName || '')}</p>
                      <p className="text-xs text-white/70">最佳连胜玩家</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-4 gap-2 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-destructive font-mono-data">{hotStreakChampion?.currentStreak || 0}</p>
                      <p className="text-[10px] text-white/70">连胜</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">{hotStreakChampion?.winRate?.toFixed(1) || 0}%</p>
                      <p className="text-[10px] text-white/70">胜率</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">{hotStreakChampion?.totalPredictions || 0}</p>
                      <p className="text-[10px] text-white/70">预测</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">¥{((hotStreakChampion?.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-white/70">投注</p>
                    </motion.div>
                  </motion.div>
                  
                  <motion.button
                    className="w-full mt-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors border border-white/20"
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
                    查看今日预测
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* 盈利榜冠军 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.25, type: "spring", stiffness: 100 }}
            >
              <Card className="relative overflow-hidden border-amber-500/40 h-full">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${profitChampion?.avatarUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/60 to-yellow-600/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                <CardContent className="p-4 sm:p-5 relative z-10">
                  <motion.div 
                    className="flex items-center gap-2 mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <motion.div 
                      className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3.5 }}
                    >
                      <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    </motion.div>
                    <h3 className="text-xs font-bold text-white/90 uppercase tracking-wide">盈利榜冠军</h3>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => profitChampion && navigate(`/player/${profitChampion.id}`)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div
                      animate={{ boxShadow: ["0 0 0 0 rgba(245,158,11,0)", "0 0 0 8px rgba(245,158,11,0.3)", "0 0 0 0 rgba(245,158,11,0)"] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      className="rounded-full"
                    >
                      <Avatar className="w-12 h-12 border-2 border-white/50 shadow-lg">
                        <AvatarImage src={profitChampion?.avatarUrl} alt={profitChampion?.displayName} />
                        <AvatarFallback className="bg-amber-500 text-white">{profitChampion?.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div>
                      <p className="text-lg font-bold text-white">{maskPlayerName(profitChampion?.displayName || '')}</p>
                      <p className="text-xs text-white/70">最高盈利玩家</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-4 gap-2 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                  >
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className={`text-lg font-bold font-mono-data ${(profitChampion?.profitAmount || 0) >= 0 ? 'text-amber-400' : 'text-amber-400/60'}`}>
                        {(profitChampion?.profitAmount || 0) >= 0 ? '+' : ''}¥{((profitChampion?.profitAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] text-white/70">盈利</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">{profitChampion?.winRate?.toFixed(1) || 0}%</p>
                      <p className="text-[10px] text-white/70">胜率</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">{profitChampion?.totalPredictions || 0}</p>
                      <p className="text-[10px] text-white/70">预测</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">¥{((profitChampion?.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-white/70">投注</p>
                    </motion.div>
                  </motion.div>
                  
                  <motion.button
                    className="w-full mt-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors border border-white/20"
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
                    查看今日预测
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* 连黑榜冠军 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 100 }}
            >
              <Card className="relative overflow-hidden border-success/40 h-full">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${coldStreakChampion?.avatarUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-success/60 to-emerald-600/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                <CardContent className="p-4 sm:p-5 relative z-10">
                  <motion.div 
                    className="flex items-center gap-2 mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <motion.div 
                      className="w-6 h-6 rounded-full bg-success/30 flex items-center justify-center"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                    >
                      <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                    </motion.div>
                    <h3 className="text-xs font-bold text-white/90 uppercase tracking-wide">连黑榜冠军</h3>
                  </motion.div>
                  
                  <motion.div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => coldStreakChampion && navigate(`/player/${coldStreakChampion.id}`)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div
                      animate={{ boxShadow: ["0 0 0 0 rgba(34,197,94,0)", "0 0 0 8px rgba(34,197,94,0.3)", "0 0 0 0 rgba(34,197,94,0)"] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      className="rounded-full"
                    >
                      <Avatar className="w-12 h-12 border-2 border-white/50 shadow-lg">
                        <AvatarImage src={coldStreakChampion?.avatarUrl} alt={coldStreakChampion?.displayName} />
                        <AvatarFallback className="bg-success text-white">{coldStreakChampion?.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div>
                      <p className="text-lg font-bold text-white">{maskPlayerName(coldStreakChampion?.displayName || '')}</p>
                      <p className="text-xs text-white/70">最差连黑玩家</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-4 gap-2 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-success font-mono-data">{coldStreakChampion?.worstStreak || 0}</p>
                      <p className="text-[10px] text-white/70">连黑</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">{coldStreakChampion?.winRate?.toFixed(1) || 0}%</p>
                      <p className="text-[10px] text-white/70">胜率</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">{coldStreakChampion?.totalPredictions || 0}</p>
                      <p className="text-[10px] text-white/70">预测</p>
                    </motion.div>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-2"
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <p className="text-lg font-bold text-white font-mono-data">¥{((coldStreakChampion?.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-white/70">投注</p>
                    </motion.div>
                  </motion.div>
                  
                  <motion.button
                    className="w-full mt-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors border border-white/20"
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
                    查看今日预测
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        );
      })()}

      {/* Today Recommendations Dialog - Compact Design */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-md p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50 px-4 py-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border border-primary/30">
                  <AvatarImage src={allPlayers.find(p => p.id === selectedPlayerHistory?.playerId)?.avatarUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {selectedPlayerHistory?.playerName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-bold">{selectedPlayerHistory?.playerName}</span>
                  <p className="text-xs text-muted-foreground font-normal">今日推荐</p>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : selectedPlayerHistory && (
            <div className="p-4 space-y-4">
              {/* 玩家核心数据 */}
              {(() => {
                const player = allPlayers.find(p => p.id === selectedPlayerHistory?.playerId);
                
                return (
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold font-mono-data text-foreground">
                          {player?.winRate.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">胜率</div>
                      </div>
                      <div className="w-px h-8 bg-border/50" />
                      <div className="text-center">
                        <div className="text-lg font-bold font-mono-data text-foreground">
                          {player?.totalPredictions || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">预测</div>
                      </div>
                      <div className="w-px h-8 bg-border/50" />
                      <div className="text-center">
                        <div className="text-lg font-bold font-mono-data text-foreground">
                          {player?.bestStreak || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">连胜</div>
                      </div>
                    </div>
                    <div className={`text-right ${(player?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      <div className="text-lg font-bold font-mono-data">
                        {(player?.profit || 0) >= 0 ? '+' : ''}{((player?.profit || 0) / 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">收益率</div>
                    </div>
                  </div>
                );
              })()}
              
              {/* 今日推荐比赛 - 紧凑版 */}
              {(() => {
                const upcomingPredictions = selectedPlayerHistory.predictions.filter(p => !p.result);
                const completedPredictions = selectedPlayerHistory.predictions.filter(p => p.result);
                
                return (
                  <div className="space-y-3">
                    {/* 待开赛推荐 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                          今日推荐
                        </h4>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {upcomingPredictions.length}场
                        </span>
                      </div>
                      
                      {upcomingPredictions.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg text-xs">
                          暂无待开赛推荐
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {upcomingPredictions.slice(0, 3).map((pred, index) => {
                            // 解析推荐内容 - 只有大小球和让分胜负两种类型
                            const getRecommendedInfo = () => {
                              const prediction = pred.prediction;
                              // 大小球
                              if (prediction.includes('大') || prediction.toLowerCase().includes('over')) {
                                const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                                return { label: `大 ${line}球`, type: 'over_under' };
                              } else if (prediction.includes('小') || prediction.toLowerCase().includes('under')) {
                                const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                                return { label: `小 ${line}球`, type: 'over_under' };
                              } 
                              // 让分胜负
                              else if (prediction.includes('让分主胜') || prediction.includes('主让')) {
                                const line = prediction.match(/-?[\d.]+/)?.[0] || '-0.5';
                                return { label: `${pred.home_team || '主队'} (${line})`, type: 'handicap' };
                              } else if (prediction.includes('让分客胜') || prediction.includes('客让')) {
                                const line = prediction.match(/\+?[\d.]+/)?.[0] || '+0.5';
                                return { label: `${pred.away_team || '客队'} (+${line.replace('+', '')})`, type: 'handicap' };
                              }
                              return { label: prediction, type: 'other' };
                            };
                            const recommended = getRecommendedInfo();
                            
                            return (
                              <div 
                                key={pred.id} 
                                className="border border-border/50 rounded-lg p-3"
                              >
                                {/* 比赛对阵 */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="flex items-center gap-1.5">
                                      {getTeamLogo(pred.home_team || '') && (
                                        <img src={getTeamLogo(pred.home_team || '')!} alt="" className="w-5 h-5 object-contain" />
                                      )}
                                      <span className="font-medium">{pred.home_team || '主队'}</span>
                                    </div>
                                    <span className="text-muted-foreground text-xs">vs</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium">{pred.away_team || '客队'}</span>
                                      {getTeamLogo(pred.away_team || '') && (
                                        <img src={getTeamLogo(pred.away_team || '')!} alt="" className="w-5 h-5 object-contain" />
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    待开赛
                                  </span>
                                </div>
                                
                                {/* 推荐信息 */}
                                <div className="flex items-center justify-between py-2 border-t border-border/30">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {recommended.type === 'over_under' ? '大小球' : '让分'}
                                    </span>
                                    {copiedPredictions.has(pred.id) ? (
                                      <span className="text-xs font-semibold text-foreground">
                                        {recommended.label}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Lock className="h-3 w-3" />
                                        <span className="blur-sm select-none">
                                          {recommended.type === 'over_under' ? '大 2.5球' : '主队 (-0.5)'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    赔率 {copiedPredictions.has(pred.id) ? (
                                      <span className="font-medium text-foreground">1.80</span>
                                    ) : (
                                      <span className="blur-sm">1.80</span>
                                    )}
                                  </span>
                                </div>
                                
                                {/* 跟单按钮 */}
                                {copiedPredictions.has(pred.id) ? (
                                  <div className="mt-2 h-8 flex items-center justify-center gap-1.5 text-xs text-success bg-success/5 rounded border border-success/20">
                                    <CheckCircle2 className="h-3 w-3" />
                                    已跟单
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2 h-8 text-xs"
                                    onClick={() => handleCopyTradeFromHistory(pred)}
                                  >
                                    跟单解锁
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                          {upcomingPredictions.length > 3 && (
                            <p className="text-[10px] text-center text-muted-foreground">
                              还有 {upcomingPredictions.length - 3} 场推荐...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* 已完成比赛 */}
                    {completedPredictions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-muted-foreground">已完赛</h4>
                          <span className="text-[10px] text-muted-foreground">
                            {completedPredictions.filter(p => p.result === 'win').length}/{completedPredictions.length} 正确
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {completedPredictions.slice(0, 2).map((pred) => {
                            const getPredictionLabel = () => {
                              const prediction = pred.prediction;
                              if (prediction.includes('大') || prediction.toLowerCase().includes('over')) {
                                const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                                return `大 ${line}球`;
                              } else if (prediction.includes('小') || prediction.toLowerCase().includes('under')) {
                                const line = prediction.match(/[\d.]+/)?.[0] || '2.5';
                                return `小 ${line}球`;
                              } else if (prediction.includes('让分主胜') || prediction.includes('主让')) {
                                const line = prediction.match(/-?[\d.]+/)?.[0] || '-0.5';
                                return `${pred.home_team || '主队'} (${line})`;
                              } else if (prediction.includes('让分客胜') || prediction.includes('客让')) {
                                const line = prediction.match(/\+?[\d.]+/)?.[0] || '+0.5';
                                return `${pred.away_team || '客队'} (+${line.replace('+', '')})`;
                              }
                              return prediction;
                            };
                            
                            return (
                              <div 
                                key={pred.id} 
                                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                    pred.result === 'win' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                                  }`}>
                                    {pred.result === 'win' ? '✓' : '✗'}
                                  </span>
                                  <div>
                                    <div className="text-xs font-medium flex items-center gap-1.5">
                                      {getTeamLogo(pred.home_team || '') && (
                                        <img src={getTeamLogo(pred.home_team || '')!} alt="" className="w-4 h-4 object-contain" />
                                      )}
                                      <span>{pred.home_team}</span>
                                      <span className="text-muted-foreground">{pred.home_score ?? 0}-{pred.away_score ?? 0}</span>
                                      <span>{pred.away_team}</span>
                                      {getTeamLogo(pred.away_team || '') && (
                                        <img src={getTeamLogo(pred.away_team || '')!} alt="" className="w-4 h-4 object-contain" />
                                      )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {pred.prediction_type === 'over_under' ? '大小球' : '让分'}: {getPredictionLabel()}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-xs font-medium ${pred.result === 'win' ? 'text-success' : 'text-destructive'}`}>
                                  {pred.result === 'win' 
                                    ? `+¥${((pred.actual_payout || pred.potential_payout || pred.bet_amount * 1.8) as number).toFixed(0)}` 
                                    : `-¥${pred.bet_amount}`
                                  }
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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

              {/* 跟单比赛信息 */}
              <div className="p-3 rounded-lg border border-border/50 space-y-2">
                <div className="text-xs text-muted-foreground mb-2">跟单比赛</div>
                <div className="flex items-center justify-center gap-3 text-sm font-medium">
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span>{copyTradeDialog.prediction.home_team}</span>
                    {getTeamLogo(copyTradeDialog.prediction.home_team || '') && (
                      <img src={getTeamLogo(copyTradeDialog.prediction.home_team || '')!} alt="" className="w-6 h-6 object-contain" />
                    )}
                  </div>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">VS</span>
                  <div className="flex items-center gap-2 flex-1">
                    {getTeamLogo(copyTradeDialog.prediction.away_team || '') && (
                      <img src={getTeamLogo(copyTradeDialog.prediction.away_team || '')!} alt="" className="w-6 h-6 object-contain" />
                    )}
                    <span>{copyTradeDialog.prediction.away_team}</span>
                  </div>
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
