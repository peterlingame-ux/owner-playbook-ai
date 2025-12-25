import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MatchAnalysisDialog, ModelAnalysis } from "@/components/MatchAnalysisDialog";
import PlayerExclusiveModelCard from "@/components/PlayerExclusiveModelCard";
import { useAuth } from "@/contexts/AuthContext";
import { PlaceBetDialog } from "./PlaceBetDialog";
import { toast } from "@/hooks/use-toast";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";

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
  const [matchStatus, setMatchStatus] = useState<'not_started' | 'live' | 'half_time' | 'other'>('not_started');

  useEffect(() => {
    const updateTime = () => {
      const status = match.status_short?.trim() || '';
      const kickoffTime = getKickoffDate(match);
      
      // 已开赛的状态列表
      const startedStatuses = ['LIVE', '1H', '2H', 'ET', 'HT', 'P', 'BREAK', 'FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];
      
      // 如果状态是已开赛，显示相应信息
      if (startedStatuses.includes(status)) {
        setShowCountdown(false);
        
        // 中场休息
        if (status === 'HT') {
          setMatchStatus('half_time');
          setTimeDisplay(t('half_time_break') || '中场休息');
          return;
        }
        
        // 比赛进行中：LIVE, 1H, 2H, ET
        if (['LIVE', '1H', '2H', 'ET'].includes(status)) {
          setMatchStatus('live');
          const elapsed = match.status_elapsed;
          setTimeDisplay(elapsed !== null && elapsed !== undefined ? `${elapsed}'` : status);
          return;
        }
        
        // 其他已开赛状态
        setMatchStatus('other');
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
        return;
      }
      
      // 如果状态不是已开赛，根据比赛时间判断
      if (!kickoffTime) {
        setMatchStatus('not_started');
        setShowCountdown(true);
        setTimeDisplay('--:--:--');
        return;
      }
      
      const now = new Date();
      const diff = kickoffTime.getTime() - now.getTime();
      
      // 如果比赛时间还未到，显示倒计时
      if (diff > 0) {
        setMatchStatus('not_started');
        setShowCountdown(true);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // 显示时分秒格式：HH:MM:SS
        setTimeDisplay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return;
      }
      
      // 如果比赛时间已过但状态不是已开赛，显示"即将开始"或比赛时间
      if (diff <= 0 && diff > -300000) { // 5分钟内
        setMatchStatus('not_started');
        setShowCountdown(false);
        setTimeDisplay(t('starting_soon') || '即将开始');
        return;
      }
      
      // 其他情况，显示空
      setMatchStatus('other');
      setShowCountdown(false);
      setTimeDisplay('');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [match.status_short, match.status_elapsed, match.mgt, t]);

  return (
    <div className="flex flex-col items-center gap-0.5 px-1 sm:px-1 shrink-0">
      {matchStatus === 'not_started' ? (
        <>
          {/* 未开赛：显示 VS 和倒计时 */}
          <span className="text-[10px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[7px] sm:text-[8px] text-muted-foreground font-medium">
            {t('until_match_starts') || '距离比赛开始'}
          </span>
          <span className="text-[8px] sm:text-[9px] text-foreground/70 font-mono font-semibold">
            {timeDisplay}
          </span>
        </>
      ) : matchStatus === 'live' ? (
        <>
          {/* 开赛：显示 VS 和比赛时间 */}
          <span className="text-[10px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[9px] sm:text-[10px] text-success font-bold font-mono">
            {timeDisplay}
          </span>
        </>
      ) : matchStatus === 'half_time' ? (
        <>
          {/* 中场休息：显示 VS 和"中场休息" */}
          <span className="text-[10px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[8px] sm:text-[9px] text-muted-foreground font-bold">
            {timeDisplay}
          </span>
        </>
      ) : (
        <>
          {/* 其他状态 */}
          <span className="text-[10px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[8px] sm:text-[9px] text-muted-foreground font-mono font-semibold">
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

// 统一获取开赛时间，仅使用 mgt 毫秒时间戳
const getKickoffDate = (match: Pick<DailyMatch, 'mgt'>): Date | null => {
  const ms = match.mgt;
  if (ms === undefined || ms === null || ms === 0) return null;
  const parsed = typeof ms === 'string' ? Number(ms) : ms;
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  // 验证时间戳是否合理（大于 2000-01-01 的时间戳，946684800000 毫秒）
  const MIN_VALID_TIMESTAMP = 946684800000; // 2000-01-01 00:00:00 UTC
  if (parsed < MIN_VALID_TIMESTAMP) return null;
  return new Date(parsed);
};

type DailyMatch = {
  mid: string;
  date: string;
  // mgt 为毫秒时间戳，必须提供
  mgt: number;
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
  // 兼容 sports API 原始字段
  mhn?: string | null;
  man?: string | null;
  mhlu?: string[] | null;
  malu?: string[] | null;
  tn?: string | null;
  tnjc?: string | null;
};

// 兼容 sports API 记录，统一成组件使用的字段
const normalizeDailyMatch = (match: any): DailyMatch => {
  const mid = match.mid?.toString() ?? match.id?.toString() ?? '';
  
  // 为 logo URL 添加前缀（如果是相对路径）
  const addLogoPrefix = (url: string | null | undefined): string | null => {
    if (!url || typeof url !== 'string' || !url.trim()) return null;
    const trimmedUrl = url.trim();
    // 如果已经是完整的 URL，直接返回
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    // 如果是相对路径，添加前缀
    const prefix = 'https://image.jganten.com';
    // 确保路径以 / 开头
    const path = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
    return `${prefix}${path}`;
  };
  
  // 提取主队 logo：优先使用 mhlut（文本格式），其次使用 mhlu 数组的第一个元素
  const getHomeLogo = () => {
    if (match.home_logo) return addLogoPrefix(match.home_logo);
    if (match.mhlut && typeof match.mhlut === 'string' && match.mhlut.trim()) return addLogoPrefix(match.mhlut);
    if (Array.isArray(match.mhlu) && match.mhlu.length > 0 && match.mhlu[0]) return addLogoPrefix(match.mhlu[0]);
    return null;
  };
  
  // 提取客队 logo：优先使用 malut（文本格式），其次使用 malu 数组的第一个元素
  const getAwayLogo = () => {
    if (match.away_logo) return addLogoPrefix(match.away_logo);
    if (match.malut && typeof match.malut === 'string' && match.malut.trim()) return addLogoPrefix(match.malut);
    if (Array.isArray(match.malu) && match.malu.length > 0 && match.malu[0]) return addLogoPrefix(match.malu[0]);
    return null;
  };
  
  // 处理 mgt：确保是有效的毫秒时间戳
  const mgtValue = match.mgt;
  const parsedMgt = typeof mgtValue === 'string' ? Number(mgtValue) : mgtValue;
  const validMgt = (parsedMgt && !Number.isNaN(parsedMgt) && parsedMgt > 0) ? parsedMgt : 0;
  
  return {
    mid,
    date: match.date,
    mgt: validMgt,
    league_id: match.league_id ?? match.tid ?? null,
    league_name: match.league_name ?? match.tn ?? match.tnjc ?? '',
    league_logo: addLogoPrefix(match.league_logo ?? match.lurl ?? null),
    home_team_id: match.home_team_id ?? (match.mhid ? Number(match.mhid) || match.mhid : null),
    home_team_name: match.home_team_name ?? match.mhn ?? '',
    away_team_id: match.away_team_id ?? (match.maid ? Number(match.maid) || match.maid : null),
    away_team_name: match.away_team_name ?? match.man ?? '',
    goals_home: match.goals_home ?? match.mhs ?? null,
    goals_away: match.goals_away ?? match.mas ?? null,
    status_short: match.status_short ?? match.mst ?? '',
    status_elapsed: match.status_elapsed ?? match.mle ?? null,
    home_logo: getHomeLogo(),
    away_logo: getAwayLogo(),
    mhn: match.mhn ?? null,
    man: match.man ?? null,
    mhlu: match.mhlu ?? null,
    malu: match.malu ?? null,
    tn: match.tn ?? null,
    tnjc: match.tnjc ?? null,
  };
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
  const { user, userProfile } = useAuth();
  
  // Get AI models (exclude locked ones like mystery and boospot, and hunsoccermax which is replaced by player's model)
  const activeAIs = aiModels.filter(ai => !ai.locked && ai.id !== 'hunsoccermax');

  // Helper function to get model display name (same as ModelCard - only show base name without version)
  const getModelDisplayName = (model: typeof aiModels[0]) => {
    if (model.id === 'hunsoccermax') {
      return user && userProfile?.display_name ? userProfile.display_name : (t('demo_player') || '体验玩家');
    }
    // Only show the first word (base name) without version number, same as ModelCard
    return model.displayName.split(' ')[0];
  };

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
  // State to track slide direction for animation
  const [slideDirection, setSlideDirection] = useState<Record<string, 'left' | 'right'>>({});
  
  // State for analysis dialog
  const [analysisDialog, setAnalysisDialog] = useState<AnalysisDialogState>({
    open: false,
    matchInfo: { homeTeam: '', awayTeam: '', league: '' },
    analysis: null,
    analyses: [],
    isLoading: false,
  });

  // State for PK dialog
  const [pkDialogOpen, setPkDialogOpen] = useState(false);
  const [pkSelectedMatch, setPkSelectedMatch] = useState<DailyMatch | null>(null);

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
          .order('mgt', { ascending: true });
        
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
          const matchesList = (activeMatches || []).map(normalizeDailyMatch) as DailyMatch[];
          setMatches(matchesList);
        }

        // Fetch auto bets (pending and confirmed status for active predictions)
        // 包含昨天和今天的投注（因为要显示昨天和今天的比赛）
        // 显示 pending 和 confirmed 状态的投注（已确定但比赛未完成的投注）
        const { data: betsData, error: betsError } = await supabase
          .from('ai_auto_bets' as any)
          .select('*')
          .in('status', ['pending', 'confirmed'])
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
    matchId: string,
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
    const kickoff = getKickoffDate(match);
    return {
      id: `match_${match.mid}`,
      mid: match.mid,
      date: match.date,
      time: kickoff ? kickoff.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }) : '--:--',
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
      confirmed: bet.status === 'confirmed' || bet.status === 'pending',
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
    // Unified professional color scheme
    return { 
      bg: "from-secondary/30 to-secondary/10", 
      border: "border-border/40", 
      text: "text-foreground",
      glow: ""
    };
  };

  // PK Dialog function
  const handleOpenPKDialog = (match: DailyMatch) => {
    setPkSelectedMatch(match);
    setPkDialogOpen(true);
  };

  // Get matches with bets (live or upcoming)
  const matchesWithBets = matches.filter(match => 
    autoBets.some(bet => bet.match_id?.toString() === match.mid)
  );
  
  // Only show loading state on initial load, not on refresh
  if (isInitialLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center mb-5">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">{t('active_ai_predictions')}</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          加载中...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full relative overflow-x-hidden max-w-full">
      {/* Subtle refresh indicator */}
      {isRefreshing && (
        <div className="absolute top-0 right-0 z-50">
          <div className="h-0.5 w-12 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-foreground/50 animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-center mb-4 sm:mb-5">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">
          {t('active_ai_predictions')}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {activeAIs.map((aiModel) => {
          // Find this AI's bets from database, grouped by match
          const betsByMatch = new Map<string, { match: DailyMatch; bets: Array<ReturnType<typeof convertBet>> }>();
          
          matchesWithBets.forEach(match => {
            const matchBets = autoBets
              .filter(b => b.match_id?.toString() === match.mid && b.ai_id === aiModel.id)
              .map(bet => convertBet(bet, match));
            
            if (matchBets.length > 0) {
              betsByMatch.set(match.mid, { match, bets: matchBets });
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
          const predictionKey = `${currentMatchData.match.mid}_${aiModel.id}`;
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
            ? `${(balance.available_balance + balance.locked_balance).toLocaleString()}模拟积分`
            : aiModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '') ? `${Number(aiModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '')).toLocaleString()}模拟积分` : '10,000模拟积分';

          // Handler to switch to next match
          const nextMatch = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSlideDirection(prev => ({ ...prev, [aiModel.id]: 'right' }));
            setCurrentMatchIndex(prev => ({
              ...prev,
              [aiModel.id]: ((prev[aiModel.id] || 0) + 1) % matchEntries.length
            }));
          };

          // Handler to switch to previous match
          const prevMatch = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSlideDirection(prev => ({ ...prev, [aiModel.id]: 'left' }));
            setCurrentMatchIndex(prev => ({
              ...prev,
              [aiModel.id]: ((prev[aiModel.id] || 0) - 1 + matchEntries.length) % matchEntries.length
            }));
          };

          return (
            <div 
              key={aiModel.id}
              className="relative rounded-lg p-3 sm:p-4 bg-card border border-border/30 hover:border-border/50 transition-all duration-300 overflow-hidden cursor-pointer"
              onClick={nextMatch}
            >
              {/* Match Counter - Bottom Right */}
              {matchEntries.length > 1 && (
                <div className="absolute bottom-0 right-1 sm:bottom-0 sm:right-2 z-20 flex items-center gap-0.5 sm:gap-0.5 opacity-70 hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-3 w-3 sm:h-4 sm:w-4 p-0 bg-background/60 hover:bg-background/80"
                    onClick={prevMatch}
                    title={t('previous_match') || '上一场'}
                  >
                    <ChevronLeft className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  </Button>
                  <Badge 
                    variant="secondary"
                    className="text-[6px] sm:text-[8px] font-bold px-0.5 sm:px-1 py-0 bg-background/60 cursor-pointer hover:bg-background/80 transition-colors"
                    onClick={nextMatch}
                    title={t('next_match') || '下一场'}
                  >
                    {matchIndex + 1}/{matchEntries.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-3 w-3 sm:h-4 sm:w-4 p-0 bg-background/60 hover:bg-background/80"
                    onClick={nextMatch}
                    title={t('next_match') || '下一场'}
                  >
                    <ChevronRight className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  </Button>
                  <span className="text-[6px] sm:text-[8px] text-muted-foreground/60 ml-0.5 hidden sm:inline">
                    {t('click_to_switch_next') || '点击切换下一页'}
                  </span>
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

              {/* Content */}
              <div className="relative z-10 space-y-3 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${aiModel.id}-${matchIndex}`}
                    initial={{ 
                      opacity: 0, 
                      x: slideDirection[aiModel.id] === 'right' ? 100 : -100 
                    }}
                    animate={{ 
                      opacity: 1, 
                      x: 0 
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: slideDirection[aiModel.id] === 'right' ? -100 : 100 
                    }}
                    transition={{ 
                      duration: 0.3, 
                      ease: "easeInOut" 
                    }}
                    className="space-y-3"
                  >
                {/* Compact Header - AI Info & Actions */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/30">
                  {/* AI Avatar & Balance */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10 ring-1 ring-primary/30">
                      <AvatarImage 
                        src={AI_ICONS[aiModel.id]} 
                        alt={aiModel.displayName} 
                        className="object-cover" 
                        style={aiModel.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                      />
                      <AvatarFallback className="text-xs font-bold bg-primary/20">{aiModel.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">{getModelDisplayName(aiModel)}</span>
                      <span className="text-[10px] font-mono-data text-muted-foreground">{balanceValue}</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {(moneylineBet || handicapBet || overUnderBet) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentMatchData) {
                            getMatchAnalysisFromDB(
                              currentMatchData.match.mid,
                              aiModel.id,
                              convertMatch(currentMatchData.match),
                              aiModel
                            );
                          }
                        }}
                      >
                        <span className="text-[11px] font-bold">AI分析</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Match Info with Team Logos */}
                {currentMatchData ? (
                  <div className="space-y-1.5 py-1">
                    {/* League & Status Row */}
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="text-[10px] sm:text-[11px] py-0.5 px-2.5 truncate max-w-[80%] font-semibold">
                        {getLeagueName(currentMatchData.match)}
                      </Badge>
                      {/* Match Status Indicator - 已删除直播中显示 */}
                    </div>
                  
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
                      <p className="font-bold text-[11px] sm:text-[12px] leading-tight flex-1 text-left truncate">
                        {getTeamName(currentMatchData.match, 'home')}
                      </p>
                    </div>
                    
                      {/* Match Time Display - Shows countdown or live score */}
                      <MatchTimeDisplay match={currentMatchData.match} />
                    
                    <div className="flex items-center gap-1 sm:gap-1 flex-1 min-w-0 justify-end">
                      <p className="font-bold text-[11px] sm:text-[12px] leading-tight flex-1 text-right truncate">
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

                {/* Handicap Bet - Simplified */}
                {handicapBet && (
                  <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                    {/* Bet Type Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-semibold text-foreground/80 uppercase tracking-wide">{t('handicap_bet')}</span>
                      <Badge 
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${handicapBet.confirmed ? "text-success border-success/40" : "text-muted-foreground"}`}
                      >
                        {handicapBet.confirmed ? "✓" : "○"}
                      </Badge>
                    </div>
                    
                    {/* Selection Grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className={`p-2 rounded-md border transition-all min-h-[40px] flex items-center ${
                        handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME"
                          ? "bg-primary/15 border-primary/50" 
                          : "bg-card/50 border-border/30"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {currentMatchData?.match.home_logo && (
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={currentMatchData.match.home_logo} />
                              <AvatarFallback><Shield className="h-2 w-2" /></AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-[10px] sm:text-[11px] font-semibold truncate flex-1">{getTeamName(currentMatchData!.match, 'home')}</span>
                          {handicapBet.handicapLine !== undefined && (
                            <span className={`text-[10px] sm:text-[11px] font-mono-data font-bold ${
                              handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME" ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {((handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                              {(handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`p-2 rounded-md border transition-all min-h-[40px] flex items-center ${
                        handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY"
                          ? "bg-primary/15 border-primary/50" 
                          : "bg-card/50 border-border/30"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {currentMatchData?.match.away_logo && (
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={currentMatchData.match.away_logo} />
                              <AvatarFallback><Shield className="h-2 w-2" /></AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-[10px] sm:text-[11px] font-semibold truncate flex-1">{getTeamName(currentMatchData!.match, 'away')}</span>
                          {handicapBet.handicapLine !== undefined && (
                            <span className={`text-[10px] sm:text-[11px] font-mono-data font-bold ${
                              handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY" ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {((handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                              {(handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Compact Stats Row */}
                    <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1.5 border-t border-border/20">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-medium">{t('confidence')}: <span className="font-bold text-foreground">{handicapBet.confidence}%</span></span>
                        <span className="text-muted-foreground font-medium">@<span className="font-mono-data font-bold text-foreground">{Math.max(0, handicapBet.odds - 1).toFixed(2)}</span></span>
                      </div>
                      <span className="font-mono-data font-bold text-success">${(handicapBet.betAmount * handicapBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}

                {/* Over/Under Bet - Simplified */}
                {overUnderBet && (
                  <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                    {/* Bet Type Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-semibold text-foreground/80 uppercase tracking-wide">{t('over_under_bet')}</span>
                      <Badge 
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${overUnderBet.confirmed ? "text-success border-success/40" : "text-muted-foreground"}`}
                      >
                        {overUnderBet.confirmed ? "✓" : "○"}
                      </Badge>
                    </div>
                    
                    {/* Selection Grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className={`p-2 rounded-md border text-center transition-all min-h-[40px] flex items-center justify-center ${
                        overUnderBet.overUnderPick === 'over'
                          ? "bg-primary/15 border-primary/50" 
                          : "bg-card/50 border-border/30"
                      }`}>
                        <span className="text-[10px] sm:text-[11px] font-semibold">{t('over')}</span>
                        <span className={`ml-1 text-[11px] sm:text-xs font-mono-data font-bold ${
                          overUnderBet.overUnderPick === 'over' ? "text-primary" : "text-muted-foreground"
                        }`}>{overUnderBet.overUnderLine}</span>
                      </div>
                      <div className={`p-2 rounded-md border text-center transition-all min-h-[40px] flex items-center justify-center ${
                        overUnderBet.overUnderPick === 'under'
                          ? "bg-primary/15 border-primary/50" 
                          : "bg-card/50 border-border/30"
                      }`}>
                        <span className="text-[10px] sm:text-[11px] font-semibold">{t('under')}</span>
                        <span className={`ml-1 text-[11px] sm:text-xs font-mono-data font-bold ${
                          overUnderBet.overUnderPick === 'under' ? "text-primary" : "text-muted-foreground"
                        }`}>{overUnderBet.overUnderLine}</span>
                      </div>
                    </div>
                    
                    {/* Compact Stats Row */}
                    <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1.5 border-t border-border/20">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-medium">{t('confidence')}: <span className="font-bold text-foreground">{overUnderBet.confidence}%</span></span>
                        <span className="text-muted-foreground font-medium">@<span className="font-mono-data font-bold text-foreground">{Math.max(0, overUnderBet.odds - 1).toFixed(2)}</span></span>
                      </div>
                      <span className="font-mono-data font-bold text-success">${(overUnderBet.betAmount * overUnderBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          );
        })}
        
        {/* Player Exclusive Model Card - replaces hunsoccermax */}
        {(() => {
          // Get hunsoccermax model data
          const hunsoccermaxModel = aiModels.find(ai => ai.id === 'hunsoccermax');
          if (!hunsoccermaxModel) return null;

          // Find hunsoccermax bets from database, grouped by match
          const betsByMatch = new Map<string, { match: DailyMatch; bets: Array<ReturnType<typeof convertBet>> }>();
          
          matchesWithBets.forEach(match => {
            const matchBets = autoBets
              .filter(b => b.match_id?.toString() === match.mid && b.ai_id === 'hunsoccermax')
              .map(bet => convertBet(bet, match));
            
            if (matchBets.length > 0) {
              betsByMatch.set(match.mid, { match, bets: matchBets });
            }
          });

          // Get current match index for hunsoccermax
          const matchIndex = currentMatchIndex['hunsoccermax'] || 0;
          const matchEntries = Array.from(betsByMatch.values());
          const currentMatchData = matchEntries.length > 0 ? matchEntries[matchIndex] : null;
          
          // Separate bets by type
          const moneylineBet = currentMatchData?.bets.find(b => b.betType === 'moneyline') || null;
          const handicapBet = currentMatchData?.bets.find(b => b.betType === 'handicap') || null;
          const overUnderBet = currentMatchData?.bets.find(b => b.betType === 'over_under') || null;
          
          // Get AI balance
          const balance = aiBalances['hunsoccermax'];
          const balanceValue = balance 
            ? `${(balance.available_balance + balance.locked_balance).toLocaleString()}模拟积分`
            : hunsoccermaxModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '') ? `${Number(hunsoccermaxModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '')).toLocaleString()}模拟积分` : '10,000模拟积分';

          return (
            <PlayerExclusiveModelCard
              currentMatchData={currentMatchData as any}
              moneylineBet={moneylineBet as any}
              handicapBet={handicapBet as any}
              overUnderBet={overUnderBet as any}
              balanceValue={balanceValue}
              matchIndex={matchIndex}
              matchEntries={matchEntries as any}
              onOpenPKDialog={handleOpenPKDialog}
              onOpenAnalysis={getMatchAnalysisFromDB}
              getTeamName={getTeamName}
              getLeagueName={getLeagueName}
              onPrevMatch={(e) => {
                e.stopPropagation();
                setCurrentMatchIndex(prev => ({
                  ...prev,
                  'hunsoccermax': ((prev['hunsoccermax'] || 0) - 1 + matchEntries.length) % matchEntries.length
                }));
              }}
              onNextMatch={(e) => {
                e.stopPropagation();
                setCurrentMatchIndex(prev => ({
                  ...prev,
                  'hunsoccermax': ((prev['hunsoccermax'] || 0) + 1) % matchEntries.length
                }));
              }}
            />
          );
        })()}
      </div>
      
      <MatchAnalysisDialog
        open={analysisDialog.open}
        onOpenChange={(open) => setAnalysisDialog(prev => ({ ...prev, open }))}
        analysis={analysisDialog.analysis}
        analyses={analysisDialog.analyses}
        isLoading={analysisDialog.isLoading}
        matchInfo={analysisDialog.matchInfo}
      />

      {/* PK Dialog */}
      <PlaceBetDialog
        open={pkDialogOpen}
        onOpenChange={setPkDialogOpen}
        match={pkSelectedMatch ? {
          fixture_id: Number.isNaN(Number(pkSelectedMatch.mid)) ? 0 : Number(pkSelectedMatch.mid),
          home_team_id: pkSelectedMatch.home_team_id || undefined,
          home_team_name: pkSelectedMatch.home_team_name,
          away_team_id: pkSelectedMatch.away_team_id || undefined,
          away_team_name: pkSelectedMatch.away_team_name,
          home_logo: pkSelectedMatch.home_logo || undefined,
          away_logo: pkSelectedMatch.away_logo || undefined,
          league_name: pkSelectedMatch.league_name,
          kickoff_at: getKickoffDate(pkSelectedMatch)?.toISOString() || '',
        } : null}
      />
    </div>
  );
};

export default ActiveAIBets;
