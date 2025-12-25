import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { GoalIcon } from "@/components/FootballIcons";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown, History, X, ExternalLink, ThumbsUp, Copy, Heart, Users, TrendingUp, TrendingDown, Minus, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import grassTexture from "@/assets/grass-texture.jpg";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";
import expertMystery from "@/assets/expert-mystery.jpg";
import mysteryIcon from "@/assets/mystery-icon.png";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AIModel } from "@/types/prediction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface TodayPosition {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  bet_type: string;
  prediction: string;
  amount: number;
  odds: number;
  status: string;
  result?: string;
  pnl?: number;
  created_at?: string;
  settled_at?: string;
}

// Mock follower data for each AI model
const generateMockFollowers = (modelId: string, count: number) => {
  const names = ['田雨', '慢慢扛', '小明', '阿杰', '球迷王', '预测达人', '足彩老手', '胜率之王', '稳赚不赔', '神预测'];
  const avatars = ['/avatars/avatar-1.png', '/avatars/avatar-2.png', '/avatars/avatar-3.png', '/avatars/avatar-4.png', '/avatars/avatar-5.png', '/avatars/avatar-6.png'];
  
  return Array.from({ length: Math.min(count, 20) }, (_, i) => {
    const isTop3 = i < 3;
    const baseCopyAmount = isTop3 ? 800 + Math.random() * 600 : 200 + Math.random() * 500;
    const profit = (Math.random() - 0.3) * baseCopyAmount * 0.3;
    
    return {
      id: `${modelId}-follower-${i}`,
      rank: i + 1,
      name: Math.random() > 0.5 
        ? names[Math.floor(Math.random() * names.length)] 
        : `${Math.floor(100 + Math.random() * 900)}***${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      days: Math.floor(1 + Math.random() * 30),
      profit: profit,
      copyAmount: baseCopyAmount,
    };
  });
};

// Model Points Data (stable values for each AI model)
const modelPointsData: Record<string, number> = {
  'deepseek': 14520,
  'gpt5': 12830,
  'gemini': 11650,
  'claude': 13280,
  'grok': 10950,
  'hunsoccer-max': 15200,
};

// Animated Points Balance Component
const AnimatedPointsBalance = ({ modelId }: { modelId: string }) => {
  const basePoints = modelPointsData[modelId] || 10000;
  
  const animatedValue = useCountAnimation(basePoints, {
    duration: 1500,
    startValue: 0
  });
  
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="font-mono"
    >
      {Math.round(animatedValue).toLocaleString()}PTS
    </motion.span>
  );
};

// Animated Follower Count Component
const AnimatedFollowerCount = ({ value, limit, onClick }: { value: number; limit: number; onClick: () => void }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    // Simulate real-time growth (but don't exceed limit)
    const interval = setInterval(() => {
      setDisplayValue(prev => {
        if (prev >= limit) return prev;
        const increment = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
        return Math.min(prev + increment, limit);
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [limit]);
  
  const animatedValue = useCountAnimation(displayValue, {
    duration: 800,
    startValue: Math.max(0, displayValue - 5)
  });
  
  const isFull = displayValue >= limit;
  
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1 text-xs transition-colors cursor-pointer hover:underline ${
        isFull ? 'text-destructive hover:text-destructive/80' : 'text-primary hover:text-primary/80'
      }`}
    >
      <span>👥 追踪人数: {Math.floor(animatedValue).toLocaleString()}/{limit.toLocaleString()}</span>
    </button>
  );
};

// Animated Profit Rate Badge Component
const ProfitRateBadge = ({ value, locked }: { value: number; locked?: boolean }) => {
  const animatedValue = useCountAnimation(value, {
    duration: 1200,
    startValue: 0
  });
  
  const isPositive = value >= 0;
  
  if (locked) {
    return (
      <span className="px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold bg-muted/50 text-muted-foreground border border-border/30">
        ???
      </span>
    );
  }
  
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-300 ${
      isPositive 
        ? 'bg-success/20 text-success border border-success/30' 
        : 'bg-destructive/20 text-destructive border border-destructive/30'
    }`}>
      {isPositive ? '+' : ''}{animatedValue.toFixed(2)}%
    </span>
  );
};

// Total Profit Rate Badge Component with Animation
const TotalProfitRateBadge = ({ totalProfit, totalVolume }: { totalProfit: number; totalVolume: number }) => {
  // Calculate realistic profit rate as percentage (typically between -50% to +100%)
  const rawRate = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;
  // Clamp to realistic range and add some variance
  const profitRate = Math.max(-45, Math.min(85, rawRate * 0.8 + 12.5));
  const animatedValue = useCountAnimation(Math.abs(profitRate), {
    duration: 1500,
    startValue: 0
  });
  
  // Simulate trend based on profit rate (positive rate = likely uptrend)
  const trendValue = profitRate > 5 ? 'up' : profitRate < -5 ? 'down' : 'neutral';
  const isPositive = profitRate >= 0;
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-muted-foreground">总收益率</span>
      <div className="flex items-center gap-1">
        <span className={`text-lg font-bold font-mono-data ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? '+' : '-'}{animatedValue.toFixed(1)}%
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.3 }}
        >
          {trendValue === 'up' && (
            <TrendingUp className="h-4 w-4 text-success" />
          )}
          {trendValue === 'down' && (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          {trendValue === 'neutral' && (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
        </motion.span>
      </div>
    </div>
  );
};

// AI模型分析优点映射
const aiModelAdvantages: Record<string, string> = {
  'deepseek': '擅长深度数据挖掘与趋势分析',
  'gpt5': '多维度综合分析，逻辑推理强',
  'claude': '稳健策略分析，风险控制出色',
  'gemini': '实时数据整合，反应速度快',
  'grok': '另类视角分析，发现冷门机会',
  'hunsoccer-max': '专精足球领域，本土化数据优势',
};

const LeaderboardTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modelsWithRealData, setModelsWithRealData] = useState<AIModel[]>(aiModels);
  const [isLoading, setIsLoading] = useState(true);
  const [todayWinRates, setTodayWinRates] = useState<Map<string, { winRate: number; total: number; correct: number }>>(new Map());
  const [timeRange, setTimeRange] = useState<1 | 7 | 30>(7);
  const [selectedModelHistory, setSelectedModelHistory] = useState<{ modelId: string; modelName: string; positions: TodayPosition[] } | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [userProfile, setUserProfile] = useState<{ display_name: string; avatar_url: string } | null>(null);
  const [likedModels, setLikedModels] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [isLiking, setIsLiking] = useState<Set<string>>(new Set());
  const [floatingHearts, setFloatingHearts] = useState<Map<string, number[]>>(new Map());
  const [copyTradeModel, setCopyTradeModel] = useState<{ id: string; name: string } | null>(null);
  const [isCopyTradeDialogOpen, setIsCopyTradeDialogOpen] = useState(false);
  const [copyTradeAmount, setCopyTradeAmount] = useState<number>(100);
  const [isCopyTrading, setIsCopyTrading] = useState(false);
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false);
  const [selectedModelFollowers, setSelectedModelFollowers] = useState<{ modelId: string; modelName: string; followers: any[] } | null>(null);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('users')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setUserProfile(data);
      };
      fetchProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // 使用本地模拟点赞数据（点赞表不存在，使用内存状态）
  useEffect(() => {
    // 初始化模拟点赞数
    const initLikeCounts = new Map<string, number>();
    aiModels.forEach(model => {
      // 根据模型ID生成随机但稳定的点赞数
      const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      initLikeCounts.set(model.id, Math.floor((seed % 500) + 100));
    });
    setLikeCounts(initLikeCounts);
  }, []);

  // 使用模拟数据生成AI模型统计（sim_positions表不存在）
  useEffect(() => {
    const generateAIStats = () => {
      setIsLoading(true);
      
      // 为每个AI模型生成稳定的模拟数据
      const updatedModels = aiModels.map(model => {
        // 使用模型ID生成稳定的随机种子
        const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // 根据时间范围调整预测数量
        const basePredictions = timeRange === 1 ? 5 : timeRange === 7 ? 25 : 80;
        const totalPredictions = basePredictions + (seed % 10);
        
        // 生成稳定的胜率（55%-75%之间）
        const baseWinRate = 55 + (seed % 20);
        const winRate = baseWinRate + (Math.sin(seed) * 5);
        const correctPredictions = Math.round(totalPredictions * (winRate / 100));
        
        // 计算投注和盈利数据
        const avgBetAmount = 200 + (seed % 100);
        const totalBetAmount = totalPredictions * avgBetAmount;
        const avgOdds = 1.8 + (seed % 5) * 0.1;
        const validAmount = correctPredictions * avgBetAmount * avgOdds;
          const profitAmount = validAmount - totalBetAmount;
          const profitRate = totalBetAmount > 0 ? (profitAmount / totalBetAmount) * 100 : 0;
          
        return {
          ...model,
          winRate: Math.round(winRate * 10) / 10,
          totalPredictions,
          correctPredictions,
            totalBetAmount,
            validAmount,
            profitAmount,
          profitRate: Math.round(profitRate * 10) / 10,
          accuracy: Math.round(winRate * 10) / 10,
          };
        });

        setModelsWithRealData(updatedModels);
        setIsLoading(false);
    };

    generateAIStats();
  }, [timeRange]);

  // 生成今日胜率模拟数据（不再查询不存在的表）
  useEffect(() => {
    const generateTodayWinRates = () => {
      const todayWinRatesMap = new Map<string, { winRate: number; total: number; correct: number }>();
      
      aiModels.forEach(model => {
        const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const total = 3 + (seed % 4);
        const correct = Math.round(total * (0.5 + (seed % 30) / 100));
        const winRate = total > 0 ? (correct / total) * 100 : 0;
        todayWinRatesMap.set(model.id, { winRate, total, correct });
        });

        setTodayWinRates(todayWinRatesMap);
    };

    generateTodayWinRates();
  }, []);

  // 获取指定 AI 的今日历史记录（使用模拟数据）
  const fetchTodayHistory = (modelId: string, modelName: string) => {
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

        const todayData = todayWinRates.get(modelId);
        const total = todayData?.total || Math.floor(Math.random() * 5) + 3;
        const correct = todayData?.correct || Math.floor(total * 0.6);
        
        const mockPositions: TodayPosition[] = [];
        for (let i = 0; i < total; i++) {
          const match = mockMatches[i % mockMatches.length];
          const isWin = i < correct;
          const amount = Math.floor(Math.random() * 400) + 100;
          const odds = (Math.random() * 0.8 + 1.5).toFixed(2);
          mockPositions.push({
            id: `mock-${modelId}-${i}`,
            match_id: `${1000 + i}`,
            home_team: match.home,
            away_team: match.away,
            bet_type: Math.random() > 0.5 ? 'over_under' : 'handicap',
            prediction: Math.random() > 0.5 ? 'Over 2.5' : 'Under 2.5',
            amount,
            odds: parseFloat(odds),
            status: 'settled',
            result: isWin ? 'win' : 'loss',
            pnl: isWin ? amount * (parseFloat(odds) - 1) : -amount,
            created_at: new Date(Date.now() - i * 3600000).toISOString(),
          });
        }
    
        setSelectedModelHistory({ modelId, modelName, positions: mockPositions });
    setIsLoadingHistory(false);
  };

  // 处理跟单
  const handleCopyTrade = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "登录后即可订阅AI模型",
        variant: "default",
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
        toast({
          title: "获取余额失败",
          description: "请稍后重试",
          variant: "destructive",
        });
        return;
      }

      if (balanceData.balance < copyTradeAmount) {
        toast({
          title: "余额不足",
          description: `当前余额: ${balanceData.balance.toFixed(2)} PTS，需要: ${copyTradeAmount} PTS`,
          variant: "destructive",
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

      toast({
        title: "订阅成功！",
        description: `已订阅 ${copyTradeModel.name}，投入 ${copyTradeAmount} PTS`,
      });

      setIsCopyTradeDialogOpen(false);
      setCopyTradeModel(null);
      setCopyTradeAmount(100);
    } catch (error) {
      console.error('Copy trade error:', error);
      toast({
        title: "订阅失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsCopyTrading(false);
    }
  };

  const openCopyTradeDialog = (modelId: string, modelName: string) => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "登录后即可订阅AI模型",
        variant: "default",
      });
      navigate('/auth');
      return;
    }
    setCopyTradeModel({ id: modelId, name: modelName });
    setIsCopyTradeDialogOpen(true);
  };

  // Calculate additional stats for each model
  const enhancedModels = modelsWithRealData
    .map(model => ({
      ...model,
      correctPredictions: (model as any).correctPredictions || 0,
      totalBetAmount: (model as any).totalBetAmount || 0,
      validAmount: (model as any).validAmount || 0,
      profitAmount: (model as any).profitAmount || 0,
      profitRate: (model as any).profitRate || 0,
      accuracy: (model as any).accuracy || model.winRate,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const winningModel = enhancedModels[0];

  const getModelIcon = (modelId: string) => {
    if (modelId === 'hunsoccermax') {
      return user && userProfile?.avatar_url ? userProfile.avatar_url : hunsoccerIcon;
    }
    const icons: Record<string, string> = {
      'deepseek': deepseekIcon,
      'qwen': deepseekIcon,
      'claude': claudeIcon,
      'grok': grokIcon,
      'gemini': geminiIcon,
      'gpt': gpt5Icon,
      'gpt5': gpt5Icon,
      'mystery': mysteryIcon,
    };
    return icons[modelId] || gpt5Icon;
  };

  const getModelDisplayName = (model: AIModel) => {
    if (model.id === 'hunsoccermax') {
      return user && userProfile?.display_name ? userProfile.display_name : t('demo_player');
    }
    // 只显示第一个单词（基础名字），不显示版本号，与 ModelCard 和首页一致
    return model.displayName.split(' ')[0];
  };

  const getExpertImage = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return starRonaldo;
      case 'gpt5':
        return starNeymar;
      case 'claude':
        return starMessi;
      case 'gemini':
        return starHaaland;
      case 'grok':
        return starMbappe;
      case 'mystery':
        return expertMystery;
      case 'hunsoccermax':
        return starHunsoccer;
      default:
        return starRonaldo;
    }
  };

  const getColorTint = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
      case 'gpt5':
        return 'from-[hsl(0,0%,35%)]/80 to-[hsl(0,0%,20%)]/80';
      case 'claude':
        return 'from-[hsl(14,92%,68%)]/80 to-[hsl(14,92%,50%)]/80';
      case 'gemini':
        return 'from-[hsl(250,75%,68%)]/80 to-[hsl(250,75%,50%)]/80';
      case 'grok':
        return 'from-[hsl(158,68%,60%)]/80 to-[hsl(158,68%,45%)]/80';
      case 'mystery':
        return 'from-[hsl(45,100%,55%)]/80 to-[hsl(45,100%,45%)]/80';
      case 'hunsoccermax':
        return 'from-[hsl(38,92%,50%)]/80 to-[hsl(38,92%,40%)]/80';
      default:
        return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
    }
  };

  return (
    <div className="space-y-6">
      {/* Leaderboard Table */}
      <Card className="border-border/30 bg-card overflow-hidden shadow-sm">
        <CardHeader className="px-3 sm:px-4 py-3 sm:py-4 border-b border-border/30 bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">{t('all_models')}</CardTitle>
            {/* Time Range Filter - 时间筛选按钮 */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setTimeRange(1)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-medium transition-colors ${
                  timeRange === 1
                    ? 'bg-foreground text-background' 
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                日
              </button>
              <button
                onClick={() => setTimeRange(7)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-medium transition-colors ${
                  timeRange === 7
                    ? 'bg-foreground text-background' 
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                周
              </button>
              <button
                onClick={() => setTimeRange(30)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-medium transition-colors ${
                  timeRange === 30
                    ? 'bg-foreground text-background' 
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                月
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {/* AI Model Cards */}
          <div className="space-y-3">
            {enhancedModels.map((model, index) => {
              const isLiked = likedModels.has(model.id);
              const likeCount = likeCounts.get(model.id) || 0;
              const isLoading = isLiking.has(model.id);
              
              const handleLike = (e: React.MouseEvent) => {
                e.stopPropagation();
                
                if (!user) {
                  toast({
                    title: "请先登录",
                    description: "登录后即可点赞",
                    variant: "default",
                  });
                  return;
                }

                if (isLiking.has(model.id)) {
                  return;
                }

                const isCurrentlyLiked = likedModels.has(model.id);

                if (isCurrentlyLiked) {
                  // 取消点赞 - 只更新本地状态
                  setLikedModels(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(model.id);
                    return newSet;
                  });
                  setLikeCounts(prev => {
                    const newMap = new Map(prev);
                    const currentCount = newMap.get(model.id) || 0;
                    newMap.set(model.id, Math.max(0, currentCount - 1));
                    return newMap;
                  });
                } else {
                  // 点赞 - 只更新本地状态
                  setLikedModels(prev => new Set(prev).add(model.id));
                  setLikeCounts(prev => {
                    const newMap = new Map(prev);
                    const currentCount = newMap.get(model.id) || 0;
                    newMap.set(model.id, currentCount + 1);
                    return newMap;
                  });
                  
                  // Trigger floating hearts animation
                  const heartIds = [Date.now(), Date.now() + 1, Date.now() + 2];
                  setFloatingHearts(prev => {
                    const newMap = new Map(prev);
                    newMap.set(model.id, heartIds);
                    return newMap;
                  });
                  // Clear hearts after animation completes
                  setTimeout(() => {
                    setFloatingHearts(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(model.id);
                      return newMap;
                    });
                  }, 2000);
                }
              };

              // Get profit data
              const profitAmount = (model as any).profitAmount || 0;
              const profitRate = (model as any).profitRate || 0;
              const generateChartPath = () => {
                const points = [];
                const width = 80;
                const height = 24;
                const numPoints = 8;
                
                for (let i = 0; i < numPoints; i++) {
                  const x = (i / (numPoints - 1)) * width;
                  const variance = Math.random() * 8 - 4;
                  const trend = profitAmount >= 0 ? (i / numPoints) * 12 : -(i / numPoints) * 8;
                  const y = height / 2 - trend + variance;
                  points.push(`${i === 0 ? 'M' : 'L'}${x},${Math.max(2, Math.min(height - 2, y))}`);
                }
                return points.join(' ');
              };
              
              return (
                <div 
                      key={model.id}
                  className="bg-muted/20 rounded-lg border border-border/30 p-3 sm:p-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Top Row: Avatar, Name, Buttons */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                        </div>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${model.id === 'hunsoccermax' && user ? 'rounded-full' : 'rounded-lg'} bg-background/60 p-1.5 flex items-center justify-center border border-border/40 overflow-hidden`}>
                            <img 
                              src={getModelIcon(model.id)} 
                              alt={model.name} 
                              className={`w-full h-full ${model.id === 'hunsoccermax' && user ? 'object-cover' : 'object-contain'}`}
                              style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                            />
                          </div>
                        </div>
                      {/* Name & Stats */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm sm:text-base text-foreground">{getModelDisplayName(model)}</span>
                          {/* Like Button */}
                          <div className="relative">
                            <button
                              onClick={handleLike}
                              disabled={isLoading}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-all shadow-sm ${
                                isLoading ? 'opacity-50 cursor-not-allowed' : ''
                              } ${
                                isLiked 
                                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                  : 'bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                              title={isLiked ? '取消点赞' : '点赞'}
                            >
                              <ThumbsUp className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
                              <span className="text-[10px] font-medium">{likeCount}</span>
                            </button>
                            {/* Floating Hearts Animation */}
                            <AnimatePresence>
                              {floatingHearts.get(model.id)?.map((heartId, idx) => (
                                <motion.div
                                  key={heartId}
                                  initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                                  animate={{ 
                                    opacity: 0, 
                                    y: -40, 
                                    x: (idx - 1) * 12,
                                    scale: 1,
                                    rotate: (idx - 1) * 15
                                  }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none"
                                >
                                  <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                          积分余额：<AnimatedPointsBalance modelId={model.id} />（初始积分10,000PTS）
                        </p>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => navigate('/history')}
                        className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
                      >
                        历史预测
                      </button>
                      {(() => {
                        const isFull = ((model as any).followerCount || 0) >= ((model as any).followerLimit || 1000);
                        return (
                          <button 
                            onClick={() => {
                              if (isFull) {
                                toast({
                                  title: "订阅名额已满",
                                  description: `${getModelDisplayName(model)} 的订阅名额已满，请稍后再试或选择其他AI模型`,
                                  variant: "destructive",
                                });
                                return;
                              }
                              openCopyTradeDialog(model.id, getModelDisplayName(model));
                            }}
                            disabled={isFull}
                            className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                              isFull 
                                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60' 
                                : 'bg-warning text-warning-foreground hover:bg-warning/90'
                            }`}
                          >
                            {isFull ? '名额已满' : '自动追踪'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Stats Grid - Row 1: 预测, 正确场次, 错误场次, 胜率 */}
                  <div className="grid grid-cols-4 gap-3 sm:gap-4">
                    {/* Total Predictions */}
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">预测</p>
                      <p className="text-sm sm:text-lg font-bold font-mono-data text-foreground">
                        {model.totalPredictions || 0}场
                      </p>
                    </div>
                    
                    {/* Correct Predictions */}
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">正确</p>
                      <p className="text-sm sm:text-lg font-bold font-mono-data text-success">
                        {model.locked ? '???' : `${(model as any).correctPredictions || 0}场`}
                      </p>
                    </div>
                    
                    {/* Incorrect Predictions */}
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">错误</p>
                      <p className="text-sm sm:text-lg font-bold font-mono-data text-destructive">
                        {model.locked ? '???' : `${(model.totalPredictions || 0) - ((model as any).correctPredictions || 0)}场`}
                      </p>
                    </div>
                    
                    {/* Win Rate */}
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">预测准确率</p>
                        <AnimatedWinRate 
                          value={model.winRate}
                        className="text-sm sm:text-lg font-bold font-mono-data text-success"
                        trend={todayWinRates.get(model.id) ? todayWinRates.get(model.id)!.winRate - model.winRate : undefined}
                        showTrend={todayWinRates.has(model.id)}
                      />
                    </div>
                  </div>
                  
                  {/* Stats Grid - Row 2: 投注金额, 盈利金额, 盈利率, 跟单人数 */}
                  <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-3 pt-3 border-t border-border/50">
                    {/* Bet Amount */}
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">模拟投入</p>
                      <p className="text-sm sm:text-base font-bold font-mono-data text-foreground">
                          {model.locked ? '???' : `${((model as any).totalBetAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PTS`}
                      </p>
            </div>
                    
                    {/* Profit Amount */}
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">模拟积分</p>
                      <p className={`text-sm sm:text-base font-bold font-mono-data ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {model.locked ? '???' : `${profitAmount >= 0 ? '+' : '-'}${Math.abs(profitAmount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PTS`}
                      </p>
                    </div>
                    
                    {/* Profit Rate */}
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">积分变化率</p>
                      <p className={`text-sm sm:text-base font-bold font-mono-data ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {model.locked ? '???' : `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(1)}%`}
                      </p>
                    </div>
                    
                    {/* Copy Traders - Clickable */}
                    <div 
                      className="text-right cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
                      onClick={() => {
                        const followers = generateMockFollowers(model.id, (model as any).followerCount || 0);
                        setSelectedModelFollowers({ modelId: model.id, modelName: getModelDisplayName(model), followers });
                        setIsFollowersDialogOpen(true);
                      }}
                    >
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center justify-end gap-1"><Users className="h-3 w-3" fill="currentColor" />追踪人数</p>
                      <p className="text-sm sm:text-base font-bold font-mono-data text-primary hover:underline">
                        {((model as any).followerCount || 0).toLocaleString()}人
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

          {/* Bottom Section: Winning Model + Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Winning Model Card */}
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
              
              <CardContent className="p-4 sm:p-6 relative z-10">
                <h3 className="text-xs sm:text-sm font-bold mb-3 sm:mb-4 text-white/80">{t('winning_model').toUpperCase()}</h3>
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <img 
                    src={getModelIcon(winningModel.id)} 
                    alt={winningModel.name} 
                    className={`h-8 w-8 sm:h-10 sm:w-10 ${winningModel.id === 'hunsoccermax' && user ? 'rounded-full object-cover' : ''}`}
                    style={winningModel.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                  />
                  <span className="text-lg sm:text-xl font-bold text-white">{getModelDisplayName(winningModel)}</span>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-white/70 mb-1">{t('win_rate_label').toUpperCase()}</p>
                    <p className="text-xl sm:text-2xl font-bold font-mono-data text-white">
                      <AnimatedWinRate 
                        value={winningModel.winRate}
                        className="text-xl sm:text-2xl font-bold font-mono-data text-white"
                      />
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs sm:text-sm text-white/70 mb-1">{t('correct_predictions_label').toUpperCase()}</p>
                    <p className="text-lg sm:text-xl font-bold font-mono-data text-success">
                      {winningModel.correctPredictions} / {winningModel.totalPredictions}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs sm:text-sm text-white/70 mb-2 sm:mb-3">{t('active_matches').toUpperCase()}</p>
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      <div className="px-2 sm:px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs text-white flex items-center gap-1">
                        <GoalIcon size={14} className="flex-shrink-0" />
                        <span>Premier League</span>
                      </div>
                      <div className="px-2 sm:px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs text-white flex items-center gap-1">
                        <GoalIcon size={14} className="flex-shrink-0" />
                        <span>La Liga</span>
                      </div>
                      <div className="px-2 sm:px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs text-white hidden sm:inline-flex items-center gap-1">
                        <GoalIcon size={14} className="flex-shrink-0" />
                        <span>Bundesliga</span>
                      </div>
                    </div>
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
                <div className="flex items-end gap-2 sm:gap-4 h-[240px] sm:h-[320px]">
                  {(() => {
                    // 固定基准：100% 胜率对应最大高度
                    const maxHeight = 240; // 最大高度（px），对应容器高度
                    const minHeight = 40; // 最小高度（px），确保即使胜率为0也可见
                    const baseWinRate = 100; // 基准胜率（100%）
                    
                    return enhancedModels.map((model) => {
                      // 基于胜率百分比直接计算高度
                      // 100% 胜率对应 maxHeight，0% 对应 minHeight
                      // 公式：height = (winRate / 100) * (maxHeight - minHeight) + minHeight
                      const heightRatio = Math.min(model.winRate / baseWinRate, 1); // 限制最大为1（100%）
                      const heightPx = heightRatio * (maxHeight - minHeight) + minHeight;
                      
                      return (
                        <div key={model.id} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 min-w-0">
                          <div className="text-[10px] sm:text-sm font-mono-data font-bold mb-1 sm:mb-2">
                            <AnimatedWinRate 
                              value={model.winRate}
                              className="text-[10px] sm:text-sm font-mono-data font-bold"
                            />
                          </div>
                          <div 
                            className="w-full rounded-t-lg relative flex items-end justify-center pb-2 sm:pb-4 transition-all duration-300 hover:opacity-80 shadow-lg"
                            style={{ 
                              height: `${heightPx}px`,
                              backgroundColor: `hsl(var(--${model.color}))`,
                            }}
                          >
                            <img 
                              src={getModelIcon(model.id)} 
                              alt={model.name}
                              className="h-5 w-5 sm:h-8 sm:w-8 object-contain"
                              style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                            />
                          </div>
                          <div className="text-[9px] sm:text-xs text-center font-medium text-muted-foreground truncate max-w-full px-1">
                            {model.displayName.split(' ')[0]}...
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Note */}
          <p className="text-sm text-muted-foreground">
            <span className="font-bold">{t('note')}:</span> {t('statistics_note')}
          </p>

      {/* Today History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {selectedModelHistory?.modelName} - {t('today_history')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : selectedModelHistory?.positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('no_history_today')}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedModelHistory?.positions.map((pos) => (
                  <div 
                    key={pos.id}
                    className={`p-3 rounded-lg border ${
                      pos.status === 'settled' 
                        ? pos.result === 'win' 
                          ? 'bg-success/10 border-success/30' 
                          : 'bg-destructive/10 border-destructive/30'
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">
                        {pos.home_team} vs {pos.away_team}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        pos.status === 'settled'
                          ? pos.result === 'win'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {pos.status === 'settled' 
                          ? pos.result === 'win' ? t('win') : t('loss')
                          : t('pending')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t('bet_type')}:</span>
                        <span className="ml-1 font-medium">{pos.bet_type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('prediction')}:</span>
                        <span className="ml-1 font-medium">{pos.prediction}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('bet_amount')}:</span>
                        <span className="ml-1 font-medium">${pos.amount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('odds')}:</span>
                        <span className="ml-1 font-medium">{pos.odds?.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {pos.status === 'settled' && pos.pnl !== undefined && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">{t('profit_loss')}:</span>
                        <span className={`ml-1 font-bold ${pos.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(pos.created_at), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Trade Dialog */}
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
                  src={copyTradeModel ? getModelIcon(copyTradeModel.id) : ''} 
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
                    className={`py-2 text-sm font-medium rounded-md transition-colors ${
                      copyTradeAmount === amount
                        ? 'bg-warning text-warning-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {amount} PTS
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

      {/* Followers Dialog */}
      <Dialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {selectedModelFollowers?.modelName} - 订阅用户
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    更新于 {new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <TotalProfitRateBadge 
                  totalProfit={selectedModelFollowers?.followers.reduce((sum, f) => sum + f.profit, 0) || 0}
                  totalVolume={selectedModelFollowers?.followers.reduce((sum, f) => sum + f.totalVolume, 0) || 1}
                />
              </div>
            </DialogHeader>
          </div>
          
          {/* Table Header */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-5 py-2.5 border-y border-border/50 bg-muted/30">
            <span>排名</span>
            <span>玩家收益 | 带单规模</span>
          </div>
          
          {/* Followers List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
            {selectedModelFollowers?.followers.map((follower, index) => (
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
                      <span className="text-base font-bold text-muted-foreground">{follower.rank}</span>
                    )}
                  </div>
                  
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border-2 border-border/50">
                    <img src={follower.avatar} alt={follower.name} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Name & Count */}
                  <div>
                    <p className="font-bold text-sm text-foreground">{follower.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      已订阅{follower.days}次
                    </p>
                  </div>
                </div>
                
                {/* Right: Profit & Copy Amount */}
                <div className="text-right">
                  <p className={`font-bold text-lg tabular-nums ${follower.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {follower.profit >= 0 ? '+' : ''}{follower.profit.toFixed(2)}
                  </p>
                  <p className="text-xs text-warning flex items-center justify-end mt-0.5">
                    <span className="tabular-nums font-medium">{follower.copyAmount.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Close Button */}
          <div className="px-5 pb-5 pt-3">
            <button
              onClick={() => setIsFollowersDialogOpen(false)}
              className="w-full py-3 text-sm font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              关闭
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {t('leaderboard_disclaimer')}
        </p>
      </div>
    </div>
  );
};
export default LeaderboardTable;
