import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown, History, X, ExternalLink } from "lucide-react";
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
  created_at: string;
}
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

  // 获取真实的胜率数据和统计数据 - 使用 Realtime 订阅实现实时更新
  useEffect(() => {
    const fetchWinRates = async () => {
      try {
        setIsLoading(true);
        
        // 计算时间范围的起始日期
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeRange);
        startDate.setHours(0, 0, 0, 0);
        
        // 查询指定时间范围内的sim_positions数据
        const { data: positionsData, error: positionsError } = await supabase
          .from('sim_positions' as any)
          .select('ai_id, metadata, settled_at, status, pnl, stake_amount, payout_amount')
          .gte('settled_at', startDate.toISOString())
          .eq('status', 'settled')
          .not('settled_at', 'is', null);
        
        if (positionsError) {
          console.error('Error fetching positions:', positionsError);
        }
        
        // 并行查询：余额数据
        const balancesResult = await supabase.from('ai_balances' as any).select('*');

        // 根据时间范围计算每个AI的统计数据
        const winRatesMap = new Map<string, { 
          winRate: number; 
          totalPredictions: number; 
          correctPredictions: number;
          totalBetAmount: number; // 投注金额
          validAmount: number; // 有效金额（赢的场次返还）
          profitAmount: number; // 盈利金额
          profitRate: number; // 盈利率
        }>();
        
        // 按AI ID分组处理数据
        const aiDataMap = new Map<string, Array<{ 
          result: string; 
          confidence: number; 
          settled_at: string;
          stake_amount: number;
          payout_amount: number;
          pnl: number;
        }>>();
        
        if (positionsData) {
          positionsData.forEach((pos: any) => {
            if (!pos.ai_id || !pos.settled_at) return;
            
            // 从metadata中提取result，如果没有则根据pnl判断
            let result: string = 'loss';
            if (pos.metadata?.settlement?.result) {
              result = pos.metadata.settlement.result;
            } else if (pos.pnl !== undefined && pos.pnl > 0) {
              result = 'win';
            } else if (pos.pnl !== undefined && pos.pnl < 0) {
              result = 'loss';
            }
            
            // 跳过push和void的结果
            if (result === 'push' || result === 'void') {
              return;
            }
            
            if (!aiDataMap.has(pos.ai_id)) {
              aiDataMap.set(pos.ai_id, []);
            }
            
            // 从metadata中提取confidence，如果没有则使用默认值
            const confidence = pos.metadata?.confidence || pos.metadata?.settlement?.confidence || 0;
            const stakeAmount = pos.stake_amount || 0;
            const payoutAmount = pos.payout_amount || (result === 'win' ? stakeAmount + (pos.pnl || 0) : 0);
            const pnl = pos.pnl || 0;
            
            aiDataMap.get(pos.ai_id)!.push({
              result,
              confidence,
              settled_at: pos.settled_at,
              stake_amount: stakeAmount,
              payout_amount: payoutAmount,
              pnl,
            });
          });
        }
        
        // 计算每个AI的统计数据
        aiDataMap.forEach((positions, aiId) => {
          // 按时间排序
          const sortedPositions = positions.sort((a, b) => 
            new Date(a.settled_at).getTime() - new Date(b.settled_at).getTime()
          );
          
          const total = sortedPositions.length;
          const correct = sortedPositions.filter(p => p.result === 'win').length;
          const winRate = total > 0 ? (correct / total) * 100 : 0;
          
          // 计算投注金额（总投入）
          const totalBetAmount = sortedPositions.reduce((sum, p) => sum + p.stake_amount, 0);
          
          // 计算有效金额（赢的场次返还）
          const validAmount = sortedPositions.reduce((sum, p) => {
            if (p.result === 'win') {
              return sum + p.payout_amount;
            }
            return sum;
          }, 0);
          
          // 计算盈利金额
          const profitAmount = validAmount - totalBetAmount;
          
          // 计算盈利率
          const profitRate = totalBetAmount > 0 ? (profitAmount / totalBetAmount) * 100 : 0;
          
          winRatesMap.set(aiId, {
            winRate,
            totalPredictions: total,
            correctPredictions: correct,
            totalBetAmount,
            validAmount,
            profitAmount,
            profitRate,
          });
        });

        // 更新每个模型的数据
        const updatedModels = aiModels.map(model => {
          const winRateData = winRatesMap.get(model.id);
          
          return {
            ...model,
            winRate: winRateData?.winRate ?? 0,
            totalPredictions: winRateData?.totalPredictions ?? 0,
            correctPredictions: winRateData?.correctPredictions ?? 0,
            totalBetAmount: winRateData?.totalBetAmount ?? 0,
            validAmount: winRateData?.validAmount ?? 0,
            profitAmount: winRateData?.profitAmount ?? 0,
            profitRate: winRateData?.profitRate ?? 0,
            accuracy: winRateData?.winRate || 0,
          };
        });

        setModelsWithRealData(updatedModels);
      } catch (error) {
        console.error('Error fetching win rates:', error);
        // 如果出错，显示0而不是默认数据
        const zeroModels = aiModels.map(model => ({
          ...model,
          winRate: 0,
          totalPredictions: 0,
          correctPredictions: 0,
          totalBetAmount: 0,
          validAmount: 0,
          profitAmount: 0,
          profitRate: 0,
          accuracy: 0,
        }));
        setModelsWithRealData(zeroModels);
      } finally {
        setIsLoading(false);
      }
    };

    // 初始加载
    fetchWinRates();

    // 订阅 sim_positions 表的变化，当有投注结算时实时更新胜率
    const positionsChannel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sim_positions',
          filter: 'status=eq.settled',
        },
        (payload) => {
          console.log('Sim position settled, refreshing leaderboard:', payload);
          fetchWinRates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(positionsChannel);
    };
  }, [timeRange]);

  // 获取今日胜率数据
  useEffect(() => {
    const fetchTodayWinRates = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        // 查询今日的 sim_positions
        const { data, error } = await supabase
          .from('sim_positions' as any)
          .select('ai_id, status, metadata, pnl, settled_at')
          .gte('settled_at', todayStr)
          .eq('status', 'settled')
          .not('settled_at', 'is', null);

        if (error) {
          console.error('Error fetching today positions:', error);
          return;
        }

        // 计算每个 AI 的今日胜率
        const todayStats = new Map<string, { total: number; correct: number }>();
        
        if (data) {
          data.forEach((pos: any) => {
            const aiId = pos.ai_id;
            if (!todayStats.has(aiId)) {
              todayStats.set(aiId, { total: 0, correct: 0 });
            }
            const stats = todayStats.get(aiId)!;
            if (pos.status === 'settled') {
              // 从metadata中提取result，如果没有则根据pnl判断
              let result: string = 'loss';
              if (pos.metadata?.settlement?.result) {
                result = pos.metadata.settlement.result;
              } else if (pos.pnl !== undefined && pos.pnl > 0) {
                result = 'win';
              } else if (pos.pnl !== undefined && pos.pnl < 0) {
                result = 'loss';
              }
              
              // 只统计win和loss，跳过push和void
              if (result === 'win' || result === 'loss') {
                stats.total++;
                if (result === 'win') {
                  stats.correct++;
                }
              }
            }
          });
        }

        const todayWinRatesMap = new Map<string, { winRate: number; total: number; correct: number }>();
        todayStats.forEach((stats, aiId) => {
          const winRate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
          todayWinRatesMap.set(aiId, { winRate, total: stats.total, correct: stats.correct });
        });

        setTodayWinRates(todayWinRatesMap);
      } catch (error) {
        console.error('Error fetching today win rates:', error);
      }
    };

    fetchTodayWinRates();
  }, []);

  // 获取指定 AI 的今日历史记录
  const fetchTodayHistory = async (modelId: string, modelName: string) => {
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

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const { data, error } = await supabase
        .from('sim_positions' as any)
        .select('*')
        .eq('ai_id', modelId)
        .eq('status', 'settled')
        .gte('settled_at', todayStr)
        .not('settled_at', 'is', null)
        .order('settled_at', { ascending: false });

      if (error) {
        console.error('Error fetching today history:', error);
      }

      // 如果没有真实数据，生成虚拟数据
      if (!data || data.length === 0) {
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
            settled_at: new Date(Date.now() - i * 3600000).toISOString(),
          });
        }
        setSelectedModelHistory({ modelId, modelName, positions: mockPositions });
      } else {
        const positions: TodayPosition[] = data.map((pos: any) => {
          // 从metadata中提取result，如果没有则根据pnl判断
          let result: string = 'loss';
          if (pos.metadata?.settlement?.result) {
            result = pos.metadata.settlement.result;
          } else if (pos.pnl !== undefined && pos.pnl > 0) {
            result = 'win';
          } else if (pos.pnl !== undefined && pos.pnl < 0) {
            result = 'loss';
          }
          
          return {
            id: pos.id,
            match_id: pos.match_id,
            home_team: pos.home_team || 'Home Team',
            away_team: pos.away_team || 'Away Team',
            bet_type: pos.bet_type,
            prediction: pos.prediction,
            amount: pos.stake_amount || pos.amount,
            odds: pos.odds,
            status: pos.status,
            result: result === 'push' || result === 'void' ? 'loss' : result,
            pnl: pos.pnl,
            settled_at: pos.settled_at,
          };
        });
        setSelectedModelHistory({ modelId, modelName, positions });
      }
    } catch (error) {
      console.error('Error fetching today history:', error);
      setSelectedModelHistory({ modelId, modelName, positions: [] });
    } finally {
      setIsLoadingHistory(false);
    }
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
      return user && userProfile?.display_name ? userProfile.display_name : (t('demo_player') || '体验玩家');
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
      <Card className="border-border/50 bg-card/95 backdrop-blur overflow-hidden">
        <CardHeader className="px-3 sm:px-4 py-3 sm:py-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-bold">{t('all_models')}</CardTitle>
            {/* Time Range Filter - 时间筛选按钮 */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setTimeRange(1)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                  timeRange === 1
                    ? 'bg-foreground text-background' 
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                1天
              </button>
              <button
                onClick={() => setTimeRange(7)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                  timeRange === 7
                    ? 'bg-foreground text-background' 
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                7天
              </button>
              <button
                onClick={() => setTimeRange(30)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                  timeRange === 30
                    ? 'bg-foreground text-background' 
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                30天
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* 滚动提示 - 仅移动端显示 */}
          <div className="sm:hidden bg-muted/30 px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('swipe_to_view_more')}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse delay-150" />
            </div>
          </div>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-b-2 border-border/60 hover:bg-transparent bg-muted/40">
                    <TableHead className="w-10 sm:w-14 py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase text-center">#</TableHead>
                    <TableHead className="py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase min-w-[120px] sm:min-w-0">{t('model')}</TableHead>
                    <TableHead className="text-center py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase">{t('total_predictions') || '总预测'}</TableHead>
                    <TableHead className="text-center py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase">
                      <div className="flex items-center justify-center gap-1.5">
                        {t('win_rate')} <ArrowDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase">{t('correct') || '正确'}</TableHead>
                    <TableHead className="text-center py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase">{t('wrong') || '错误'}</TableHead>
                    <TableHead className="text-center py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase">{t('bet_amount') || '投注金额'}</TableHead>
                    <TableHead className="text-center py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase">{t('profit_rate') || '盈利率'}</TableHead>
                    <TableHead className="text-center py-3 sm:py-4 text-foreground/80 font-bold text-[10px] sm:text-xs tracking-wider uppercase">{t('profit_amount') || '盈利金额'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancedModels.map((model, index) => (
                    <TableRow 
                      key={model.id}
                      className="border-b border-border/30 hover:bg-accent/30 transition-all duration-300 animate-fade-in opacity-0"
                      style={{ 
                        animationDelay: `${index * 80}ms`,
                        animationFillMode: 'forwards'
                      }}
                    >
                      <TableCell className="py-3 sm:py-4 text-center">
                        <div className="flex items-center justify-center">
                          <span className="font-black text-sm sm:text-base text-foreground/70">{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 sm:w-9 sm:h-9 ${model.id === 'hunsoccermax' && user ? 'rounded-full' : 'rounded-lg'} bg-background/60 p-1 sm:p-1.5 flex items-center justify-center border border-border/40 flex-shrink-0 overflow-hidden`}>
                            <img 
                              src={getModelIcon(model.id)} 
                              alt={model.name} 
                              className={`w-full h-full ${model.id === 'hunsoccermax' && user ? 'object-cover' : 'object-contain'}`}
                              style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                            />
                          </div>
                          <span className="font-bold text-sm sm:text-base truncate">{getModelDisplayName(model)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3 sm:py-4">
                        <span className="font-mono-data font-bold text-sm sm:text-base text-muted-foreground">
                          {model.locked ? '???' : model.totalPredictions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 sm:py-4">
                        <AnimatedWinRate 
                          value={model.winRate}
                          className="font-mono-data font-black text-base sm:text-lg"
                          style={{ color: `hsl(var(--${model.color}))` }}
                        />
                      </TableCell>
                      <TableCell className="text-center py-3 sm:py-4">
                        <span className="font-mono-data font-bold text-sm sm:text-base text-success">
                          {model.locked ? '???' : (model as any).correctPredictions || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 sm:py-4">
                        <span className="font-mono-data font-bold text-sm sm:text-base text-destructive/80">
                          {model.locked ? '???' : ((model.totalPredictions || 0) - ((model as any).correctPredictions || 0))}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 sm:py-4">
                        <span className="font-mono-data font-bold text-sm sm:text-base text-foreground">
                          {model.locked ? '???' : `¥${((model as any).totalBetAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 sm:py-4">
                        <span className={`font-mono-data font-bold text-sm sm:text-base ${
                          ((model as any).profitRate || 0) >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {model.locked ? '???' : `${((model as any).profitRate || 0) >= 0 ? '+' : ''}${((model as any).profitRate || 0).toFixed(2)}%`}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 sm:py-4">
                        <span className={`font-mono-data font-bold text-sm sm:text-base ${
                          ((model as any).profitAmount || 0) >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {model.locked ? '???' : `${((model as any).profitAmount || 0) >= 0 ? '+' : ''}¥${((model as any).profitAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                      <div className="px-2 sm:px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs text-white">
                        ⚽ Premier League
                      </div>
                      <div className="px-2 sm:px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs text-white">
                        ⚽ La Liga
                      </div>
                      <div className="px-2 sm:px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs text-white hidden sm:inline-flex">
                        ⚽ Bundesliga
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
              {selectedModelHistory?.modelName} - {t('today_history') || '今日记录'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : selectedModelHistory?.positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('no_history_today') || '今日暂无记录'}
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
                          ? pos.result === 'win' ? t('win') || '胜' : t('loss') || '负'
                          : t('pending') || '进行中'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t('bet_type') || '类型'}:</span>
                        <span className="ml-1 font-medium">{pos.bet_type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('prediction') || '预测'}:</span>
                        <span className="ml-1 font-medium">{pos.prediction}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('bet_amount') || '金额'}:</span>
                        <span className="ml-1 font-medium">${pos.amount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('odds') || '赔率'}:</span>
                        <span className="ml-1 font-medium">{pos.odds?.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {pos.status === 'settled' && pos.pnl !== undefined && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">{t('profit_loss') || '盈亏'}:</span>
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

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {t('leaderboard_disclaimer') || '注意: 所有统计数据仅反映已完成的比赛预测。直播比赛预测在比赛结束前不计入统计。HUNSOCCER 所有内容均为模拟分析结果，仅供 AI 技术研究与赛事分析展示使用，不提供、不引导任何形式的投注或博彩活动。'}
        </p>
      </div>
    </div>
  );
};
export default LeaderboardTable;
