import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, XCircle, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiModels } from "@/data/mockData";
import Header from "@/components/Header";
import { AnimatedWinRate } from "@/components/AnimatedWinRate";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import iconGreencourt from "@/assets/icon_greencourt.jpg";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";

// AI 图标映射
const AI_ICONS: Record<string, string> = {
  deepseek: deepseekIcon,
  gpt5: gpt5Icon,
  claude: claudeIcon,
  gemini: geminiIcon,
  grok: grokIcon,
  hunsoccermax: hunsoccerIcon,
};

// 类型定义
type ModelPrediction = {
  id: string;
  matchId: string;
  prediction: "HOME_WIN" | "AWAY_WIN" | "DRAW";
  actualResult?: "HOME_WIN" | "AWAY_WIN" | "DRAW";
  correct: boolean;
  confidence: number;
  date: string;
  betType: "handicap" | "over_under";
  handicapLine?: number;
  overUnderLine?: number;
  overUnderPick?: "over" | "under";
  odds: number;
  betAmount: number;
  profit: number;
  match?: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore?: number;
    awayScore?: number;
    homeLogo?: string;
    awayLogo?: string;
    league?: string;
  };
};

const ModelDetail = () => {
  const { t, i18n } = useTranslation();
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterBetType, setFilterBetType] = useState<string>("all");
  const [modelPredictions, setModelPredictions] = useState<ModelPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  const model = aiModels.find(m => m.id === modelId);
  
  // 从数据库获取历史数据和余额
  const [aiBalance, setAiBalance] = useState<{ currentValue: number; profit: number; changePercent: number } | null>(null);

  useEffect(() => {
    const fetchModelHistory = async () => {
      if (!modelId) return;
      
      try {
        setIsLoading(true);
        
        // 并行查询：投注记录和余额数据
        const [positionsResult, balanceResult] = await Promise.all([
          supabase
            .from('sim_positions' as any)
            .select(`
              id,
              match_id,
              ai_id,
              status,
              settled_at,
              stake_amount,
              odds,
              bet_type,
              metadata
            `)
            .eq('status', 'settled')
            .eq('ai_id', modelId)
            .not('settled_at', 'is', null)
            .order('settled_at', { ascending: false }),
          supabase
            .from('ai_balances' as any)
            .select('ai_id, available_balance, locked_balance')
            .eq('ai_id', modelId)
            .maybeSingle()
        ]);

        const { data: positionsData, error: positionsError } = positionsResult;
        const { data: balanceData, error: balanceError } = balanceResult;
  
        if (positionsError) {
          console.error('Error fetching positions:', positionsError);
          setModelPredictions([]);
          setIsLoading(false);
          return;
        }
        
        console.log(`[ModelDetail] Fetched ${positionsData?.length || 0} positions for model ${modelId}`);

        // 处理余额数据（与首页逻辑一致）
        const INITIAL_BALANCE = 100000;
        if (!balanceError && balanceData) {
          const balance = balanceData as any;
          const totalBalance = (balance.available_balance || 0) + (balance.locked_balance || 0);
          const profit = totalBalance - INITIAL_BALANCE;
          const changePercent = (profit / INITIAL_BALANCE) * 100;
          
          setAiBalance({
            currentValue: totalBalance,
            profit,
            changePercent,
          });
        } else {
          // 如果没有余额数据，使用默认值
          setAiBalance({
            currentValue: INITIAL_BALANCE,
            profit: 0,
            changePercent: 0,
          });
        }
  
        if (!positionsData || positionsData.length === 0) {
          setModelPredictions([]);
          return;
        }
  
        // 获取所有唯一的 match_id
        const matchIds = [...new Set(positionsData.map((p: any) => p.match_id).filter(Boolean))];
        
        // 查询比赛信息
        let matchesMap = new Map();
        if (matchIds.length > 0) {
          // 将 match_id 转换为数字（如果它们是字符串）
          const numericMatchIds = matchIds.map(id => {
            const numId = typeof id === 'string' ? parseInt(id, 10) : id;
            return isNaN(numId) ? null : numId;
          }).filter(Boolean);
          
          if (numericMatchIds.length > 0) {
            const { data: matchesData, error: matchesError } = await supabase
              .from('daily_matches' as any)
              .select('*')
              .in('match_id', numericMatchIds);
    
            if (matchesError) {
              console.error('Error fetching matches:', matchesError);
            } else {
              console.log(`[ModelDetail] Fetched ${matchesData?.length || 0} matches for ${numericMatchIds.length} match IDs`);
              if (matchesData) {
                matchesData.forEach((match: any) => {
                  // 使用 match_id 作为 key，确保类型一致
                  const matchIdKey = match.match_id?.toString() || match.match_id;
                  matchesMap.set(matchIdKey, match);
                });
              }
            }
          } else {
            console.warn('[ModelDetail] No valid numeric match IDs to query');
          }
        }
  
        // 转换数据格式
        // 过滤掉 push 和 void 的结果，与 ai_win_rates_overall 视图保持一致
        const records: ModelPrediction[] = positionsData
          .filter((position: any) => {
            const metadata = position.metadata || {};
            const settlement = metadata.settlement || {};
            const result = settlement.result;
            // 只保留 win 和 loss 的结果，排除 push 和 void（与视图逻辑一致）
            return result === 'win' || result === 'loss';
          })
          .map((position: any) => {
          const metadata = position.metadata || {};
          const settlement = metadata.settlement || {};
          const result = settlement.result; // 'win', 'loss' (已过滤掉 push/void)
          
          // 从表的 bet_type 列读取，如果不存在则从 metadata 读取（向后兼容）
          const betType = position.bet_type || metadata.bet_type || metadata.betType || 'moneyline';
          
          // 从 metadata 中提取预测信息
          const prediction = metadata.prediction || position.prediction || 'HOME_WIN';
          const confidence = metadata.confidence || 0;
          // metadata 中可能使用驼峰命名，需要兼容两种格式
          const handicapLine = metadata.handicap_line ?? metadata.handicapLine;
          const overUnderLine = metadata.over_under_line ?? metadata.overUnderLine;
          const overUnderPick = metadata.over_under_pick ?? metadata.overUnderPick;
          
          // 获取比赛信息
          // 确保 match_id 类型一致（转换为字符串或数字）
          const matchIdKey = position.match_id?.toString() || position.match_id;
          const match = matchIdKey ? matchesMap.get(matchIdKey) : null;
          
          // 计算实际结果（从比赛比分推断）
          // daily_matches 表使用 home_scores[0] 和 away_scores[0] 作为常规时间比分
          let actualResult: "HOME_WIN" | "AWAY_WIN" | "DRAW" | undefined;
          if (match) {
            const goalsHome = match.home_scores?.[0] ?? match.goals_home ?? null;
            const goalsAway = match.away_scores?.[0] ?? match.goals_away ?? null;
            
            if (goalsHome !== null && goalsAway !== null) {
              if (goalsHome > goalsAway) {
                actualResult = "HOME_WIN";
              } else if (goalsAway > goalsHome) {
                actualResult = "AWAY_WIN";
              } else {
                actualResult = "DRAW";
              }
            }
          }
          
          // 判断是否正确（只考虑 win/loss，不考虑 push/void）
          const correct = result === 'win';
          
          // 计算盈亏
          const betAmount = position.stake_amount || 0;
          const profit = correct ? betAmount * (position.odds - 1) : -betAmount;
          
          // 格式化日期
          const settledDate = position.settled_at ? new Date(position.settled_at) : new Date();
          const dateStr = settledDate.toISOString().split('T')[0];
          
          return {
            id: position.id.toString(),
            matchId: position.match_id?.toString() || '',
            prediction: prediction as "HOME_WIN" | "AWAY_WIN" | "DRAW",
            actualResult,
            correct,
            confidence,
            date: dateStr,
            betType: betType as "handicap" | "over_under",
            handicapLine,
            overUnderLine,
            overUnderPick: overUnderPick as "over" | "under" | undefined,
            odds: position.odds || 1,
            betAmount,
            profit,
            match: match ? {
              id: match.match_id?.toString() || '',
              homeTeam: match.home_team_name || '',
              awayTeam: match.away_team_name || '',
              homeScore: match.home_scores?.[0] ?? match.goals_home ?? undefined,
              awayScore: match.away_scores?.[0] ?? match.goals_away ?? undefined,
              homeLogo: match.home_team_logo || match.home_logo || undefined,
              awayLogo: match.away_team_logo || match.away_logo || undefined,
              league: match.competition_name || match.competition_name_zh || match.league_name || undefined,
            } : undefined,
          };
        });
  
        console.log(`[ModelDetail] Processed ${records.length} prediction records`);
        setModelPredictions(records);
      } catch (error) {
        console.error('Error fetching model history:', error);
        setModelPredictions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModelHistory();
  }, [modelId]);

  if (!model) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-[50px] sm:pt-[70px]">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">{t('model_not_found')}</p>
          <Button onClick={() => navigate("/")}>
            {t('go_back')}
          </Button>
        </div>
        </div>
      </div>
    );
  }

  // 应用筛选
  let filteredPredictions = [...modelPredictions];
  
  if (filterResult !== "all") {
    filteredPredictions = filteredPredictions.filter(p => 
      filterResult === "correct" ? p.correct : !p.correct
    );
  }
  
  if (filterBetType !== "all") {
    filteredPredictions = filteredPredictions.filter(p => p.betType === filterBetType);
  }

  // 计算盈利（用于表格显示）
  const calculateProfit = (prediction: ModelPrediction) => {
    return prediction.profit;
  };

  const INITIAL_BALANCE = 100000;
  
  // 使用 ai_balances 表的余额数据（与首页一致）
  const currentBalance = aiBalance?.currentValue ?? INITIAL_BALANCE;
  const totalProfit = aiBalance?.profit ?? 0;
  const roi = aiBalance?.changePercent != null ? aiBalance.changePercent.toFixed(2) : "0.00";
  
  // 计算筛选后的总盈利（用于表格显示）
  const filteredTotalProfit = filteredPredictions.reduce((sum, p) => sum + calculateProfit(p), 0);
  
  // 计算统计数据（使用未筛选的数据，与首页视图保持一致）
  // 注意：这里使用 modelPredictions 而不是 filteredPredictions，因为统计应该基于所有数据
  const totalPredictions = modelPredictions.length;
  const correctPredictions = modelPredictions.filter(p => p.correct).length;
  const winRate = totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(2) : "0.00";

  // Helper function to get team name based on language
  const getTeamName = (match: ModelPrediction['match'], team: 'home' | 'away') => {
    if (!match) return '';
    
    const originalName = team === 'home' ? match.homeTeam : match.awayTeam;
    if (!originalName) return '';
    
    // If Chinese language, try to get translation from i18n
    if (i18n.language.startsWith('zh')) {
      const translatedName = t(`teams.${originalName}`, originalName);
      return translatedName;
    }
    
    // Return original name for English
    return originalName;
  };

  const getBetTypeLabel = (betType: string, prediction: ModelPrediction, match?: ModelPrediction['match']) => {
    switch(betType) {
      case "moneyline": 
        return t('bet_type_moneyline') || 'Moneyline';
      case "handicap": 
        // 显示让球线和让球方（盘口以主队为基准：主队 +line，客队 -line）
        if (prediction.handicapLine !== undefined) {
          const rawLine = typeof prediction.handicapLine === 'string'
            ? parseFloat(prediction.handicapLine as string)
            : Number(prediction.handicapLine);
          const predStr = prediction.prediction as string;
          const isAway = predStr === 'AWAY' || predStr === 'AWAY_WIN' || predStr.includes('AWAY');
          const displayLine = isAway ? -rawLine : rawLine;
          const lineStr = `${displayLine > 0 ? '+' : ''}${displayLine}`;
          if (predStr === 'HOME' || predStr === 'HOME_WIN' || predStr.includes('HOME')) {
            const teamName = match ? getTeamName(match, 'home') : t('home') || 'Home';
            return `${teamName} ${lineStr}`;
          } else if (isAway) {
            const teamName = match ? getTeamName(match, 'away') : t('away') || 'Away';
            return `${teamName} ${lineStr}`;
          } else {
            if (!isNaN(rawLine) && rawLine < 0 && match) {
              const homeLineStr = `${rawLine > 0 ? '+' : ''}${rawLine}`;
              return `${getTeamName(match, 'home')} ${homeLineStr}`;
            } else if (!isNaN(rawLine) && rawLine > 0 && match) {
              const awayLine = -rawLine;
              const awayLineStr = `${awayLine > 0 ? '+' : ''}${awayLine}`;
              return `${getTeamName(match, 'away')} ${awayLineStr}`;
            }
            return lineStr;
          }
        }
        return t('bet_type_handicap') || 'Handicap';
      case "over_under": 
        // 显示大小球具体投注
        if (prediction.overUnderLine !== undefined && prediction.overUnderPick) {
          const overUnder = prediction.overUnderPick === 'over' ? t('over') || 'Over' : t('under') || 'Under';
          return `${prediction.overUnderLine} ${overUnder}`;
        }
        return t('bet_type_over_under') || 'Over/Under';
      default: return betType;
    }
  };

  const getPredictionLabel = (prediction: ModelPrediction, match: ModelPrediction['match']) => {
    // AI预测列显示投注类型：让分或大小球
    if (prediction.betType === 'over_under') {
      return t('bet_type_over_under') || '大小球';
    } else if (prediction.betType === 'handicap') {
      return t('bet_type_handicap') || '让分';
    } else if (prediction.betType === 'moneyline') {
      // 对于独赢，也显示类型名称
      return t('bet_type_moneyline') || '独赢';
    }
    // 默认情况：显示投注类型
    return prediction.betType || t('bet_type_moneyline') || '独赢';
  };

  const getModelBackground = (modelId: string) => {
    // 统一使用绿色球场背景图
    return iconGreencourt;
  };

  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      <div className="pt-[50px] sm:pt-[70px]">
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 safe-area-padding">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-4 sm:mb-6 text-xs sm:text-sm h-8 sm:h-10"
        >
          <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          {t('back_to_models')}
        </Button>

        {/* 模型信息头部 - 带背景 */}
        <div 
          className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-8"
          style={{
            backgroundImage: `url(${getModelBackground(modelId!)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" />
          <div className="relative flex items-center gap-3 sm:gap-6 p-4 sm:p-8">
            <div 
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2 sm:p-3 bg-background/80 backdrop-blur-sm border-2 flex-shrink-0"
              style={{ borderColor: `hsl(var(--${model.color}))` }}
            >
              <img 
                src={AI_ICONS[model.id] || deepseekIcon}
                alt={model.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 
                className="text-xl sm:text-4xl font-bold mb-0.5 sm:mb-1 truncate"
                style={{ color: `hsl(var(--${model.color}))` }}
              >
                {model.displayName}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-lg">
                {totalPredictions} {t('predictions')}
              </p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('win_rate')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              <AnimatedWinRate 
                value={parseFloat(winRate)}
                className="text-xl sm:text-3xl font-bold"
                style={{ color: `hsl(var(--${model.color}))` }}
              />
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('correct')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              {correctPredictions}
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('wrong')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              {totalPredictions - correctPredictions}
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('roi') || '盈利率'}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              {Number(roi) >= 0 ? '+' : ''}{roi}%
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('current_balance')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">{t('filters')}:</span>
            </div>
            
            <div className="flex gap-2 sm:gap-4 flex-1">
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('result')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_results')}</SelectItem>
                  <SelectItem value="correct">{t('correct')}</SelectItem>
                  <SelectItem value="wrong">{t('wrong')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBetType} onValueChange={setFilterBetType}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('bet_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_types')}</SelectItem>
                  <SelectItem value="handicap">{t('bet_type_handicap')}</SelectItem>
                  <SelectItem value="over_under">{t('bet_type_over_under')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground sm:ml-auto">
              {filteredPredictions.length} {t('records')}
            </div>
          </div>
        </Card>

        {/* 预测历史表格 */}
        <Card className="overflow-hidden">
          {/* 桌面端表格 */}
          <div className="hidden sm:block overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px] sm:w-[100px] text-[10px] sm:text-xs px-2">{t('date')}</TableHead>
                  <TableHead className="text-[10px] sm:text-xs px-2">{t('match')}</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] sm:text-xs px-2">{t('ai_prediction') || 'AI预测'}</TableHead>
                  <TableHead className="hidden sm:table-cell text-[10px] sm:text-xs px-2">{t('bet_type')}</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-xs px-2">{t('odds')}</TableHead>
                  <TableHead className="hidden lg:table-cell text-right text-[10px] sm:text-xs px-2">{t('bet_amount')}</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-xs px-2">{t('profit')}</TableHead>
                  <TableHead className="text-center text-[10px] sm:text-xs px-2">{t('result')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                      {t('loading') || '加载中...'}
                    </TableCell>
                  </TableRow>
                ) : filteredPredictions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                      {t('no_predictions')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPredictions.map((prediction) => {
                    const match = prediction.match;
                    const profit = calculateProfit(prediction);
                    
                    return (
                      <TableRow 
                        key={prediction.id}
                        className={`hover:bg-muted/50 ${match ? 'cursor-pointer' : ''}`}
                        onClick={() => match && navigate(`/match/${match.id}`)}
                      >
                        <TableCell className="font-medium text-[10px] sm:text-xs px-2 py-2">
                          <div className="truncate max-w-[60px] sm:max-w-none">
                            {prediction.date}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          {match ? (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {match.homeLogo && (
                                <img 
                                  src={match.homeLogo} 
                                  alt={getTeamName(match, 'home')}
                                  className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] sm:text-sm font-medium truncate">
                                  {getTeamName(match, 'home')} vs {getTeamName(match, 'away')}
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                  {match.homeScore !== undefined && match.awayScore !== undefined && (
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                                      {match.homeScore} - {match.awayScore}
                                    </span>
                                  )}
                                  {match.league && (
                                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                      • {match.league}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {match.awayLogo && (
                                <img 
                                  src={match.awayLogo} 
                                  alt={getTeamName(match, 'away')}
                                  className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] sm:text-sm text-muted-foreground">
                              Match ID: {prediction.matchId || 'N/A'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-[11px] sm:text-sm font-medium px-2 py-2">
                          <div className="truncate max-w-[100px]">
                            {getPredictionLabel(prediction, match || { homeTeam: '', awayTeam: '' } as any)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-[11px] sm:text-sm px-2 py-2">
                          <div className="truncate max-w-[120px]">
                            {getBetTypeLabel(prediction.betType, prediction, match || { homeTeam: '', awayTeam: '' } as any)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] sm:text-sm px-2 py-2">
                          @{(prediction.odds - 1).toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right font-mono text-[11px] sm:text-sm px-2 py-2">
                          ${prediction.betAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-[11px] sm:text-sm font-bold px-2 py-2 ${
                          profit >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center px-2 py-2">
                          {prediction.correct ? (
                            <Badge className="gap-0.5 sm:gap-1 bg-success/20 text-success border-success/30 text-[10px] sm:text-xs px-1.5 sm:px-2">
                              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="hidden xs:inline">{t('correct')}</span>
                              <span className="xs:hidden">✓</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
                              <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="hidden xs:inline">{t('wrong')}</span>
                              <span className="xs:hidden">✗</span>
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* 移动端卡片列表 */}
          <div className="sm:hidden">
            {isLoading ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {t('loading') || '加载中...'}
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {t('no_predictions')}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredPredictions.map((prediction) => {
                  const match = prediction.match;
                  const profit = calculateProfit(prediction);
                  
                  return (
                    <div 
                      key={prediction.id}
                      className={`p-2.5 active:bg-muted/50 ${match ? 'cursor-pointer' : ''}`}
                      onClick={() => match && navigate(`/match/${match.id}`)}
                    >
                      {/* 第一行：日期和结果 */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-muted-foreground">{prediction.date}</span>
                        {prediction.correct ? (
                          <Badge className="gap-0.5 bg-success/20 text-success border-success/30 text-[9px] px-1.5 py-0 h-4">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            ✓
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-0.5 text-[9px] px-1.5 py-0 h-4">
                            <XCircle className="h-2.5 w-2.5" />
                            ✗
                          </Badge>
                        )}
                      </div>
                      
                      {/* 第二行：比赛信息 */}
                      {match ? (
                        <>
                          <div className="flex items-center gap-1.5 mb-1">
                            {match.homeLogo && (
                              <img 
                                src={match.homeLogo} 
                                alt={getTeamName(match, 'home')}
                                className="w-4 h-4 object-contain shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span className="text-[11px] font-medium truncate flex-1">
                              {getTeamName(match, 'home')} vs {getTeamName(match, 'away')}
                            </span>
                            {match.awayLogo && (
                              <img 
                                src={match.awayLogo} 
                                alt={getTeamName(match, 'away')}
                                className="w-4 h-4 object-contain shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            {match.homeScore !== undefined && match.awayScore !== undefined && (
                              <span className="text-[10px] font-semibold ml-1">
                                {match.homeScore}-{match.awayScore}
                              </span>
                            )}
                          </div>
                          {match.league && (
                            <div className="text-[9px] text-muted-foreground mb-1.5 truncate">
                              {match.league}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[11px] text-muted-foreground mb-1.5">
                          Match ID: {prediction.matchId || 'N/A'}
                        </div>
                      )}
                      
                      {/* 第三行：投注类型、赔率、盈亏 */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground truncate max-w-[50%]">
                          {getBetTypeLabel(prediction.betType, prediction, match || { homeTeam: '', awayTeam: '' } as any)}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-muted-foreground font-mono">@{(prediction.odds - 1).toFixed(2)}</span>
                          <span className={`font-mono font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {profit >= 0 ? '+' : ''}${profit.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default ModelDetail;
