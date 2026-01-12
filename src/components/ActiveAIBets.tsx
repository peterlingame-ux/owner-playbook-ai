import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, Clock, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect, useLayoutEffect, useRef, useCallback, type CSSProperties } from "react";
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
  
  // 使用 ref 来存储最新的 match 对象，确保 updateTime 函数总是使用最新的值
  const matchRef = useRef(match);
  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    const updateTime = () => {
      // 从 ref 中获取最新的 match 对象，确保使用最新的值
      const currentMatch = matchRef.current;
      
      // 只使用 match_live_data 中的 score_kickoff_time（秒级时间戳）
      // 如果没有 match_live_data 数据，显示默认值
      if (!currentMatch.live_kickoff_time || currentMatch.live_status_id === null || currentMatch.live_status_id === undefined) {
        setMatchStatus('not_started');
        setShowCountdown(true);
        setTimeDisplay('--:--:--');
        return;
      }
      
      // 优先使用 live_status_id 判断状态（最准确）
      // live_status_id: 2 = 上半场, 3 = 中场休息, 4 = 下半场
      if (currentMatch.live_status_id === 3) {
        // 中场休息
        setMatchStatus('half_time');
        setShowCountdown(false);
        setTimeDisplay(t('half_time_break') || '中场休息');
        return;
      }
      
      // match_live_data 中的 score_kickoff_time 是秒级时间戳
      const kickoffTimeSeconds = typeof currentMatch.live_kickoff_time === 'string' 
        ? Number(currentMatch.live_kickoff_time) 
        : currentMatch.live_kickoff_time;
      
      if (Number.isNaN(kickoffTimeSeconds) || kickoffTimeSeconds <= 0) {
        setMatchStatus('not_started');
        setShowCountdown(true);
        setTimeDisplay('--:--:--');
        return;
      }
      
      // 每次调用都获取最新的当前时间，确保时间实时更新
      const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
      
      // 计算比赛进行时间（分钟）
      // 只使用 match_live_data 中的实时数据计算
      let displayMinutes: number;
      
      if (currentMatch.live_status_id === 2) {
        // 上半场：比赛进行分钟数 = (当前时间戳 - 上半场开球时间戳) / 60 + 1
        const elapsedSeconds = now - kickoffTimeSeconds;
        if (elapsedSeconds > 0) {
          displayMinutes = Math.floor(elapsedSeconds / 60) + 1;
          // 上半场最多显示45分钟
          if (displayMinutes > 45) {
            displayMinutes = 45;
          }
        } else {
          // 比赛还没开始
          setMatchStatus('not_started');
          setShowCountdown(true);
          const kickoffTime = new Date(kickoffTimeSeconds * 1000);
          const diff = kickoffTime.getTime() - Date.now();
          const absDiff = Math.abs(diff);
          const hours = Math.floor(absDiff / (1000 * 60 * 60));
          const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
          setTimeDisplay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          return;
        }
      } else if (currentMatch.live_status_id === 4) {
        // 下半场：比赛进行分钟数 = (当前时间戳 - 下半场开球时间戳) / 60 + 45 + 1
        // 下半场开球时间通常是上半场开球时间 + 60分钟（45分钟上半场 + 15分钟中场休息）
        const secondHalfKickoffTime = kickoffTimeSeconds + 60 * 60; // 下半场开球时间戳（秒）= 上半场开球时间 + 3600秒
        const elapsedSeconds = now - secondHalfKickoffTime;
        
        // 如果 elapsedSeconds <= 0，说明下半场还没开始，但 live_status_id === 4 表示已经是下半场
        // 这种情况下，使用总时间来计算，确保时间能够实时更新
        if (elapsedSeconds > 0) {
          // 下半场：比赛进行分钟数 = (当前时间戳 - 下半场开球时间戳) / 60 + 45 + 1
          displayMinutes = Math.floor(elapsedSeconds / 60) + 45 + 1;
        } else {
          // 如果 elapsedSeconds <= 0，使用总时间计算，确保时间能够实时更新
          // 总时间 = (当前时间戳 - 上半场开球时间戳) / 60 + 1
          const totalElapsedSeconds = now - kickoffTimeSeconds;
          if (totalElapsedSeconds > 0) {
            displayMinutes = Math.floor(totalElapsedSeconds / 60) + 1;
            // 确保至少显示46分钟（下半场刚开始）
            if (displayMinutes < 46) {
              displayMinutes = 46;
            }
          } else {
            displayMinutes = 46;
          }
        }
      } else {
        // 其他状态（完场、取消等），显示默认值
        setMatchStatus('other');
        setShowCountdown(false);
        setTimeDisplay('');
        return;
      }
        
      // 确保分钟数不为负数
      if (displayMinutes < 0) {
        displayMinutes = 0;
      }
      
      // 如果显示分钟数为 0，显示秒数
      if (displayMinutes === 0) {
        const elapsedSeconds = now - kickoffTimeSeconds;
        if (elapsedSeconds > 0 && elapsedSeconds < 60) {
          // 如果小于 60 秒，显示秒数
          setMatchStatus('live');
          setTimeDisplay(`${elapsedSeconds}''`);
          return;
        } else {
          // 如果大于等于 60 秒，至少显示 1 分钟
          displayMinutes = 1;
        }
      }
      
      setMatchStatus('live');
      setTimeDisplay(`${displayMinutes}'`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [match.live_kickoff_time, match.live_status_id, t]);

  return (
    <div className="flex flex-col items-center gap-0 sm:gap-0.5 px-0.5 sm:px-1 shrink-0">
      {matchStatus === 'not_started' ? (
        <>
          {/* 未开赛：显示 VS 和倒计时 */}
          <span className="text-[8px] sm:text-[11px] text-foreground/80 font-bold">VS</span>
          <span className="text-[6px] sm:text-[8px] text-muted-foreground font-medium">
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
          <span className="text-[7px] sm:text-[10px] text-warning font-bold">
            {timeDisplay || t('half_time_break') || '中场休息'}
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
  cmec?: string | null; // 比赛状态枚举代码
  home_logo?: string | null;
  away_logo?: string | null;
  // match_live_data 相关字段（用于实时时间计算）
  live_kickoff_time?: number | null; // 来自 match_live_data.score_kickoff_time（秒级时间戳）
  live_status_id?: number | null; // 来自 match_live_data.score_status
};

// 根据迁移文件，将数据库记录转换为组件使用的字段
// liveData: 来自 match_live_data 表的实时数据（可选）
const normalizeDailyMatch = (match: any, liveData?: any): DailyMatch => {
  // 根据迁移文件，数据库字段是 match_id（INTEGER），前端组件使用 mid（string）
  const mid = match.match_id?.toString() ?? '';
  
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
  
  // 根据 status_id 转换为 status_short
  // status_id 状态码映射（参考 MatchCenter.tsx）：
  // 0: 比赛异常, 1: 未开赛, 2: 上半场, 3: 中场, 4: 下半场, 5: 加时赛, 6: 加时赛(弃用)
  // 7: 点球决战, 8: 完场, 9: 推迟, 10: 中断, 11: 腰斩, 12: 取消, 13: 待定
  const getStatusShort = (statusId: number | null | undefined): string => {
    if (statusId === null || statusId === undefined) return '';
    const statusMap: Record<number, string> = {
      0: '', // 比赛异常
      1: '', // 未开赛
      2: 'LIVE', // 上半场
      3: 'HT', // 中场
      4: 'LIVE', // 下半场
      5: 'ET', // 加时赛
      6: 'ET', // 加时赛(弃用)
      7: 'PEN', // 点球决战
      8: 'FT', // 完场
      9: 'POST', // 推迟
      10: 'SUSP', // 中断
      11: 'FT', // 腰斩
      12: 'CANC', // 取消
      13: 'POST', // 待定
    };
    return statusMap[statusId] || '';
  };
  
  // 处理 mgt：从 match_time（秒级时间戳）转换为毫秒时间戳
  // 只使用 liveData 中的 score_kickoff_time
  // 根据迁移文件：match_time BIGINT, -- 开球时间戳（秒）
  // 组件内部使用 mgt 作为毫秒时间戳
  let mgtValue: number = 0;
  if (liveData?.score_kickoff_time) {
    const parsedTime = typeof liveData.score_kickoff_time === 'string' ? Number(liveData.score_kickoff_time) : liveData.score_kickoff_time;
    if (!Number.isNaN(parsedTime) && parsedTime > 0) {
      // 时间戳是秒级，转换为毫秒
      mgtValue = parsedTime * 1000;
    }
  }
  
  // 只使用 liveData 中的实时比分
  const goalsHome = liveData?.score_home_scores?.[0] ?? null;
  const goalsAway = liveData?.score_away_scores?.[0] ?? null;
  
  // 只使用 liveData 中的状态
  const statusId = liveData?.score_status ?? null;
  const statusShort = getStatusShort(statusId) || '';
  
  // 计算比赛进行时间（分钟）
  // 根据 status_id 判断是上半场还是下半场
  // status_id: 2 = 上半场, 3 = 中场休息, 4 = 下半场
  let statusElapsed: number | null = null;
  if (liveData?.score_kickoff_time && statusId) {
    // 比赛进行中（上半场或下半场）
    const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
    const kickoffTime = liveData.score_kickoff_time; // 上半场开球时间戳（秒）
    
    if (statusId === 2) {
      // 上半场：比赛进行分钟数 = (当前时间戳 - 上半场开球时间戳) / 60 + 1
      const elapsedSeconds = now - kickoffTime;
      if (elapsedSeconds > 0) {
        statusElapsed = Math.floor(elapsedSeconds / 60) + 1;
        // 上半场最多显示45分钟
        if (statusElapsed > 45) {
          statusElapsed = 45;
        }
      }
    } else if (statusId === 4) {
      // 下半场：比赛进行分钟数 = (当前时间戳 - 下半场开球时间戳) / 60 + 45 + 1
      // 下半场开球时间通常是上半场开球时间 + 60分钟（45分钟上半场 + 15分钟中场休息）
      const secondHalfKickoffTime = kickoffTime + 60 * 60; // 下半场开球时间戳（秒）= 上半场开球时间 + 3600秒
      const elapsedSeconds = now - secondHalfKickoffTime;
      if (elapsedSeconds > 0) {
        statusElapsed = Math.floor(elapsedSeconds / 60) + 45 + 1;
      }
      // 如果下半场还没开始（elapsedSeconds <= 0），不设置 statusElapsed
      // 让前端组件根据 status_id = 3 或 status_short = 'HT' 判断是否中场休息
    }
    // statusId === 3 是中场休息，不计算 statusElapsed，让前端显示"中场休息"
  }
  
  // 判断是否中场休息
  // 只根据 liveData 中的 status_id 判断，不再使用 status_short
  let cmec: string | null = null;
  if (statusId === 3) {
    cmec = 'half_time';
  } else if (match.raw?.cmec) {
    cmec = match.raw.cmec;
  }
  
  return {
    mid,
    date: match.date,
    mgt: mgtValue,
    league_id: match.competition_id ?? null,
    league_name: match.competition_name_zh ?? match.competition_name ?? '',
    league_logo: addLogoPrefix(match.competition_logo ?? null),
    home_team_id: match.home_team_id ?? null,
    home_team_name: match.home_team_name_zh ?? match.home_team_name ?? '',
    away_team_id: match.away_team_id ?? null,
    away_team_name: match.away_team_name_zh ?? match.away_team_name ?? '',
    goals_home: goalsHome,
    goals_away: goalsAway,
    status_short: statusShort,
    status_elapsed: statusElapsed,
    cmec: cmec,
    home_logo: addLogoPrefix(match.home_team_logo ?? null),
    away_logo: addLogoPrefix(match.away_team_logo ?? null),
    // 保存 match_live_data 中的实时数据，供 MatchTimeDisplay 使用
    live_kickoff_time: liveData?.score_kickoff_time ?? null,
    live_status_id: liveData?.score_status ?? null,
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

  // Lock card height based on auto prediction layout so switching modes doesn't resize the grid
  const [lockedCardHeight, setLockedCardHeight] = useState<number | null>(null);
  const cardItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const registerCardRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      cardItemRefs.current[key] = el;
    },
    []
  );

  const measureAndLockCardHeight = useCallback(() => {
    const els = Object.values(cardItemRefs.current).filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;

    const max = Math.ceil(Math.max(...els.map((el) => el.getBoundingClientRect().height)));
    setLockedCardHeight((prev) => (prev ? Math.max(prev, max) : max));
  }, []);

  useLayoutEffect(() => {
    if (!isAutoPrediction) return;

    const raf1 = requestAnimationFrame(measureAndLockCardHeight);
    // Re-measure once more after images/fonts have settled
    const timeout = window.setTimeout(() => {
      measureAndLockCardHeight();
    }, 350);

    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(timeout);
    };
  }, [
    isAutoPrediction,
    measureAndLockCardHeight,
    matches.length,
    autoBets.length,
    Object.keys(aiBalances).length,
  ]);

  useEffect(() => {
    if (!isAutoPrediction) return;
    const onResize = () => measureAndLockCardHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isAutoPrediction, measureAndLockCardHeight]);
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

        // Fetch yesterday's and today's matches (live or upcoming) - exclude completed matches
        // Use ended field and status_id to filter: 
        // - ended 是秒级时间戳，null 或 0 表示未结束，> 0 表示已结束
        // - status_id = 8 表示完场，status_id = 11 表示腰斩
        // According to migration: ended INTEGER (秒级时间戳), status_id INTEGER
        // 查询条件：ended 为 null 或 0，且 status_id 不是 8（完场）或 11（腰斩）
        // 注意：Supabase 的 .not() 不支持多个值的组合，所以需要在客户端再次过滤
        const { data: matchesData, error: matchesError } = await supabase
          .from('daily_matches' as any)
          .select('*')
          .in('date', [yesterdayStr, today])
          .or('ended.is.null,ended.eq.0') // ended 为 null 或 0 表示未结束（ended 是秒级时间戳）
          .order('match_time', { ascending: true }); // 使用 match_time 字段排序（秒级时间戳）
        
        // Filter out completed matches on client side (using ended field and status_id)
        // 比赛结束逻辑：根据 ended 字段和 status_id 判断
        // ended 是秒级时间戳，> 0 表示已结束；status_id = 8 表示完场
        const activeMatches = (matchesData || []).filter((match: any) => {
          const ended = match.ended;
          // 确保 ended 转换为数字进行比较
          const endedValue = ended !== null && ended !== undefined 
            ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
            : 0;
          
          // 确保 status_id 转换为数字进行比较
          const statusId = match.status_id !== null && match.status_id !== undefined
            ? (typeof match.status_id === 'string' ? parseInt(match.status_id, 10) : Number(match.status_id))
            : null;
          
          // 过滤掉已结束的比赛：
          // 1. ended > 0 表示已结束（ended 是秒级时间戳）
          // 2. status_id = 8 表示完场
          // 3. status_id = 11 表示腰斩（也算结束）
          if (!isNaN(endedValue) && endedValue > 0) {
            return false; // ended > 0，比赛已结束
          }
          if (!isNaN(statusId) && (statusId === 8 || statusId === 11)) {
            return false; // status_id = 8（完场）或 11（腰斩），比赛已结束
          }
          
          // 只保留未结束的比赛：ended 为 null、undefined 或 0，且 status_id 不是完场或腰斩
          return true;
        });

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
          // 获取实时比赛数据（match_live_data 表）
          const matchIds = (activeMatches || []).map((m: any) => m.match_id).filter((id: any) => id != null);
          let liveDataMap: Record<number, any> = {};
          
          if (matchIds.length > 0) {
            try {
              const { data: liveDataArray, error: liveDataError } = await supabase
                .from('match_live_data' as any)
                .select('*')
                .in('match_id', matchIds);
              
              if (liveDataError) {
                console.warn('Error fetching live data:', liveDataError);
              } else if (liveDataArray) {
                // 构建 match_id -> liveData 的映射
                liveDataArray.forEach((liveData: any) => {
                  if (liveData.match_id) {
                    liveDataMap[liveData.match_id] = liveData;
                  }
                });
              }
            } catch (error) {
              console.warn('Error fetching live data:', error);
            }
          }
          
          // 合并实时数据到比赛数据中
          const matchesList = (activeMatches || []).map((match: any) => {
            const liveData = match.match_id ? liveDataMap[match.match_id] : undefined;
            return normalizeDailyMatch(match, liveData);
          }) as DailyMatch[];
          
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
    
    // 订阅 match_live_data 表的变化，实时更新比赛比分、状态等
    const liveDataChannel = supabase
      .channel('match-live-data-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_live_data',
        },
        (payload) => {
          console.log('Live data updated, refreshing matches:', payload);
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_live_data',
        },
        (payload) => {
          console.log('New live data inserted, refreshing matches:', payload);
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
      supabase.removeChannel(liveDataChannel);
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
  // First, get all unique match_ids from bets
  const betMatchIds = new Set(autoBets.map(bet => bet.match_id?.toString()).filter(Boolean));
  
  // Then, get matches that have bets from the active matches list
  const matchesWithBets = matches.filter(match => 
    betMatchIds.has(match.mid)
  );
  
  // State to store missing matches (matches that have bets but are not in active matches list)
  const [missingMatches, setMissingMatches] = useState<DailyMatch[]>([]);
  
  // Fetch missing matches that have bets but are not in the active matches list
  useEffect(() => {
    const fetchMissingMatches = async () => {
      const missingMatchIds = Array.from(betMatchIds).filter(mid => 
        !matches.some(m => m.mid === mid)
      );
      
      if (missingMatchIds.length > 0) {
        // 将字符串 ID 转换为数字（数据库中的 match_id 是 INTEGER 类型）
        const numericMatchIds = missingMatchIds.map(id => {
          const numId = parseInt(id);
          return isNaN(numId) ? null : numId;
        }).filter((id): id is number => id !== null);
        
        if (numericMatchIds.length > 0) {
          const { data: missingMatchesData } = await supabase
            .from('daily_matches' as any)
            .select('*')
            .in('match_id', numericMatchIds) // 使用数据库字段名 match_id，不是 mid
            .or('ended.is.null,ended.eq.0'); // 只获取未结束的比赛（ended 为 null 或 0）
          
          if (missingMatchesData) {
            // 再次过滤已结束的比赛（客户端过滤）
            const filteredMissing = (missingMatchesData || []).filter((match: any) => {
              const ended = match.ended;
              const endedValue = ended !== null && ended !== undefined 
                ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
                : 0;
              const statusId = match.status_id !== null && match.status_id !== undefined
                ? (typeof match.status_id === 'string' ? parseInt(match.status_id, 10) : Number(match.status_id))
                : null;
              
              // 过滤掉已结束的比赛
              if (!isNaN(endedValue) && endedValue > 0) {
                return false;
              }
              if (!isNaN(statusId) && (statusId === 8 || statusId === 11)) {
                return false;
              }
              return true;
            });
            
            const normalizedMissing = filteredMissing.map(normalizeDailyMatch) as DailyMatch[];
            setMissingMatches(normalizedMissing);
          } else {
            setMissingMatches([]);
          }
        } else {
          setMissingMatches([]);
        }
      } else {
        setMissingMatches([]);
      }
    };
    
    fetchMissingMatches();
  }, [betMatchIds.size, matches.length, autoBets.length]);
  
  // Combine active matches and missing matches
  const allMatchesWithBets = [...matchesWithBets, ...missingMatches];
  
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
      <div className="flex items-center justify-center mb-3 sm:mb-6 lg:mb-8 px-1">
        <div className="relative">
          <h2 className="text-xs sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight text-center">
            {t('active_ai_predictions')}
          </h2>
          <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2 w-8 sm:w-12 h-0.5 sm:h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full" />
        </div>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-3 lg:gap-5 auto-rows-fr w-full max-w-full overflow-hidden"
        style={
          lockedCardHeight
            ? ({ ["--ai-card-h" as any]: `${lockedCardHeight}px` } as CSSProperties)
            : undefined
        }
      >
        {activeAIs.map((aiModel) => {
          // Find this AI's bets from database, grouped by match
          const betsByMatch = new Map<string, { match: DailyMatch; bets: Array<ReturnType<typeof convertBet>> }>();
          
          allMatchesWithBets.forEach(match => {
            const matchBets = autoBets
              .filter(b => b.match_id?.toString() === match.mid && b.ai_id === aiModel.id)
              .map(bet => convertBet(bet, match));
            
            if (matchBets.length > 0) {
              betsByMatch.set(match.mid, { match, bets: matchBets });
            }
          });

          // Get current match index for this AI (default to 0)
          const matchIndex = currentMatchIndex[aiModel.id] || 0;
          // Sort matchEntries: started matches (live) first, then upcoming matches
          // Within each group, sort by mgt (kickoff time)
          const now = Date.now();
          const matchEntries = Array.from(betsByMatch.values()).sort((a, b) => {
            const aKickoff = a.match.mgt || 0;
            const bKickoff = b.match.mgt || 0;
            const aStarted = aKickoff > 0 && now > aKickoff;
            const bStarted = bKickoff > 0 && now > bKickoff;
            
            // Started matches come first
            if (aStarted && !bStarted) return -1;
            if (!aStarted && bStarted) return 1;
            
            // Within the same group (both started or both not started), sort by kickoff time
            // For started matches: later kickoff time first (more recent matches first)
            // For upcoming matches: earlier kickoff time first (earlier matches first)
            if (aStarted && bStarted) {
              return bKickoff - aKickoff; // Descending (more recent first)
            } else {
              return aKickoff - bKickoff; // Ascending (earlier first)
            }
          });
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
            <div key={aiModel.id} ref={registerCardRef(aiModel.id)} className="h-full">
              <TiltCard
                className={`group rounded-lg sm:rounded-2xl p-1.5 sm:p-5 bg-gradient-to-br ${gradient.from} ${gradient.to} backdrop-blur-sm border border-white/10 hover:border-white/25 transition-colors duration-300 overflow-hidden cursor-pointer h-full min-h-[160px] sm:min-h-[320px] ${lockedCardHeight ? 'h-[var(--ai-card-h)]' : ''}`}
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

              {/* Match Counter - Bottom Right */}
              {matchEntries.length > 1 && (
                <div className="absolute bottom-0.5 sm:bottom-1.5 right-1.5 sm:right-3 z-20 flex items-center gap-0.5 sm:gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    className="!h-4 !w-4 sm:!h-6 sm:!w-6 !p-0 !min-w-0 !min-h-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 shrink-0 flex items-center justify-center aspect-square touch-manipulation"
                    onClick={prevMatch}
                    title={t('previous_match') || '上一场'}
                  >
                    <ChevronLeft className="h-2 w-2 sm:h-3 sm:w-3 shrink-0" />
                  </button>
                  <span className="text-[8px] sm:text-xs font-mono font-medium px-1 sm:px-2 py-0 sm:py-0.5 rounded-full bg-white/10 border border-white/10 shrink-0 whitespace-nowrap">
                    {matchIndex + 1}/{matchEntries.length}
                  </span>
                  <button
                    type="button"
                    className="!h-4 !w-4 sm:!h-6 sm:!w-6 !p-0 !min-w-0 !min-h-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 shrink-0 flex items-center justify-center aspect-square touch-manipulation"
                    onClick={nextMatch}
                    title={t('next_match') || '下一场'}
                  >
                    <ChevronRight className="h-2 w-2 sm:h-3 sm:w-3 shrink-0" />
                  </button>
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
              <div className="relative z-10 space-y-1 sm:space-y-4 overflow-hidden pb-5 sm:pb-8">
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
                      <div className="flex items-center gap-1.5 sm:gap-3">
                        <div className="relative">
                          <Avatar className="h-7 w-7 sm:h-12 sm:w-12 ring-1 sm:ring-2 ring-white/20 shadow-lg">
                            <AvatarImage 
                              src={AI_ICONS[aiModel.id]} 
                              alt={aiModel.displayName} 
                              className="object-cover" 
                              style={aiModel.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                            />
                            <AvatarFallback className="text-[8px] sm:text-sm font-bold bg-white/10">{aiModel.name[0]}</AvatarFallback>
                          </Avatar>
                          {/* Online Indicator */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-3.5 sm:h-3.5 bg-success rounded-full border sm:border-2 border-card" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-[9px] sm:text-sm font-bold tracking-wide uppercase ${gradient.accent} truncate max-w-[70px] sm:max-w-none`}>
                            {getModelDisplayName(aiModel)}
                          </span>
                          <span className="text-[8px] sm:text-xs text-muted-foreground/80 font-medium inline-flex items-center gap-0.5 shrink-0">
                            <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-5 sm:h-5 shrink-0" />
                            <span className="truncate">{balanceNumber}</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Button - Show when has bets */}
                      {(moneylineBet || handicapBet || overUnderBet) && (
                        <button
                          type="button"
                          className="!h-6 sm:!h-8 !px-2 sm:!px-4 !py-0 !min-w-0 !min-h-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-foreground font-medium text-[9px] sm:text-xs backdrop-blur-sm transition-all duration-300 shrink-0 whitespace-nowrap touch-manipulation flex items-center justify-center gap-0.5 sm:gap-1"
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
                          {t('view_analysis')}
                        </button>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Match Info */}
                    {currentMatchData ? (
                      <div className="space-y-1.5 sm:space-y-3">
                        {/* League Badge */}
                        <div className="flex items-center justify-center">
                          <Badge className="text-[7px] sm:text-[11px] py-0.5 sm:py-1 px-1.5 sm:px-3 bg-white/10 border-white/20 text-foreground/90 font-medium backdrop-blur-sm max-w-full truncate">
                            {getLeagueName(currentMatchData.match)}
                          </Badge>
                        </div>
                      
                        {/* Teams Display */}
                        <div className="flex items-center justify-between gap-1 sm:gap-2 px-0.5">
                          {/* Home Team */}
                          <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                            <div className="relative shrink-0">
                              {currentMatchData.match.home_logo ? (
                                <img 
                                  src={currentMatchData.match.home_logo} 
                                  alt={getTeamName(currentMatchData.match, 'home')}
                                  className="h-6 w-6 sm:h-10 sm:w-10 object-cover"
                                />
                              ) : (
                                <Shield className="h-6 w-6 sm:h-10 sm:w-10 text-muted-foreground" />
                              )}
                            </div>
                            <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                              {getTeamName(currentMatchData.match, 'home')}
                            </p>
                          </div>
                        
                          {/* Match Time Display & Score */}
                          <div className="flex flex-col items-center gap-0 sm:gap-0.5 shrink-0">
                            {/* 比分显示（如果有比分，显示在VS上面） */}
                            {(currentMatchData.match.goals_home !== null && currentMatchData.match.goals_home !== undefined) || 
                             (currentMatchData.match.goals_away !== null && currentMatchData.match.goals_away !== undefined) ? (
                              <div className="flex items-center gap-0.5 sm:gap-1">
                                <span className="text-[9px] sm:text-sm font-bold text-foreground font-mono">
                                  {currentMatchData.match.goals_home ?? 0}
                                </span>
                                <span className="text-[8px] sm:text-xs text-muted-foreground/70 font-medium">-</span>
                                <span className="text-[9px] sm:text-sm font-bold text-foreground font-mono">
                                  {currentMatchData.match.goals_away ?? 0}
                                </span>
                              </div>
                            ) : null}
                            <MatchTimeDisplay match={currentMatchData.match} />
                          </div>
                        
                          {/* Away Team */}
                          <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                            <div className="relative shrink-0">
                              {currentMatchData.match.away_logo ? (
                                <img 
                                  src={currentMatchData.match.away_logo} 
                                  alt={getTeamName(currentMatchData.match, 'away')}
                                  className="h-6 w-6 sm:h-10 sm:w-10 object-cover"
                                />
                              ) : (
                                <Shield className="h-6 w-6 sm:h-10 sm:w-10 text-muted-foreground" />
                              )}
                            </div>
                            <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
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

                {/* Handicap Bet - Modern Style */}
                {handicapBet && (
                  <div className="block bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3 border border-white/10">
                    {/* Bet Type Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">{t('handicap_bet')}</span>
                      <Badge 
                        variant="outline"
                        className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${handicapBet.confirmed ? "bg-success/20 text-success border-success/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                      >
                        {handicapBet.confirmed ? "已确认" : "待确认"}
                      </Badge>
                    </div>
                    
                    {/* Selection Grid */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                        handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME"
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 whitespace-nowrap">{getTeamName(currentMatchData!.match, 'home')}</span>
                        {handicapBet.handicapLine !== undefined && (
                          <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
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
                        <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 whitespace-nowrap">{getTeamName(currentMatchData!.match, 'away')}</span>
                        {handicapBet.handicapLine !== undefined && (
                          <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
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
                      <span className="font-mono font-bold text-success flex items-center gap-0.5">
                        <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                        {(handicapBet.betAmount * handicapBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Over/Under Bet - Modern Style */}
                {overUnderBet && (
                  <div className="block bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3 border border-white/10">
                    {/* Bet Type Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">{t('over_under_bet')}</span>
                      <Badge 
                        variant="outline"
                        className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${overUnderBet.confirmed ? "bg-success/20 text-success border-success/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                      >
                        {overUnderBet.confirmed ? "已确认" : "待确认"}
                      </Badge>
                    </div>
                    
                    {/* Selection Grid */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                        overUnderBet.overUnderPick === 'over'
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        <span className="text-[8px] sm:text-[10px] font-semibold">{t('over')}</span>
                        <span className={`text-[8px] sm:text-[10px] font-mono font-bold ${
                          overUnderBet.overUnderPick === 'over' ? "text-primary" : "text-muted-foreground"
                        }`}>{overUnderBet.overUnderLine}</span>
                      </div>
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                        overUnderBet.overUnderPick === 'under'
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        <span className="text-[8px] sm:text-[10px] font-semibold">{t('under')}</span>
                        <span className={`text-[8px] sm:text-[10px] font-mono font-bold ${
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
                      <span className="font-mono font-bold text-success flex items-center gap-0.5">
                        <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                        {(overUnderBet.betAmount * overUnderBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                )}
                  </motion.div>
                </AnimatePresence>
              </div>
              </TiltCard>
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
          
          allMatchesWithBets.forEach(match => {
            const matchBets = autoBets
              .filter(b => b.match_id?.toString() === match.mid && b.ai_id === 'hunsoccermax')
              .map(bet => convertBet(bet, match));
            
            if (matchBets.length > 0) {
              betsByMatch.set(match.mid, { match, bets: matchBets });
            }
          });

          // Get current match index for hunsoccermax
          const matchIndex = currentMatchIndex['hunsoccermax'] || 0;
          // Sort matchEntries: started matches (live) first, then upcoming matches
          // Within each group, sort by mgt (kickoff time)
          const now = Date.now();
          const matchEntries = Array.from(betsByMatch.values()).sort((a, b) => {
            const aKickoff = a.match.mgt || 0;
            const bKickoff = b.match.mgt || 0;
            const aStarted = aKickoff > 0 && now > aKickoff;
            const bStarted = bKickoff > 0 && now > bKickoff;
            
            // Started matches come first
            if (aStarted && !bStarted) return -1;
            if (!aStarted && bStarted) return 1;
            
            // Within the same group (both started or both not started), sort by kickoff time
            // For started matches: later kickoff time first (more recent matches first)
            // For upcoming matches: earlier kickoff time first (earlier matches first)
            if (aStarted && bStarted) {
              return bKickoff - aKickoff; // Descending (more recent first)
            } else {
              return aKickoff - bKickoff; // Ascending (earlier first)
            }
          });
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
          // Available balance = available_balance (locked_balance is already bet, so we can only use available_balance)
          const availableBalance = balance ? balance.available_balance : undefined;

          return (
            <div ref={registerCardRef('hunsoccermax')} className="h-full">
              <PlayerExclusiveModelCard
                className={lockedCardHeight ? "h-[var(--ai-card-h)]" : undefined}
                currentMatchData={currentMatchData as any}
                moneylineBet={moneylineBet as any}
                handicapBet={handicapBet as any}
                overUnderBet={overUnderBet as any}
                balanceValue={balanceValue}
                availableBalance={availableBalance}
                matchIndex={matchIndex}
                matchEntries={matchEntries as any}
                onOpenPKDialog={handleOpenPKDialog}
                onOpenAnalysis={getMatchAnalysisFromDB}
                getTeamName={getTeamName}
                getLeagueName={getLeagueName}
                isManualPrediction={!isAutoPrediction}
                availableMatches={matches}
                isAutoPrediction={isAutoPrediction}
                onToggleAutoPrediction={setIsAutoPrediction}
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
            </div>
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
