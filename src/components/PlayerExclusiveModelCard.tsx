import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getUTC8Timestamp } from "@/lib/utils";
import { 
  Sparkles, 
  Send, 
  Brain, 
  History, 
  Trash2, 
  Zap,
  Database,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  Tag,
  FileText,
  Calendar,
  Shield,
  ChevronLeft,
  User,
  ChevronRight,
  ArrowRight,
  Check
} from "lucide-react";
import hunsoccerAlphaLogo from "@/assets/hunsoccer-alpha-logo-outline.png";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import TiltCard from "@/components/TiltCard";

interface TrainingRecord {
  id: string;
  content: string;
  created_at: string;
}

interface BetData {
  match: any; // Flexible match type to support different formats
  aiId: string;
  betType: string;
  prediction: string;
  confidence: number;
  odds: number;
  betAmount: number;
  handicapLine?: number | string; // 支持数字和字符串格式（如 "-0.5/1"）
  overUnderLine?: number | string; // 支持数字和字符串格式（如 "2.5/3"）
  overUnderPick?: string;
  confirmed: boolean;
}

interface PlayerExclusiveModelCardProps {
  className?: string;
  // Data from ActiveAIBets
  currentMatchData?: { match: any; bets: BetData[] } | null;
  moneylineBet?: BetData | null;
  handicapBet?: BetData | null;
  overUnderBet?: BetData | null;
  balanceValue?: string;
  availableBalance?: number; // 可用余额（总余额 - 已下注金额）
  matchIndex?: number;
  matchEntries?: Array<{ match: any; bets: BetData[] }>;
  onOpenPKDialog?: (match: any) => void;
  onOpenAnalysis?: (matchId: string, aiId: string, match: any, aiModel: any) => void;
  getTeamName?: (match: any, team: 'home' | 'away') => string;
  getLeagueName?: (match: any) => string;
  onPrevMatch?: (e: React.MouseEvent) => void;
  onNextMatch?: (e: React.MouseEvent) => void;
  // Manual prediction mode
  isManualPrediction?: boolean;
  availableMatches?: any[];
  // Auto/Manual toggle
  isAutoPrediction?: boolean;
  onToggleAutoPrediction?: (value: boolean) => void;
}

// Common football-related keywords to extract
const FOOTBALL_KEYWORDS = [
  '主队', '客队', '胜率', '进球', '失球', '主场', '客场', '连胜', '连败', '不败',
  '实力', '状态', '伤病', '阵容', '战术', '防守', '进攻', '中场', '前锋', '后卫',
  '门将', '角球', '任意球', '点球', '红牌', '黄牌', '换人', '加时', '半场', '全场',
  '欧冠', '英超', '西甲', '德甲', '意甲', '法甲', '世界杯', '欧洲杯', '联赛', '杯赛',
  '让球', '大小球', '亚盘', '欧赔', '赔率', '盘口', '水位', '初盘', '即时', '临场',
  '爆冷', '热门', '冷门', '稳胆', '单关', '串关', '比分', '净胜', '总进球', '半全场'
];

// 统一获取开赛时间，使用 mgt 毫秒时间戳（兼容 kickoff_at）
const getKickoffDateForMatch = (match: any): Date | null => {
  // 优先使用 mgt（毫秒时间戳）
  if (match.mgt !== undefined && match.mgt !== null && match.mgt !== 0) {
    const parsed = typeof match.mgt === 'string' ? Number(match.mgt) : match.mgt;
    if (!Number.isNaN(parsed) && parsed > 0) {
      const MIN_VALID_TIMESTAMP = 946684800000; // 2000-01-01 00:00:00 UTC
      if (parsed >= MIN_VALID_TIMESTAMP) {
        return new Date(parsed);
      }
    }
  }
  
  // 回退到 kickoff_at（如果存在）
  if (match.kickoff_at) {
    const kickoffDate = new Date(match.kickoff_at);
    if (!Number.isNaN(kickoffDate.getTime())) {
      return kickoffDate;
    }
  }
  
  return null;
};

// MatchTimeDisplay component for PlayerExclusiveModelCard
// 参考 ActiveAIBets 中的 MatchTimeDisplay 逻辑
const MatchTimeDisplay = ({ match }: { match: any }) => {
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
      
      const now = getUTC8Timestamp(); // 当前时间戳（秒，UTC+8）
      
      // 首先检查当前时间是否小于 daily_matches 里面的比赛开始时间（match_time）
      // 优先使用 match_time（秒级时间戳），如果没有则使用 mgt（毫秒时间戳）转换为秒
      let matchTime: number | null = null;
      if (currentMatch.match_time && typeof currentMatch.match_time === 'number' && currentMatch.match_time > 0) {
        matchTime = currentMatch.match_time;
      } else if (currentMatch.mgt && typeof currentMatch.mgt === 'number' && currentMatch.mgt > 0) {
        // mgt 是毫秒时间戳，转换为秒
        matchTime = Math.floor(currentMatch.mgt / 1000);
      }
      
      if (matchTime && typeof matchTime === 'number' && matchTime > 0) {
        // 检查当前时间是否小于 match_time
        if (now < matchTime) {
          // 比赛还未开始，显示倒计时
          const diff = matchTime - now;
          setMatchStatus('not_started');
          setShowCountdown(true);
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = diff % 60;
          setTimeDisplay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          return;
        }
        // 如果当前时间大于等于 match_time，继续执行后面的逻辑（计算比赛进行时间）
      }
      
      // 否则使用 match_live_data 里面的数据
      // 检查是否有比分数据：如果有比分，说明比赛已开始，即使状态字段缺失
      const hasScore = (currentMatch.goals_home !== null && currentMatch.goals_home !== undefined) ||
                       (currentMatch.goals_away !== null && currentMatch.goals_away !== undefined) ||
                       (currentMatch.mhs !== null && currentMatch.mhs !== undefined) ||
                       (currentMatch.mas !== null && currentMatch.mas !== undefined);
      
      // 获取开球时间：使用 live_kickoff_time（来自 match_live_data）
      let kickoffTimeSeconds: number | null = null;
      if (currentMatch.live_kickoff_time) {
        kickoffTimeSeconds = typeof currentMatch.live_kickoff_time === 'string' 
          ? Number(currentMatch.live_kickoff_time) 
          : currentMatch.live_kickoff_time;
      }
      
      // 如果既没有开球时间，也没有比分数据，显示默认值
      if ((!kickoffTimeSeconds || Number.isNaN(kickoffTimeSeconds) || kickoffTimeSeconds <= 0) && !hasScore) {
        setMatchStatus('not_started');
        setShowCountdown(true);
        setTimeDisplay('--:--:--');
        return;
      }
      
      // 如果有比分但没有状态数据，推断比赛正在进行中
      if (hasScore && (!currentMatch.live_kickoff_time || currentMatch.live_status_id === null || currentMatch.live_status_id === undefined)) {
        setMatchStatus('live');
        setShowCountdown(false);
        // 显示"进行中"或使用默认时间显示
        setTimeDisplay(t('in_progress') || '进行中');
        return;
      }
      
      // 使用 live_status_id 判断状态（来自 match_live_data）
      // live_status_id: 2 = 上半场, 3 = 中场休息, 4 = 下半场
      const liveStatusId = currentMatch.live_status_id;
      
      if (liveStatusId === 3) {
        // 中场休息
        setMatchStatus('half_time');
        setShowCountdown(false);
        setTimeDisplay(t('half_time_break') || '中场休息');
        return;
      }
      
      if (liveStatusId === 9) {
        // 推迟
        setMatchStatus('other');
        setShowCountdown(false);
        setTimeDisplay(t('postponed') || '推迟');
        return;
      }
      
      // 如果开球时间无效，无法计算
      if (!kickoffTimeSeconds || Number.isNaN(kickoffTimeSeconds) || kickoffTimeSeconds <= 0) {
        if (hasScore) {
          setMatchStatus('live');
          setShowCountdown(false);
          setTimeDisplay(t('in_progress') || '进行中');
        } else {
          setMatchStatus('not_started');
          setShowCountdown(true);
          setTimeDisplay('--:--:--');
        }
        return;
      }
      
      // 计算比赛进行时间（分钟）
      // 使用 match_live_data 中的实时数据计算
      let displayMinutes: number;
      let timeDisplayStr: string;
      
      if (liveStatusId === 2) {
        // 上半场：比赛进行分钟数 = (当前时间戳 - 上半场开球时间戳) / 60 + 1
        const elapsedSeconds = now - kickoffTimeSeconds;
        displayMinutes = Math.floor(elapsedSeconds / 60) + 1;
        
        // 格式化显示：如果大于45且状态不是中场，显示 45' + 具体时间
        if (displayMinutes > 45) {
          timeDisplayStr = `45'+${displayMinutes - 45}'`;
        } else {
          timeDisplayStr = `${displayMinutes}'`;
        }
      } else if (liveStatusId === 4) {
        // 下半场比赛进行分钟数=(当前时间戳-下半场开球时间戳) / 60 + 45 + 1
        const totalElapsedSeconds = now - kickoffTimeSeconds; 
        displayMinutes = Math.floor(totalElapsedSeconds / 60) + 45 + 1;
        
        // 格式化显示：如果大于90，显示 90' + 具体时间
        if (displayMinutes > 90) {
          timeDisplayStr = `90'+${displayMinutes - 90}'`;
        } else {
          timeDisplayStr = `${displayMinutes}'`;
        }
      } else {
        // 其他状态（完场、取消等），显示默认值
        setMatchStatus('other');
        setShowCountdown(false);
        setTimeDisplay('');
        return;
      }
      setMatchStatus('live');
      setTimeDisplay(timeDisplayStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [match.live_kickoff_time, match.live_status_id, match.match_time, match.status_id, match.goals_home, match.goals_away, match.mhs, match.mas, match.mgt, t]);

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

const PlayerExclusiveModelCard = ({ 
  className,
  currentMatchData,
  moneylineBet,
  handicapBet,
  overUnderBet,
  balanceValue,
  availableBalance,
  matchIndex = 0,
  matchEntries = [],
  onOpenPKDialog,
  onOpenAnalysis,
  getTeamName,
  getLeagueName,
  onPrevMatch,
  onNextMatch,
  isManualPrediction = false,
  availableMatches = [],
  isAutoPrediction = true,
  onToggleAutoPrediction
}: PlayerExclusiveModelCardProps) => {
  const { t } = useTranslation();
  const { user, userProfile, refreshBalance } = useAuth();
  const [showFeedDialog, setShowFeedDialog] = useState(false);
  const [feedText, setFeedText] = useState('');
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedProgress, setFeedProgress] = useState(0);
  const [feedComplete, setFeedComplete] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState<TrainingRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [trainingCount, setTrainingCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('feed');

  // Manual prediction state
  const [showManualBetDialog, setShowManualBetDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [manualBetType, setManualBetType] = useState<'handicap' | 'over_under'>('handicap');
  
  // 用户余额状态（用于人工下注）
  const [userBalance, setUserBalance] = useState<number | null>(null);
  
  // 获取用户余额（从 user_balances 表）
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (!user) {
        setUserBalance(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('[PlayerExclusiveModelCard] Error fetching user balance:', error);
          setUserBalance(null);
          return;
        }
        
        // 如果没有记录，使用默认值 100000
        setUserBalance(data?.balance ?? 100000);
      } catch (error) {
        console.error('[PlayerExclusiveModelCard] Unexpected error fetching user balance:', error);
        setUserBalance(null);
      }
    };
    
    fetchUserBalance();
  }, [user]);
  
  // Calculate available balance for manual betting
  // 人工下注使用用户余额，而不是 AI 模型余额
  const maxBetAmount = useMemo(() => {
    // 优先使用用户余额（从 user_balances 表获取）
    if (userBalance !== null) {
      return userBalance;
    }
    // 如果没有用户余额，回退到 availableBalance（AI 模型余额，仅用于显示）
    if (availableBalance !== undefined) {
      return availableBalance;
    }
    // 最后回退到 balanceValue
    if (balanceValue) {
      const parsed = parseInt(balanceValue.replace(/,/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, [userBalance, availableBalance, balanceValue]);

  // Initialize bet amount based on available balance
  const [manualBetAmount, setManualBetAmount] = useState<number | ''>('');
  
  // Update bet amount when maxBetAmount changes (ensure it doesn't exceed available balance)
  useEffect(() => {
    if (maxBetAmount > 0 && typeof manualBetAmount === 'number' && manualBetAmount > maxBetAmount) {
      setManualBetAmount(maxBetAmount);
    }
  }, [maxBetAmount, manualBetAmount]);
  
  const [manualHandicapLine, setManualHandicapLine] = useState<number | string>(0);
  const [manualOverUnderLine, setManualOverUnderLine] = useState(2.5);
  const [manualPrediction, setManualPrediction] = useState<string>('');
  const [manualOverUnderPick, setManualOverUnderPick] = useState<'over' | 'under'>('over');
  const [isSubmittingBet, setIsSubmittingBet] = useState(false);
  const [manualBetConfirmed, setManualBetConfirmed] = useState(false);
  const [confirmedManualBet, setConfirmedManualBet] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [hasManualBet, setHasManualBet] = useState(false); // 是否有数据库中的手动下注
  const [isCheckingManualBet, setIsCheckingManualBet] = useState(false); // 是否正在检查手动下注
  
  // Market odds from ai_match_analyses.bet_snapshot.allMarketOdds
  type MarketOdds = {
    overUnder?: Array<{ line: number | string; over: number; under: number }>;
    handicap?: Array<{ line: number | string; home: number; away: number }>;
  };
  const [marketOdds, setMarketOdds] = useState<MarketOdds | null>(null);
  const [isLoadingMarketOdds, setIsLoadingMarketOdds] = useState(false);
  // 使用 ref 存储已查询的 matchId，避免重复查询
  const lastFetchedMatchIdRef = useRef<string | null>(null);

  // Demo matches for manual prediction when no real matches available
  const demoMatches = useMemo(() => [
    {
      mid: 'demo_1',
      // 根据 SQL 迁移文件更新字段：使用新字段名
      mhn: 'Manchester United',
      man: 'Liverpool',
      mhlu: ['https://media.api-sports.io/football/teams/33.png'],
      malu: ['https://media.api-sports.io/football/teams/40.png'],
      tn: 'Premier League',
      // 保留旧字段作为兼容
      home_team_name: 'Manchester United',
      away_team_name: 'Liverpool',
      home_logo: 'https://media.api-sports.io/football/teams/33.png',
      away_logo: 'https://media.api-sports.io/football/teams/40.png',
      league_name: 'Premier League',
      date: new Date().toISOString().split('T')[0],
    },
    {
      mid: 'demo_2',
      // 根据 SQL 迁移文件更新字段：使用新字段名
      mhn: 'Barcelona',
      man: 'Real Madrid',
      mhlu: ['https://media.api-sports.io/football/teams/529.png'],
      malu: ['https://media.api-sports.io/football/teams/541.png'],
      tn: 'La Liga',
      // 保留旧字段作为兼容
      home_team_name: 'Barcelona',
      away_team_name: 'Real Madrid',
      home_logo: 'https://media.api-sports.io/football/teams/529.png',
      away_logo: 'https://media.api-sports.io/football/teams/541.png',
      league_name: 'La Liga',
      date: new Date().toISOString().split('T')[0],
    },
    {
      mid: 'demo_3',
      // 根据 SQL 迁移文件更新字段：使用新字段名
      mhn: 'Bayern Munich',
      man: 'Dortmund',
      mhlu: ['https://media.api-sports.io/football/teams/157.png'],
      malu: ['https://media.api-sports.io/football/teams/165.png'],
      tn: 'Bundesliga',
      // 保留旧字段作为兼容
      home_team_name: 'Bayern Munich',
      away_team_name: 'Dortmund',
      home_logo: 'https://media.api-sports.io/football/teams/157.png',
      away_logo: 'https://media.api-sports.io/football/teams/165.png',
      league_name: 'Bundesliga',
      date: new Date().toISOString().split('T')[0],
    },
  ], []);

  // Get matches from matchEntries (current model's AI bets) for manual prediction dialog
  // 只显示当前模型有下注的比赛
  const matchesFromBets = useMemo(() => {
    // 只从 matchEntries 中提取比赛（当前模型的下注比赛数据）
    if (matchEntries && matchEntries.length > 0) {
      const uniqueMatches = new Map<string, any>();
      matchEntries.forEach(entry => {
        if (entry && entry.match && entry.match.mid) {
          uniqueMatches.set(entry.match.mid, entry.match);
        }
      });
      return Array.from(uniqueMatches.values());
    }
    // 如果没有下注数据，返回空数组（不显示任何比赛）
    return [];
  }, [matchEntries]);
  
  // 使用 matchesFromBets 作为要显示的比赛列表
  const matchesToShow = matchesFromBets;
  
  // Debug: Log what data source is being used
  // Fetch market odds from ai_match_analyses when dialog opens and match is selected
  useEffect(() => {
    const fetchMarketOdds = async () => {
      if (!showManualBetDialog || !selectedMatch) {
        setMarketOdds(null);
        lastFetchedMatchIdRef.current = null;
        return;
      }

      // Get match_id from selectedMatch (优先使用 mid，回退到 match_id)
      // 根据 SQL 迁移文件，mid 是番茄体育格式的比赛ID
      const matchId = selectedMatch.mid || selectedMatch.match_id;
      if (!matchId) {
        console.warn('[PlayerExclusiveModelCard] No match_id found in selectedMatch');
        setMarketOdds(null);
        lastFetchedMatchIdRef.current = null;
        return;
      }

      // 如果已经查询过相同的 matchId，跳过重复查询
      if (lastFetchedMatchIdRef.current === String(matchId) && marketOdds) {
        return;
      }

      setIsLoadingMarketOdds(true);
      try {
        // 方法1: 从 matchEntries 中查找当前比赛的分析数据
        let betSnapshot = null;
        if (matchEntries && matchEntries.length > 0) {
          const matchEntry = matchEntries.find(entry => 
            entry.match && (entry.match.mid === matchId || entry.match.match_id === matchId)
          );
          if (matchEntry && (matchEntry as any).analysis) {
            const analysis = (matchEntry as any).analysis;
            if (analysis.bet_snapshot) {
              betSnapshot = analysis.bet_snapshot;
              console.log('[PlayerExclusiveModelCard] bet_snapshot loaded from matchEntries:', betSnapshot);
            }
          }
        }

        // 方法2: 如果 matchEntries 中没有，从 ai_match_analyses 表查询
        // 查询所有 AI 模型的分析数据（不限制 ai_id），因为 bet_snapshot 可能来自任意模型
        if (!betSnapshot) {
          // 尝试字符串格式的 match_id
          let { data: analysesData, error } = await supabase
            .from('ai_match_analyses' as any)
            .select('bet_snapshot, ai_id, match_id')
            .eq('match_id', String(matchId))
            .limit(10); // 查询多个分析记录，找到包含 bet_snapshot 的

          // 如果失败，尝试数字格式（如果 matchId 是数字字符串）
          if ((error || !analysesData || analysesData.length === 0) && !isNaN(Number(matchId))) {
            const numMatchId = Number(matchId);
            const result = await supabase
              .from('ai_match_analyses' as any)
              .select('bet_snapshot, ai_id, match_id')
              .eq('match_id', numMatchId)
              .limit(10);
            analysesData = result.data;
            error = result.error;
          }

          if (error) {
            console.error('[PlayerExclusiveModelCard] Error fetching bet_snapshot:', error);
          } else if (analysesData && analysesData.length > 0) {
            // 遍历所有分析记录，找到包含 bet_snapshot 的
            for (const analysis of analysesData as any[]) {
              const snapshot = analysis?.bet_snapshot;
              if (snapshot) {
                betSnapshot = snapshot;
                console.log('[PlayerExclusiveModelCard] bet_snapshot loaded from ai_match_analyses (ai_id:', analysis.ai_id, '):', betSnapshot);
                break; // 找到后退出循环
              }
            }
            if (!betSnapshot) {
              const sampleAnalysis = analysesData[0] as any;
              console.warn('[PlayerExclusiveModelCard] Found', analysesData.length, 'analysis records but none contain bet_snapshot');
              console.warn('[PlayerExclusiveModelCard] Sample analysis:', sampleAnalysis);
            }
          } else {
            console.warn('[PlayerExclusiveModelCard] No analysis data found for match_id:', matchId);
          }
        }

        // 从 bet_snapshot 中提取 handicap 和 overUnder 的盘口，然后从 allMarketOdds 中找到对应的赔率
        // 优先使用 matchEntries 中已有的 bet 数据（与 AI 自动下注显示一致）
        let targetHandicapLine: number | string | undefined = undefined;
        let targetOverUnderLine: number | string | undefined = undefined;
        
        // 方法1: 优先从 matchEntries 中获取当前比赛的让分盘口（与 AI 自动下注显示一致）
        if (matchEntries && matchEntries.length > 0) {
          const matchEntry = matchEntries.find(entry => 
            entry.match && (entry.match.mid === matchId || entry.match.match_id === matchId)
          );
          if (matchEntry && matchEntry.bets && matchEntry.bets.length > 0) {
            // 找到当前比赛的让分投注（任意 AI 模型的，因为我们要显示与 AI 自动下注相同的盘口）
            const handicapBet = matchEntry.bets.find(bet => bet.betType === 'handicap');
            if (handicapBet && handicapBet.handicapLine !== undefined) {
              targetHandicapLine = handicapBet.handicapLine;
              console.log('[PlayerExclusiveModelCard] Using handicap line from matchEntries (AI bet):', targetHandicapLine);
            }
            
            // 找到当前比赛的大小球投注（任意 AI 模型的）
            const overUnderBet = matchEntry.bets.find(bet => bet.betType === 'over_under');
            if (overUnderBet && overUnderBet.overUnderLine !== undefined) {
              targetOverUnderLine = overUnderBet.overUnderLine;
              console.log('[PlayerExclusiveModelCard] Using overUnder line from matchEntries (AI bet):', targetOverUnderLine);
            }
          }
        }
        
        // 方法2: 如果 matchEntries 中没有，从 bet_snapshot.handicap 和 bet_snapshot.overUnder 中获取
        if (betSnapshot && (targetHandicapLine === undefined || targetOverUnderLine === undefined)) {
          const handicapInfo = betSnapshot.handicap;
          const overUnderInfo = betSnapshot.overUnder;
          
          if (targetHandicapLine === undefined && handicapInfo && handicapInfo.line !== undefined) {
            targetHandicapLine = handicapInfo.line;
            console.log('[PlayerExclusiveModelCard] Using handicap line from bet_snapshot.handicap:', targetHandicapLine);
          }
          
          if (targetOverUnderLine === undefined && overUnderInfo && overUnderInfo.line !== undefined) {
            targetOverUnderLine = overUnderInfo.line;
            console.log('[PlayerExclusiveModelCard] Using overUnder line from bet_snapshot.overUnder:', targetOverUnderLine);
          }
        }
        
        // 从 allMarketOdds 中找到对应的盘口和赔率
        let allMarketOdds = null;
        if (betSnapshot) {
          // 获取 allMarketOdds（包含所有可用的盘口和赔率）
          allMarketOdds = betSnapshot.allMarketOdds || null;
          
          // 如果存在目标盘口，从 allMarketOdds 中找到对应的盘口
          if (allMarketOdds) {
            // 处理让分盘口：如果目标盘口存在，找到对应的盘口
            if (targetHandicapLine !== undefined && allMarketOdds.handicap && Array.isArray(allMarketOdds.handicap)) {
              // 在 allMarketOdds.handicap 中查找匹配的盘口
              const matchedHandicap = allMarketOdds.handicap.find((h: any) => {
                const hLine = String(h.line || '');
                const targetLine = String(targetHandicapLine || '');
                // 精确匹配
                if (hLine === targetLine) return true;
                // 处理正负号的情况（如 "-0.5" 和 "0.5"）
                if (hLine === `-${targetLine}` || `-${hLine}` === targetLine) return true;
                // 处理字符串格式的盘口（如 "-0.5/1"）
                if (hLine.includes('/') && targetLine.includes('/')) {
                  return hLine === targetLine;
                }
                return false;
              });
              
              if (matchedHandicap) {
                // 只保留匹配的让分盘口
                allMarketOdds.handicap = [matchedHandicap];
                console.log('[PlayerExclusiveModelCard] Matched handicap line:', matchedHandicap, 'for target:', targetHandicapLine);
              } else {
                // 如果找不到完全匹配的，保留所有让分盘口（作为后备）
                console.warn('[PlayerExclusiveModelCard] Could not find exact match for handicap line:', targetHandicapLine, 'in allMarketOdds, showing all available handicap options');
                console.warn('[PlayerExclusiveModelCard] Available handicap lines:', allMarketOdds.handicap.map((h: any) => h.line));
              }
            }
            
            // 处理大小球盘口：如果目标盘口存在，找到对应的盘口
            if (targetOverUnderLine !== undefined && allMarketOdds.overUnder && Array.isArray(allMarketOdds.overUnder)) {
              // 在 allMarketOdds.overUnder 中查找匹配的盘口
              const matchedOverUnder = allMarketOdds.overUnder.find((ou: any) => {
                const ouLine = String(ou.line || '');
                const targetLine = String(targetOverUnderLine || '');
                // 精确匹配
                if (ouLine === targetLine) return true;
                // 处理字符串格式的盘口（如 "2.5/3"）
                if (ouLine.includes('/') && targetLine.includes('/')) {
                  return ouLine === targetLine;
                }
                // 尝试数字比较（如果都是数字）
                const ouNum = parseFloat(ouLine);
                const targetNum = parseFloat(targetLine);
                if (!isNaN(ouNum) && !isNaN(targetNum)) {
                  return Math.abs(ouNum - targetNum) < 0.01; // 允许小的浮点数误差
                }
                return false;
              });
              
              if (matchedOverUnder) {
                // 只保留匹配的大小球盘口
                allMarketOdds.overUnder = [matchedOverUnder];
                console.log('[PlayerExclusiveModelCard] Matched overUnder line:', matchedOverUnder, 'for target:', targetOverUnderLine);
              } else {
                // 如果找不到完全匹配的，保留所有大小球盘口（作为后备）
                console.warn('[PlayerExclusiveModelCard] Could not find exact match for overUnder line:', targetOverUnderLine, 'in allMarketOdds, showing all available overUnder options');
                console.warn('[PlayerExclusiveModelCard] Available overUnder lines:', allMarketOdds.overUnder.map((ou: any) => ou.line));
              }
            }
          }
        }

        // 方法3: 如果还是没有，尝试从 odds_info 解析（作为最后的后备方案）
        if (!allMarketOdds && selectedMatch.odds_info) {
          try {
            const oddsInfo = typeof selectedMatch.odds_info === 'string' 
              ? JSON.parse(selectedMatch.odds_info) 
              : selectedMatch.odds_info;
            
            // 从 odds_info 中提取让分和大小球数据
            if (oddsInfo && oddsInfo.data && Array.isArray(oddsInfo.data)) {
              const handicapOdds: Array<{ line: number | string; home: number; away: number }> = [];
              const overUnderOdds: Array<{ line: number | string; over: number; under: number }> = [];

              oddsInfo.data.forEach((market: any) => {
                // 让分盘 (hpt = 2 或 hpt = 4)
                if ((market.hpt === 2 || market.hpt === 4) && market.hl && Array.isArray(market.hl)) {
                  market.hl.forEach((hl: any) => {
                    if (hl.hv && hl.ol && Array.isArray(hl.ol)) {
                      const homeOdds = hl.ol.find((o: any) => o.ot === '1' || o.otd === 3);
                      const awayOdds = hl.ol.find((o: any) => o.ot === '2' || o.otd === 4);
                      if (homeOdds && awayOdds) {
                        handicapOdds.push({
                          line: hl.hv,
                          home: homeOdds.ov / 100000, // 转换为小数赔率
                          away: awayOdds.ov / 100000
                        });
                      }
                    }
                  });
                }
                // 大小球 (hpt = 5 或 hpt = 18)
                if ((market.hpt === 5 || market.hpt === 18) && market.hl && Array.isArray(market.hl)) {
                  market.hl.forEach((hl: any) => {
                    if (hl.hv && hl.ol && Array.isArray(hl.ol)) {
                      const overOdds = hl.ol.find((o: any) => o.ot === 'Over' || o.otd === 2 || o.otd === 96);
                      const underOdds = hl.ol.find((o: any) => o.ot === 'Under' || o.otd === 1 || o.otd === 95);
                      if (overOdds && underOdds) {
                        overUnderOdds.push({
                          line: hl.hv,
                          over: overOdds.ov / 100000,
                          under: underOdds.ov / 100000
                        });
                      }
                    }
                  });
                }
              });

              if (handicapOdds.length > 0 || overUnderOdds.length > 0) {
                allMarketOdds = {
                  handicap: handicapOdds.length > 0 ? handicapOdds : undefined,
                  overUnder: overUnderOdds.length > 0 ? overUnderOdds : undefined
                };
                console.log('[PlayerExclusiveModelCard] Market odds parsed from odds_info:', allMarketOdds);
              }
            }
          } catch (parseError) {
            console.warn('[PlayerExclusiveModelCard] Failed to parse odds_info:', parseError);
          }
        }

        if (allMarketOdds) {
          setMarketOdds(allMarketOdds);
          lastFetchedMatchIdRef.current = String(matchId);
        } else {
          console.warn('[PlayerExclusiveModelCard] No market odds found from any source for match_id:', matchId);
          setMarketOdds(null);
          lastFetchedMatchIdRef.current = String(matchId); // 即使没找到也记录，避免重复查询
        }
      } catch (error) {
        console.error('[PlayerExclusiveModelCard] Unexpected error fetching market odds:', error);
        setMarketOdds(null);
        lastFetchedMatchIdRef.current = String(matchId); // 即使出错也记录，避免重复查询
      } finally {
        setIsLoadingMarketOdds(false);
      }
    };

    fetchMarketOdds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showManualBetDialog, selectedMatch?.mid, selectedMatch?.match_id]);

  const trainingSteps = [
    { icon: Database, label: '数据解析', description: '正在分析输入内容...' },
    { icon: Brain, label: '神经网络', description: '更新模型权重...' },
    { icon: Target, label: '模式识别', description: '学习预测模式...' },
    { icon: TrendingUp, label: '优化完成', description: '模型已更新！' },
  ];

  // Demo mode for non-logged-in users
  const isDemo = !user || !userProfile;
  const displayName = isDemo ? t('demo_player') || '预测者专属模型' : `${userProfile?.display_name || '玩家'}`;
  const avatarUrl = isDemo ? '/avatars/avatar-1.png' : (userProfile?.avatar_url || '/avatars/avatar-1.png');

  // Calculate training trend data (last 7 days)
  const trendData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(day => {
      const dayStart = startOfDay(day);
      const count = trainingHistory.filter(record => {
        const recordDate = startOfDay(new Date(record.created_at));
        return recordDate.getTime() === dayStart.getTime();
      }).length;

      return {
        date: format(day, 'MM/dd'),
        count,
        fullDate: format(day, 'yyyy-MM-dd')
      };
    });
  }, [trainingHistory]);

  // Extract and count keywords from training history
  const keywordStats = useMemo(() => {
    const allText = trainingHistory.map(r => r.content).join(' ');
    const keywordCounts: Record<string, number> = {};

    FOOTBALL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = allText.match(regex);
      if (matches && matches.length > 0) {
        keywordCounts[keyword] = matches.length;
      }
    });

    // Sort by count and take top 12
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([keyword, count]) => ({ keyword, count }));
  }, [trainingHistory]);

  // Calculate total characters
  const totalCharacters = useMemo(() => {
    return trainingHistory.reduce((sum, r) => sum + r.content.length, 0);
  }, [trainingHistory]);

  // Fetch training history count on mount
  useEffect(() => {
    if (user) {
      fetchTrainingCount();
    }
  }, [user]);

  // Fetch training history when dialog opens
  useEffect(() => {
    if (showFeedDialog && user) {
      fetchTrainingHistory();
    }
  }, [showFeedDialog, user]);

  const fetchTrainingCount = async () => {
    if (!user) return;
    
    const { count, error } = await supabase
      .from('ai_training_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (!error && count !== null) {
      setTrainingCount(count);
    }
  };

  const fetchTrainingHistory = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('ai_training_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100); // Fetch more for better analytics
    
    if (error) {
      console.error('Error fetching training history:', error);
      toast.error(t('fetch_training_failed'));
    } else {
      setTrainingHistory(data || []);
    }
    setIsLoadingHistory(false);
  };

  const saveTrainingData = async (content: string) => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('ai_training_history')
        .insert({
          user_id: user.id,
          content: content
        })
        .select(); // 返回插入的数据，用于验证
      
      if (error) {
        console.error('Error saving training data:', error);
        toast.error(`保存失败: ${error.message}`);
        return false;
      }
      
      if (data && data.length > 0) {
        console.log('Training data saved successfully:', data[0].id);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Unexpected error saving training data:', err);
      toast.error('保存失败，请检查网络连接');
      return false;
    }
  };

  const deleteTrainingRecord = async (id: string) => {
    const { error } = await supabase
      .from('ai_training_history')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('删除失败');
      return;
    }
    
    setTrainingHistory(prev => prev.filter(r => r.id !== id));
    setTrainingCount(prev => prev - 1);
    toast.success('已删除');
  };

  // Handle AI feeding progress animation with steps
  useEffect(() => {
    if (isFeeding && feedProgress < 100) {
      const interval = setInterval(() => {
        setFeedProgress(prev => {
          const increment = Math.random() * 8 + 3;
          const newProgress = Math.min(prev + increment, 100);
          
          if (newProgress >= 25 && currentStep < 1) setCurrentStep(1);
          if (newProgress >= 50 && currentStep < 2) setCurrentStep(2);
          if (newProgress >= 75 && currentStep < 3) setCurrentStep(3);
          
          if (newProgress >= 100) {
            setIsFeeding(false);
            setFeedComplete(true);
            clearInterval(interval);
          }
          return newProgress;
        });
      }, 120);
      return () => clearInterval(interval);
    }
  }, [isFeeding, feedProgress, currentStep]);

  const handleFeedSubmit = async () => {
    if (!feedText.trim()) {
      toast.error('请输入训练数据');
      return;
    }
    
    if (isDemo) {
      toast.info('请先登录以保存训练数据');
      // 演示模式下不执行训练动画
      return;
    }
    
    // 保存训练数据
    const saved = await saveTrainingData(feedText.trim());
    if (!saved) {
      toast.error('保存训练数据失败，请稍后重试');
      return;
    }
    
    // 保存成功后立即更新训练计数和历史记录
    setTrainingCount(prev => prev + 1);
    // 延迟获取历史记录，确保数据库已写入
    setTimeout(() => {
      fetchTrainingHistory();
    }, 500);
    
    // 开始训练动画
    setCurrentStep(0);
    setIsFeeding(true);
    setFeedProgress(0);
    setFeedComplete(false);
  };

  const handleDialogClose = () => {
    setShowFeedDialog(false);
    setFeedText('');
    setFeedProgress(0);
    setIsFeeding(false);
    setFeedComplete(false);
    setCurrentStep(0);
    setActiveTab('feed');
  };

  const handleFeedComplete = () => {
    toast.success('AI训练完成！您的专属模型已更新');
    // 训练计数和历史记录已在 handleFeedSubmit 中更新，这里只需刷新一次确保数据同步
    if (!isDemo && user) {
      fetchTrainingCount();
      fetchTrainingHistory();
    }
    setFeedText('');
    setFeedProgress(0);
    setFeedComplete(false);
    setCurrentStep(0);
  };

  // Get keyword color based on frequency
  const getKeywordColor = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'bg-amber-500 text-black';
    if (ratio > 0.4) return 'bg-amber-500/60 text-white';
    return 'bg-amber-500/30 text-amber-200';
  };

  // Helper functions with fallbacks
  // 根据 SQL 迁移文件更新字段：mhn (主队名称), man (客队名称), tn (联赛名称)
  const safeGetTeamName = (match: any, team: 'home' | 'away') => {
    if (getTeamName) return getTeamName(match, team);
    // 优先使用新字段 mhn/man，回退到旧字段 home_team_name/away_team_name
    if (team === 'home') {
      return match?.mhn || match?.home_team_name || '主队';
    } else {
      return match?.man || match?.away_team_name || '客队';
    }
  };

  const safeGetLeagueName = (match: any) => {
    if (getLeagueName) return getLeagueName(match);
    // 优先使用新字段 tn，回退到旧字段 league_name 或 competition_name
    return match?.tn || match?.league_name || match?.competition_name || '联赛';
  };

  // 获取球队 logo，优先使用新字段 mhlu/malu (数组)，回退到 mhlut/malut (文本)，最后回退到旧字段
  const safeGetTeamLogo = (match: any, team: 'home' | 'away') => {
    if (team === 'home') {
      // 优先使用 mhlu[0] (数组第一个)，然后是 mhlut (文本)，最后是 home_logo
      return match?.mhlu?.[0] || match?.mhlut || match?.home_logo || null;
    } else {
      // 优先使用 malu[0] (数组第一个)，然后是 malut (文本)，最后是 away_logo
      return match?.malu?.[0] || match?.malut || match?.away_logo || null;
    }
  };

  const bet = handicapBet || overUnderBet || moneylineBet;

  // State to track slide direction for animation
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const handlePrevMatch = (e: React.MouseEvent) => {
    setSlideDirection('left');
    if (onPrevMatch) onPrevMatch(e);
  };

  const handleNextMatch = (e: React.MouseEvent) => {
    setSlideDirection('right');
    if (onNextMatch) onNextMatch(e);
  };

  // Handle manual bet submission
  const handleManualBetSubmit = async () => {
    // Validate bet amount is provided
    if (manualBetAmount === '' || manualBetAmount === null || manualBetAmount === undefined) {
      toast.error(t('invalid_bet_amount') || '下注金额无效', {
        description: t('please_enter_bet_amount') || '请输入下注金额',
      });
      return;
    }
    
    // Validate bet amount doesn't exceed available balance
    if (manualBetAmount > maxBetAmount) {
      toast.error(t('insufficient_balance') || '余额不足', {
        description: t('bet_amount_exceeds_balance') || `下注金额不能超过可用余额 ${maxBetAmount.toLocaleString()}`,
      });
      return;
    }
    
    if (manualBetAmount <= 0) {
      toast.error(t('invalid_bet_amount') || '下注金额无效', {
        description: t('bet_amount_must_be_positive') || '下注金额必须大于 0',
      });
      return;
    }
    if (!selectedMatch) {
      toast.error(t('please_select_match') || '请选择比赛');
      return;
    }

    if (manualBetType === 'handicap' && !manualPrediction) {
      toast.error(t('please_select_team') || '请选择球队');
      return;
    }

    setIsSubmittingBet(true);

    // Calculate odds based on selected bet type and option
    // Get real odds from AI bets - no fallback to defaults
    let odds: number | null = null;
    const matchEntry = matchEntries?.find(entry => entry.match?.mid === selectedMatch?.mid);
    
    if (manualBetType === 'handicap') {
      const handicapBet = matchEntry?.bets?.find((b: any) => b.betType === 'handicap');
      // Only use real odds if AI bet exists and matches the selection
      if (manualPrediction === 'HOME' && handicapBet && (handicapBet.prediction === 'HOME' || handicapBet.prediction === 'HOME_WIN')) {
        odds = handicapBet.odds;
      } else if (manualPrediction === 'AWAY' && handicapBet && (handicapBet.prediction === 'AWAY' || handicapBet.prediction === 'AWAY_WIN')) {
        odds = handicapBet.odds;
      }
    } else {
      const overUnderBet = matchEntry?.bets?.find((b: any) => b.betType === 'over_under');
      // Only use real odds if AI bet exists and matches the selection
      if (manualOverUnderPick === 'over' && overUnderBet && overUnderBet.overUnderPick === 'over') {
        odds = overUnderBet.odds;
      } else if (manualOverUnderPick === 'under' && overUnderBet && overUnderBet.overUnderPick === 'under') {
        odds = overUnderBet.odds;
      }
    }
    
    // If no real odds found, show error and return
    if (!odds || odds <= 0) {
      toast.error(t('odds_not_available') || '赔率数据不可用', {
        description: t('please_select_another_option') || '请选择其他选项或稍后再试',
      });
      setIsSubmittingBet(false);
      return;
    }
    
    // At this point, manualBetAmount is guaranteed to be a number (validated above)
    const betAmount = typeof manualBetAmount === 'number' ? manualBetAmount : 0;
    const potentialPayout = betAmount * odds;

    // If user is logged in, save to database
    if (user) {
      try {
        const matchDate = selectedMatch.date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase.rpc('place_bet', {
          p_user_id: user.id,
          // 根据 SQL 迁移文件，优先使用 mid (番茄体育格式的比赛ID)
          p_match_id: selectedMatch.mid || selectedMatch.match_id || selectedMatch.fixture_id?.toString(),
          p_match_date: matchDate,
          p_prediction: manualBetType === 'handicap' ? manualPrediction : manualOverUnderPick.toUpperCase(),
          p_prediction_type: manualBetType,
          p_bet_amount: betAmount,
          p_potential_payout: potentialPayout,
          p_confidence: 75,
          p_handicap_line: manualBetType === 'handicap' 
            ? (typeof manualHandicapLine === 'number' 
                ? manualHandicapLine 
                : (() => {
                    // 尝试从字符串中解析第一个数字（如 "-0/0.5" -> -0 或 "-0.5/1" -> -0.5）
                    const parsed = parseFloat(String(manualHandicapLine));
                    return isNaN(parsed) ? null : parsed;
                  })()) as number | null
            : null,
          p_over_under_line: manualBetType === 'over_under' ? manualOverUnderLine : null,
        });

        if (error) {
          console.error('Place bet error:', error);
          toast.error(t('bet_failed') || '下注失败');
          setIsSubmittingBet(false);
          return;
        }
        
        // 下注成功后刷新用户余额
        if (refreshBalance) {
          await refreshBalance();
        }
        // 同时更新本地状态
        const { data: updatedBalance } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        if (updatedBalance) {
          setUserBalance(updatedBalance.balance);
        }
      } catch (err) {
        console.error('Manual bet error:', err);
        toast.error(t('unknown_error') || '未知错误');
        setIsSubmittingBet(false);
        return;
      }
    }

    // Save the confirmed bet for display (works for both demo and logged-in users)
    setConfirmedManualBet({
      match: selectedMatch,
      betType: manualBetType,
      prediction: manualBetType === 'handicap' ? manualPrediction : manualOverUnderPick.toUpperCase(),
      betAmount: betAmount,
      odds: odds,
      confidence: 75,
      handicapLine: manualBetType === 'handicap' ? manualHandicapLine : undefined,
      overUnderLine: manualBetType === 'over_under' ? manualOverUnderLine : undefined,
      overUnderPick: manualBetType === 'over_under' ? manualOverUnderPick : undefined,
    });

    setManualBetConfirmed(true);
    setShowManualBetDialog(false);
    setIsSubmittingBet(false);
    
    // Show success animation dialog
    setShowSuccessDialog(true);
    setTimeout(() => {
      setShowSuccessDialog(false);
    }, 2500);
  };

  // Check if user has manual bet for current match (from database)
  useEffect(() => {
    const checkManualBet = async () => {
      // Only check in manual prediction mode, when user is logged in, and when there is a current match
      if (!isManualPrediction || !user || !currentMatchData?.match?.mid) {
        setHasManualBet(false);
        return;
      }

      setIsCheckingManualBet(true);
      try {
        const { data, error } = await supabase
          .from('user_predictions')
          .select('id, match_id, prediction_type, prediction, bet_amount, potential_payout, handicap_line, over_under_line, confidence, result, created_at')
          .eq('user_id', user.id)
          .eq('match_id', currentMatchData.match.mid)
          .eq('result', 'pending') // Only check pending bets (not settled)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking manual bet:', error);
          setHasManualBet(false);
        } else if (data && data.length > 0) {
          // User has a pending manual bet for this match
          setHasManualBet(true);
          // Optionally, set confirmedManualBet from database data
          const bet = data[0];
          setConfirmedManualBet({
            match: currentMatchData.match,
            betType: bet.prediction_type,
            prediction: bet.prediction,
            betAmount: bet.bet_amount,
            odds: bet.potential_payout ? bet.potential_payout / bet.bet_amount : 1.85,
            confidence: bet.confidence || 75,
            handicapLine: bet.handicap_line,
            overUnderLine: bet.over_under_line,
            overUnderPick: bet.prediction === 'OVER' ? 'over' : bet.prediction === 'UNDER' ? 'under' : undefined,
            confirmed: true,
          });
          setManualBetConfirmed(true);
        } else {
          setHasManualBet(false);
        }
      } catch (err) {
        console.error('Error checking manual bet:', err);
        setHasManualBet(false);
      } finally {
        setIsCheckingManualBet(false);
      }
    };

    checkManualBet();
  }, [isManualPrediction, user, currentMatchData?.match?.mid]);

  // Reset manual bet when switching modes
  useEffect(() => {
    if (!isManualPrediction) {
      setManualBetConfirmed(false);
      setConfirmedManualBet(null);
      setHasManualBet(false);
    }
  }, [isManualPrediction]);

  return (
    <>
      <TiltCard
        className={`group rounded-lg sm:rounded-2xl p-1.5 sm:p-5 bg-gradient-to-br from-amber-900/20 via-slate-800/60 to-slate-900/40 backdrop-blur-sm border-2 border-amber-500/60 hover:border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all duration-300 overflow-hidden cursor-pointer h-full min-h-[160px] sm:min-h-[320px] ${className} relative`}
        onClick={!user ? () => window.location.href = '/auth' : handleNextMatch}
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

        {/* Match Counter - Bottom Right - Only show if not in manual prediction mode without manual bet */}
        {matchEntries.length > 1 && !(isManualPrediction && !hasManualBet && !manualBetConfirmed) && (
          <div className="absolute bottom-0.5 sm:bottom-1.5 right-1.5 sm:right-3 z-20 flex items-center gap-0.5 sm:gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              className="!h-4 !w-4 sm:!h-6 sm:!w-6 !p-0 !min-w-0 !min-h-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 shrink-0 flex items-center justify-center aspect-square touch-manipulation"
              onClick={handlePrevMatch}
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
              onClick={handleNextMatch}
              title={t('next_match') || '下一场'}
            >
              <ChevronRight className="h-2 w-2 sm:h-3 sm:w-3 shrink-0" />
            </button>
          </div>
        )}

        {/* Auto/Manual Toggle - Top Right */}
        <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-20">
          {onToggleAutoPrediction ? (
            <div 
              className="flex items-center bg-secondary/80 rounded-full p-0.5 backdrop-blur-sm shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAutoPrediction(true);
                }}
                className={`!px-1.5 sm:!px-3 !py-0.5 sm:!py-1 !min-w-0 !min-h-0 rounded-full text-[8px] sm:text-xs font-medium transition-all shrink-0 whitespace-nowrap touch-manipulation ${
                  isAutoPrediction 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                {t('auto_prediction') || '自动预测'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAutoPrediction(false);
                }}
                className={`!px-1.5 sm:!px-3 !py-0.5 sm:!py-1 !min-w-0 !min-h-0 rounded-full text-[8px] sm:text-xs font-medium transition-all shrink-0 whitespace-nowrap touch-manipulation ${
                  !isAutoPrediction 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                {t('manual_prediction') || '人工预测'}
              </button>
            </div>
          ) : matchEntries.length === 0 ? (
            <Badge 
              variant="outline"
              className="text-[8px] sm:text-[10px] font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-white/10 border-white/20 text-foreground/80 backdrop-blur-sm"
            >
              {t('no_bets')}
            </Badge>
          ) : null}
        </div>

        {/* Content */}
        <div className={`relative z-10 space-y-1.5 sm:space-y-4 overflow-hidden ${!user ? 'blur-[1px]' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`player-${matchIndex}-${isManualPrediction ? 'manual' : 'auto'}`}
              initial={{ 
                opacity: 0, 
                x: slideDirection === 'right' ? 80 : -80 
              }}
              animate={{ 
                opacity: 1, 
                x: 0 
              }}
              exit={{ 
                opacity: 0, 
                x: slideDirection === 'right' ? -80 : 80 
              }}
              transition={{ 
                duration: 0.25, 
                ease: "easeOut" 
              }}
              className="space-y-1.5 sm:space-y-4"
            >
              {/* AI Model Header */}
              <div className="flex items-center justify-between">
                {/* Player Avatar & Info */}
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className="relative">
                    <Avatar className={`h-7 w-7 sm:h-12 sm:w-12 shadow-lg ${isDemo ? 'border border-dashed sm:border-2 border-white/30' : 'ring-1 sm:ring-2 ring-white/20'}`}>
                      {!isDemo ? (
                        <>
                          <AvatarImage 
                            src={avatarUrl} 
                            alt={displayName} 
                            className="object-cover" 
                          />
                          <AvatarFallback className="text-[8px] sm:text-sm font-bold bg-white/10">{displayName[0]}</AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="bg-white/5">
                          <User className="h-3 w-3 sm:h-5 sm:w-5 text-muted-foreground/40" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {/* Online Indicator - only show when logged in */}
                    {!isDemo && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-3.5 sm:h-3.5 bg-success rounded-full border sm:border-2 border-card" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] sm:text-sm font-bold tracking-wide uppercase text-slate-200 truncate max-w-[70px] sm:max-w-none">
                      {displayName}
                    </span>
                    <span className="text-[8px] sm:text-xs text-muted-foreground/80 font-medium inline-flex items-center gap-0.5 shrink-0">
                      <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-5 sm:h-5 shrink-0" />
                      <span className="truncate">{!isDemo ? (balanceValue || '10,000') : '--'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Training Badge - Show if has training, hidden on mobile */}
              {trainingCount > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="text-[10px] font-medium px-2.5 py-1 bg-white/10 border-white/20 text-foreground/80 cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFeedDialog(true);
                    }}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    {trainingCount}{t('times_training')}
                  </Badge>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Match Info */}
              {/* In manual prediction mode, show "Start Prediction" button if there is no manual bet, regardless of AI auto bets */}
              {isManualPrediction && !hasManualBet && !manualBetConfirmed ? (
                /* Manual Prediction Mode - Show "Start Prediction" button when no bets exist */
                <div className="flex flex-col items-center justify-center py-2 sm:py-6 text-center px-1 overflow-hidden shrink-0">
                  <img src={hunsoccerAlphaLogo} alt="HUNSOCCER" className="h-8 sm:h-16 w-auto opacity-15 mb-1 sm:mb-3 shrink-0" />
                  <p className="text-[7px] sm:text-sm text-muted-foreground/80 font-medium truncate max-w-full shrink-0">
                    {t('manual_prediction_hint') || '选择比赛进行人工预测'}
                  </p>
                  <button
                    type="button"
                    className="text-[6px] sm:text-xs mt-0.5 sm:mt-1 !px-2 sm:!px-3 !py-0.5 sm:!py-1 !min-w-0 !min-h-0 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:border-primary/50 transition-all duration-200 font-medium shrink-0 whitespace-nowrap touch-manipulation cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowManualBetDialog(true);
                    }}
                  >
                    {t('start_prediction') || '开始预测'}
                  </button>
                </div>
              ) : currentMatchData ? (
                <div className="space-y-1.5 sm:space-y-3">
                  {/* League Badge */}
                  <div className="flex items-center justify-center">
                    <Badge className="text-[7px] sm:text-[11px] py-0.5 sm:py-1 px-1.5 sm:px-3 bg-white/10 border-white/20 text-foreground/90 font-medium backdrop-blur-sm max-w-full truncate">
                      {safeGetLeagueName(currentMatchData.match)}
                    </Badge>
                  </div>
                
                  {/* Teams Display */}
                  <div className="flex items-center justify-between gap-1 sm:gap-2 px-0.5">
                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                      <div className="relative shrink-0">
                        {safeGetTeamLogo(currentMatchData.match, 'home') ? (
                          <img 
                            src={safeGetTeamLogo(currentMatchData.match, 'home')} 
                            alt={safeGetTeamName(currentMatchData.match, 'home')}
                            className="h-6 w-6 sm:h-10 sm:w-10 object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 sm:h-10 sm:w-10 flex items-center justify-center">
                            <Shield className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(currentMatchData.match, 'home')}
                      </p>
                    </div>
                  
                    {/* Match Time Display & Score */}
                    <div className="flex flex-col items-center gap-0 sm:gap-0.5 shrink-0">
                      {/* 比分显示（如果有比分，显示在VS上面） */}
                      {(currentMatchData.match.goals_home !== null && currentMatchData.match.goals_home !== undefined) || 
                       (currentMatchData.match.goals_away !== null && currentMatchData.match.goals_away !== undefined) ||
                       (currentMatchData.match.mhs !== null && currentMatchData.match.mhs !== undefined) ||
                       (currentMatchData.match.mas !== null && currentMatchData.match.mas !== undefined) ? (
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <span className="text-[9px] sm:text-sm font-bold text-foreground font-mono">
                            {currentMatchData.match.goals_home ?? currentMatchData.match.mhs ?? 0}
                          </span>
                          <span className="text-[8px] sm:text-xs text-muted-foreground/70 font-medium">-</span>
                          <span className="text-[9px] sm:text-sm font-bold text-foreground font-mono">
                            {currentMatchData.match.goals_away ?? currentMatchData.match.mas ?? 0}
                          </span>
                        </div>
                      ) : null}
                      <MatchTimeDisplay match={currentMatchData.match} />
                    </div>
                  
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                      <div className="relative shrink-0">
                        {safeGetTeamLogo(currentMatchData.match, 'away') ? (
                          <img 
                            src={safeGetTeamLogo(currentMatchData.match, 'away')} 
                            alt={safeGetTeamName(currentMatchData.match, 'away')}
                            className="h-6 w-6 sm:h-10 sm:w-10 object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 sm:h-10 sm:w-10 flex items-center justify-center">
                            <Shield className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(currentMatchData.match, 'away')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : isManualPrediction && !manualBetConfirmed ? (
                /* Manual Prediction Mode - Matching other cards' no-data state with prominent button */
                <div className="flex flex-col items-center justify-center py-2 sm:py-6 text-center px-1 overflow-hidden shrink-0">
                  <img src={hunsoccerAlphaLogo} alt="HUNSOCCER" className="h-8 sm:h-16 w-auto opacity-15 mb-1 sm:mb-3 shrink-0" />
                  <p className="text-[7px] sm:text-sm text-muted-foreground/80 font-medium truncate max-w-full shrink-0">
                    {t('manual_prediction_hint') || '选择比赛进行人工预测'}
                  </p>
                  <button
                    type="button"
                    className="text-[6px] sm:text-xs mt-0.5 sm:mt-1 !px-2 sm:!px-3 !py-0.5 sm:!py-1 !min-w-0 !min-h-0 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:border-primary/50 transition-all duration-200 font-medium shrink-0 whitespace-nowrap touch-manipulation cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowManualBetDialog(true);
                    }}
                  >
                    {t('start_prediction') || '开始预测'}
                  </button>
                </div>
              ) : manualBetConfirmed && confirmedManualBet ? (
                /* Show confirmed manual bet */
                <div className="space-y-1.5 sm:space-y-3">
                  {/* League Badge */}
                  <div className="flex items-center justify-center">
                    <Badge className="text-[7px] sm:text-[11px] py-0.5 sm:py-1 px-1.5 sm:px-3 bg-white/10 border-white/20 text-foreground/90 font-medium backdrop-blur-sm max-w-full truncate">
                      {safeGetLeagueName(confirmedManualBet.match)}
                    </Badge>
                  </div>
                
                  {/* Teams Display */}
                  <div className="flex items-center justify-between gap-1 sm:gap-2 px-0.5 relative -translate-y-1">
                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                      <div className="relative shrink-0">
                        {safeGetTeamLogo(confirmedManualBet.match, 'home') ? (
                          <img 
                            src={safeGetTeamLogo(confirmedManualBet.match, 'home')} 
                            alt={safeGetTeamName(confirmedManualBet.match, 'home')}
                            className="h-6 w-6 sm:h-10 sm:w-10 object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 sm:h-10 sm:w-10 flex items-center justify-center">
                            <Shield className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(confirmedManualBet.match, 'home')}
                      </p>
                    </div>
                  
                    {/* Match Time Display & Score - Same as auto prediction */}
                    <div className="flex flex-col items-center gap-0 sm:gap-0.5 shrink-0">
                      {/* 比分显示（如果有比分，显示在VS上面） */}
                      {(confirmedManualBet.match.goals_home !== null && confirmedManualBet.match.goals_home !== undefined) || 
                       (confirmedManualBet.match.goals_away !== null && confirmedManualBet.match.goals_away !== undefined) ||
                       (confirmedManualBet.match.mhs !== null && confirmedManualBet.match.mhs !== undefined) ||
                       (confirmedManualBet.match.mas !== null && confirmedManualBet.match.mas !== undefined) ? (
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <span className="text-[9px] sm:text-sm font-bold text-foreground font-mono">
                            {confirmedManualBet.match.goals_home ?? confirmedManualBet.match.mhs ?? 0}
                          </span>
                          <span className="text-[8px] sm:text-xs text-muted-foreground/70 font-medium">-</span>
                          <span className="text-[9px] sm:text-sm font-bold text-foreground font-mono">
                            {confirmedManualBet.match.goals_away ?? confirmedManualBet.match.mas ?? 0}
                          </span>
                        </div>
                      ) : null}
                      <MatchTimeDisplay match={confirmedManualBet.match} />
                    </div>
                  
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                      <div className="relative shrink-0">
                        {safeGetTeamLogo(confirmedManualBet.match, 'away') ? (
                          <img 
                            src={safeGetTeamLogo(confirmedManualBet.match, 'away')} 
                            alt={safeGetTeamName(confirmedManualBet.match, 'away')}
                            className="h-6 w-6 sm:h-10 sm:w-10 object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 sm:h-10 sm:w-10 flex items-center justify-center">
                            <Shield className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(confirmedManualBet.match, 'away')}
                      </p>
                    </div>
                  </div>

                  {/* Manual Bet Details - Handicap */}
                  {confirmedManualBet.betType === 'handicap' && (
                    <div className="block bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3 border border-white/10">
                      {/* Bet Type Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">{t('handicap_bet') || '让分'}</span>
                        <Badge 
                          variant="outline"
                          className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${confirmedManualBet.confirmed ? "bg-success/20 text-success border-success/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                        >
                          {confirmedManualBet.confirmed ? "已确认" : "待确认"}
                        </Badge>
                      </div>
                      
                      {/* Selection Grid */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                          confirmedManualBet.prediction === "HOME" || confirmedManualBet.prediction === "HOME_WIN"
                            ? "bg-primary/20 border-primary/60" 
                            : "bg-white/5 border-white/10 opacity-60"
                        }`}>
                          <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 truncate">{safeGetTeamName(confirmedManualBet.match, 'home')}</span>
                          {confirmedManualBet.handicapLine !== undefined && (
                            <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
                              confirmedManualBet.prediction === "HOME" || confirmedManualBet.prediction === "HOME_WIN" ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {(() => {
                                const line = confirmedManualBet.handicapLine;
                                if (typeof line === 'number') {
                                  return line < 0 ? line.toString() : line > 0 ? `+${line}` : '0';
                                }
                                // 处理字符串格式的盘口
                                const lineStr = String(line);
                                if (lineStr.startsWith('-')) {
                                  return lineStr; // 负数，直接返回
                                }
                                if (lineStr === '0' || lineStr === '0.0') {
                                  return '0';
                                }
                                // 正数，添加 + 号
                                return `+${lineStr}`;
                              })()}
                            </span>
                          )}
                        </div>
                        <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                          confirmedManualBet.prediction === "AWAY" || confirmedManualBet.prediction === "AWAY_WIN"
                            ? "bg-primary/20 border-primary/60" 
                            : "bg-white/5 border-white/10 opacity-60"
                        }`}>
                          <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 truncate">{safeGetTeamName(confirmedManualBet.match, 'away')}</span>
                          {confirmedManualBet.handicapLine !== undefined && (
                            <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
                              confirmedManualBet.prediction === "AWAY" || confirmedManualBet.prediction === "AWAY_WIN" ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {(() => {
                                // 客队的让分盘是主队的相反数
                                const homeLine = confirmedManualBet.handicapLine;
                                if (typeof homeLine === 'number') {
                                  const awayLine = -homeLine;
                                  return awayLine < 0 ? awayLine.toString() : awayLine > 0 ? `+${awayLine}` : '0';
                                }
                                // 处理字符串格式的盘口
                                const homeLineStr = String(homeLine);
                                let awayLineStr: string;
                                if (homeLineStr.startsWith('-')) {
                                  // 主队是负数（如 "-0/0.5"），客队应该是正数（"+0/0.5"）
                                  awayLineStr = homeLineStr.substring(1);
                                } else {
                                  // 主队是正数或0（如 "0/0.5"），客队应该是负数（"-0/0.5"）
                                  awayLineStr = `-${homeLineStr}`;
                                }
                                // 格式化客队的让分盘，确保正数前面有 + 号
                                if (awayLineStr.startsWith('-')) {
                                  return awayLineStr; // 负数，直接返回
                                }
                                if (awayLineStr === '0' || awayLineStr === '0.0') {
                                  return '0';
                                }
                                // 正数，添加 + 号
                                return `+${awayLineStr}`;
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Stats Row */}
                      <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <span className="text-muted-foreground">{t('confidence')}: <span className="font-bold text-foreground">{confirmedManualBet.confidence}%</span></span>
                          <span className="text-muted-foreground">@<span className="font-mono font-bold text-foreground">{Math.max(0, confirmedManualBet.odds - 1).toFixed(2)}</span></span>
                        </div>
                        <span className="font-mono font-bold text-success flex items-center gap-0.5">
                          <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          {(confirmedManualBet.betAmount * confirmedManualBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Manual Bet Details - Over/Under */}
                  {confirmedManualBet.betType === 'over_under' && (
                    <div className="bg-white/5 rounded-lg p-2 space-y-1.5 border border-white/10">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-xs font-semibold text-foreground/90">{t('over_under_bet') || '大小球'}</span>
                        <Badge variant="outline" className="text-[8px] sm:text-[10px] px-2 py-0.5 bg-success/20 text-success border-success/30 font-medium">
                          已确认
                        </Badge>
                      </div>
                      
                      {/* Selection Grid */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <div className={`p-2 rounded-lg border-2 transition-all ${
                          confirmedManualBet.overUnderPick === 'over' 
                            ? 'bg-secondary/80 border-border' 
                            : 'bg-white/5 border-white/10 opacity-50'
                        }`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-[9px] sm:text-xs font-medium">{t('over') || '大球'}</span>
                            <span className="text-[9px] sm:text-xs font-mono font-bold">{confirmedManualBet.overUnderLine}</span>
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg border-2 transition-all ${
                          confirmedManualBet.overUnderPick === 'under' 
                            ? 'bg-secondary/80 border-border' 
                            : 'bg-white/5 border-white/10 opacity-50'
                        }`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 rotate-180" />
                            <span className="text-[9px] sm:text-xs font-medium">{t('under') || '小球'}</span>
                            <span className="text-[9px] sm:text-xs font-mono font-bold">{confirmedManualBet.overUnderLine}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Stats Row */}
                      <div className="flex items-center justify-between text-[9px] sm:text-[11px] pt-1.5 border-t border-white/10">
                        <span className="text-muted-foreground">
                          {t('confidence') || '置信度'}: <span className="font-bold text-foreground">{confirmedManualBet.confidence}%</span>
                          <span className="ml-2 font-mono">@{Math.max(0, confirmedManualBet.odds - 1).toFixed(2)}</span>
                        </span>
                        <span className="font-mono font-bold text-success flex items-center gap-0.5">{(confirmedManualBet.betAmount * confirmedManualBet.odds).toFixed(0)}<img src={hunterCoinIcon} alt="" className="w-3 h-3 sm:w-4 sm:h-4" /></span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Auto Prediction Mode - No data state matching other cards exactly */
                <div className="flex flex-col items-center justify-center py-2 sm:py-6 text-center px-1 overflow-hidden">
                  <img src={hunsoccerAlphaLogo} alt="HUNSOCCER" className="h-8 sm:h-16 w-auto opacity-15 mb-1 sm:mb-3 shrink-0" />
                  <p className="text-[7px] sm:text-sm text-muted-foreground/80 font-medium truncate max-w-full">
                    {isDemo ? (t('login_to_create_model') || '登录后生成专属模型') : (t('no_active_predictions') || '当前没有活跃的预测')}
                  </p>
                  <p className="text-[6px] sm:text-xs text-muted-foreground/60 mt-0.5 sm:mt-1 hidden sm:block truncate max-w-full">
                    {t('no_bets_for_ai') || '该AI暂无预测记录'}
                  </p>
                </div>
              )}

              {/* Handicap Bet - Modern Style - Only show if not in manual prediction mode without manual bet */}
              {handicapBet && currentMatchData && !(isManualPrediction && !hasManualBet && !manualBetConfirmed) && (
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
                      <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 truncate">{safeGetTeamName(currentMatchData.match, 'home')}</span>
                      {handicapBet.handicapLine !== undefined && (
                        <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
                          handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME" ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {(() => {
                            const line = handicapBet.handicapLine;
                            if (typeof line === 'number') {
                              return line < 0 ? line.toString() : line > 0 ? `+${line}` : '0';
                            }
                            // 处理字符串格式的盘口
                            const lineStr = String(line);
                            if (lineStr.startsWith('-')) {
                              return lineStr; // 负数，直接返回
                            }
                            if (lineStr === '0' || lineStr === '0.0') {
                              return '0';
                            }
                            // 正数，添加 + 号
                            return `+${lineStr}`;
                          })()}
                        </span>
                      )}
                    </div>
                    <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                      handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY"
                        ? "bg-primary/20 border-primary/60"
                        : "bg-white/5 border-white/10 opacity-60"
                    }`}>
                      <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 truncate">{safeGetTeamName(currentMatchData.match, 'away')}</span>
                      {handicapBet.handicapLine !== undefined && (
                        <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
                          handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY" ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {(() => {
                            // 客队的让分盘是主队的相反数
                            const homeLine = handicapBet.handicapLine;
                            if (typeof homeLine === 'number') {
                              const awayLine = -homeLine;
                              return awayLine < 0 ? awayLine.toString() : awayLine > 0 ? `+${awayLine}` : '0';
                            }
                            // 处理字符串格式的盘口
                            const homeLineStr = String(homeLine);
                            let awayLineStr: string;
                            if (homeLineStr.startsWith('-')) {
                              // 主队是负数（如 "-0/0.5"），客队应该是正数（"+0/0.5"）
                              awayLineStr = homeLineStr.substring(1);
                            } else {
                              // 主队是正数或0（如 "0/0.5"），客队应该是负数（"-0/0.5"）
                              awayLineStr = `-${homeLineStr}`;
                            }
                            // 格式化客队的让分盘，确保正数前面有 + 号
                            if (awayLineStr.startsWith('-')) {
                              return awayLineStr; // 负数，直接返回
                            }
                            if (awayLineStr === '0' || awayLineStr === '0.0') {
                              return '0';
                            }
                            // 正数，添加 + 号
                            return `+${awayLineStr}`;
                          })()}
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

              {/* Over/Under Bet - Modern Style - Only show if not in manual prediction mode without manual bet */}
              {overUnderBet && currentMatchData && !(isManualPrediction && !hasManualBet && !manualBetConfirmed) && (
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
        
        {/* 未登录时的遮罩层和提示 */}
        {!user && (
          <div 
            className="absolute inset-0 z-30 flex items-center justify-center bg-background/40 backdrop-blur-sm rounded-lg sm:rounded-2xl pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/auth';
            }}
          >
            <div className="text-center px-4 py-3">
              <p className="text-xs sm:text-sm font-medium text-foreground">
                注册后获得专属模型
              </p>
            </div>
          </div>
        )}
      </TiltCard>

      {/* AI Feed Dialog */}
      <Dialog open={showFeedDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-[#212121] border-[#3a3a3a] rounded-2xl">
          {/* Header */}
          <div className="px-6 pt-5 pb-4">
            <DialogHeader>
              <DialogTitle className="text-base font-medium text-white">
                AI 模型训练
              </DialogTitle>
              <p className="text-sm text-[#9b9b9b] mt-1">输入训练数据以优化您的专属AI模型</p>
            </DialogHeader>

            {/* Stats Bar */}
            <div className="flex items-center gap-6 mt-4 text-sm text-[#9b9b9b]">
              <span>训练次数 <span className="text-white font-medium ml-1">{trainingCount}</span></span>
              <span>总字符 <span className="text-white font-medium ml-1">{totalCharacters.toLocaleString()}</span></span>
              <span>状态 <span className="text-white font-medium ml-1">活跃</span></span>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {!isFeeding && !feedComplete ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-6 h-10 grid grid-cols-3 bg-[#2f2f2f] rounded-xl p-1">
                      <TabsTrigger value="feed" className="text-sm text-[#9b9b9b] data-[state=active]:bg-[#424242] data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">
                        投喂训练
                      </TabsTrigger>
                      <TabsTrigger value="stats" className="text-sm text-[#9b9b9b] data-[state=active]:bg-[#424242] data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">
                        数据分析
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-sm text-[#9b9b9b] data-[state=active]:bg-[#424242] data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">
                        训练历史
                      </TabsTrigger>
                    </TabsList>

                    {/* Feed Tab */}
                    <TabsContent value="feed" className="flex-1 overflow-auto px-6 pt-5 pb-6 space-y-4 m-0">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-white">
                          输入训练数据
                        </label>
                        <div className="relative">
                          <Textarea
                            placeholder="例如：&#10;• 我认为主队在主场的胜率通常更高&#10;• 最近5场比赛保持不败的球队状态更好&#10;• 欧冠比赛中实力差距明显的比赛更容易爆冷..."
                            value={feedText}
                            onChange={(e) => setFeedText(e.target.value)}
                            className="min-h-[200px] resize-none bg-[#2f2f2f] border-[#3a3a3a] focus:border-[#5a5a5a] text-white placeholder:text-[#6b6b6b] text-sm rounded-xl"
                          />
                          <div className="absolute bottom-3 right-3 text-xs text-[#6b6b6b]">
                            {feedText.length} 字符
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button 
                          variant="ghost" 
                          onClick={handleDialogClose} 
                          className="text-sm text-[#9b9b9b] hover:text-white hover:bg-[#2f2f2f]"
                        >
                          取消
                        </Button>
                        <Button 
                          onClick={handleFeedSubmit}
                          className="text-sm bg-[#2f2f2f] hover:bg-[#424242] text-white border border-[#3a3a3a]"
                          disabled={!feedText.trim()}
                        >
                          开始训练
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Stats Tab */}
                    <TabsContent value="stats" className="flex-1 overflow-auto px-6 pt-5 pb-6 space-y-6 m-0">
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-[#6b6b6b]" />
                        </div>
                      ) : trainingHistory.length === 0 ? (
                        <div className="text-center py-12 text-[#6b6b6b]">
                          <p className="text-sm">暂无训练数据</p>
                          <p className="text-xs mt-1">开始投喂数据后将显示统计分析</p>
                        </div>
                      ) : (
                        <>
                          {/* Training Trend Chart */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white">近7天训练趋势</h4>
                            <div className="h-[140px] bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-3">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 10, fill: '#6b6b6b' }}
                                    axisLine={{ stroke: '#3a3a3a' }}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 10, fill: '#6b6b6b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#2f2f2f',
                                      border: '1px solid #3a3a3a',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      color: '#fff'
                                    }}
                                    formatter={(value: number) => [`${value} 次训练`, '投喂次数']}
                                    labelFormatter={(label) => `日期: ${label}`}
                                  />
                                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {trendData.map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.count > 0 ? '#fff' : '#3a3a3a'}
                                        fillOpacity={entry.count > 0 ? 0.8 : 0.3}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Keyword Analysis */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white">常用关键词</h4>
                            {keywordStats.length === 0 ? (
                              <div className="text-center py-6 text-[#6b6b6b] text-sm bg-[#2f2f2f] rounded-xl border border-[#3a3a3a]">
                                暂未检测到足球相关关键词
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2 p-4 bg-[#2f2f2f] rounded-xl border border-[#3a3a3a]">
                                {keywordStats.map((item, index) => (
                                  <span 
                                    key={item.keyword}
                                    className="text-xs font-medium px-3 py-1.5 bg-[#424242] text-white rounded-full"
                                  >
                                    {item.keyword}
                                    <span className="ml-1.5 text-[#9b9b9b]">×{item.count}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Summary Stats */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-4 text-center">
                              <div className="text-2xl font-semibold text-white">{trainingCount}</div>
                              <div className="text-xs text-[#6b6b6b] mt-1">总训练次数</div>
                            </div>
                            <div className="bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-4 text-center">
                              <div className="text-2xl font-semibold text-white">{totalCharacters.toLocaleString()}</div>
                              <div className="text-xs text-[#6b6b6b] mt-1">总字符数</div>
                            </div>
                            <div className="bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-4 text-center">
                              <div className="text-2xl font-semibold text-white">{keywordStats.length}</div>
                              <div className="text-xs text-[#6b6b6b] mt-1">识别关键词</div>
                            </div>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history" className="flex-1 overflow-hidden px-6 pt-5 pb-6 m-0">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-white">训练历史记录</h4>
                        <span className="text-xs text-[#6b6b6b]">{trainingHistory.length} 条</span>
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#6b6b6b]" />
                          <span className="text-[#6b6b6b]">加载中...</span>
                        </div>
                      ) : trainingHistory.length === 0 ? (
                        <div className="text-center py-12 text-[#6b6b6b]">
                          <p className="text-sm">暂无训练记录</p>
                          <p className="text-xs mt-1">开始投喂您的专属AI吧</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[280px] pr-4">
                          <div className="space-y-2">
                            {trainingHistory.slice(0, 20).map((record, index) => (
                              <div
                                key={record.id}
                                className="bg-[#2f2f2f] rounded-xl p-4 border border-[#3a3a3a] group/item hover:border-[#5a5a5a] transition-all"
                              >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <span className="text-xs text-[#6b6b6b] font-mono">
                                    {format(new Date(record.created_at), 'MM-dd HH:mm')}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity text-[#6b6b6b] hover:text-red-400 hover:bg-red-400/10"
                                    onClick={() => deleteTrainingRecord(record.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-sm text-[#d1d1d1] line-clamp-2 leading-relaxed">{record.content}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </Tabs>
                </motion.div>
              ) : (
                /* Training Progress View */
                <motion.div
                  key="training"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1 flex flex-col items-center justify-center py-8 px-6"
                >
                  <h3 className="text-lg font-medium mb-6 text-white">
                    {feedComplete ? '训练完成' : '正在训练模型...'}
                  </h3>
                  
                  <div className="w-full max-w-md space-y-6">
                    {/* Progress Steps with connecting line */}
                    <div className="relative">
                      {/* Connecting line background */}
                      <div className="absolute top-5 left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 bg-[#3a3a3a]" />
                      {/* Connecting line progress */}
                      <motion.div 
                        className="absolute top-5 left-[calc(12.5%)] h-0.5 bg-white origin-left"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (currentStep / (trainingSteps.length - 1)) * 75)}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                      
                      <div className="relative grid grid-cols-4 gap-2">
                        {trainingSteps.map((step, index) => {
                          const StepIcon = step.icon;
                          const isActive = index <= currentStep;
                          const isCurrent = index === currentStep && isFeeding;
                          const isCompleted = index < currentStep;
                          
                          return (
                            <motion.div
                              key={step.label}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex flex-col items-center text-center"
                            >
                              <motion.div 
                                className={`relative h-10 w-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-300 ${
                                  isCompleted 
                                    ? 'bg-white border-white' 
                                    : isActive 
                                    ? 'bg-[#212121] border-white' 
                                    : 'bg-[#212121] border-[#3a3a3a]'
                                }`}
                                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-[#212121]" />
                                ) : (
                                  <StepIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#6b6b6b]'} ${isCurrent ? 'animate-pulse' : ''}`} />
                                )}
                                {isCurrent && (
                                  <motion.div 
                                    className="absolute inset-0 rounded-full border-2 border-white"
                                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                )}
                              </motion.div>
                              <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-white' : 'text-[#6b6b6b]'}`}>
                                {step.label}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#9b9b9b]">处理进度</span>
                        <span className="font-mono font-medium text-white">{Math.round(feedProgress)}%</span>
                      </div>
                      <div className="relative h-1.5 bg-[#3a3a3a] rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${feedProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {feedComplete && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                      <Button 
                        onClick={handleFeedComplete}
                        className="px-8 bg-[#2f2f2f] hover:bg-[#424242] text-white border border-[#3a3a3a]"
                      >
                        完成
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Bet Dialog - Professional Betting Style */}
      <Dialog open={showManualBetDialog} onOpenChange={(open) => {
        setShowManualBetDialog(open);
        if (!open) {
          setSelectedMatch(null);
          setManualPrediction('');
        }
      }}>
        <DialogContent className="sm:max-w-md w-[calc(100%-24px)] max-w-[360px] max-h-[80vh] p-0 gap-0 bg-background border-border rounded-xl overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-sm font-medium text-foreground">
              {selectedMatch ? '人工下注' : '选择比赛'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-60px)] overscroll-contain">
            {/* Step 1: Match Selection */}
            {!selectedMatch ? (
              <div className="p-3 space-y-2">
                {matchesToShow.length > 0 ? (
                  matchesToShow.map((match: any) => {
                    // Find the bet entry for this match to show bet info
                    const matchEntry = matchEntries?.find(entry => entry.match?.mid === match.mid);
                    const hasBets = matchEntry && matchEntry.bets && matchEntry.bets.length > 0;
                    
                    return (
                      <div
                        // 根据 SQL 迁移文件，优先使用 mid (番茄体育格式的比赛ID)
                        key={match.mid || match.match_id || match.fixture_id}
                        className="p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors border border-border hover:border-primary/30"
                        onClick={() => {
                          setSelectedMatch(match);
                          setManualPrediction('');
                        }}
                      >
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                            {safeGetTeamName(match, 'home')}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">vs</span>
                          <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                            {safeGetTeamName(match, 'away')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          {safeGetLeagueName(match)}
                        </p>
                        {hasBets && (
                          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-border/50">
                            <span className="text-[10px] text-muted-foreground">
                              AI已下注 · {matchEntry.bets.length}项
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('no_matches_available') || '暂无可用比赛'}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Betting Options - Simplified */
              <div className="p-4 space-y-3">
                {/* Match Header */}
                <div className="text-center pb-3 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">{safeGetLeagueName(selectedMatch)}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{safeGetTeamName(selectedMatch, 'home')}</span>
                    <span className="text-xs text-muted-foreground shrink-0">vs</span>
                    <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{safeGetTeamName(selectedMatch, 'away')}</span>
                  </div>
                </div>

                {/* Handicap Section - Use allMarketOdds from ai_match_analyses */}
                <div className="space-y-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">让分</span>
                  {(() => {
                    if (isLoadingMarketOdds) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          加载中...
                        </div>
                      );
                    }

                    // Use marketOdds from ai_match_analyses.bet_snapshot.allMarketOdds
                    if (!marketOdds?.handicap || marketOdds.handicap.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无让分赔率数据
                        </div>
                      );
                    }

                    // Display all handicap options from allMarketOdds
                    // Format line display - 确保正数前面显示 + 号
                    const formatLine = (line: number | string): string => {
                      if (typeof line === 'number') {
                        return line < 0 ? line.toString() : line > 0 ? `+${line}` : '0';
                      }
                      // 处理字符串格式的盘口（如 "-0/0.5", "0/0.5", "2.5/3"）
                      const lineStr = String(line);
                      // 如果已经是负数（以 "-" 开头），直接返回
                      if (lineStr.startsWith('-')) {
                        return lineStr;
                      }
                      // 如果是正数或0，确保前面有 + 号（除非是 "0"）
                      if (lineStr === '0' || lineStr === '0.0') {
                        return '0';
                      }
                      // 其他情况（正数），添加 + 号
                      return `+${lineStr}`;
                    };

                    // Display all handicap options - show first one by default, but allow selection
                    // For better UX, we'll show the first available handicap line
                    const firstHandicap = marketOdds.handicap[0];
                    // 解析让球盘：如果是字符串格式（如 "-0/0.5"），保持为字符串；如果是数字，转换为数字
                    const parseHandicapLine = (line: number | string): number | string => {
                      if (typeof line === 'number') {
                        return line;
                      }
                      // 尝试解析为数字，如果失败（如 "-0/0.5"），保持为字符串
                      const parsed = parseFloat(String(line));
                      return isNaN(parsed) ? line : parsed;
                    };
                    const handicapLine = parseHandicapLine(firstHandicap.line);
                    const homeOdds = firstHandicap.home;
                    const awayOdds = firstHandicap.away;

                    return (
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'handicap' && manualPrediction === 'HOME' && String(manualHandicapLine) === String(handicapLine)
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('handicap'); 
                            setManualPrediction('HOME'); 
                            setManualHandicapLine(handicapLine); 
                          }}
                          disabled={!homeOdds || homeOdds <= 0}
                        >
                          {manualBetType === 'handicap' && manualPrediction === 'HOME' && String(manualHandicapLine) === String(handicapLine) && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium truncate">{safeGetTeamName(selectedMatch, 'home')}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{formatLine(firstHandicap.line)}</span>
                          </div>
                          {/* 从 allMarketOdds 获取的赔率是欧洲盘，显示时减1转为亚洲盘 */}
                          {homeOdds && homeOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === handicapLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, homeOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'handicap' && manualPrediction === 'AWAY' && String(manualHandicapLine) === String(handicapLine)
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('handicap'); 
                            setManualPrediction('AWAY'); 
                            setManualHandicapLine(handicapLine); 
                          }}
                          disabled={!awayOdds || awayOdds <= 0}
                        >
                          {manualBetType === 'handicap' && manualPrediction === 'AWAY' && String(manualHandicapLine) === String(handicapLine) && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium truncate">{safeGetTeamName(selectedMatch, 'away')}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                              {(() => {
                                // 客队的让分盘是主队的相反数
                                const homeLine = firstHandicap.line;
                                if (typeof homeLine === 'number') {
                                  // 数字类型：直接取反
                                  return formatLine(-homeLine);
                                } else {
                                  // 字符串类型：处理正负号
                                  const homeLineStr = String(homeLine);
                                  if (homeLineStr.startsWith('-')) {
                                    // 主队是负数（如 "-0/0.5"），客队应该是正数（"+0/0.5"）
                                    return formatLine(homeLineStr.substring(1));
                                  } else {
                                    // 主队是正数或0（如 "0/0.5"），客队应该是负数（"-0/0.5"）
                                    return formatLine(`-${homeLineStr}`);
                                  }
                                }
                              })()}
                            </span>
                          </div>
                          {/* 从 allMarketOdds 获取的赔率是欧洲盘，显示时减1转为亚洲盘 */}
                          {awayOdds && awayOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === handicapLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, awayOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Over/Under Section - Use allMarketOdds from ai_match_analyses */}
                <div className="space-y-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">大小球</span>
                  {(() => {
                    if (isLoadingMarketOdds) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          加载中...
                        </div>
                      );
                    }

                    // Use marketOdds from ai_match_analyses.bet_snapshot.allMarketOdds
                    if (!marketOdds?.overUnder || marketOdds.overUnder.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无大小球赔率数据
                        </div>
                      );
                    }

                    // Display all over/under options from allMarketOdds
                    // Show the first available over/under line from allMarketOdds
                    const firstOverUnder = marketOdds.overUnder[0];
                    const overUnderLine = typeof firstOverUnder.line === 'number' ? firstOverUnder.line : parseFloat(String(firstOverUnder.line)) || 2.5;
                    // 从 allMarketOdds 获取赔率，显示时减1（欧洲盘转亚洲盘）
                    const overOdds = firstOverUnder.over;
                    const underOdds = firstOverUnder.under;

                    return (
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('over_under'); 
                            setManualOverUnderPick('over'); 
                            setManualOverUnderLine(overUnderLine); 
                          }}
                          disabled={!overOdds || overOdds <= 0}
                        >
                          {manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium">大球 {overUnderLine}</span>
                          {/* 从 allMarketOdds 获取的赔率是欧洲盘，显示时减1转为亚洲盘 */}
                          {overOdds && overOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, overOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('over_under'); 
                            setManualOverUnderPick('under'); 
                            setManualOverUnderLine(overUnderLine); 
                          }}
                          disabled={!underOdds || underOdds <= 0}
                        >
                          {manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium">小球 {overUnderLine}</span>
                          {/* 从 allMarketOdds 获取的赔率是欧洲盘，显示时减1转为亚洲盘 */}
                          {underOdds && underOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, underOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Bet Amount Input */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">投注猎人币</span>
                  <div className="flex items-center gap-1.5">
                    <img src={hunterCoinIcon} alt="" className="w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      type="number"
                      min={1}
                      max={maxBetAmount}
                      value={manualBetAmount === '' ? '' : manualBetAmount}
                      placeholder="输入金额"
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === '') {
                          setManualBetAmount('');
                          return;
                        }
                        const value = parseInt(inputValue);
                        if (isNaN(value)) {
                          return;
                        }
                        // Clamp value between 1 and maxBetAmount
                        const clampedValue = Math.max(1, Math.min(value, maxBetAmount));
                        setManualBetAmount(clampedValue);
                      }}
                      className="w-20 sm:w-24 h-8 sm:h-9 px-2 rounded bg-secondary/50 border border-border text-right text-sm font-mono focus:outline-none focus:border-primary transition-colors placeholder:text-xs placeholder:sm:text-sm placeholder:text-muted-foreground placeholder:font-sans"
                    />
                    {maxBetAmount > 0 && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        最多 {maxBetAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium"
                  onClick={handleManualBetSubmit}
                  disabled={isSubmittingBet || (manualBetType === 'handicap' && !manualPrediction)}
                >
                  {isSubmittingBet ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  确认预测{manualBetAmount !== '' ? ` · ${manualBetAmount}` : ''}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Animation Dialog - Simplified for mobile */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[200px] w-[160px] p-4 gap-0 bg-card/95 backdrop-blur-md border-border/50 text-center rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('bet_success') || '预测成功'}</DialogTitle>
          </DialogHeader>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center py-2"
          >
            {/* Success Icon */}
            <motion.div 
              className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 250 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 350 }}
              >
                <CheckCircle2 className="h-6 w-6 text-success" />
              </motion.div>
            </motion.div>
            
            {/* Success Text */}
            <motion.p 
              className="text-sm font-semibold"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {isDemo ? (t('demo_success') || '体验成功') : (t('success') || '成功')}
            </motion.p>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlayerExclusiveModelCard;
