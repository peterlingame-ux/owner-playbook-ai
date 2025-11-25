import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, Clock, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchAnalysisDialog, ModelAnalysis } from "@/components/MatchAnalysisDialog";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import deepseekCardBg from "@/assets/deepseek-card-bg.png";
import grokCardBg from "@/assets/grok-card-bg.png";
import gpt5CardBg from "@/assets/gpt5-card-bg.png";
import claudeCardBg from "@/assets/claude-card-bg.png";
import geminiCardBg from "@/assets/gemini-card-bg.png";
import hunsoccerMaxCardBg from "@/assets/hunsoccer-max-card-bg.png";

const AI_ICONS: Record<string, string> = {
  deepseek: deepseekIcon,
  gpt5: gpt5Icon,
  claude: claudeIcon,
  gemini: geminiIcon,
  grok: grokIcon,
  hunsoccermax: hunsoccerIcon,
};

// 比赛时间显示组件（进行时间或倒计时）
const MatchTimeDisplay = ({ match }: { match: DailyMatch }) => {
  const { t } = useTranslation();
  const [timeDisplay, setTimeDisplay] = useState<string>('');
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const status = match.status_short;
      
      // 需要显示比分和时长的状态：LIVE, 1H, HT, 2H, ET
      const showScoreAndTimeStatuses = ['LIVE', '1H', 'HT', '2H', 'ET'];
      
      // 如果比赛已开赛（不是 NS），显示进行时间
      if (status !== 'NS') {
        setShowCountdown(false);
        // 判断是否需要显示比分和时长
        const shouldShowScore = showScoreAndTimeStatuses.includes(status);
        setIsLive(shouldShowScore);
        
        if (shouldShowScore) {
          // 这些状态需要显示比分和时长
          const elapsed = match.status_elapsed;
        switch (status) {
          case 'HT':
              // 中场休息，显示多语言的"半场"
            setTimeDisplay(t('half_time') || '半场');
              break;
            case '1H':
          case '2H':
          case 'ET':
            case 'LIVE':
              // 显示进行分钟数
              setTimeDisplay(elapsed !== null && elapsed !== undefined ? `${elapsed}'` : status);
              break;
            default:
              setTimeDisplay(status);
              break;
          }
        } else {
          // 其他状态（如 P, BREAK 等）只显示状态文本
          setIsLive(false);
          switch (status) {
          case 'P':
            setTimeDisplay('PEN');
              break;
          case 'BREAK':
            setTimeDisplay('BREAK');
              break;
          default:
            setTimeDisplay(status);
              break;
        }
        }
        return;
      }
      
      // 如果未开赛，显示倒计时（时分秒格式）
      setIsLive(false);
      setShowCountdown(true);
      const kickoffTime = new Date(match.kickoff_at);
      const now = new Date();
      const diff = kickoffTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeDisplay(t('starting_soon') || '即将开始');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // 显示时分秒格式：HH:MM:SS
      setTimeDisplay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [match.status_short, match.status_elapsed, match.kickoff_at, t]);

  const homeScore = match.goals_home ?? 0;
  const awayScore = match.goals_away ?? 0;

  return (
    <div className="flex flex-col items-center gap-0.5 px-1 sm:px-1 shrink-0">
      {isLive ? (
        <>
          {/* 比赛进行中：显示比分 */}
          <div className="flex items-center gap-1 sm:gap-1">
            <span className="text-sm sm:text-sm font-bold font-mono-data text-success">{homeScore}</span>
            <span className="text-[9px] sm:text-[9px] text-muted-foreground">-</span>
            <span className="text-sm sm:text-sm font-bold font-mono-data text-success">{awayScore}</span>
          </div>
          {/* 显示进行时间 */}
          <span className="text-[7px] sm:text-[7px] text-success font-bold font-mono uppercase">
            {timeDisplay}
          </span>
        </>
      ) : (
        <>
      <span className="text-[9px] sm:text-[9px] text-muted-foreground font-bold">VS</span>
          {showCountdown && (
            <span className="text-[6px] sm:text-[7px] text-muted-foreground/70">
              {t('until_match_starts') || '距离比赛开始'}
            </span>
          )}
          <span className="text-[7px] sm:text-[7px] text-muted-foreground font-mono">
        {timeDisplay}
      </span>
        </>
      )}
    </div>
  );
};

// Countdown Timer Component with Match Time
const MatchCountdown = ({ match }: { match: any }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState("");
  const [matchTime, setMatchTime] = useState("");

  useEffect(() => {
    if (match.status === "live") {
      // For live matches, show the current minute
      if (match.currentMinute) {
        setMatchTime(`${match.currentMinute}'`);
      }
      setCountdown(t('in_progress'));
      return;
    }

    const calculateCountdown = () => {
      const matchDateTime = new Date(`${match.date}T${match.time}`);
      const now = new Date();
      const diff = matchDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(t('in_progress'));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setCountdown(`${days}${t('days')} ${hours % 24}${t('hours')}`);
      } else if (hours > 0) {
        setCountdown(`${hours}${t('hours')} ${minutes}${t('minutes')}`);
      } else {
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [match, t]);

  return (
    <div className="flex flex-col items-center gap-1">
      <Badge 
        variant={match.status === "live" ? "default" : "secondary"}
        className={`text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 ${
          match.status === "live" 
            ? "bg-success/20 text-success border-success/50 animate-pulse" 
            : "bg-primary/20 text-primary border-primary/50"
        }`}
      >
        <Clock className="h-3 w-3" />
        {countdown}
      </Badge>
      {match.status === "live" && matchTime && (
        <span className="text-xs font-bold text-success font-mono-data">{matchTime}</span>
      )}
    </div>
  );
};

type MatchAnalysisResult = {
  analysis?: string;
  analyses?: ModelAnalysis[];
  error?: string;
};

type AnalysisDialogState = {
  open: boolean;
  matchInfo: { homeTeam: string; awayTeam: string; league: string };
  analysis: string | null;
  analyses: ModelAnalysis[];
  isLoading: boolean;
};

type DailyMatch = {
  fixture_id: number;
  date: string;
  kickoff_at: string;
  league_id?: number | null;
  league_name: string;
  league_logo?: string | null;
  home_team_id?: number | null;
  home_team_name: string;
  away_team_id?: number | null;
  away_team_name: string;
  goals_home: number | null;
  goals_away: number | null;
  status_short: string;
  status_elapsed?: number | null;
  home_logo?: string | null;
  away_logo?: string | null;
};

type AutoBet = {
  id: number;
  match_id: number | null;
  ai_id: string | null;
  ai_display_name: string;
  bet_type: string;
  prediction: string;
  confidence: number;
  odds: number;
  stake_amount: number;
  status: string;
  inserted_at: string;
  handicap_line?: number | null;
  over_under_line?: number | null;
  over_under_pick?: string | null;
  analysis_reference_ids?: number[] | null;
};

type MatchAnalysis = {
  id: number;
  match_id: number | null;
  ai_id: string | null;
  provider_model_id?: string;
  provider_model_name?: string;
  model_identifier?: string;
  analysis_text?: string;
  analysis?: string; // 数据库可能返回 analysis 字段
  created_at?: string;
  inserted_at?: string;
};

type AIBalance = {
  id: number;
  ai_id: string | null;
  ai_display_name: string;
  available_balance: number;
  locked_balance: number;
  currency: string;
};

const ActiveAIBets = () => {
  const { t, i18n } = useTranslation();
  
  // Get AI models (exclude locked ones like mystery and boospot)
  const activeAIs = aiModels.filter(ai => !ai.locked);

  // State for real data
  const [matches, setMatches] = useState<DailyMatch[]>([]);
  const [autoBets, setAutoBets] = useState<AutoBet[]>([]);
  const [aiBalances, setAiBalances] = useState<Record<string, AIBalance>>({});
  const [moneylinePredictions, setMoneylinePredictions] = useState<Record<string, { prediction: string; confidence: number; odds: number }>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Track if this is the first mount to avoid showing loading on language change
  const isFirstMount = useRef(true);
  const prevLanguage = useRef(i18n.language);

  // State to track which match index is shown for each AI
  const [currentMatchIndex, setCurrentMatchIndex] = useState<Record<string, number>>({});
  
  // State for analysis dialog
  const [analysisDialog, setAnalysisDialog] = useState<AnalysisDialogState>({
    open: false,
    matchInfo: { homeTeam: '', awayTeam: '', league: '' },
    analysis: null,
    analyses: [],
    isLoading: false,
  });

  // Fetch real data from database (only on mount and periodic refresh, not on language change)
  useEffect(() => {
    const fetchData = async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsInitialLoading(true);
        }
        
        // 获取 UTC+8 时区的日期字符串（与数据库存储一致）
        const getUTC8DateString = (date: Date): string => {
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Shanghai', // UTC+8 时区
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          return formatter.format(date);
        };
        
        const today = getUTC8DateString(new Date());
        // 计算昨天的日期（UTC+8）
        const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yesterdayStr = getUTC8DateString(yesterdayDate);
        
        // Completed statuses that should be excluded (same as fetch-daily-matches)
        const COMPLETED_STATUSES = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];

        // Fetch yesterday's and today's matches (live or upcoming) - exclude completed matches
        // Use client-side filtering to avoid missing any active status values from API
        const { data: matchesData, error: matchesError } = await supabase
          .from('daily_matches' as any)
          .select('*')
          .in('date', [yesterdayStr, today])
          .order('kickoff_at', { ascending: true });
        
        // Filter out completed matches on client side (same logic as fetch-daily-matches)
        const activeMatches = (matchesData || []).filter((match: any) => 
          !match.status_short || !COMPLETED_STATUSES.includes(match.status_short)
        );

        if (matchesError) {
          console.error('Error fetching matches:', matchesError);
          if (!isRefresh) {
            toast({
              title: "加载失败",
              description: "无法获取比赛数据",
              variant: "destructive",
            });
          }
        } else {
          const matchesList = (activeMatches || []) as unknown as DailyMatch[];
          setMatches(matchesList);
        }

        // Fetch auto bets (pending status for active predictions)
        // 包含昨天和今天的投注（因为要显示昨天和今天的比赛）
        const { data: betsData, error: betsError } = await supabase
          .from('ai_auto_bets' as any)
          .select('*')
          .eq('status', 'pending')
          .gte('inserted_at', `${yesterdayStr}T00:00:00Z`)
          .order('inserted_at', { ascending: false });

        if (betsError) {
          console.error('Error fetching auto bets:', betsError);
        } else {
          setAutoBets((betsData || []) as unknown as AutoBet[]);
          
          // 获取所有投注的分析记录，提取输赢预测
          const betsWithAnalysis = (betsData || []) as unknown as AutoBet[];
          const analysisIds = betsWithAnalysis
            .filter(b => b.analysis_reference_ids && b.analysis_reference_ids.length > 0)
            .flatMap(b => b.analysis_reference_ids || []);

          if (analysisIds.length > 0) {
            const { data: analysesData } = await supabase
              .from('ai_match_analyses' as any)
              .select('id, match_id, ai_id, bet_snapshot')
              .in('id', analysisIds);
            
            if (analysesData) {
              const predictionsMap: Record<string, { prediction: string; confidence: number; odds: number }> = {};
              
              analysesData.forEach((analysis: any) => {
                if (analysis.bet_snapshot && analysis.bet_snapshot.moneyline) {
                  const key = `${analysis.match_id}_${analysis.ai_id}`;
                  predictionsMap[key] = {
                    prediction: analysis.bet_snapshot.moneyline.prediction,
                    confidence: analysis.bet_snapshot.moneyline.confidence || 0,
                    odds: analysis.bet_snapshot.moneyline.odds || 1.9,
                  };
                }
              });
              
              setMoneylinePredictions(predictionsMap);
            }
          }
        }

        // Fetch AI balances
        const { data: balancesData, error: balancesError } = await supabase
          .from('ai_balances' as any)
          .select('*');

        if (balancesError) {
          console.error('Error fetching balances:', balancesError);
        } else {
          const balancesMap: Record<string, AIBalance> = {};
          ((balancesData || []) as unknown as AIBalance[]).forEach((balance) => {
            if (balance.ai_id) {
              balancesMap[balance.ai_id] = balance;
            }
          });
          setAiBalances(balancesMap);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        if (!isRefresh) {
          toast({
            title: "加载失败",
            description: "发生未知错误",
            variant: "destructive",
          });
        }
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    };

    // Only fetch data on initial mount
    if (isFirstMount.current) {
      fetchData(false);
      isFirstMount.current = false;
    }

    // Refresh data every 30 seconds (silent refresh)
    const interval = setInterval(() => fetchData(true), 30000);

    // 订阅 daily_matches 表的变化，实时更新比赛状态、比分等
    const matchesChannel = supabase
      .channel('active-matches-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_matches',
        },
        (payload) => {
          console.log('Match updated, refreshing data:', payload);
          fetchData(true);
        }
      )
      .subscribe();

    // 订阅 ai_auto_bets 表的变化，实时显示新投注和状态变化
    const autoBetsChannel = supabase
      .channel('auto-bets-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_auto_bets',
        },
        (payload) => {
          console.log('New auto bet inserted, refreshing data:', payload);
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_auto_bets',
        },
        (payload) => {
          console.log('Auto bet updated, refreshing data:', payload);
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(autoBetsChannel);
    };
  }, []); // Only run on mount, not on language change

  // Update language ref when language changes (for getTeamName/getLeagueName to react)
  useEffect(() => {
    prevLanguage.current = i18n.language;
    // No need to fetch data, just let component re-render with new translations
  }, [i18n.language]);

  // Function to get match analysis directly from ai_match_analyses table
  const getMatchAnalysisFromDB = async (
    matchId: number,
    aiId: string,
    match: any,
    aiModel: any
  ) => {
    setAnalysisDialog({
      open: true,
      matchInfo: {
        homeTeam: getTeamName(match, 'home'),
        awayTeam: getTeamName(match, 'away'),
        league: getLeagueName(match),
      },
      analysis: null,
      analyses: [],
      isLoading: true,
    });

    try {
      // 直接从 ai_match_analyses 表获取分析数据
      const { data: analysisData, error: analysisError } = await supabase
        .from('ai_match_analyses' as any)
        .select('*')
        .eq('match_id', matchId)
        .eq('ai_id', aiId)
        .order('inserted_at', { ascending: false });

      if (analysisError) {
        toast({
          title: "获取分析失败",
          description: analysisError.message || "无法从数据库获取分析数据",
          variant: "destructive",
        });
        setAnalysisDialog(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (!analysisData || analysisData.length === 0) {
        toast({
          title: "未找到分析",
          description: "该比赛暂无AI分析数据",
          variant: "default",
        });
        setAnalysisDialog(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // 转换分析数据格式
      const analyses: ModelAnalysis[] = (analysisData as unknown as MatchAnalysis[]).map((analysisItem) => {
        const analysisText = analysisItem.analysis_text || analysisItem.analysis || '';
        
        return {
          id: analysisItem.provider_model_id || analysisItem.ai_id || 'unknown',
          displayName: aiModel.displayName,
          model: analysisItem.provider_model_id || analysisItem.model_identifier || 'unknown',
          analysis: analysisText,
        };
      });

      setAnalysisDialog(prev => ({
        ...prev,
        analysis: analyses[0]?.analysis || null,
        analyses,
        isLoading: false,
      }));
    } catch (error) {
      toast({
        title: "获取分析失败",
        description: "发生未知错误，请稍后重试",
        variant: "destructive",
      });
      setAnalysisDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Helper function to get team name based on language
  const getTeamName = (match: DailyMatch | any, team: 'home' | 'away') => {
    // Get original team name from match data
    const originalName = ('home_team_name' in match)
      ? (team === 'home' ? match.home_team_name : match.away_team_name)
      : (team === 'home' ? match.homeTeam : match.awayTeam);
    
    if (!originalName) {
      return '';
    }
    
    // If Chinese language, try to get translation from i18n
    if (i18n.language === 'zh') {
      const translatedName = t(`teams.${originalName}`, originalName);
      // If translation key exists in resources, it will return the translated value
      // Otherwise, it returns the original name as fallback
      return translatedName;
    }
    
    // Return original name for English
    return originalName;
  };

  // Helper function to get league name based on language
  const getLeagueName = (match: DailyMatch | any) => {
    // Get original league name from match data
    const originalName = match.league_name || match.league;
    
    if (!originalName) {
      return '';
    }
    
    // If Chinese language, try to get translation from i18n
    if (i18n.language === 'zh') {
      const translatedName = t(`leagues.${originalName}`, originalName);
      // If translation key exists in resources, it will return the translated value
      // Otherwise, it returns the original name as fallback
      return translatedName;
    }
    
    // Return original name for English
    return originalName;
  };

  // Convert database match to component format
  const convertMatch = (match: DailyMatch) => {
    const isLive = match.status_short === 'LIVE';
    return {
      id: `match_${match.fixture_id}`,
      fixture_id: match.fixture_id,
      date: match.date,
      time: new Date(match.kickoff_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      league: match.league_name,
      homeTeam: match.home_team_name,
      awayTeam: match.away_team_name,
      homeScore: match.goals_home ?? 0,
      awayScore: match.goals_away ?? 0,
      status: isLive ? 'live' : 'upcoming',
      homeLogo: match.home_logo || undefined,
      awayLogo: match.away_logo || undefined,
      currentMinute: isLive ? 45 : undefined, // TODO: Get actual minute from API
    };
  };

  // Convert database bet to component format
  const convertBet = (bet: AutoBet, match: DailyMatch) => {
    const matchData = convertMatch(match);
    return {
      match: matchData,
      aiId: bet.ai_id || '',
      betType: bet.bet_type,
      prediction: bet.prediction,
      confidence: bet.confidence,
      odds: bet.odds,
      betAmount: bet.stake_amount,
      handicapLine: bet.handicap_line ?? undefined,
      overUnderLine: bet.over_under_line ?? undefined,
      overUnderPick: bet.over_under_pick ?? undefined,
      confirmed: bet.status === 'pending',
    };
  };

  const getBetTypeText = (betType: string, prediction: string, handicapLine?: number, overUnderLine?: number, overUnderPick?: string) => {
    switch(betType) {
      case "moneyline":
        return t('moneyline_bet');
      case "handicap":
        const sign = (handicapLine || 0) >= 0 ? '+' : '';
        return `${t('handicap_bet')} (${sign}${handicapLine})`;
      case "over_under":
        return `${t('over_under_bet')} ${overUnderLine} (${overUnderPick === 'over' ? t('over') : t('under')})`;
      default:
        return "";
    }
  };

  const getPredictionIcon = (prediction: string) => {
    switch(prediction) {
      case "HOME_WIN": return <TrendingUp className="h-4 w-4 text-success" />;
      case "AWAY_WIN": return <TrendingUp className="h-4 w-4 text-success" />;
      case "DRAW": return <ArrowRight className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  const getPredictionText = (prediction: string, match: any) => {
    switch(prediction) {
      case "HOME_WIN": return getTeamName(match, 'home');
      case "AWAY_WIN": return getTeamName(match, 'away');
      case "DRAW": return t('draw');
      default: return "";
    }
  };

  const getAIModel = (aiId: string) => {
    return aiModels.find(ai => ai.id === aiId);
  };

  const getModelColor = (aiId: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
      deepseek: { 
        bg: "from-blue-500/20 to-blue-600/10", 
        border: "border-blue-500/40", 
        text: "text-blue-400",
        glow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
      },
      gpt5: { 
        bg: "from-emerald-500/20 to-green-500/10", 
        border: "border-emerald-500/40", 
        text: "text-emerald-400",
        glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
      },
      claude: { 
        bg: "from-purple-500/20 to-violet-500/10", 
        border: "border-purple-500/40", 
        text: "text-purple-400",
        glow: "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
      },
      gemini: { 
        bg: "from-cyan-500/20 to-sky-500/10", 
        border: "border-cyan-500/40", 
        text: "text-cyan-400",
        glow: "drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
      },
      grok: { 
        bg: "from-orange-500/20 to-amber-500/10", 
        border: "border-orange-500/40", 
        text: "text-orange-400",
        glow: "drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
      },
      hunsoccermax: { 
        bg: "from-red-500/20 to-rose-500/10", 
        border: "border-red-500/40", 
        text: "text-red-400",
        glow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
      },
    };
    return colorMap[aiId] || colorMap.deepseek;
  };

  // Get matches with bets (live or upcoming)
  const matchesWithBets = matches.filter(match => 
    autoBets.some(bet => bet.match_id === match.fixture_id)
  );

  // Only show loading state on initial load, not on refresh
  if (isInitialLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-2xl font-bold">{t('active_ai_predictions')}</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          加载中...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* Subtle refresh indicator */}
      {isRefreshing && (
        <div className="absolute top-0 right-0 z-50">
          <div className="h-1 w-16 bg-primary/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 px-2">
        <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-center text-white">
          {t('active_ai_predictions')}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {activeAIs.map((aiModel) => {
          // Find this AI's bets from database, grouped by match
          const betsByMatch = new Map<number, { match: DailyMatch; bets: Array<ReturnType<typeof convertBet>> }>();
          
          matchesWithBets.forEach(match => {
            const matchBets = autoBets
              .filter(b => b.match_id === match.fixture_id && b.ai_id === aiModel.id)
              .map(bet => convertBet(bet, match));
            
            if (matchBets.length > 0) {
              betsByMatch.set(match.fixture_id, { match, bets: matchBets });
            }
          });

          // Get current match index for this AI (default to 0)
          const matchIndex = currentMatchIndex[aiModel.id] || 0;
          const matchEntries = Array.from(betsByMatch.values());
          const currentMatchData = matchEntries.length > 0 ? matchEntries[matchIndex] : null;
          
          // Separate bets by type: moneyline (胜负), handicap (让球), and over_under (大小球)
          let moneylineBet = currentMatchData?.bets.find(b => b.betType === 'moneyline') || null;
          const handicapBet = currentMatchData?.bets.find(b => b.betType === 'handicap') || null;
          const overUnderBet = currentMatchData?.bets.find(b => b.betType === 'over_under') || null;
          
          // 如果没有 moneylineBet，从 moneylinePredictions 状态中获取输赢预测
          if (!moneylineBet && currentMatchData && currentMatchData.match) {
            const predictionKey = `${currentMatchData.match.fixture_id}_${aiModel.id}`;
            const moneylinePrediction = moneylinePredictions[predictionKey];
            
            if (moneylinePrediction) {
              moneylineBet = {
                match: currentMatchData.bets[0]?.match || convertMatch(currentMatchData.match),
                aiId: aiModel.id,
                betType: 'moneyline',
                prediction: moneylinePrediction.prediction,
                confidence: moneylinePrediction.confidence,
                odds: moneylinePrediction.odds,
                betAmount: 0,
                handicapLine: undefined,
                overUnderLine: undefined,
                overUnderPick: undefined,
                confirmed: false,
              };
            }
          }
          
          // For backward compatibility, use moneylineBet as the main bet
          const bet = moneylineBet || handicapBet || overUnderBet;

          // Get AI balance
          const balance = aiBalances[aiModel.id];
          const balanceValue = balance 
            ? `$${(balance.available_balance + balance.locked_balance).toLocaleString()}`
            : aiModel.currentValue;

          // Handler to switch to next match
          const nextMatch = (e: React.MouseEvent) => {
            e.stopPropagation();
            setCurrentMatchIndex(prev => ({
              ...prev,
              [aiModel.id]: ((prev[aiModel.id] || 0) + 1) % matchEntries.length
            }));
          };

          // Handler to switch to previous match
          const prevMatch = (e: React.MouseEvent) => {
            e.stopPropagation();
            setCurrentMatchIndex(prev => ({
              ...prev,
              [aiModel.id]: ((prev[aiModel.id] || 0) - 1 + matchEntries.length) % matchEntries.length
            }));
          };

          return (
            <div 
              key={aiModel.id}
              className="relative rounded-xl p-3 sm:p-3 md:p-4 bg-gradient-to-br from-card/95 via-card to-card/90 hover:shadow-2xl transition-all duration-500 border-2 border-primary/30 hover:border-primary/60 overflow-hidden group hover:scale-105 cursor-pointer"
              onClick={nextMatch}
            >
              {/* Match Counter - Top Right */}
              {matchEntries.length > 1 && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex items-center gap-0.5 sm:gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 sm:h-5 sm:w-5 p-0 bg-background/80 hover:bg-background"
                    onClick={prevMatch}
                  >
                    <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                  <Badge 
                    variant="secondary"
                    className="text-[8px] sm:text-[10px] font-bold px-1 sm:px-2 py-0.5 bg-background/80"
                  >
                    {matchIndex + 1}/{matchEntries.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 sm:h-5 sm:w-5 p-0 bg-background/80 hover:bg-background"
                    onClick={nextMatch}
                  >
                    <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              )}

              {/* No Bets Indicator */}
              {matchEntries.length === 0 && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
                  <Badge 
                    variant="outline"
                    className="text-[8px] sm:text-[10px] font-bold px-2 py-0.5 bg-muted/80 text-muted-foreground"
                  >
                    {t('no_bets')}
                  </Badge>
                </div>
              )}

              {/* Background Image for DeepSeek */}
              {aiModel.id === 'deepseek' && (
                <div 
                  className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${deepseekCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px'
                  }}
                />
              )}
              
              {/* Background Image for Grok */}
              {aiModel.id === 'grok' && (
                <div 
                  className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${grokCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px'
                  }}
                />
              )}
              
              {/* Background Image for GPT5 */}
              {aiModel.id === 'gpt5' && (
                <div 
                  className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${gpt5CardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
              
              {/* Background Image for Claude */}
              {aiModel.id === 'claude' && (
                <div 
                  className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${claudeCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
              
              {/* Background Image for Gemini */}
              {aiModel.id === 'gemini' && (
                <div 
                  className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${geminiCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
              
              {/* Background Image for HUNSOCCER MAX */}
              {aiModel.id === 'hunsoccermax' && (
                <div 
                  className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${hunsoccerMaxCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
              
              {/* Diagonal Stripe Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-transparent" />
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary)) 10px, hsl(var(--primary)) 11px)',
                  opacity: 0.1
                }} />
              </div>
              
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              
              {/* Content */}
              <div className="relative z-10 space-y-2 sm:space-y-2 md:space-y-3">
                 {/* Header with Avatar and Balance */}
                <div className="flex flex-col items-center gap-1.5 sm:gap-1.5 pb-2 sm:pb-2 border-b-2 border-primary/20 relative">
                  {/* Analysis Button - Left Side */}
                  {(moneylineBet || handicapBet || overUnderBet) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute left-0 top-0 sm:left-1 sm:top-1 h-auto px-2 sm:px-2.5 py-1.5 sm:py-1.5 border-primary/50 bg-primary/10 hover:bg-primary/20 hover:border-primary z-10 group/analyze flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentMatchData) {
                          // 直接从 ai_match_analyses 表获取分析数据
                          getMatchAnalysisFromDB(
                            currentMatchData.match.fixture_id,
                            aiModel.id,
                            convertMatch(currentMatchData.match),
                            aiModel
                          );
                        }
                      }}
                      title="查看分析"
                    >
                      <BarChart3 className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5 text-primary group-hover/analyze:scale-110 transition-transform" />
                      <span className="text-[9px] sm:text-[9px] font-bold text-primary">查看分析</span>
                    </Button>
                  )}
                  
                  <Avatar className="h-12 w-12 sm:h-10 md:h-14 sm:w-10 md:w-14 ring-2 ring-primary/40 shadow-2xl group-hover:ring-primary/60 transition-all">
                    <AvatarImage src={AI_ICONS[aiModel.id]} alt={aiModel.displayName} className="object-cover" />
                    <AvatarFallback className="text-sm sm:text-sm md:text-lg font-bold bg-gradient-to-br from-primary to-primary/50">{aiModel.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] sm:text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{t('wallet_balance')}</span>
                    <Badge variant="outline" className="text-xs sm:text-xs font-mono-data font-bold px-2 sm:px-2 py-0.5 bg-gradient-to-r from-foreground/10 to-foreground/5 border-2 border-foreground/20 text-foreground">
                      {balanceValue}
                    </Badge>
                  </div>
                </div>

                {/* Match Info with Team Logos */}
                {currentMatchData ? (
                  <div className="space-y-1 sm:space-y-1 py-1 sm:py-1">
                    <Badge variant="outline" className="text-[9px] sm:text-[9px] w-full justify-center py-1">
                      {getLeagueName(currentMatchData.match)}
                    </Badge>
                  
                    {/* Teams with Logos */}
                    <div className="flex items-center justify-between gap-1 sm:gap-1 px-1">
                    <div className="flex items-center gap-1 sm:gap-1 flex-1 min-w-0">
                      {currentMatchData.match.home_logo ? (
                        <Avatar className="h-5 w-5 sm:h-5 sm:w-5 ring-1 ring-border shrink-0">
                          <AvatarImage src={currentMatchData.match.home_logo} alt={getTeamName(currentMatchData.match, 'home')} />
                          <AvatarFallback><Shield className="h-2 w-2 sm:h-2 sm:w-2" /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-5 w-5 sm:h-5 sm:w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Shield className="h-2 w-2 sm:h-2 sm:w-2 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-bold text-[10px] sm:text-[10px] leading-tight flex-1 text-left truncate">
                        {getTeamName(currentMatchData.match, 'home')}
                      </p>
                    </div>
                    
                      {/* Match Time Display - Shows countdown or live score */}
                      <MatchTimeDisplay match={currentMatchData.match} />
                    
                    <div className="flex items-center gap-1 sm:gap-1 flex-1 min-w-0 justify-end">
                      <p className="font-bold text-[10px] sm:text-[10px] leading-tight flex-1 text-right truncate">
                        {getTeamName(currentMatchData.match, 'away')}
                      </p>
                      {currentMatchData.match.away_logo ? (
                        <Avatar className="h-5 w-5 sm:h-5 sm:w-5 ring-1 ring-border shrink-0">
                          <AvatarImage src={currentMatchData.match.away_logo} alt={getTeamName(currentMatchData.match, 'away')} />
                          <AvatarFallback><Shield className="h-2 w-2 sm:h-2 sm:w-2" /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-5 w-5 sm:h-5 sm:w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Shield className="h-2 w-2 sm:h-2 sm:w-2 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('no_active_predictions')}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {t('no_bets_for_ai')}
                    </p>
                  </div>
                )}

                {/* Professional Sportsbook Bet Slip - Complete */}
                {/* 下部分：让球预测 */}
                {handicapBet && (
                  <div className="space-y-2 pt-1.5 sm:pt-1.5 border-t-2 border-primary/20">
                    <div className="bg-card/90 backdrop-blur-md rounded-lg overflow-hidden border-2 border-border/80 shadow-xl">
                      {/* Header */}
                      <div className="bg-muted/60 px-2 sm:px-2 py-1 sm:py-1 border-b border-border/70 flex items-center justify-between backdrop-blur-sm">
                        <p className="text-[9px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t('bet_slip')}
                        </p>
                        <Badge 
                          variant={handicapBet.confirmed ? "default" : "outline"}
                          className={`text-[9px] sm:text-[9px] font-bold px-1.5 sm:px-1.5 py-0.5 ${
                            handicapBet.confirmed 
                              ? "bg-success/20 text-success border-success/50" 
                              : "bg-destructive/20 text-destructive border-destructive/50"
                          }`}
                        >
                          {handicapBet.confirmed ? "已确定" : "未确定"}
                        </Badge>
                      </div>
                      
                      {/* Bet Details */}
                      <div className="p-2 sm:p-2 space-y-1.5 sm:space-y-1.5 bg-card/95 backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] sm:text-[10px] font-bold bg-primary/15 text-primary border-primary/40 px-2 sm:px-2 py-1 sm:py-1">
                              {handicapBet.prediction === 'HOME_WIN' || handicapBet.prediction === 'HOME' 
                                ? getTeamName(currentMatchData!.match, 'home')
                                : handicapBet.prediction === 'AWAY_WIN' || handicapBet.prediction === 'AWAY' 
                                ? getTeamName(currentMatchData!.match, 'away')
                                : t('draw')}
                              {handicapBet.handicapLine !== undefined && (
                                <span className="ml-1 font-mono-data">
                                  {handicapBet.handicapLine > 0 ? '+' : ''}{handicapBet.handicapLine}
                                </span>
                              )}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] sm:text-[10px] font-bold px-2 sm:px-2 py-1 bg-secondary/80 text-foreground border-2 border-border">
                              {handicapBet.confidence}% {t('confidence')}
                            </Badge>
                          </div>
                          <Badge variant="default" className="text-[10px] sm:text-[10px] font-mono-data font-bold bg-foreground text-background px-2 sm:px-2 py-1">
                            @{Math.max(0, handicapBet.odds - 1).toFixed(2)}
                          </Badge>
                        </div>
                        
                        {/* Handicap Selection */}
                        <div className="bg-muted/50 rounded-lg p-1 sm:p-1.5 border border-border/70 backdrop-blur-sm">
                          <p className="text-[8px] sm:text-[9px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                            {t('handicap_bet')}
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            <div className={`p-1 sm:p-1.5 rounded border-2 transition-all relative ${
                              handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME"
                                ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                : "bg-card border-border/50"
                            }`}>
                              {(handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                              )}
                              <div className="flex items-center gap-1">
                                {currentMatchData?.match.home_logo ? (
                                  <Avatar className="h-3 w-3 sm:h-4 sm:w-4 ring-1 ring-border shrink-0">
                                    <AvatarImage src={currentMatchData.match.home_logo} alt={getTeamName(currentMatchData.match, 'home')} />
                                    <AvatarFallback><Shield className="h-1.5 w-1.5" /></AvatarFallback>
                                  </Avatar>
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[7px] sm:text-[8px] font-medium truncate">{getTeamName(currentMatchData!.match, 'home')}</p>
                                </div>
                                {handicapBet.handicapLine !== undefined && (
                                  <Badge variant={(handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? "default" : "outline"} className="text-[7px] sm:text-[8px] font-mono-data py-0 px-1 shrink-0">
                                    {(() => {
                                      // 如果预测是主队，主队显示 handicapLine；如果预测是客队，主队显示 -handicapLine
                                      const homeLine = (handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") 
                                        ? handicapBet.handicapLine 
                                        : -handicapBet.handicapLine;
                                      return homeLine > 0 ? `+${homeLine}` : `${homeLine}`;
                                    })()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className={`p-1 sm:p-1.5 rounded border-2 transition-all relative ${
                              handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY"
                                ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                : "bg-card border-border/50"
                            }`}>
                              {(handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                              )}
                              <div className="flex items-center gap-1">
                                {currentMatchData?.match.away_logo ? (
                                  <Avatar className="h-3 w-3 sm:h-4 sm:w-4 ring-1 ring-border shrink-0">
                                    <AvatarImage src={currentMatchData.match.away_logo} alt={getTeamName(currentMatchData.match, 'away')} />
                                    <AvatarFallback><Shield className="h-1.5 w-1.5" /></AvatarFallback>
                                  </Avatar>
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[7px] sm:text-[8px] font-medium truncate">{getTeamName(currentMatchData!.match, 'away')}</p>
                                </div>
                                {handicapBet.handicapLine !== undefined && (
                                  <Badge variant={(handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? "default" : "outline"} className="text-[7px] sm:text-[8px] font-mono-data py-0 px-1 shrink-0">
                                    {(() => {
                                      // 如果预测是客队，客队显示 handicapLine；如果预测是主队，客队显示 -handicapLine
                                      const awayLine = (handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") 
                                        ? handicapBet.handicapLine 
                                        : -handicapBet.handicapLine;
                                      return awayLine > 0 ? `+${awayLine}` : `${awayLine}`;
                                    })()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Financial Details */}
                        <div className="space-y-1 sm:space-y-1 pt-1 sm:pt-1 border-t border-border/30">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-[9px] sm:text-[9px] text-muted-foreground font-medium">
                              {t('bet_amount')}
                            </span>
                            <span className="text-xs sm:text-sm font-mono-data font-bold text-foreground">
                              ${handicapBet.betAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-[9px] sm:text-[9px] text-muted-foreground font-medium">
                              {t('odds')}
                            </span>
                            <span className="text-xs sm:text-sm font-mono-data font-bold text-foreground">
                              {Math.max(0, handicapBet.odds - 1).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1 bg-success/10 rounded-lg px-2 sm:px-2 border border-success/30">
                            <span className="text-[9px] sm:text-[9px] text-success font-bold">
                              {t('potential_return')}
                            </span>
                            <span className="text-xs sm:text-sm font-mono-data font-bold text-success">
                              ${(handicapBet.betAmount * handicapBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 下部分：大小球预测 */}
                {overUnderBet && (
                  <div className={`space-y-2 ${handicapBet ? 'pt-2' : 'pt-1.5 sm:pt-1.5 border-t-2 border-primary/20'}`}>
                    <div className="bg-card/90 backdrop-blur-md rounded-lg overflow-hidden border-2 border-border/80 shadow-xl">
                      {/* Header */}
                      <div className="bg-muted/60 px-2 sm:px-2 py-1 sm:py-1 border-b border-border/70 flex items-center justify-between backdrop-blur-sm">
                        <p className="text-[9px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t('bet_slip')}
                        </p>
                        <Badge 
                          variant={overUnderBet.confirmed ? "default" : "outline"}
                          className={`text-[9px] sm:text-[9px] font-bold px-1.5 sm:px-1.5 py-0.5 ${
                            overUnderBet.confirmed 
                              ? "bg-success/20 text-success border-success/50" 
                              : "bg-destructive/20 text-destructive border-destructive/50"
                          }`}
                        >
                          {overUnderBet.confirmed ? "已确定" : "未确定"}
                        </Badge>
                      </div>
                      
                      {/* Bet Details */}
                      <div className="p-2 sm:p-2 space-y-1.5 sm:space-y-1.5 bg-card/95 backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] sm:text-[10px] font-bold bg-primary/15 text-primary border-primary/40 px-2 sm:px-2 py-1 sm:py-1">
                              {overUnderBet.overUnderLine} ({overUnderBet.overUnderPick === 'over' ? t('over') : t('under')})
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] sm:text-[10px] font-bold px-2 sm:px-2 py-1 bg-secondary/80 text-foreground border-2 border-border">
                              {overUnderBet.confidence}% {t('confidence')}
                            </Badge>
                          </div>
                          <Badge variant="default" className="text-[10px] sm:text-[10px] font-mono-data font-bold bg-foreground text-background px-2 sm:px-2 py-1">
                            @{Math.max(0, overUnderBet.odds - 1).toFixed(2)}
                          </Badge>
                        </div>
                        
                        {/* Over/Under Lines */}
                        <div className="bg-muted/50 rounded-lg p-1 sm:p-1.5 border border-border/70 backdrop-blur-sm">
                          <p className="text-[8px] sm:text-[9px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                            {t('over_under_bet')}
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {/* 大球选项 - 根据实际的大小球预测高亮 */}
                            {(() => {
                              // 根据实际的大小球预测决定是否选中
                              const isSelected = overUnderBet.overUnderPick === 'over';
                              
                              return (
                                <div className={`p-1 sm:p-1.5 rounded border-2 transition-all relative ${
                                  isSelected
                                    ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                    : "bg-card border-border/50"
                                }`}>
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                                  )}
                                  <div className="flex items-center gap-1 justify-center">
                                    <p className="text-[7px] sm:text-[8px] font-medium">{t('over')}</p>
                                    <Badge variant={isSelected ? "default" : "outline"} className="text-[7px] sm:text-[8px] font-mono-data py-0 px-1 shrink-0">
                                      {overUnderBet.overUnderLine}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })()}
                            {/* 小球选项 - 根据实际的大小球预测高亮 */}
                            {(() => {
                              // 根据实际的大小球预测决定是否选中
                              const isSelected = overUnderBet.overUnderPick === 'under';
                              
                              return (
                                <div className={`p-1 sm:p-1.5 rounded border-2 transition-all relative ${
                                  isSelected
                                    ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                    : "bg-card border-border/50"
                                }`}>
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                                  )}
                                  <div className="flex items-center gap-1 justify-center">
                                    <p className="text-[7px] sm:text-[8px] font-medium">{t('under')}</p>
                                    <Badge variant={isSelected ? "default" : "outline"} className="text-[7px] sm:text-[8px] font-mono-data py-0 px-1 shrink-0">
                                      {overUnderBet.overUnderLine}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* Financial Details */}
                        <div className="space-y-1 sm:space-y-1 pt-1 sm:pt-1 border-t border-border/30">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-[9px] sm:text-[9px] text-muted-foreground font-medium">
                              {t('bet_amount')}
                            </span>
                            <span className="text-xs sm:text-sm font-mono-data font-bold text-foreground">
                              ${overUnderBet.betAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-[9px] sm:text-[9px] text-muted-foreground font-medium">
                              {t('odds')}
                            </span>
                            <span className="text-xs sm:text-sm font-mono-data font-bold text-foreground">
                              {Math.max(0, overUnderBet.odds - 1).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1 bg-success/10 rounded-lg px-2 sm:px-2 border border-success/30">
                            <span className="text-[9px] sm:text-[9px] text-success font-bold">
                              {t('potential_return')}
                            </span>
                            <span className="text-xs sm:text-sm font-mono-data font-bold text-success">
                              ${(overUnderBet.betAmount * overUnderBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Corner Accent */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-3xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-primary/20 to-transparent rounded-tr-3xl" />
            </div>
          );
        })}
      </div>
      
      <MatchAnalysisDialog
        open={analysisDialog.open}
        onOpenChange={(open) => setAnalysisDialog(prev => ({ ...prev, open }))}
        analysis={analysisDialog.analysis}
        analyses={analysisDialog.analyses}
        isLoading={analysisDialog.isLoading}
        matchInfo={analysisDialog.matchInfo}
      />
    </div>
  );
};

export default ActiveAIBets;
