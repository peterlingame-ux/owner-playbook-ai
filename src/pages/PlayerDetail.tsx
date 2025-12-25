import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, XCircle, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { AnimatedWinRate } from "@/components/AnimatedWinRate";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import iconGreencourt from "@/assets/icon_greencourt.jpg";

// 类型定义
type PlayerPrediction = {
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

const PlayerDetail = () => {
  const { t, i18n } = useTranslation();
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // 如果 tab=today，默认筛选今日数据
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterBetType, setFilterBetType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>(tabParam === 'today' ? 'today' : 'all');
  const [playerPredictions, setPlayerPredictions] = useState<PlayerPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string;
  } | null>(null);
  const [userBalance, setUserBalance] = useState<{ currentValue: number; profit: number; changePercent: number } | null>(null);
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });

  // 从数据库获取玩家历史数据和余额
  useEffect(() => {
    const fetchPlayerHistory = async () => {
      if (!playerId) return;
      
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;
        
        // 并行查询：用户信息、预测记录和余额数据
        const [userResult, predictionsResult, balanceResult] = await Promise.all([
          supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .eq('id', playerId)
            .single(),
          supabase
            .from('user_predictions')
            .select('*')
            .eq('user_id', playerId)
            .not('result', 'is', null)
            .order('created_at', { ascending: false }),
          supabase
            .from('user_balances')
            .select('balance')
            .eq('user_id', playerId)
            .maybeSingle()
        ]);

        const { data: userData, error: userError } = userResult;
        const { data: predictionsData, error: predictionsError } = predictionsResult;
        const { data: balanceData, error: balanceError } = balanceResult;

        if (userError || !userData) {
          console.error('Error fetching user:', userError);
          navigate('/');
          return;
        }

        setPlayer({
          id: userData.id,
          displayName: userData.display_name,
          avatarUrl: userData.avatar_url,
        });

        // 处理余额数据
        if (!balanceError && balanceData) {
          const balance = balanceData as any;
          const totalBalance = balance.balance || INITIAL_BALANCE;
          const profit = totalBalance - INITIAL_BALANCE;
          const changePercent = (profit / INITIAL_BALANCE) * 100;
          
          setUserBalance({
            currentValue: totalBalance,
            profit,
            changePercent,
          });
        } else {
          setUserBalance({
            currentValue: INITIAL_BALANCE,
            profit: 0,
            changePercent: 0,
          });
        }

        if (predictionsError) {
          console.error('Error fetching predictions:', predictionsError);
          setPlayerPredictions([]);
          return;
        }

        if (!predictionsData || predictionsData.length === 0) {
          setPlayerPredictions([]);
          return;
        }

        // 获取所有唯一的 match_id
        const matchIds = [...new Set(predictionsData.map((p: any) => p.match_id).filter(Boolean))];
        
        // 查询比赛信息
        let matchesMap = new Map();
        if (matchIds.length > 0) {
          const { data: matchesData, error: matchesError } = await supabase
            .from('daily_matches' as any)
            .select('*')
            .in('fixture_id', matchIds);

          if (!matchesError && matchesData) {
            matchesData.forEach((match: any) => {
              matchesMap.set(match.fixture_id, match);
            });
          }
        }

        // 转换数据格式
        const records: PlayerPrediction[] = predictionsData.map((prediction: any) => {
          const correct = prediction.result === 'win';
          const profit = prediction.actual_payout ? prediction.actual_payout - prediction.bet_amount : (correct ? prediction.bet_amount * (prediction.potential_payout / prediction.bet_amount - 1) : -prediction.bet_amount);
          
          // 格式化日期
          const date = new Date(prediction.created_at);
          const dateStr = date.toISOString().split('T')[0];
          
          // 获取比赛信息
          const match = prediction.match_id ? matchesMap.get(prediction.match_id) : null;
          
          return {
            id: prediction.id.toString(),
            matchId: prediction.match_id?.toString() || '',
            prediction: prediction.prediction as "HOME_WIN" | "AWAY_WIN" | "DRAW",
            actualResult: prediction.actual_result as "HOME_WIN" | "AWAY_WIN" | "DRAW" | undefined,
            correct,
            confidence: prediction.confidence || 0,
            date: dateStr,
            betType: prediction.prediction_type as "handicap" | "over_under",
            handicapLine: prediction.handicap_line,
            overUnderLine: prediction.over_under_line,
            overUnderPick: prediction.over_under_pick as "over" | "under" | undefined,
            odds: prediction.potential_payout ? prediction.potential_payout / prediction.bet_amount : 1.9,
            betAmount: prediction.bet_amount,
            profit,
            match: match ? {
              id: match.fixture_id?.toString() || '',
              homeTeam: match.home_team_name || '',
              awayTeam: match.away_team_name || '',
              homeScore: match.goals_home,
              awayScore: match.goals_away,
              homeLogo: match.home_logo || undefined,
              awayLogo: match.away_logo || undefined,
              league: match.league_name || undefined,
            } : undefined,
          };
        });

        setPlayerPredictions(records);
      } catch (error) {
        console.error('Error fetching player history:', error);
        setPlayerPredictions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerHistory();
  }, [playerId, navigate]);

  if (isLoading || !player) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // 应用筛选
  let filteredPredictions = [...playerPredictions];
  
  // 日期筛选 - 今日观点
  if (filterDate === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filteredPredictions = filteredPredictions.filter(p => {
      const predDate = new Date(p.date);
      predDate.setHours(0, 0, 0, 0);
      return predDate.getTime() === today.getTime();
    });
  }
  
  if (filterResult !== "all") {
    filteredPredictions = filteredPredictions.filter(p => 
      filterResult === "correct" ? p.correct : !p.correct
    );
  }
  
  if (filterBetType !== "all") {
    filteredPredictions = filteredPredictions.filter(p => p.betType === filterBetType);
  }

  // 计算盈利
  const calculateProfit = (prediction: PlayerPrediction) => {
    return prediction.profit;
  };

  const INITIAL_BALANCE = 10000;
  
  // 使用 user_balances 表的余额数据
  const currentBalance = userBalance?.currentValue ?? INITIAL_BALANCE;
  const totalProfit = userBalance?.profit ?? 0;
  const roi = userBalance?.changePercent ? userBalance.changePercent.toFixed(1) : "0.0";
  
  // 计算统计数据（使用未筛选的数据）
  const totalPredictions = playerPredictions.length;
  const correctPredictions = playerPredictions.filter(p => p.correct).length;
  const winRate = totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(2) : "0.00";

  // Helper function to get team name based on language
  const getTeamName = (match: PlayerPrediction['match'], team: 'home' | 'away') => {
    if (!match) return '';
    
    const originalName = team === 'home' ? match.homeTeam : match.awayTeam;
    if (!originalName) return '';
    
    // If Chinese language, try to get translation from i18n
    if (i18n.language === 'zh') {
      const translatedName = t(`teams.${originalName}`, originalName);
      return translatedName;
    }
    
    // Return original name for English
    return originalName;
  };

  const getBetTypeLabel = (betType: string, prediction: PlayerPrediction, match?: PlayerPrediction['match']) => {
    switch(betType) {
      case "moneyline": 
        return t('bet_type_moneyline');
      case "handicap": 
        // 显示让球线和让球方
        if (prediction.handicapLine !== undefined) {
          const lineStr = `${prediction.handicapLine > 0 ? '+' : ''}${prediction.handicapLine}`;
          const predStr = prediction.prediction as string;
          if (predStr === 'HOME' || predStr === 'HOME_WIN' || predStr.includes('HOME')) {
            const teamName = match ? getTeamName(match, 'home') : t('home');
            return `${teamName} ${lineStr}`;
          } else if (predStr === 'AWAY' || predStr === 'AWAY_WIN' || predStr.includes('AWAY')) {
            const teamName = match ? getTeamName(match, 'away') : t('away');
            return `${teamName} ${lineStr}`;
          } else {
            if (prediction.handicapLine < 0 && match) {
              return `${getTeamName(match, 'home')} ${lineStr}`;
            } else if (prediction.handicapLine > 0 && match) {
              return `${getTeamName(match, 'away')} ${lineStr}`;
            }
            return lineStr;
          }
        }
        return t('bet_type_handicap');
      case "over_under": 
        // 显示大小球具体投注
        if (prediction.overUnderLine !== undefined && prediction.overUnderPick) {
          const overUnder = prediction.overUnderPick === 'over' ? t('over') : t('under');
          return `${prediction.overUnderLine} ${overUnder}`;
        }
        return t('bet_type_over_under');
      default: return betType;
    }
  };

  const getPredictionLabel = (prediction: PlayerPrediction, match: PlayerPrediction['match']) => {
    // AI预测列显示投注类型：让分或大小球
    if (prediction.betType === 'over_under') {
      return t('bet_type_over_under');
    } else if (prediction.betType === 'handicap') {
      return t('bet_type_handicap');
    } else if (prediction.betType === 'moneyline') {
      return t('bet_type_moneyline');
    }
    return prediction.betType || t('bet_type_moneyline');
  };

  const getRankColor = () => {
    // 玩家使用主色调
    return 'hsl(var(--primary))';
  };

  const rankColor = getRankColor();

  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-8 safe-area-padding">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-3 sm:mb-6 text-[10px] sm:text-sm h-7 sm:h-10 px-2 sm:px-4"
        >
          <ArrowLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
          {t('back_to_models')}
        </Button>

        {/* 玩家信息头部 - 带背景 */}
        <div 
          className="relative rounded-lg sm:rounded-2xl overflow-hidden mb-3 sm:mb-8"
          style={{
            backgroundImage: `url(${iconGreencourt})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" />
          <div className="relative flex items-center gap-2 sm:gap-6 p-3 sm:p-8">
            <Avatar 
              className="w-10 h-10 sm:w-20 sm:h-20 border-2 flex-shrink-0"
              style={{ borderColor: rankColor }}
            >
              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
              <AvatarFallback className="text-base sm:text-2xl">{player.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 
                className="text-base sm:text-4xl font-bold mb-0 sm:mb-1 truncate"
                style={{ color: rankColor }}
              >
                {player.displayName}
              </h1>
              <p className="text-muted-foreground text-[10px] sm:text-lg">
                {totalPredictions} {t('predictions')}
              </p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-4 mb-3 sm:mb-8">
          <Card className="p-2 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-2 truncate">{t('win_rate')}</p>
            <p className="text-sm sm:text-3xl font-bold" style={{ color: rankColor }}>
              <AnimatedWinRate 
                value={parseFloat(winRate)}
                className="text-sm sm:text-3xl font-bold"
                style={{ color: rankColor }}
              />
            </p>
          </Card>
          
          <Card className="p-2 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-2 truncate">{t('correct')}</p>
            <p className="text-sm sm:text-3xl font-bold" style={{ color: rankColor }}>
              {correctPredictions}
            </p>
          </Card>
          
          <Card className="p-2 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-2 truncate">{t('wrong')}</p>
            <p className="text-sm sm:text-3xl font-bold" style={{ color: rankColor }}>
              {totalPredictions - correctPredictions}
            </p>
          </Card>
          
          <Card className="p-2 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm col-span-2 sm:col-span-1">
            <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-2 truncate">{t('roi')}</p>
            <p className="text-sm sm:text-3xl font-bold" style={{ color: rankColor }}>
              {Number(roi) >= 0 ? '+' : ''}{roi}%
            </p>
          </Card>
          
          <Card className="p-2 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm sm:col-span-1">
            <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-2 truncate">{t('current_balance')}</p>
            <p className="text-sm sm:text-3xl font-bold truncate" style={{ color: rankColor }}>
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="p-2 sm:p-4 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-[10px] sm:text-sm font-medium">{t('filters')}:</span>
              <span className="text-[10px] sm:text-sm text-muted-foreground ml-auto sm:hidden">
                {filteredPredictions.length} {t('records')}
              </span>
            </div>
            
            <div className="flex gap-1.5 sm:gap-4 flex-1">
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-7 sm:h-10 text-[10px] sm:text-sm px-2 sm:px-3">
                  <SelectValue placeholder={t('date_filter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">{t('all')}</SelectItem>
                  <SelectItem value="today" className="text-xs sm:text-sm">{t('today_prediction')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-7 sm:h-10 text-[10px] sm:text-sm px-2 sm:px-3">
                  <SelectValue placeholder={t('result')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">{t('all_results')}</SelectItem>
                  <SelectItem value="correct" className="text-xs sm:text-sm">{t('correct')}</SelectItem>
                  <SelectItem value="wrong" className="text-xs sm:text-sm">{t('wrong')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBetType} onValueChange={setFilterBetType}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-7 sm:h-10 text-[10px] sm:text-sm px-2 sm:px-3">
                  <SelectValue placeholder={t('bet_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">{t('all_types')}</SelectItem>
                  <SelectItem value="handicap" className="text-xs sm:text-sm">{t('bet_type_handicap')}</SelectItem>
                  <SelectItem value="over_under" className="text-xs sm:text-sm">{t('bet_type_over_under')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden sm:block text-xs sm:text-sm text-muted-foreground sm:ml-auto">
              {filteredPredictions.length} {t('records')}
            </div>
          </div>
        </Card>

        {/* 预测历史表格 - 移动端使用卡片列表 */}
        <Card className="overflow-hidden">
          {/* 桌面端表格 */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-xs px-2">{t('date')}</TableHead>
                  <TableHead className="text-xs px-2">{t('match')}</TableHead>
                  <TableHead className="hidden md:table-cell text-xs px-2">{t('ai_prediction')}</TableHead>
                  <TableHead className="text-xs px-2">{t('bet_type')}</TableHead>
                  <TableHead className="text-right text-xs px-2">{t('odds')}</TableHead>
                  <TableHead className="hidden lg:table-cell text-right text-xs px-2">{t('bet_amount')}</TableHead>
                  <TableHead className="text-right text-xs px-2">{t('profit')}</TableHead>
                  <TableHead className="text-center text-xs px-2">{t('result')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                      {t('loading')}
                    </TableCell>
                  </TableRow>
                ) : filteredPredictions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                      {t('no_predictions')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPredictions.map((prediction) => {
                    const match = prediction.match;
                    if (!match) return null;
                    
                    const profit = calculateProfit(prediction);
                    
                    return (
                      <TableRow 
                        key={prediction.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <TableCell className="font-medium text-xs px-2 py-2">
                          {prediction.date}
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            {match.homeLogo && (
                              <img 
                                src={match.homeLogo} 
                                alt={getTeamName(match, 'home')}
                                className="w-5 h-5 object-contain shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {getTeamName(match, 'home')} vs {getTeamName(match, 'away')}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {match.homeScore !== undefined && match.awayScore !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {match.homeScore} - {match.awayScore}
                                  </span>
                                )}
                                {match.league && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    • {match.league}
                                  </span>
                                )}
                              </div>
                            </div>
                            {match.awayLogo && (
                              <img 
                                src={match.awayLogo} 
                                alt={getTeamName(match, 'away')}
                                className="w-5 h-5 object-contain shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm font-medium px-2 py-2">
                          <div className="truncate max-w-[100px]">
                            {getPredictionLabel(prediction, match)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm px-2 py-2">
                          <div className="truncate max-w-[120px]">
                            {getBetTypeLabel(prediction.betType, prediction, match)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm px-2 py-2">
                          @{prediction.odds.toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right font-mono text-sm px-2 py-2">
                          ${prediction.betAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm font-bold px-2 py-2 ${
                          profit >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center px-2 py-2">
                          {prediction.correct ? (
                            <Badge className="gap-1 bg-success/20 text-success border-success/30 text-xs px-2">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('correct')}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-xs px-2">
                              <XCircle className="h-3 w-3" />
                              {t('wrong')}
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
                {t('loading')}
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {t('no_predictions')}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredPredictions.map((prediction) => {
                  const match = prediction.match;
                  if (!match) return null;
                  
                  const profit = calculateProfit(prediction);
                  
                  return (
                    <div 
                      key={prediction.id}
                      className="p-2.5 active:bg-muted/50"
                      onClick={() => navigate(`/match/${match.id}`)}
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
                      <div className="flex items-center gap-1.5 mb-1.5">
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
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {match.homeScore}-{match.awayScore}
                          </span>
                        )}
                      </div>
                      
                      {/* 第三行：投注类型、赔率、盈亏 */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground truncate max-w-[45%]">
                          {getBetTypeLabel(prediction.betType, prediction, match)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">@{prediction.odds.toFixed(2)}</span>
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
  );
};

export default PlayerDetail;
