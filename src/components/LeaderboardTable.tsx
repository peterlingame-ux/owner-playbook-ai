import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown, History, X, ThumbsUp, Copy, Heart, Users, TrendingUp, TrendingDown, Minus, Wallet, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import mysteryIcon from "@/assets/mystery-icon.png";
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
      {Math.round(animatedValue).toLocaleString()}
    </motion.span>
  );
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

  // 使用本地模拟点赞数据
  useEffect(() => {
    const initLikeCounts = new Map<string, number>();
    aiModels.forEach(model => {
      const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      initLikeCounts.set(model.id, Math.floor((seed % 500) + 100));
    });
    setLikeCounts(initLikeCounts);
  }, []);

  // 生成AI模型统计
  useEffect(() => {
    const generateAIStats = () => {
      setIsLoading(true);
      
      const updatedModels = aiModels.map(model => {
        const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const basePredictions = timeRange === 1 ? 5 : timeRange === 7 ? 25 : 80;
        const totalPredictions = basePredictions + (seed % 10);
        const baseWinRate = 55 + (seed % 20);
        const winRate = baseWinRate + (Math.sin(seed) * 5);
        const correctPredictions = Math.round(totalPredictions * (winRate / 100));
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

  // 生成今日胜率模拟数据
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

  // 获取指定 AI 的今日历史记录
  const fetchTodayHistory = (modelId: string, modelName: string) => {
    setIsLoadingHistory(true);
    setIsHistoryDialogOpen(true);
    
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
    return model.displayName.split(' ')[0];
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { bg: 'bg-amber-500', text: 'text-white', label: '1' };
    if (index === 1) return { bg: 'bg-slate-400', text: 'text-white', label: '2' };
    if (index === 2) return { bg: 'bg-amber-700', text: 'text-white', label: '3' };
    return { bg: 'bg-muted', text: 'text-muted-foreground', label: `${index + 1}` };
  };

  return (
    <div className="space-y-4">
      {/* Header with Time Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">{t('all_models')}</h2>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {[
            { value: 1, label: '24H' },
            { value: 7, label: '7D' },
            { value: 30, label: '30D' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeRange(item.value as 1 | 7 | 30)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                timeRange === item.value
                  ? 'bg-foreground text-background shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Model Cards - Clean Grid Layout */}
      <div className="grid gap-3">
        {enhancedModels.map((model, index) => {
          const isLiked = likedModels.has(model.id);
          const likeCount = likeCounts.get(model.id) || 0;
          const isLoading = isLiking.has(model.id);
          const rankBadge = getRankBadge(index);
          const profitAmount = (model as any).profitAmount || 0;
          const profitRate = (model as any).profitRate || 0;
          
          const handleLike = (e: React.MouseEvent) => {
            e.stopPropagation();
            
            if (!user) {
              toast({ title: "请先登录", description: "登录后即可点赞", variant: "default" });
              return;
            }

            if (isLiking.has(model.id)) return;

            const isCurrentlyLiked = likedModels.has(model.id);

            if (isCurrentlyLiked) {
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
              setLikedModels(prev => new Set(prev).add(model.id));
              setLikeCounts(prev => {
                const newMap = new Map(prev);
                const currentCount = newMap.get(model.id) || 0;
                newMap.set(model.id, currentCount + 1);
                return newMap;
              });
              
              const heartIds = [Date.now(), Date.now() + 1, Date.now() + 2];
              setFloatingHearts(prev => {
                const newMap = new Map(prev);
                newMap.set(model.id, heartIds);
                return newMap;
              });
              setTimeout(() => {
                setFloatingHearts(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(model.id);
                  return newMap;
                });
              }, 2000);
            }
          };
          
          return (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group bg-card border border-border/50 rounded-xl p-4 hover:border-border hover:shadow-sm transition-all duration-200"
            >
              {/* Top Section: Rank + Avatar + Name + Actions */}
              <div className="flex items-center gap-3 mb-4">
                {/* Rank Badge */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-full ${rankBadge.bg} flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${rankBadge.text}`}>{rankBadge.label}</span>
                </div>
                
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 ${model.id === 'hunsoccermax' && user ? 'rounded-full' : 'rounded-lg'} bg-muted/50 p-1.5 flex items-center justify-center overflow-hidden`}>
                    <img 
                      src={getModelIcon(model.id)} 
                      alt={model.name} 
                      className={`w-full h-full ${model.id === 'hunsoccermax' && user ? 'object-cover' : 'object-contain'}`}
                      style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                    />
                  </div>
                </div>
                
                {/* Name & Balance */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base text-foreground truncate">{getModelDisplayName(model)}</span>
                    {/* Like Button */}
                    <div className="relative">
                      <button
                        onClick={handleLike}
                        disabled={isLoading}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all text-xs ${
                          isLoading ? 'opacity-50' : ''
                        } ${
                          isLiked 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <ThumbsUp className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
                        <span className="font-medium">{likeCount}</span>
                      </button>
                      <AnimatePresence>
                        {floatingHearts.get(model.id)?.map((heartId, idx) => (
                          <motion.div
                            key={heartId}
                            initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                            animate={{ opacity: 0, y: -30, x: (idx - 1) * 10, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none"
                          >
                            <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    <span><AnimatedPointsBalance modelId={model.id} /> PTS</span>
                    <span className="text-muted-foreground/60">(初始 10,000)</span>
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => navigate('/history')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {t('history')}
                  </button>
                  <button 
                    onClick={() => openCopyTradeDialog(model.id, getModelDisplayName(model))}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
                  >
                    {t('subscribe')}
                  </button>
                </div>
              </div>
              
              {/* Stats Grid - Modern 4-column layout */}
              <div className="grid grid-cols-4 gap-4 py-3 border-y border-border/30">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Predictions</p>
                  <p className="text-lg font-bold font-mono-data text-foreground">{model.totalPredictions}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Win / Loss</p>
                  <p className="text-lg font-bold font-mono-data">
                    <span className="text-success">{model.correctPredictions}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-destructive">{model.totalPredictions - model.correctPredictions}</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accuracy</p>
                  <AnimatedWinRate 
                    value={model.winRate}
                    className="text-lg font-bold font-mono-data text-foreground"
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">P&L</p>
                  <p className={`text-lg font-bold font-mono-data ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              {/* Bottom Stats Row */}
              <div className="flex items-center justify-between pt-3 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Volume: </span>
                    <span className="font-medium font-mono-data text-foreground">
                      {model.locked ? '???' : `${((model as any).totalBetAmount || 0).toLocaleString()} PTS`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit: </span>
                    <span className={`font-medium font-mono-data ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {model.locked ? '???' : `${profitAmount >= 0 ? '+' : ''}${profitAmount.toLocaleString()} PTS`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const followers = generateMockFollowers(model.id, (model as any).followerCount || 0);
                    setSelectedModelFollowers({ modelId: model.id, modelName: getModelDisplayName(model), followers });
                    setIsFollowersDialogOpen(true);
                  }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">{((model as any).followerCount || 0).toLocaleString()} followers</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center py-2">
        {t('note')}: {t('statistics_note')}
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
                      {format(new Date(pos.created_at || ''), 'HH:mm')}
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
              <Copy className="w-5 h-5" />
              Subscribe to {copyTradeModel?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
                <p className="text-xs text-muted-foreground">Follow AI predictions automatically</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Amount (PTS)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[50, 100, 200, 500].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCopyTradeAmount(amount)}
                    className={`py-2 text-sm font-medium rounded-lg transition-colors ${
                      copyTradeAmount === amount
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={copyTradeAmount}
                onChange={(e) => setCopyTradeAmount(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                placeholder="Custom amount"
                min={10}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsCopyTradeDialogOpen(false)}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCopyTrade}
              disabled={isCopyTrading || copyTradeAmount < 10}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCopyTrading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followers Dialog */}
      <Dialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedModelFollowers?.modelName} - Followers
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {selectedModelFollowers?.followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No followers yet
              </div>
            ) : (
              <div className="space-y-2">
                {selectedModelFollowers?.followers.map((follower) => (
                  <div 
                    key={follower.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-semibold text-muted-foreground">{follower.rank}</span>
                    </div>
                    <img 
                      src={follower.avatar} 
                      alt={follower.name} 
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{follower.name}</p>
                      <p className="text-xs text-muted-foreground">{follower.days} days</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium font-mono-data ${follower.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {follower.profit >= 0 ? '+' : ''}{follower.profit.toFixed(0)} PTS
                      </p>
                      <p className="text-xs text-muted-foreground">{follower.copyAmount.toFixed(0)} PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderboardTable;
