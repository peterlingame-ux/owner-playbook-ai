import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, Clock, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MatchAnalysisDialog, ModelAnalysis } from "@/components/MatchAnalysisDialog";
import PlayerExclusiveModelCard from "@/components/PlayerExclusiveModelCard";
import { useAuth } from "@/contexts/AuthContext";
import { PlaceBetDialog } from "./PlaceBetDialog";
import { toast } from "@/hooks/use-toast";
import TiltCard from "@/components/TiltCard";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import hunsoccerAlphaLogo from "@/assets/hunsoccer-alpha-logo-outline.png";

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
    <div className="flex flex-col items-center gap-0 sm:gap-0.5 px-0.5 sm:px-1 shrink-0">
      {matchStatus === 'not_started' ? (
        <>
          {/* 未开赛：显示 VS 和倒计时 */}
          <span className="text-[8px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[6px] sm:text-[8px] text-muted-foreground font-medium hidden sm:block">
            {t('until_match_starts') || '距离比赛开始'}
          </span>
          <span className="text-[7px] sm:text-[9px] text-foreground/70 font-mono font-semibold">
            {timeDisplay}
          </span>
        </>
      ) : matchStatus === 'live' ? (
        <>
          {/* 开赛：显示 VS 和比赛时间 */}
          <span className="text-[8px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[8px] sm:text-[10px] text-success font-bold font-mono">
            {timeDisplay}
          </span>
        </>
      ) : matchStatus === 'half_time' ? (
        <>
          {/* 中场休息：显示 VS 和"中场休息" */}
          <span className="text-[8px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[7px] sm:text-[9px] text-muted-foreground font-bold">
            {timeDisplay}
          </span>
        </>
      ) : (
        <>
          {/* 其他状态 */}
          <span className="text-[8px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[7px] sm:text-[9px] text-muted-foreground font-mono font-semibold">
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


// Unified color scheme for all AI models - professional dark blue-gray
const MODEL_GRADIENTS: Record<string, { from: string; to: string; accent: string; glow: string }> = {
  deepseek: { from: 'from-slate-800/60', to: 'to-slate-900/40', accent: 'text-slate-200', glow: 'shadow-slate-500/10' },
  gpt5: { from: 'from-slate-800/60', to: 'to-slate-900/40', accent: 'text-slate-200', glow: 'shadow-slate-500/10' },
  claude: { from: 'from-slate-800/60', to: 'to-slate-900/40', accent: 'text-slate-200', glow: 'shadow-slate-500/10' },
  gemini: { from: 'from-slate-800/60', to: 'to-slate-900/40', accent: 'text-slate-200', glow: 'shadow-slate-500/10' },
  grok: { from: 'from-slate-800/60', to: 'to-slate-900/40', accent: 'text-slate-200', glow: 'shadow-slate-500/10' },
  hunsoccermax: { from: 'from-slate-800/60', to: 'to-slate-900/40', accent: 'text-slate-200', glow: 'shadow-slate-500/10' },
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

  // State for prediction mode toggle (auto vs manual)
  const [isAutoPrediction, setIsAutoPrediction] = useState(true);

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
              title: t('load_failed'),
              description: t('fetch_match_failed'),
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
            title: t('load_failed'),
            description: t('unknown_error'),
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
          title: t('fetch_analysis_failed'),
          description: analysisError.message || t('cannot_fetch_analysis'),
          variant: "destructive",
        });
        setAnalysisDialog(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (!analysisData || analysisData.length === 0) {
        toast({
          title: t('no_analysis_found'),
          description: t('no_analysis_data'),
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
        title: t('fetch_analysis_failed'),
        description: t('unknown_error'),
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
        <div className="flex items-center justify-center mb-3 sm:mb-5">
          <h2 className="text-sm sm:text-lg lg:text-xl font-semibold text-foreground">{t('active_ai_predictions')}</h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center py-4 sm:py-6">
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
          <div className="h-0.5 sm:h-1 w-12 sm:w-16 bg-gradient-to-r from-primary/40 to-primary/80 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
          </div>
        </div>
      )}
      
      {/* Modern Section Header */}
      <div className="flex flex-col items-center mb-3 sm:mb-6 lg:mb-8 px-1">
        <div className="relative max-w-full">
          <h2 className="text-xs sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight truncate">
            {t('active_ai_predictions')}
          </h2>
          <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2 w-8 sm:w-12 h-0.5 sm:h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full" />
        </div>
        
        {/* Auto/Manual Prediction Toggle - Minimalist Tab Style */}
        <div className="flex items-center mt-2 sm:mt-4 bg-muted/40 rounded-lg p-0.5 sm:p-1 w-fit mx-auto">
          <button
            onClick={() => setIsAutoPrediction(true)}
            className={`px-3 sm:px-5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-sm font-medium transition-all duration-200 ${
              isAutoPrediction 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('auto_prediction') || '自动预测'}
          </button>
          <button
            onClick={() => setIsAutoPrediction(false)}
            className={`px-3 sm:px-5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-sm font-medium transition-all duration-200 ${
              !isAutoPrediction 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('manual_prediction') || '人工预测'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-5 auto-rows-fr">
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
          const balanceNumber = balance 
            ? (balance.available_balance + balance.locked_balance).toLocaleString()
            : aiModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '') ? Number(aiModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '')).toLocaleString() : '10,000';

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

          const gradient = MODEL_GRADIENTS[aiModel.id] || MODEL_GRADIENTS.gpt5;

          return (
            <TiltCard
              key={aiModel.id}
              className={`group rounded-lg sm:rounded-2xl p-1.5 sm:p-5 bg-gradient-to-br ${gradient.from} ${gradient.to} backdrop-blur-sm border border-white/10 hover:border-white/25 transition-colors duration-300 overflow-hidden cursor-pointer`}
              onClick={nextMatch}
              maxTilt={8}
              scale={1.02}
              glare={false}
              maxGlare={0}
            >
              {/* Animated Background Pattern - Hidden on mobile for performance */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none hidden sm:block">
                <motion.div 
                  className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"
                  animate={{ 
                    x: [20, 40, 20],
                    y: [-20, -40, -20],
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl"
                  animate={{ 
                    x: [-10, -30, -10],
                    y: [10, 30, 10],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              {/* Match Counter - Top Right */}
              {matchEntries.length > 1 && (
                <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-20 flex items-center gap-0.5 sm:gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 sm:h-6 sm:w-6 p-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/10"
                    onClick={prevMatch}
                    title={t('previous_match') || '上一场'}
                  >
                    <ChevronLeft className="h-2 w-2 sm:h-3 sm:w-3" />
                  </Button>
                  <span className="text-[8px] sm:text-xs font-mono font-medium px-1 sm:px-2 py-0 sm:py-0.5 rounded-full bg-white/10 border border-white/10">
                    {matchIndex + 1}/{matchEntries.length}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 sm:h-6 sm:w-6 p-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/10"
                    onClick={nextMatch}
                    title={t('next_match') || '下一场'}
                  >
                    <ChevronRight className="h-2 w-2 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              )}

                              {/* No Bets Indicator */}
                              {matchEntries.length === 0 && (
                                <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-20">
                                  <Badge 
                                    variant="outline"
                                    className="text-[6px] sm:text-[10px] font-medium px-1 sm:px-2.5 py-0.5 sm:py-1 bg-white/10 border-white/20 text-foreground/80 backdrop-blur-sm max-w-[50px] sm:max-w-none truncate"
                                  >
                                    {t('no_bets')}
                                  </Badge>
                                </div>
                              )}

              {/* Content */}
              <div className="relative z-10 space-y-1.5 sm:space-y-4 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${aiModel.id}-${matchIndex}`}
                    initial={{ 
                      opacity: 0, 
                      x: slideDirection[aiModel.id] === 'right' ? 80 : -80 
                    }}
                    animate={{ 
                      opacity: 1, 
                      x: 0 
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: slideDirection[aiModel.id] === 'right' ? -80 : 80 
                    }}
                    transition={{ 
                      duration: 0.25, 
                      ease: "easeOut" 
                    }}
                    className="space-y-1.5 sm:space-y-4"
                  >
                    {/* AI Model Header */}
                    <div className="flex items-center justify-between">
                     {/* AI Avatar & Info */}
                      <div className="flex items-center gap-1 sm:gap-3">
                        <div className="relative">
                          <Avatar className="h-6 w-6 sm:h-12 sm:w-12 ring-1 sm:ring-2 ring-white/20 shadow-lg">
                            <AvatarImage 
                              src={AI_ICONS[aiModel.id]} 
                              alt={aiModel.displayName} 
                              className="object-cover" 
                              style={aiModel.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                            />
                            <AvatarFallback className="text-[8px] sm:text-sm font-bold bg-white/10">{aiModel.name[0]}</AvatarFallback>
                          </Avatar>
                          {/* Online Indicator */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 sm:w-3.5 sm:h-3.5 bg-success rounded-full border sm:border-2 border-card" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-[8px] sm:text-sm font-bold tracking-wide uppercase ${gradient.accent} truncate max-w-[60px] sm:max-w-none`}>
                            {getModelDisplayName(aiModel)}
                          </span>
                          <span className="text-[7px] sm:text-xs text-muted-foreground/80 font-medium inline-flex items-center gap-0.5 shrink-0">
                            <img src={hunterCoinIcon} alt="猎人币" className="w-2.5 h-2.5 sm:w-5 sm:h-5 shrink-0" />
                            <span className="truncate">{balanceNumber}</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Button - Only show when has bets, hidden on mobile */}
                      {(moneylineBet || handicapBet || overUnderBet) && (
                        <Button
                          size="sm"
                          className="hidden sm:flex h-7 sm:h-8 px-2.5 sm:px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-foreground font-medium text-[10px] sm:text-xs backdrop-blur-sm transition-all duration-300"
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
                          <span className="hidden sm:inline">{t('view_analysis')}</span>
                          <span className="sm:hidden">{t('view') || '查看'}</span>
                          <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1" />
                        </Button>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Match Info */}
                    {currentMatchData ? (
                      <div className="space-y-1 sm:space-y-3">
                        {/* League Badge */}
                        <div className="flex items-center justify-center">
                          <Badge className="text-[6px] sm:text-[11px] py-0 sm:py-1 px-1 sm:px-3 bg-white/10 border-white/20 text-foreground/90 font-medium backdrop-blur-sm max-w-full truncate">
                            {getLeagueName(currentMatchData.match)}
                          </Badge>
                        </div>
                      
                        {/* Teams Display */}
                        <div className="flex items-center justify-between gap-0.5 sm:gap-2 px-0">
                          {/* Home Team */}
                          <div className="flex flex-col items-center gap-0.5 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                            <div className="relative shrink-0">
                              {currentMatchData.match.home_logo ? (
                                <Avatar className="h-5 w-5 sm:h-10 sm:w-10 ring-1 sm:ring-2 ring-white/10 shadow-md">
                                  <AvatarImage src={currentMatchData.match.home_logo} alt={getTeamName(currentMatchData.match, 'home')} />
                                  <AvatarFallback><Shield className="h-2 w-2 sm:h-4 sm:w-4" /></AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-5 w-5 sm:h-10 sm:w-10 rounded-full bg-white/10 flex items-center justify-center ring-1 sm:ring-2 ring-white/10">
                                  <Shield className="h-2 w-2 sm:h-4 sm:w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-[6px] sm:text-xs text-center leading-tight truncate w-full max-w-[45px] sm:max-w-[100px]">
                              {getTeamName(currentMatchData.match, 'home')}
                            </p>
                          </div>
                        
                          {/* Match Time Display */}
                          <MatchTimeDisplay match={currentMatchData.match} />
                        
                          {/* Away Team */}
                          <div className="flex flex-col items-center gap-0.5 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                            <div className="relative shrink-0">
                              {currentMatchData.match.away_logo ? (
                                <Avatar className="h-5 w-5 sm:h-10 sm:w-10 ring-1 sm:ring-2 ring-white/10 shadow-md">
                                  <AvatarImage src={currentMatchData.match.away_logo} alt={getTeamName(currentMatchData.match, 'away')} />
                                  <AvatarFallback><Shield className="h-2 w-2 sm:h-4 sm:w-4" /></AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-5 w-5 sm:h-10 sm:w-10 rounded-full bg-white/10 flex items-center justify-center ring-1 sm:ring-2 ring-white/10">
                                  <Shield className="h-2 w-2 sm:h-4 sm:w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-[6px] sm:text-xs text-center leading-tight truncate w-full max-w-[45px] sm:max-w-[100px]">
                              {getTeamName(currentMatchData.match, 'away')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 sm:py-6 text-center px-1 overflow-hidden">
                        <img src={hunsoccerAlphaLogo} alt="HUNSOCCER" className="h-8 sm:h-16 w-auto opacity-15 mb-1 sm:mb-3 shrink-0" />
                        <p className="text-[7px] sm:text-sm text-muted-foreground/80 font-medium truncate max-w-full">
                          {t('no_active_predictions')}
                        </p>
                        <p className="text-[6px] sm:text-xs text-muted-foreground/60 mt-0.5 sm:mt-1 hidden sm:block truncate max-w-full">
                          {t('no_bets_for_ai')}
                        </p>
                      </div>
                    )}

                {/* Handicap Bet - Modern Style - Hidden on mobile */}
                {handicapBet && (
                  <div className="hidden sm:block bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3 border border-white/10">
                    {/* Bet Type Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">{t('handicap_bet')}</span>
                      <Badge 
                        variant="outline"
                        className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${handicapBet.confirmed ? "bg-success/20 text-success border-success/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                      >
                        {handicapBet.confirmed ? "Confirmed" : "Pending"}
                      </Badge>
                    </div>
                    
                    {/* Selection Grid */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                        handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME"
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        {currentMatchData?.match.home_logo && (
                          <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                            <AvatarImage src={currentMatchData.match.home_logo} />
                            <AvatarFallback><Shield className="h-2 w-2 sm:h-3 sm:w-3" /></AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-[10px] sm:text-xs font-semibold truncate flex-1">{getTeamName(currentMatchData!.match, 'home')}</span>
                        {handicapBet.handicapLine !== undefined && (
                          <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                            handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME" ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {((handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                            {(handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                          </span>
                        )}
                      </div>
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                        handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY"
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        {currentMatchData?.match.away_logo && (
                          <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                            <AvatarImage src={currentMatchData.match.away_logo} />
                            <AvatarFallback><Shield className="h-2 w-2 sm:h-3 sm:w-3" /></AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-[10px] sm:text-xs font-semibold truncate flex-1">{getTeamName(currentMatchData!.match, 'away')}</span>
                        {handicapBet.handicapLine !== undefined && (
                          <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                            handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY" ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {((handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                            {(handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-muted-foreground">{t('confidence')}: <span className="font-bold text-foreground">{handicapBet.confidence}%</span></span>
                        <span className="text-muted-foreground">@<span className="font-mono font-bold text-foreground">{Math.max(0, handicapBet.odds - 1).toFixed(2)}</span></span>
                      </div>
                      <span className="font-mono font-bold text-success">${(handicapBet.betAmount * handicapBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}

                {/* Over/Under Bet - Modern Style - Hidden on mobile */}
                {overUnderBet && (
                  <div className="hidden sm:block bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3 border border-white/10">
                    {/* Bet Type Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">{t('over_under_bet')}</span>
                      <Badge 
                        variant="outline"
                        className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${overUnderBet.confirmed ? "bg-success/20 text-success border-success/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                      >
                        {overUnderBet.confirmed ? "Confirmed" : "Pending"}
                      </Badge>
                    </div>
                    
                    {/* Selection Grid */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${
                        overUnderBet.overUnderPick === 'over'
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="text-[10px] sm:text-xs font-semibold">{t('over')}</span>
                        <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                          overUnderBet.overUnderPick === 'over' ? "text-primary" : "text-muted-foreground"
                        }`}>{overUnderBet.overUnderLine}</span>
                      </div>
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${
                        overUnderBet.overUnderPick === 'under'
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 rotate-180" />
                        <span className="text-[10px] sm:text-xs font-semibold">{t('under')}</span>
                        <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                          overUnderBet.overUnderPick === 'under' ? "text-primary" : "text-muted-foreground"
                        }`}>{overUnderBet.overUnderLine}</span>
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-muted-foreground">{t('confidence')}: <span className="font-bold text-foreground">{overUnderBet.confidence}%</span></span>
                        <span className="text-muted-foreground">@<span className="font-mono font-bold text-foreground">{Math.max(0, overUnderBet.odds - 1).toFixed(2)}</span></span>
                      </div>
                      <span className="font-mono font-bold text-success">${(overUnderBet.betAmount * overUnderBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </TiltCard>
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
          const balanceNumber = balance 
            ? (balance.available_balance + balance.locked_balance).toLocaleString()
            : hunsoccermaxModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '') ? Number(hunsoccermaxModel.currentValue?.replace('$', '').replace(/,/g, '').replace(/\..*/, '')).toLocaleString() : '10,000';
          const balanceValue = balanceNumber;

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
              isManualPrediction={!isAutoPrediction}
              availableMatches={matches}
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
      
      {/* Hunter Coin Disclaimer */}
      <div className="mt-6 sm:mt-8 p-4 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('hunter_coin_disclaimer')}
        </p>
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
