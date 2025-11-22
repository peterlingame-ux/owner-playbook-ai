import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown } from "lucide-react";
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
import { AIModel } from "@/types/prediction";

const LeaderboardTable = () => {
  const { t } = useTranslation();
  const [modelsWithRealData, setModelsWithRealData] = useState<AIModel[]>(aiModels);
  const [isLoading, setIsLoading] = useState(true);

  // 获取真实的胜率数据和统计数据 - 使用 Realtime 订阅实现实时更新
  useEffect(() => {
    const fetchWinRates = async () => {
      try {
        setIsLoading(true);
        
        // 并行查询：胜率数据和统计数据
        const [winRatesResult, statisticsResult] = await Promise.all([
          supabase.from('ai_win_rates_overall' as any).select('*'),
          supabase.from('ai_statistics' as any).select('*'),
        ]);

        if (winRatesResult.error) {
          console.error('Error fetching win rates:', winRatesResult.error);
        }
        if (statisticsResult.error) {
          console.error('Error fetching statistics:', statisticsResult.error);
        }

        // 将查询结果转换为 Map 以便快速查找
        const winRatesMap = new Map<string, { winRate: number; totalPredictions: number; correctPredictions: number }>();
        if (winRatesResult.data) {
          winRatesResult.data.forEach((item: any) => {
            winRatesMap.set(item.ai_id, {
              winRate: item.win_rate || 0,
              totalPredictions: item.total_predictions || 0,
              correctPredictions: item.correct_predictions || 0,
            });
          });
        }

        const statisticsMap = new Map<string, { currentStreak: number; bestStreak: number; worstStreak: number; avgConfidence: number }>();
        if (statisticsResult.data) {
          statisticsResult.data.forEach((item: any) => {
            statisticsMap.set(item.ai_id, {
              currentStreak: item.current_streak || 0,
              bestStreak: item.best_streak || 0,
              worstStreak: item.worst_streak || 0,
              avgConfidence: item.avg_confidence || 0,
            });
          });
        }

        // 更新每个模型的数据
        const updatedModels = aiModels.map(model => {
          const winRateData = winRatesMap.get(model.id);
          const statsData = statisticsMap.get(model.id);
          
          const wrongPredictions = (winRateData?.totalPredictions || 0) - (winRateData?.correctPredictions || 0);
          
          return {
            ...model,
            winRate: winRateData?.winRate ?? 0,
            totalPredictions: winRateData?.totalPredictions ?? 0,
            correctPredictions: winRateData?.correctPredictions ?? 0,
            wrongPredictions,
            currentStreak: statsData?.currentStreak ?? 0,
            bestStreak: statsData?.bestStreak ?? 0,
            worstStreak: statsData?.worstStreak ?? 0,
            accuracy: winRateData?.winRate || 0,
            avgConfidence: statsData?.avgConfidence ? statsData.avgConfidence.toFixed(1) : '0',
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
          wrongPredictions: 0,
          currentStreak: 0,
          bestStreak: 0,
          worstStreak: 0,
          accuracy: 0,
          avgConfidence: '0',
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
  }, []);

  // Calculate additional stats for each model
  const enhancedModels = modelsWithRealData
    .map(model => ({
      ...model,
      wrongPredictions: (model as any).wrongPredictions || (model.totalPredictions - model.correctPredictions),
      currentStreak: (model as any).currentStreak || 0,
      bestStreak: (model as any).bestStreak || 0,
      worstStreak: (model as any).worstStreak || 0,
      accuracy: (model as any).accuracy || model.winRate,
      avgConfidence: (model as any).avgConfidence || '0',
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const winningModel = enhancedModels[0];

  const getModelIcon = (modelId: string) => {
    const icons: Record<string, string> = {
      'deepseek': deepseekIcon,
      'qwen': deepseekIcon,
      'claude': claudeIcon,
      'grok': grokIcon,
      'gemini': geminiIcon,
      'gpt': gpt5Icon,
      'gpt5': gpt5Icon,
      'hunsoccermax': hunsoccerIcon,
      'mystery': mysteryIcon,
    };
    return icons[modelId] || gpt5Icon;
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
                  <TableRow className="border-b border-border/50 hover:bg-transparent bg-muted/30">
                    <TableHead className="w-8 sm:w-12 py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase text-center">#</TableHead>
                    <TableHead className="py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase min-w-[100px] sm:min-w-0">{t('model')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">
                      <div className="flex items-center justify-center gap-1">
                        {t('win_rate')} <ArrowDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('predictions')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('correct')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('wrong')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('best_streak')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('avg_confidence')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancedModels.map((model, index) => (
                    <TableRow 
                      key={model.id}
                      className="border-b border-border/20 hover:bg-accent/20 transition-colors"
                    >
                      <TableCell className="py-2 sm:py-3 text-center">
                        <div className="flex items-center justify-center">
                          <span className="font-bold text-xs sm:text-sm text-muted-foreground">{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-3">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          <div className="w-5 h-5 sm:w-7 sm:h-7 rounded bg-background/50 p-0.5 sm:p-1 flex items-center justify-center border border-border/30 flex-shrink-0">
                            <img src={getModelIcon(model.id)} alt={model.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="font-semibold text-xs sm:text-sm truncate">{model.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <AnimatedWinRate 
                          value={model.winRate}
                          className="font-mono-data font-bold text-sm sm:text-base"
                          style={{ color: `hsl(var(--${model.color}))` }}
                        />
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <span className="font-mono-data text-xs sm:text-sm text-muted-foreground">
                          {model.locked ? '???' : model.totalPredictions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <span className="font-mono-data font-semibold text-xs sm:text-sm text-foreground/90">
                          {model.locked ? '???' : model.correctPredictions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <span className="font-mono-data font-semibold text-xs sm:text-sm text-foreground/50">
                          {model.locked ? '???' : model.wrongPredictions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <span className="font-mono-data text-xs sm:text-sm text-foreground/70">
                          {model.locked ? '???' : '+' + model.bestStreak}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <span className="font-mono-data text-xs sm:text-sm text-foreground/80">
                          {model.locked ? '???' : model.avgConfidence + '%'}
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
                  <img src={getModelIcon(winningModel.id)} alt={winningModel.name} className="h-8 w-8 sm:h-10 sm:w-10" />
                  <span className="text-lg sm:text-xl font-bold text-white">{winningModel.displayName}</span>
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
    </div>
  );
};
export default LeaderboardTable;
