import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Disclaimer from "@/components/Disclaimer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, CheckCircle2, XCircle, Filter, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiModels } from "@/data/mockData";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatedWinRate } from "@/components/AnimatedWinRate";
import CryptoTicker from "@/components/CryptoTicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import iconGreencourt from "@/assets/icon_greencourt.jpg";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";

// 类型定义
type HistoryRecord = {
  id: string;
  matchId: string;
  aiModel: string;
  prediction: "HOME_WIN" | "AWAY_WIN" | "DRAW";
  actualResult?: "HOME_WIN" | "AWAY_WIN" | "DRAW";
  correct: boolean;
  pending?: boolean; // 是否进行中
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

// AI 图标映射
const AI_ICONS: Record<string, string> = {
  deepseek: deepseekIcon,
  gpt5: gpt5Icon,
  claude: claudeIcon,
  gemini: geminiIcon,
  grok: grokIcon,
  hunsoccermax: hunsoccerIcon,
};

const History = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [playerHistoryRecords, setPlayerHistoryRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [topPlayers, setTopPlayers] = useState<Array<{id: string, display_name: string, win_rate: number}>>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

    // 从数据库获取历史数据
    useEffect(() => {
      const fetchHistory = async () => {
        try {
          setIsLoading(true);
          
          // 查询已结算的投注记录
          const { data: positionsData, error: positionsError } = await supabase
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
            .not('settled_at', 'is', null)
            .order('settled_at', { ascending: false });
  
          if (positionsError) {
            console.error('Error fetching positions:', positionsError);
            setHistoryRecords([]);
            return;
          }
  
          if (!positionsData || positionsData.length === 0) {
            setHistoryRecords([]);
            return;
          }
  
          // 获取所有唯一的 match_id
          const matchIds = [...new Set(positionsData.map((p: any) => p.match_id).filter(Boolean))];
          
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
          const records: HistoryRecord[] = positionsData.map((position: any) => {
            const metadata = position.metadata || {};
            const settlement = metadata.settlement || {};
            const result = settlement.result; // 'win', 'loss', 'push', 'void'
            
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
            const match = position.match_id ? matchesMap.get(position.match_id) : null;
            
            // 计算实际结果（从比赛比分推断）
            let actualResult: "HOME_WIN" | "AWAY_WIN" | "DRAW" | undefined;
            if (match && match.goals_home !== null && match.goals_away !== null) {
              if (match.goals_home > match.goals_away) {
                actualResult = "HOME_WIN";
              } else if (match.goals_away > match.goals_home) {
                actualResult = "AWAY_WIN";
              } else {
                actualResult = "DRAW";
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
              aiModel: position.ai_id || '',
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
  
          setHistoryRecords(records);
        } catch (error) {
          console.error('Error fetching history:', error);
          setHistoryRecords([]);
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchHistory();
    }, []);

  // 获取前十名玩家
  useEffect(() => {
    const fetchTopPlayers = async () => {
      try {
        // 查询所有用户的预测记录统计
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('user_predictions')
          .select('user_id, result')
          .not('result', 'is', null);

        if (predictionsError || !predictionsData) {
          console.error('Error fetching predictions for top players:', predictionsError);
          return;
        }

        // 按用户统计胜率
        const userStats = predictionsData.reduce((acc: any, pred: any) => {
          if (!acc[pred.user_id]) {
            acc[pred.user_id] = { total: 0, wins: 0 };
          }
          acc[pred.user_id].total += 1;
          if (pred.result === 'win') {
            acc[pred.user_id].wins += 1;
          }
          return acc;
        }, {});

        // 计算胜率并排序
        const userWinRates = Object.entries(userStats).map(([userId, stats]: [string, any]) => ({
          user_id: userId,
          win_rate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
          total: stats.total
        })).sort((a, b) => b.win_rate - a.win_rate).slice(0, 10);

        // 获取用户信息
        const userIds = userWinRates.map(u => u.user_id);
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, display_name')
          .in('id', userIds);

        if (usersError || !usersData) {
          console.error('Error fetching users:', usersError);
          return;
        }

        // 合并用户信息和胜率
        const topPlayersData = userWinRates.map(u => {
          const userInfo = usersData.find(user => user.id === u.user_id);
          return {
            id: u.user_id,
            display_name: userInfo?.display_name || 'Unknown',
            win_rate: u.win_rate
          };
        });

        setTopPlayers(topPlayersData);
        
        // 设置默认选择当前用户（如果在前十名中）或第一名
        if (user) {
          const currentUserInTop = topPlayersData.find(p => p.id === user.id);
          setSelectedPlayerId(currentUserInTop ? user.id : (topPlayersData[0]?.id || ""));
        } else {
          setSelectedPlayerId(topPlayersData[0]?.id || "");
        }
      } catch (error) {
        console.error('Error fetching top players:', error);
      }
    };

    fetchTopPlayers();
  }, [user]);

  // 从数据库获取玩家历史数据
  useEffect(() => {
    const fetchPlayerHistory = async () => {
      const targetUserId = selectedPlayerId || user?.id;
      
      if (!targetUserId) {
        setPlayerHistoryRecords([]);
        setIsPlayerLoading(false);
        return;
      }

      try {
        setIsPlayerLoading(true);
        
        // 查询选中玩家的预测记录
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', targetUserId)
          .not('result', 'is', null)
          .order('created_at', { ascending: false });

        if (predictionsError) {
          console.error('Error fetching player predictions:', predictionsError);
          setPlayerHistoryRecords([]);
          return;
        }

        if (!predictionsData || predictionsData.length === 0) {
          setPlayerHistoryRecords([]);
          return;
        }

        // 转换数据格式
        const records: HistoryRecord[] = predictionsData.map((prediction: any) => {
          const correct = prediction.result === 'win';
          const profit = prediction.actual_payout ? prediction.actual_payout - prediction.bet_amount : (correct ? prediction.bet_amount * 0.9 : -prediction.bet_amount);
          
          // 格式化日期
          const date = new Date(prediction.created_at);
          const dateStr = date.toISOString().split('T')[0];
          
          return {
            id: prediction.id.toString(),
            matchId: prediction.match_id?.toString() || '',
            aiModel: 'player',
            prediction: prediction.prediction as "HOME_WIN" | "AWAY_WIN" | "DRAW",
            actualResult: prediction.actual_result as "HOME_WIN" | "AWAY_WIN" | "DRAW" | undefined,
            correct,
            confidence: prediction.confidence || 0,
            date: dateStr,
            betType: prediction.prediction_type as "handicap" | "over_under",
            handicapLine: prediction.handicap_line,
            overUnderLine: prediction.over_under_line,
            overUnderPick: undefined,
            odds: prediction.potential_payout ? prediction.potential_payout / prediction.bet_amount : 1.9,
            betAmount: prediction.bet_amount,
            profit,
            match: undefined, // 玩家历史记录暂不显示比赛详情
          };
        });

        setPlayerHistoryRecords(records);
      } catch (error) {
        console.error('Error fetching player history:', error);
        setPlayerHistoryRecords([]);
      } finally {
        setIsPlayerLoading(false);
      }
    };

    fetchPlayerHistory();
  }, [user, selectedPlayerId]);

  // 过滤历史数据
  let filteredHistory = [...historyRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (filterModel !== "all") {
    filteredHistory = filteredHistory.filter(p => p.aiModel === filterModel);
  }

  if (filterResult !== "all") {
    filteredHistory = filteredHistory.filter(p => 
      filterResult === "correct" ? p.correct : !p.correct
    );
  }

  if (filterPeriod !== "all") {
    const now = new Date();
    const daysAgo = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
    const periodDate = new Date(now.setDate(now.getDate() - daysAgo));
    filteredHistory = filteredHistory.filter(p => 
      new Date(p.date) >= periodDate
    );
  }

  // 过滤玩家历史数据
  let filteredPlayerHistory = [...playerHistoryRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (filterResult !== "all") {
    filteredPlayerHistory = filteredPlayerHistory.filter(p => 
      filterResult === "correct" ? p.correct : !p.correct
    );
  }

  if (filterPeriod !== "all") {
    const now = new Date();
    const daysAgo = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
    const periodDate = new Date(now.setDate(now.getDate() - daysAgo));
    filteredPlayerHistory = filteredPlayerHistory.filter(p => 
      new Date(p.date) >= periodDate
    );
  }

  // 计算AI统计数据
  const totalPredictions = filteredHistory.length;
  const correctPredictions = filteredHistory.filter(p => p.correct).length;
  const winRate = totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(1) : "0.0";
  
  const calculateProfit = (prediction: HistoryRecord) => {
    return prediction.profit;
  };

  const INITIAL_BALANCE = 10000;
  const totalProfit = filteredHistory.reduce((sum, p) => sum + calculateProfit(p), 0);
  const currentBalance = INITIAL_BALANCE + totalProfit;
  const roi = totalPredictions > 0 ? ((totalProfit / INITIAL_BALANCE) * 100).toFixed(1) : "0.0";

  // 计算玩家统计数据
  const playerTotalPredictions = filteredPlayerHistory.length;
  const playerCorrectPredictions = filteredPlayerHistory.filter(p => p.correct).length;
  const playerWinRate = playerTotalPredictions > 0 ? ((playerCorrectPredictions / playerTotalPredictions) * 100).toFixed(1) : "0.0";
  const playerTotalProfit = filteredPlayerHistory.reduce((sum, p) => sum + calculateProfit(p), 0);
  const playerCurrentBalance = INITIAL_BALANCE + playerTotalProfit;
  const playerRoi = playerTotalPredictions > 0 ? ((playerTotalProfit / INITIAL_BALANCE) * 100).toFixed(1) : "0.0";

  // 获取选中的模型信息
  const selectedModel = filterModel !== "all" ? aiModels.find(m => m.id === filterModel) : null;

  const getModelBackground = (modelId: string) => {
    // 统一使用绿色球场背景图
    return iconGreencourt;
  };

  // Helper function to get team name based on language
  const getTeamName = (match: HistoryRecord['match'], team: 'home' | 'away') => {
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

  const getBetTypeLabel = (betType: string, prediction: HistoryRecord, match?: HistoryRecord['match']) => {
    if (betType === "handicap") {
      // 显示让球线和让球方，比如 "主队名 -1.5" 或 "客队名 +0.5"
      if (prediction.handicapLine !== undefined) {
        const lineStr = `${prediction.handicapLine > 0 ? '+' : ''}${prediction.handicapLine}`;
        // 根据 prediction 判断是哪个球队让球
        const predStr = prediction.prediction as string;
        if (predStr === 'HOME' || predStr === 'HOME_WIN' || predStr.includes('HOME')) {
          const teamName = match ? getTeamName(match, 'home') : t('home') || 'Home';
          return `${teamName} ${lineStr}`;
        } else if (predStr === 'AWAY' || predStr === 'AWAY_WIN' || predStr.includes('AWAY')) {
          const teamName = match ? getTeamName(match, 'away') : t('away') || 'Away';
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
      return t('bet_type_handicap') || '让球';
    } else if (betType === "over_under") {
      // 显示大小球具体投注，比如 "3.5 Under"
      if (prediction.overUnderLine !== undefined && prediction.overUnderPick) {
        const overUnder = prediction.overUnderPick === 'over' ? t('over') || '大' : t('under') || '小';
        return `${prediction.overUnderLine} ${overUnder}`;
      }
      return t('bet_type_over_under') || '大小球';
    }
    return betType;
  };

  const getPredictionLabel = (prediction: HistoryRecord, match: HistoryRecord['match']) => {
    // 根据 bet_type 决定显示内容
    if (prediction.betType === 'over_under') {
      // 对于大小球，显示投注类型名称
      return t('bet_type_over_under') || 'Over/Under';
    } else if (prediction.betType === 'handicap') {
      // 对于让球，显示投注类型名称
      return t('bet_type_handicap') || 'Handicap';
    } else if (prediction.betType === 'moneyline') {
      // 对于独赢，显示队伍名称或平局
      if (!match) return prediction.prediction;
      switch(prediction.prediction) {
        case "HOME_WIN": return getTeamName(match, 'home');
        case "AWAY_WIN": return getTeamName(match, 'away');
        case "DRAW": return t('draw') || '平局';
        default: return prediction.prediction;
      }
    }
    // 默认情况
    if (!match) return prediction.prediction;
    switch(prediction.prediction) {
      case "HOME_WIN": return getTeamName(match, 'home');
      case "AWAY_WIN": return getTeamName(match, 'away');
      case "DRAW": return t('draw') || '平局';
      default: return prediction.prediction;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 safe-area-padding">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/leaderboard")}
          className="mb-4 sm:mb-6 text-xs sm:text-sm h-8 sm:h-10"
        >
          <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          返回
        </Button>

        {/* 赞助商滚动展示 */}
        <div className="mb-4 sm:mb-6">
          <CryptoTicker />
        </div>

        {/* 模型详情头部 - 当筛选特定模型时显示 */}
        {selectedModel && (
          <div 
            className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6"
            style={{
              backgroundImage: `url(${getModelBackground(selectedModel.id)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" />
            <div className="relative flex items-center gap-3 sm:gap-6 p-4 sm:p-8">
              <div 
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2 sm:p-3 bg-background/80 backdrop-blur-sm border-2 flex-shrink-0"
                style={{ borderColor: `hsl(var(--${selectedModel.color}))` }}
              >
                <img 
                  src={AI_ICONS[selectedModel.id] || deepseekIcon}
                  alt={selectedModel.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 
                  className="text-xl sm:text-4xl font-bold mb-0.5 sm:mb-1 truncate"
                  style={{ color: `hsl(var(--${selectedModel.color}))` }}
                >
                  {selectedModel.displayName}
                </h2>
                <p className="text-muted-foreground text-xs sm:text-lg">
                  {totalPredictions} {t('predictions')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 统计卡片 - 仅在选择特定模型时显示 */}
        {selectedModel && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('total_predictions')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--primary))' }}>
                {totalPredictions}
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('win_rate')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--success))' }}>
                <AnimatedWinRate 
                  value={parseFloat(winRate)}
                  className="text-lg sm:text-2xl lg:text-3xl font-bold"
                  style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : undefined}
                />
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('correct')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--success))' }}>
                {correctPredictions}
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">ROI</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: totalProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                {Number(roi) >= 0 ? '+' : ''}{roi}%
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm col-span-2 sm:col-span-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('current_balance')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--primary))' }}>
                ${currentBalance.toFixed(0)}
              </p>
            </Card>
          </div>
        )}

        {/* 筛选器和历史记录 */}
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="ai">{t('ai_history') || 'AI历史'}</TabsTrigger>
            <TabsTrigger value="player">{t('player_history') || '玩家历史'}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai">
            {/* 筛选器 */}
            <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium">{t('filters')}:</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <Select value={filterModel} onValueChange={setFilterModel}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder={t('model')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_models')}</SelectItem>
                      {aiModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>{model.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterResult} onValueChange={setFilterResult}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder={t('result')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_results')}</SelectItem>
                      <SelectItem value="correct">{t('correct')}</SelectItem>
                      <SelectItem value="wrong">{t('wrong')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder={t('period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_time')}</SelectItem>
                      <SelectItem value="7d">{t('last_7_days')}</SelectItem>
                      <SelectItem value="30d">{t('last_30_days')}</SelectItem>
                      <SelectItem value="90d">{t('last_90_days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border/50 flex items-center justify-between">
                  <span>{t('records')}:</span>
                  <span className="font-bold">{filteredHistory.length}</span>
                </div>
              </div>
            </Card>

        {/* 历史记录表格 */}
        <Card className="overflow-hidden">
          {/* 滚动提示 - 仅移动端显示 */}
          <div className="sm:hidden bg-muted/30 px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('swipe_to_view_more')}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse delay-150" />
            </div>
          </div>
          
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] sm:w-[100px] text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('date')}</TableHead>
                  <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('match')}</TableHead>
                  <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('model')}</TableHead>
                  <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('ai_prediction')}</TableHead>
                  <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('bet_type')}</TableHead>
                  <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('odds')}</TableHead>
                  <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('profit')}</TableHead>
                  <TableHead className="text-center text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('result')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 sm:py-12 text-sm sm:text-base text-muted-foreground">
                      {t('no_history_data')}
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 sm:py-12 text-sm sm:text-base text-muted-foreground">
                      {t('loading') || '加载中...'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((prediction) => {
                    const match = prediction.match;
                    const model = aiModels.find(m => m.id === prediction.aiModel);
                    if (!match || !model) return null;
                    
                    const profit = calculateProfit(prediction);
                    
                    return (
                      <TableRow 
                        key={prediction.id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <TableCell className="font-medium text-[11px] sm:text-sm px-2 sm:px-4 py-3 sm:py-4">
                          <div className="truncate min-w-[70px]">
                            {prediction.date}
                          </div>
                        </TableCell>
                        
                        <TableCell className="px-2 sm:px-4 py-3 sm:py-4">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-[180px]">
                            {match.homeLogo && (
                              <img 
                                src={match.homeLogo} 
                                alt={getTeamName(match, 'home')}
                                className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                              />
                            )}
                            <span className="text-xs sm:text-sm font-medium truncate flex-1">{getTeamName(match, 'home')}</span>
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                              <span className="text-muted-foreground text-xs sm:text-sm">{t('vs_text') || 'vs'}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                                {match.homeScore !== null && match.awayScore !== null ? (
                                  `${match.homeScore} - ${match.awayScore}`
                                ) : (
                                  '-'
                                )}
                              </span>
                            </div>
                            <span className="text-xs sm:text-sm font-medium truncate flex-1 text-right">{getTeamName(match, 'away')}</span>
                            {match.awayLogo && (
                              <img 
                                src={match.awayLogo} 
                                alt={getTeamName(match, 'away')}
                                className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                              />
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="px-2 sm:px-4 py-3 sm:py-4">
                          <div className="flex items-center justify-center">
                            <div 
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-1.5 sm:p-2 bg-background/80 backdrop-blur-sm border-2"
                              style={{ borderColor: `hsl(var(--${model.color}))` }}
                            >
                              <img 
                                src={AI_ICONS[model.id] || deepseekIcon}
                                alt={model.displayName}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-xs sm:text-sm font-medium px-2 sm:px-4 py-3 sm:py-4">
                          <div className="truncate max-w-[120px]">
                            {getPredictionLabel(prediction, match)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-3 sm:py-4">
                          <div className="truncate max-w-[140px]">
                            {getBetTypeLabel(prediction.betType, prediction, match)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right font-mono text-xs sm:text-sm font-bold px-2 sm:px-4 py-3 sm:py-4">
                          @{Math.max(0, prediction.odds - 1).toFixed(2)}
                        </TableCell>
                        
                        <TableCell className={`text-right font-mono text-xs sm:text-sm font-bold px-2 sm:px-4 py-3 sm:py-4 ${
                          profit >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </TableCell>
                        
                        <TableCell className="text-center px-2 sm:px-4 py-3 sm:py-4">
                          {prediction.pending ? (
                            <Badge className="gap-1 sm:gap-1.5 bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                              <span>{t('in_progress')}</span>
                            </Badge>
                          ) : prediction.correct ? (
                            <Badge className="gap-1 sm:gap-1.5 bg-success/20 text-success border-success/30 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden xs:inline">{t('correct')}</span>
                              <span className="xs:hidden">✓</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                              <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
        </Card>

          </TabsContent>
          
          <TabsContent value="player">
            {/* 筛选器 - 玩家历史 */}
            <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium">{t('filters')}:</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder={t('select_player') || '选择玩家'} />
                    </SelectTrigger>
                    <SelectContent>
                      {topPlayers.map((player, index) => (
                        <SelectItem key={player.id} value={player.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">#{index + 1}</span>
                            <span>{player.display_name}</span>
                            <span className="text-success text-xs">({player.win_rate.toFixed(1)}%)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterResult} onValueChange={setFilterResult}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder={t('result')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_results')}</SelectItem>
                      <SelectItem value="correct">{t('correct')}</SelectItem>
                      <SelectItem value="wrong">{t('wrong')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder={t('period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_time')}</SelectItem>
                      <SelectItem value="7d">{t('last_7_days')}</SelectItem>
                      <SelectItem value="30d">{t('last_30_days')}</SelectItem>
                      <SelectItem value="90d">{t('last_90_days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border/50 flex items-center justify-between">
                  <span>{t('records')}:</span>
                  <span className="font-bold">{filteredPlayerHistory.length}</span>
                </div>
              </div>
            </Card>
            
            {/* 玩家统计卡片 */}
            {user && playerTotalPredictions > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('total_predictions')}</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate text-primary">
                    {playerTotalPredictions}
                  </p>
                </Card>
                
                <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('win_rate')}</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate text-success">
                    <AnimatedWinRate 
                      value={parseFloat(playerWinRate)}
                      className="text-lg sm:text-2xl lg:text-3xl font-bold"
                    />
                  </p>
                </Card>
                
                <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">ROI</p>
                  <p className={`text-lg sm:text-2xl lg:text-3xl font-bold truncate ${playerTotalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {Number(playerRoi) >= 0 ? '+' : ''}{playerRoi}%
                  </p>
                </Card>
                
                <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('current_balance')}</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate text-primary">
                    ${playerCurrentBalance.toFixed(0)}
                  </p>
                </Card>
              </div>
            )}

            {/* 玩家历史记录表格 */}
            <Card className="overflow-hidden">
              {/* 滚动提示 - 仅移动端显示 */}
              <div className="sm:hidden bg-muted/30 px-3 py-2 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('swipe_to_view_more')}</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse delay-150" />
                </div>
              </div>
              
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] sm:w-[100px] text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('date')}</TableHead>
                      <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('match_id')}</TableHead>
                      <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('prediction')}</TableHead>
                      <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('bet_type')}</TableHead>
                      <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('bet_amount')}</TableHead>
                      <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('profit')}</TableHead>
                      <TableHead className="text-center text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('result')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!user ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 sm:py-12 text-sm sm:text-base text-muted-foreground">
                          {t('please_login') || '请先登录'}
                        </TableCell>
                      </TableRow>
                    ) : filteredPlayerHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 sm:py-12 text-sm sm:text-base text-muted-foreground">
                          {t('no_history_data')}
                        </TableCell>
                      </TableRow>
                    ) : isPlayerLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 sm:py-12 text-sm sm:text-base text-muted-foreground">
                          {t('loading') || '加载中...'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPlayerHistory.map((prediction) => {
                        const profit = calculateProfit(prediction);
                        
                        return (
                          <TableRow 
                            key={prediction.id}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className="font-medium text-[11px] sm:text-sm px-2 sm:px-4 py-3 sm:py-4">
                              <div className="truncate min-w-[70px]">
                                {prediction.date}
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-3 sm:py-4">
                              <div className="truncate max-w-[150px]">
                                {prediction.matchId}
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-xs sm:text-sm font-medium px-2 sm:px-4 py-3 sm:py-4">
                              <div className="truncate max-w-[120px]">
                                {prediction.prediction}
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-xs sm:text-sm px-2 sm:px-4 py-3 sm:py-4">
                              <div className="truncate max-w-[140px]">
                                {prediction.betType}
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-right font-mono text-xs sm:text-sm font-bold px-2 sm:px-4 py-3 sm:py-4">
                              ${prediction.betAmount.toFixed(2)}
                            </TableCell>
                            
                            <TableCell className={`text-right font-mono text-xs sm:text-sm font-bold px-2 sm:px-4 py-3 sm:py-4 ${
                              profit >= 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                            </TableCell>
                            
                            <TableCell className="text-center px-2 sm:px-4 py-3 sm:py-4">
                              {prediction.pending ? (
                                <Badge className="gap-1 sm:gap-1.5 bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                                  <span>{t('in_progress')}</span>
                                </Badge>
                              ) : prediction.correct ? (
                                <Badge className="gap-1 sm:gap-1.5 bg-success/20 text-success border-success/30 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  <span className="hidden xs:inline">{t('correct')}</span>
                                  <span className="xs:hidden">✓</span>
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                                  <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
            </Card>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </div>
  );
};

export default History;
