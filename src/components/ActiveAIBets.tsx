import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect, useLayoutEffect, useRef, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { MatchAnalysisDialog, ModelAnalysis } from "@/components/MatchAnalysisDialog";
import PlayerExclusiveModelCard from "@/components/PlayerExclusiveModelCard";
import { useAuth } from "@/contexts/AuthContext";
import { PlaceBetDialog } from "./PlaceBetDialog";
import { toast } from "@/hooks/use-toast";
import TiltCard from "@/components/TiltCard";
import { getUTC8Timestamp, getUTC8TimestampMs } from "@/lib/utils";
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
  const [matchStatus, setMatchStatus] = useState<'not_started' | 'live' | 'half_time' | 'other' | 'postponed'>('not_started');
  
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
      const matchTime = currentMatch.match_time;
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
                       (currentMatch.goals_away !== null && currentMatch.goals_away !== undefined);
      
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
      }
      else if (liveStatusId === 9) {
        // 推迟
        setMatchStatus('postponed');
        setShowCountdown(false);
        setTimeDisplay(t('postponed') || '推迟');
        return;
      }else {
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
  }, [match.live_kickoff_time, match.live_status_id, match.match_time, match.status_id, match.goals_home, match.goals_away, t]);

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

// 根据 supabase/migrations/20250125000000_redesign_daily_matches_for_sportnanoapi.sql 定义
type DailyMatch = {
  // 基础字段
  mid: string; // match_id 的字符串形式
  date: string; // DATE 格式
  // mgt 为毫秒时间戳，必须提供（从 match_time 转换）
  mgt: number;
  
  // 比赛基本信息（来自 DiaryMatch）
  season_id?: number | null;
  competition_id?: number | null; // league_id 的别名
  league_id?: number | null; // competition_id 的别名，保持向后兼容
  home_team_id?: number | null;
  away_team_id?: number | null;
  status_id?: number | null; // 比赛状态ID
  match_time?: number | null; // 开球时间戳（秒）
  neutral?: number | null; // 是否中立场地
  note?: string | null; // 备注信息
  home_scores?: number[] | null; // 主队得分数组 [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]
  away_scores?: number[] | null; // 客队得分数组
  home_position?: string | null; // 主队排名
  away_position?: string | null; // 客队排名
  venue_id?: number | null; // 场地ID
  referee_id?: number | null; // 裁判ID
  related_id?: number | null; // 关联比赛ID
  agg_score?: number[] | null; // 总比分
  ended?: number | null; // 是否已结束 (1-已结束, 0-未结束)
  updated_at_api?: number | null; // API返回的更新时间戳
  
  // 覆盖信息（coverage）
  coverage_mlive?: number | null; // 是否有文字直播
  coverage_intelligence?: number | null; // 是否有情报
  coverage_lineup?: number | null; // 是否有阵容
  
  // 轮次信息（round）
  round_stage_id?: number | null;
  round_group_num?: number | null;
  round_round_num?: number | null;
  
  // 环境信息（environment）
  environment_weather?: number | null;
  environment_pressure?: string | null;
  environment_temperature?: string | null;
  environment_wind?: string | null;
  environment_humidity?: string | null;
  
  // 联赛信息（从 competition 关联）
  competition_name?: string | null; // 联赛名称
  competition_name_zh?: string | null; // 联赛中文名称
  league_name: string; // competition_name_zh 或 competition_name 的别名，保持向后兼容
  competition_logo?: string | null; // 联赛logo
  league_logo?: string | null; // competition_logo 的别名，保持向后兼容
  
  // 球队信息（从 team 关联）
  home_team_name?: string | null; // 主队名称
  home_team_name_zh?: string | null; // 主队中文名称
  away_team_name?: string | null; // 客队名称
  away_team_name_zh?: string | null; // 客队中文名称
  home_team_logo?: string | null; // 主队logo
  home_logo?: string | null; // home_team_logo 的别名，保持向后兼容
  away_team_logo?: string | null; // 客队logo
  away_logo?: string | null; // away_team_logo 的别名，保持向后兼容
  
  // 原始数据（JSONB格式，存储完整的API响应）
  raw?: any; // JSONB 格式
  
  // 赔率数据（从番茄体育API获取）
  odds_info?: any | null; // JSONB 格式，详细赔率信息
  odds_requested?: boolean | null; // 是否已请求过赔率信息
  
  // 前端计算/显示字段（不在数据库中）
  goals_home: number | null; // 从 home_scores[0] 提取
  goals_away: number | null; // 从 away_scores[0] 提取
  status_short: string; // 从 status_id 计算得出
  status_elapsed?: number | null; // 计算得出的比赛进行时间（分钟）
  cmec?: string | null; // 比赛状态枚举代码
  
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
  // 优先使用 liveData 中的 score_kickoff_time，如果没有则使用 match_time 作为备用
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
  // 如果 liveData 中没有 score_kickoff_time，使用 match_time 作为备用（用于排序）
  if (mgtValue === 0 && match.match_time) {
    const parsedMatchTime = typeof match.match_time === 'string' ? parseInt(match.match_time, 10) : match.match_time;
    if (!Number.isNaN(parsedMatchTime) && parsedMatchTime > 0) {
      // match_time 是秒级，转换为毫秒
      mgtValue = parsedMatchTime * 1000;
    }
  }
  
  // 只使用 liveData 中的实时比分
  const goalsHome = liveData?.score_home_scores?.[0] ?? null;
  const goalsAway = liveData?.score_away_scores?.[0] ?? null;
  
  // 只使用 liveData 中的状态
  // 如果有比分但状态为 null，推断状态为进行中（status_id = 2 表示上半场）
  let statusId = liveData?.score_status ?? null;
  if ((goalsHome !== null || goalsAway !== null) && statusId === null) {
    // 有比分但状态缺失，推断为进行中（默认上半场）
    statusId = 2;
    console.warn(`[normalizeDailyMatch] 比赛 ${match.match_id} 有比分但状态缺失，推断为进行中（status_id=2）`);
  }
  const statusShort = getStatusShort(statusId) || '';
  
  // 计算比赛进行时间（分钟）
  // 根据 status_id 判断是上半场还是下半场
  // status_id: 2 = 上半场, 3 = 中场休息, 4 = 下半场
  let statusElapsed: number | null = null;
  if (liveData?.score_kickoff_time && statusId) {
    // 比赛进行中（上半场或下半场）
    const now = getUTC8Timestamp(); // 当前时间戳（秒，UTC+8）
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

  // 保存 match_live_data 中的实时数据，供 MatchTimeDisplay 使用
  // 优先使用 liveData 中的 score_kickoff_time，如果没有则使用 match_time（秒级时间戳）作为备用
  let liveKickoffTime = liveData?.score_kickoff_time ?? null;
  if (!liveKickoffTime && match.match_time) {
    // 如果没有 live_kickoff_time，使用 match_time 作为备用（用于倒计时显示）
    liveKickoffTime = typeof match.match_time === 'string' ? parseInt(match.match_time, 10) : match.match_time;
  }

  return {
    // 基础字段
    mid,
    date: match.date,
    mgt: mgtValue,
    
    // 比赛基本信息
    season_id: match.season_id ?? null,
    competition_id: match.competition_id ?? null,
    league_id: match.competition_id ?? null, // 别名，保持向后兼容
    home_team_id: match.home_team_id ?? null,
    away_team_id: match.away_team_id ?? null,
    status_id: match.status_id ?? null,
    match_time: match.match_time ?? null,
    neutral: match.neutral ?? null,
    note: match.note ?? null,
    home_scores: match.home_scores ?? null,
    away_scores: match.away_scores ?? null,
    home_position: match.home_position ?? null,
    away_position: match.away_position ?? null,
    venue_id: match.venue_id ?? null,
    referee_id: match.referee_id ?? null,
    related_id: match.related_id ?? null,
    agg_score: match.agg_score ?? null,
    ended: match.ended ?? null,
    updated_at_api: match.updated_at_api ?? null,
    
    // 覆盖信息
    coverage_mlive: match.coverage_mlive ?? null,
    coverage_intelligence: match.coverage_intelligence ?? null,
    coverage_lineup: match.coverage_lineup ?? null,
    
    // 轮次信息
    round_stage_id: match.round_stage_id ?? null,
    round_group_num: match.round_group_num ?? null,
    round_round_num: match.round_round_num ?? null,
    
    // 环境信息
    environment_weather: match.environment_weather ?? null,
    environment_pressure: match.environment_pressure ?? null,
    environment_temperature: match.environment_temperature ?? null,
    environment_wind: match.environment_wind ?? null,
    environment_humidity: match.environment_humidity ?? null,
    
    // 联赛信息
    competition_name: match.competition_name ?? null,
    competition_name_zh: match.competition_name_zh ?? null,
    league_name: match.competition_name_zh ?? match.competition_name ?? '', // 别名，保持向后兼容
    competition_logo: match.competition_logo ?? null,
    league_logo: addLogoPrefix(match.competition_logo ?? null), // 别名，保持向后兼容
    
    // 球队信息
    home_team_name: match.home_team_name_zh ?? match.home_team_name ?? '',
    home_team_name_zh: match.home_team_name_zh ?? null,
    away_team_name: match.away_team_name_zh ?? match.away_team_name ?? '',
    away_team_name_zh: match.away_team_name_zh ?? null,
    home_team_logo: match.home_team_logo ?? null,
    home_logo: addLogoPrefix(match.home_team_logo ?? null), // 别名，保持向后兼容
    away_team_logo: match.away_team_logo ?? null,
    away_logo: addLogoPrefix(match.away_team_logo ?? null), // 别名，保持向后兼容
    
    // 原始数据和赔率
    raw: match.raw ?? null,
    odds_info: match.odds_info ?? null,
    odds_requested: match.odds_requested ?? null,
    
    // 前端计算/显示字段
    goals_home: goalsHome,
    goals_away: goalsAway,
    status_short: statusShort,
    status_elapsed: statusElapsed,
    cmec: cmec,
    
    // match_live_data 相关字段
    live_kickoff_time: liveKickoffTime,
    live_status_id: statusId, // 使用推断后的状态
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
  bet_snapshot?: any; // bet_snapshot 包含预测信息
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
  // Market odds from ai_match_analyses.bet_snapshot.allMarketOdds
  type MarketOdds = {
    overUnder?: Array<{ line: number | string; over: number; under: number }>;
    handicap?: Array<{ line: number | string; home: number; away: number }>;
  };
  const [marketOddsMap, setMarketOddsMap] = useState<Record<string, MarketOdds>>({});
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
        const yesterdayDate = new Date(getUTC8TimestampMs() - 24 * 60 * 60 * 1000);
        const yesterdayStr = getUTC8DateString(yesterdayDate);

        // Fetch yesterday's and today's matches (live or upcoming) - exclude completed madao'j
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
              const marketOddsMapNew: Record<string, MarketOdds> = {};
              
              analysesData.forEach((analysis: any) => {
                const key = `${analysis.match_id}_${analysis.ai_id}`;
                
                // Extract moneyline prediction
                if (analysis.bet_snapshot && analysis.bet_snapshot.moneyline) {
                  predictionsMap[key] = {
                    prediction: analysis.bet_snapshot.moneyline.prediction,
                    confidence: analysis.bet_snapshot.moneyline.confidence || 0,
                    odds: analysis.bet_snapshot.moneyline.odds || 1.9,
                  };
                }
                
                // Extract allMarketOdds for handicap and over/under
                if (analysis.bet_snapshot && analysis.bet_snapshot.allMarketOdds) {
                  marketOddsMapNew[key] = analysis.bet_snapshot.allMarketOdds;
                }
              });
              
              setMoneylinePredictions(predictionsMap);
              setMarketOddsMap(marketOddsMapNew);
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

      // 解析分析文本，提取结构化信息
      const parseAnalysisText = (content: string) => {
        const result = {
          ownerAnalysis: '',
          playerAnalysis: '',
          oddsAnalysis: '',
        };

        if (!content) return result;

        const lines = content.split('\n');
        let currentSection: 'owner' | 'player' | 'odds' | 'other' = 'other';
        let currentContent: string[] = [];

        // 预测行已经在 filterAnalysisText 中处理过了（转换为中文）
        // 这里只需要跳过预测行，不归类到任何章节
        const predictionPatterns = [
          /PREDICTION_OVER_UNDER:\s*(OVER|UNDER)\s+([\d.]+)\s+(\d+)/i,
          /PREDICTION_HANDICAP:\s*(HOME|AWAY)\s+([-\d.]+)\s+(\d+)/i,
          /PREDICTION_MONEYLINE:\s*(HOME_WIN|AWAY_WIN|DRAW)\s+(\d+)/i, // 也过滤掉 MONEYLINE
          /^预测(胜负|大小球|让球):/i, // 也匹配已转换的中文预测行
        ];

        // 直接使用所有行进行解析（预测行会在后面被跳过）
        const processedLines = lines;

        // 使用处理后的行继续解析结构化信息
        for (const line of processedLines) {
          const trimmed = line.trim();
          
          // 跳过预测行（预测行会在最后单独处理，不归类到任何章节）
          const isPredictionLine = /^预测(胜负|大小球|让球):/i.test(trimmed) || 
                                   predictionPatterns.some(pattern => pattern.test(trimmed));
          if (isPredictionLine) {
            continue; // 完全跳过预测行，不添加到任何章节
          }

          if (!trimmed) {
            // 保留空行，但只在有内容时才添加
            if (currentContent.length > 0) {
              currentContent.push('');
            }
            continue;
          }

          // 识别章节标题（支持多种格式：**标题**、# 标题、纯文本标题）
          // 球队老板层面分析
          const isOwnerSection = /^[*#]{1,3}\s*球队老板层面分析|^[*#]{1,3}\s*老板层面分析|^[*#]{1,3}\s*老板/i.test(trimmed) ||
                                 /^\*\*球队老板层面分析\*\*$/i.test(trimmed) ||
                                 trimmed === '球队老板层面分析' ||
                                 (trimmed.includes('老板') && trimmed.includes('层面') && trimmed.includes('分析') && trimmed.length < 30);
          
          // 球员技术面拆解
          const isPlayerSection = /^[*#]{1,3}\s*球员技术面拆解|^[*#]{1,3}\s*球员技术|^[*#]{1,3}\s*技术面/i.test(trimmed) ||
                                 /^\*\*球员技术面拆解\*\*$/i.test(trimmed) ||
                                 trimmed === '球员技术面拆解' ||
                                 (trimmed.includes('球员') && trimmed.includes('技术') && trimmed.includes('拆解') && trimmed.length < 30);
          
          // 异常赔率监测
          const isOddsSection = /^[*#]{1,3}\s*异常赔率监测|^[*#]{1,3}\s*赔率监测|^[*#]{1,3}\s*异常赔率/i.test(trimmed) ||
                               /^\*\*异常赔率监测\*\*$/i.test(trimmed) ||
                               trimmed === '异常赔率监测' ||
                               (trimmed.includes('赔率') && trimmed.includes('异常') && trimmed.includes('监测') && trimmed.length < 30);

          if (isOwnerSection) {
            // 保存当前章节内容
            if (currentContent.length > 0) {
              if (currentSection === 'owner') result.ownerAnalysis += currentContent.join('\n') + '\n';
              else if (currentSection === 'player') result.playerAnalysis += currentContent.join('\n') + '\n';
              else if (currentSection === 'odds') result.oddsAnalysis += currentContent.join('\n') + '\n';
            }
            // 切换到新章节
            currentSection = 'owner';
            currentContent = [];
            continue; // 跳过标题行本身
          }
          
          if (isPlayerSection) {
            // 保存当前章节内容
            if (currentContent.length > 0) {
              if (currentSection === 'owner') result.ownerAnalysis += currentContent.join('\n') + '\n';
              else if (currentSection === 'player') result.playerAnalysis += currentContent.join('\n') + '\n';
              else if (currentSection === 'odds') result.oddsAnalysis += currentContent.join('\n') + '\n';
            }
            // 切换到新章节
            currentSection = 'player';
            currentContent = [];
            continue; // 跳过标题行本身
          }
          
          if (isOddsSection) {
            // 保存当前章节内容
            if (currentContent.length > 0) {
              if (currentSection === 'owner') result.ownerAnalysis += currentContent.join('\n') + '\n';
              else if (currentSection === 'player') result.playerAnalysis += currentContent.join('\n') + '\n';
              else if (currentSection === 'odds') result.oddsAnalysis += currentContent.join('\n') + '\n';
            }
            // 切换到新章节
            currentSection = 'odds';
            currentContent = [];
            continue; // 跳过标题行本身
          }

          // 普通内容行，添加到当前章节
          currentContent.push(line);
        }

        // 处理最后一部分内容
        if (currentContent.length > 0) {
          if (currentSection === 'owner') result.ownerAnalysis += currentContent.join('\n');
          else if (currentSection === 'player') result.playerAnalysis += currentContent.join('\n');
          else if (currentSection === 'odds') result.oddsAnalysis += currentContent.join('\n');
        }

        // 清理空白内容
        result.ownerAnalysis = result.ownerAnalysis.trim();
        result.playerAnalysis = result.playerAnalysis.trim();
        result.oddsAnalysis = result.oddsAnalysis.trim();

        return result;
      };

      // 从 bet_snapshot 中提取最高置信度预测
      // 优先在 PREDICTION_OVER_UNDER 和 PREDICTION_HANDICAP 之间选择置信度更高的
      const extractHighestConfidencePrediction = (betSnapshot: any) => {
        if (!betSnapshot) return undefined;

        const predictions = [];
        
        // 优先提取 handicap 和 overUnder 预测（这两个字段中选择置信度高的）
        if (betSnapshot.handicap) {
          predictions.push({
            type: 'handicap',
            prediction: betSnapshot.handicap.prediction,
            confidence: betSnapshot.handicap.confidence || 0,
            odds: betSnapshot.handicap.odds,
            handicapLine: betSnapshot.handicap.line,
          });
        }
        if (betSnapshot.overUnder) {
          predictions.push({
            type: 'over_under',
            prediction: betSnapshot.overUnder.prediction,
            confidence: betSnapshot.overUnder.confidence || 0,
            odds: betSnapshot.overUnder.odds,
            overUnderLine: betSnapshot.overUnder.line,
            overUnderPick: betSnapshot.overUnder.prediction === 'OVER' ? 'over' : 'under',
          });
        }

        // 如果 handicap 和 overUnder 都不存在，才考虑 moneyline
        if (predictions.length === 0 && betSnapshot.moneyline) {
          predictions.push({
            type: 'moneyline',
            prediction: betSnapshot.moneyline.prediction,
            confidence: betSnapshot.moneyline.confidence || 0,
            odds: betSnapshot.moneyline.odds,
          });
        }

        // 找到置信度最高的预测
        if (predictions.length === 0) return undefined;
        const highest = predictions.reduce((max, pred) => 
          (pred.confidence > max.confidence) ? pred : max
        );

        return highest;
      };

      // 将预测行转换为中文
      const convertPredictionToChinese = (predictionLine: string): string => {
        const trimmed = predictionLine.trim();
        
        // PREDICTION_MONEYLINE: HOME_WIN 63
        const moneylineMatch = trimmed.match(/PREDICTION_MONEYLINE:\s*(HOME_WIN|AWAY_WIN|DRAW)\s+(\d+)/i);
        if (moneylineMatch) {
          const prediction = moneylineMatch[1];
          const confidence = moneylineMatch[2];
          const predictionZh = prediction === 'HOME_WIN' ? '主队胜' : 
                               prediction === 'AWAY_WIN' ? '客队胜' : '平局';
          return `预测胜负: ${predictionZh} ${confidence}%`;
        }
        
        // PREDICTION_OVER_UNDER: OVER 2.5 60
        const overUnderMatch = trimmed.match(/PREDICTION_OVER_UNDER:\s*(OVER|UNDER)\s+([\d.]+)\s+(\d+)/i);
        if (overUnderMatch) {
          const pick = overUnderMatch[1];
          const line = overUnderMatch[2];
          const confidence = overUnderMatch[3];
          const pickZh = pick === 'OVER' ? '大球' : '小球';
          return `预测大小球: ${pickZh} ${line} ${confidence}%`;
        }
        
        // PREDICTION_HANDICAP: HOME 0.5 65
        const handicapMatch = trimmed.match(/PREDICTION_HANDICAP:\s*(HOME|AWAY)\s+([-\d.]+)\s+(\d+)/i);
        if (handicapMatch) {
          const team = handicapMatch[1];
          const line = handicapMatch[2];
          const confidence = handicapMatch[3];
          const teamZh = team === 'HOME' ? '主队' : '客队';
          const lineStr = parseFloat(line) > 0 ? `+${line}` : line;
          return `预测让球: ${teamZh} ${lineStr} ${confidence}%`;
        }
        
        // 如果无法匹配，返回原行
        return predictionLine;
      };

      // 过滤分析文本，只保留置信度最高的预测行并转换为中文
      // 只在 PREDICTION_OVER_UNDER 和 PREDICTION_HANDICAP 之间选择置信度更高的
      // PREDICTION_MONEYLINE 会被过滤掉，不显示
      const filterAnalysisText = (content: string) => {
        if (!content) return content;

        const lines = content.split('\n');
        // 只处理 OVER_UNDER 和 HANDICAP 预测，不处理 MONEYLINE
        const predictionPatterns = [
          /PREDICTION_OVER_UNDER:\s*(OVER|UNDER)\s+([\d.]+)\s+(\d+)/i,
          /PREDICTION_HANDICAP:\s*(HOME|AWAY)\s+([-\d.]+)\s+(\d+)/i,
        ];
        // MONEYLINE 模式，用于识别和过滤（不加入 predictions）
        const moneylinePattern = /PREDICTION_MONEYLINE:\s*(HOME_WIN|AWAY_WIN|DRAW)\s+(\d+)/i;

        let predictions: Array<{ line: string; confidence: number; originalLine: string }> = [];
        const filteredLines: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          let isPredictionLine = false;

          // 先检查是否是 MONEYLINE（需要过滤掉）
          if (moneylinePattern.test(trimmed)) {
            isPredictionLine = true; // 标记为预测行，但不加入 predictions，直接跳过
          } else {
            // 检查是否是 OVER_UNDER 或 HANDICAP 预测
            for (const pattern of predictionPatterns) {
              const match = trimmed.match(pattern);
              if (match) {
                const confidence = parseInt(match[match.length - 1], 10);
                if (!isNaN(confidence)) {
                  predictions.push({
                    line: trimmed,
                    confidence,
                    originalLine: line,
                  });
                  isPredictionLine = true;
                  break;
                }
              }
            }
          }

          // 如果不是预测行，保留原行
          if (!isPredictionLine) {
            filteredLines.push(line);
          }
        }

        // 找到置信度最高的预测，转换为中文后添加到文本末尾
        if (predictions.length > 0) {
          const highestPrediction = predictions.reduce((max, pred) => 
            pred.confidence > max.confidence ? pred : max
          );
          // 将最高置信度的预测行转换为中文后添加到文本末尾
          const chinesePrediction = convertPredictionToChinese(highestPrediction.originalLine);
          // 在文本末尾添加预测行（如果文本不为空，先添加换行）
          if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim()) {
            filteredLines.push('');
          }
          filteredLines.push(chinesePrediction);
        }

        return filteredLines.join('\n');
      };

      // 转换分析数据格式
      const analyses: ModelAnalysis[] = (analysisData as unknown as MatchAnalysis[]).map((analysisItem) => {
        const originalAnalysisText = analysisItem.analysis_text || analysisItem.analysis || '';
        
        // 过滤分析文本，只保留置信度最高的预测行
        const filteredAnalysisText = filterAnalysisText(originalAnalysisText);
        
        // 解析分析文本，提取结构化信息（使用过滤后的文本）
        const structuredAnalysis = parseAnalysisText(filteredAnalysisText);
        
        // 从 bet_snapshot 中提取最高置信度预测
        const highestConfidencePrediction = extractHighestConfidencePrediction(
          analysisItem.bet_snapshot
        );
        
        return {
          id: analysisItem.provider_model_id || analysisItem.ai_id || 'unknown',
          displayName: aiModel.displayName,
          model: analysisItem.provider_model_id || analysisItem.model_identifier || 'unknown',
          analysis: filteredAnalysisText, // 使用过滤后的文本
          structuredAnalysis: structuredAnalysis.ownerAnalysis || structuredAnalysis.playerAnalysis || structuredAnalysis.oddsAnalysis
            ? structuredAnalysis
            : undefined,
          highestConfidencePrediction,
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
  // Only show matches that have odds_info (赔率信息)
  const matchesWithBets = matches.filter(match => 
    betMatchIds.has(match.mid) && match.odds_info !== null && match.odds_info !== undefined
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
              
              // 过滤掉没有赔率信息的比赛
              if (!match.odds_info || match.odds_info === null || match.odds_info === undefined) {
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
  
  // 直接显示 AI 模型卡片，即使数据还在加载中
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
            // 只处理有赔率信息的比赛
            if (!match.odds_info || match.odds_info === null || match.odds_info === undefined) {
              return;
            }
            
            const matchBets = autoBets
              .filter(b => b.match_id?.toString() === match.mid && b.ai_id === aiModel.id)
              .map(bet => convertBet(bet, match));
            
            if (matchBets.length > 0) {
              betsByMatch.set(match.mid, { match, bets: matchBets });
            }
          });

          // Get current match index for this AI (default to 0)
          const matchIndex = currentMatchIndex[aiModel.id] || 0;
          
          // 优先联赛列表（按优先级排序）
          const top5Leagues = [
            '英格兰超级联赛',
            '德国甲级联赛',
            '西班牙甲级联赛',
            '意大利甲级联赛',
            '法国甲级联赛',
            '荷兰甲级联赛',
            '葡萄牙超级联赛',
            '西班牙乙级联赛',
            '意大利乙级联赛',
            '土耳其超级联赛',
            '德国乙级联赛',
          ];
          
          // 获取联赛优先级（数字越小优先级越高）
          const getLeaguePriority = (leagueName: string | null | undefined): number => {
            if (!leagueName) return 999; // 没有联赛信息的排在最后
            const index = top5Leagues.indexOf(leagueName);
            return index === -1 ? 100 : index; // 优先联赛返回0-10，其他联赛返回100
          };
          
          // Sort matchEntries with priority:
          // 1. Started matches (live) first, then upcoming matches
          // 2. Within same time group, sort by kickoff time (earlier first)
          // 3. For matches at the same time, prioritize top leagues
          const now = getUTC8TimestampMs(); // UTC+8 时间戳（毫秒）
          const matchEntries = Array.from(betsByMatch.values())
            .filter(entry => {
              // 过滤掉已结束的比赛
              const match = entry.match;
              const ended = match.ended;
              const endedValue = ended !== null && ended !== undefined
                ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
                : 0;
              const statusId = match.status_id !== null && match.status_id !== undefined
                ? (typeof match.status_id === 'string' ? parseInt(match.status_id, 10) : Number(match.status_id))
                : null;
              
              // 排除已结束的比赛
              if (!isNaN(endedValue) && endedValue > 0) return false;
              if (!isNaN(statusId) && (statusId === 8 || statusId === 11)) return false;
              
              return true;
            })
            .sort((a, b) => {
              // 获取有效的开球时间：优先使用 mgt（毫秒），如果没有则使用 match_time（秒级转毫秒）
              const aKickoff = a.match.mgt && a.match.mgt > 0 
                ? a.match.mgt 
                : (a.match.match_time ? (typeof a.match.match_time === 'string' ? parseInt(a.match.match_time, 10) * 1000 : a.match.match_time * 1000) : 0);
              const bKickoff = b.match.mgt && b.match.mgt > 0 
                ? b.match.mgt 
                : (b.match.match_time ? (typeof b.match.match_time === 'string' ? parseInt(b.match.match_time, 10) * 1000 : b.match.match_time * 1000) : 0);
              
              const aStarted = aKickoff > 0 && now > aKickoff; // 比赛已开始
              const bStarted = bKickoff > 0 && now > bKickoff; // 比赛已开始
              
              // 1. 已开始的比赛优先显示
              if (aStarted && !bStarted) return -1;
              if (!aStarted && bStarted) return 1;
              
              // 2. 在同一组（都已开始或都未开始）内，按开球时间排序（早的在前）
              if (aKickoff === 0 && bKickoff === 0) {
                // 两者都无效，按联赛优先级排序
                const aLeaguePriority = getLeaguePriority(a.match.league_name);
                const bLeaguePriority = getLeaguePriority(b.match.league_name);
                return aLeaguePriority - bLeaguePriority;
              }
              if (aKickoff === 0) return 1; // a 无效，排在后面
              if (bKickoff === 0) return -1; // b 无效，排在后面
              
              if (aKickoff !== bKickoff) {
                return aKickoff - bKickoff; // 早的在前
              }
              
              // 3. 对于相同时间的比赛，优先显示五大联赛
              const aLeaguePriority = getLeaguePriority(a.match.league_name);
              const bLeaguePriority = getLeaguePriority(b.match.league_name);
              return aLeaguePriority - bLeaguePriority; // 优先级数字小的在前（五大联赛）
            })
            .slice(0, 5); // 限制最多显示5场比赛
          
          // 如果当前索引超出范围，重置为0
          const validMatchIndex = matchIndex >= matchEntries.length ? 0 : matchIndex;
          if (validMatchIndex !== matchIndex) {
            setCurrentMatchIndex(prev => ({ ...prev, [aiModel.id]: 0 }));
          }
          
          const currentMatchData = matchEntries.length > 0 ? matchEntries[validMatchIndex] : null;
          
          // Separate bets by type: moneyline (胜负), handicap (让球), and over_under (大小球)
          let moneylineBet = currentMatchData?.bets.find(b => b.betType === 'moneyline') || null;
          let handicapBet = currentMatchData?.bets.find(b => b.betType === 'handicap') || null;
          let overUnderBet = currentMatchData?.bets.find(b => b.betType === 'over_under') || null;
          
          // Get market odds from ai_match_analyses.bet_snapshot.allMarketOdds
          const predictionKey = currentMatchData?.match ? `${currentMatchData.match.mid}_${aiModel.id}` : '';
          const marketOdds = predictionKey ? marketOddsMap[predictionKey] : null;
          
          // 如果没有 moneylineBet，从 moneylinePredictions 状态中获取输赢预测
          if (!moneylineBet && currentMatchData && currentMatchData.match) {
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
          
          // 如果让分投注存在，使用 allMarketOdds 中的赔率数据
          if (handicapBet && marketOdds?.handicap && marketOdds.handicap.length > 0) {
            const handicapLine = handicapBet.handicapLine;
            
            // 精确匹配：先尝试字符串完全匹配，再尝试数字匹配
            let matchingHandicap = marketOdds.handicap.find(h => {
              // 如果 line 是字符串，直接比较字符串
              if (typeof h.line === 'string' && typeof handicapLine === 'number') {
                // 将数字转换为字符串进行比较（例如 -2 转换为 "-2"）
                return h.line === String(handicapLine);
              }
              // 如果都是数字，直接比较
              if (typeof h.line === 'number' && typeof handicapLine === 'number') {
                return Math.abs(h.line - handicapLine) < 0.01;
              }
              // 如果都是字符串，直接比较
              if (typeof h.line === 'string' && typeof handicapLine === 'string') {
                return h.line === handicapLine;
              }
              return false;
            });
            
            // 如果精确匹配失败，尝试数字匹配（兼容旧数据）
            if (!matchingHandicap && typeof handicapLine === 'number') {
              matchingHandicap = marketOdds.handicap.find(h => {
                const hLine = typeof h.line === 'number' ? h.line : parseFloat(String(h.line)) || 0;
                // 只有当解析后的值完全相等时才匹配（避免 '-2/2.5' 被误匹配为 -2）
                return !isNaN(hLine) && Math.abs(hLine - handicapLine) < 0.01 && 
                       (typeof h.line === 'number' || String(h.line) === String(handicapLine));
              });
            }
            
            if (matchingHandicap) {
              // 根据预测方向选择对应的赔率
              const isHome = handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME";
              const matchedOdds = isHome ? matchingHandicap.home : matchingHandicap.away;
              if (matchedOdds && matchedOdds > 0) {
                handicapBet = {
                  ...handicapBet,
                  odds: matchedOdds,
                };
              }
            }
          }
          
          // 如果大小球投注存在，使用 allMarketOdds 中的赔率数据
          if (overUnderBet && marketOdds?.overUnder && marketOdds.overUnder.length > 0) {
            const overUnderLine = overUnderBet.overUnderLine;
            
            // 精确匹配：先尝试字符串完全匹配，再尝试数字匹配
            let matchingOverUnder = marketOdds.overUnder.find(ou => {
              // 如果 line 是字符串，直接比较字符串
              if (typeof ou.line === 'string' && typeof overUnderLine === 'number') {
                // 将数字转换为字符串进行比较（例如 2.5 转换为 "2.5"）
                return ou.line === String(overUnderLine);
              }
              // 如果都是数字，直接比较
              if (typeof ou.line === 'number' && typeof overUnderLine === 'number') {
                return Math.abs(ou.line - overUnderLine) < 0.01;
              }
              // 如果都是字符串，直接比较
              if (typeof ou.line === 'string' && typeof overUnderLine === 'string') {
                return ou.line === overUnderLine;
              }
              return false;
            });
            
            // 如果精确匹配失败，尝试数字匹配（兼容旧数据）
            if (!matchingOverUnder && typeof overUnderLine === 'number') {
              matchingOverUnder = marketOdds.overUnder.find(ou => {
                const ouLine = typeof ou.line === 'number' ? ou.line : parseFloat(String(ou.line)) || 0;
                // 只有当解析后的值完全相等时才匹配（避免 '2.5/3' 被误匹配为 2.5）
                return !isNaN(ouLine) && Math.abs(ouLine - overUnderLine) < 0.01 && 
                       (typeof ou.line === 'number' || String(ou.line) === String(overUnderLine));
              });
            }
            
            if (matchingOverUnder) {
              // 根据预测方向选择对应的赔率
              const isOver = overUnderBet.overUnderPick === "over";
              const matchedOdds = isOver ? matchingOverUnder.over : matchingOverUnder.under;
              if (matchedOdds && matchedOdds > 0) {
                overUnderBet = {
                  ...overUnderBet,
                  odds: matchedOdds,
                };
              }
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
                        <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 truncate">{getTeamName(currentMatchData!.match, 'home')}</span>
                        {handicapBet.handicapLine !== undefined && (() => {
                          // 确保正确处理字符串和数字类型
                          const handicapLineNum = typeof handicapBet.handicapLine === 'string' 
                            ? parseFloat(handicapBet.handicapLine) 
                            : handicapBet.handicapLine;
                          const homeHandicapLine = isNaN(handicapLineNum) ? 0 : handicapLineNum;
                          return (
                            <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
                              handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME" ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {homeHandicapLine > 0 ? '+' : ''}
                              {homeHandicapLine}
                            </span>
                          );
                        })()}
                      </div>
                      <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                        handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY"
                          ? "bg-primary/20 border-primary/60" 
                          : "bg-white/5 border-white/10 opacity-60"
                      }`}>
                        <span className="text-[8px] sm:text-[10px] font-semibold flex-1 min-w-0 truncate">{getTeamName(currentMatchData!.match, 'away')}</span>
                        {handicapBet.handicapLine !== undefined && (() => {
                          // 确保正确计算客队的让球值（主队让球值的相反数）
                          const handicapLineNum = typeof handicapBet.handicapLine === 'string' 
                            ? parseFloat(handicapBet.handicapLine) 
                            : handicapBet.handicapLine;
                          const awayHandicapLine = isNaN(handicapLineNum) ? 0 : -handicapLineNum;
                          return (
                            <span className={`text-[8px] sm:text-[10px] font-mono font-bold shrink-0 ${
                              handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY" ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {awayHandicapLine > 0 ? '+' : ''}
                              {awayHandicapLine}
                            </span>
                          );
                        })()}
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
            // 只处理有赔率信息的比赛
            if (!match.odds_info || match.odds_info === null || match.odds_info === undefined) {
              return;
            }
            
            const matchBets = autoBets
              .filter(b => b.match_id?.toString() === match.mid && b.ai_id === 'hunsoccermax')
              .map(bet => convertBet(bet, match));
            
            if (matchBets.length > 0) {
              betsByMatch.set(match.mid, { match, bets: matchBets });
            }
          });

          // Get current match index for hunsoccermax
          const matchIndex = currentMatchIndex['hunsoccermax'] || 0;
          
          // 优先联赛列表（按优先级排序）
          const top5Leagues = [
            '英格兰超级联赛',
            '德国甲级联赛',
            '西班牙甲级联赛',
            '意大利甲级联赛',
            '法国甲级联赛',
            '荷兰甲级联赛',
            '葡萄牙超级联赛',
            '西班牙乙级联赛',
            '意大利乙级联赛',
            '土耳其超级联赛',
            '德国乙级联赛',
          ];
          
          // 获取联赛优先级（数字越小优先级越高）
          const getLeaguePriority = (leagueName: string | null | undefined): number => {
            if (!leagueName) return 999; // 没有联赛信息的排在最后
            const index = top5Leagues.indexOf(leagueName);
            return index === -1 ? 100 : index; // 优先联赛返回0-10，其他联赛返回100
          };
          
          // Sort matchEntries with priority:
          // 1. Started matches (live) first, then upcoming matches
          // 2. Within same time group, sort by kickoff time (earlier first)
          // 3. For matches at the same time, prioritize top leagues
          const now = getUTC8TimestampMs(); // UTC+8 时间戳（毫秒）
          const matchEntries = Array.from(betsByMatch.values())
            .filter(entry => {
              // 过滤掉已结束的比赛
              const match = entry.match;
              const ended = match.ended;
              const endedValue = ended !== null && ended !== undefined
                ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
                : 0;
              const statusId = match.status_id !== null && match.status_id !== undefined
                ? (typeof match.status_id === 'string' ? parseInt(match.status_id, 10) : Number(match.status_id))
                : null;
              
              // 排除已结束的比赛
              if (!isNaN(endedValue) && endedValue > 0) return false;
              if (!isNaN(statusId) && (statusId === 8 || statusId === 11)) return false;
              
              return true;
            })
            .sort((a, b) => {
              // 获取有效的开球时间：优先使用 mgt（毫秒），如果没有则使用 match_time（秒级转毫秒）
              const aKickoff = a.match.mgt && a.match.mgt > 0 
                ? a.match.mgt 
                : (a.match.match_time ? (typeof a.match.match_time === 'string' ? parseInt(a.match.match_time, 10) * 1000 : a.match.match_time * 1000) : 0);
              const bKickoff = b.match.mgt && b.match.mgt > 0 
                ? b.match.mgt 
                : (b.match.match_time ? (typeof b.match.match_time === 'string' ? parseInt(b.match.match_time, 10) * 1000 : b.match.match_time * 1000) : 0);
              
              const aStarted = aKickoff > 0 && now > aKickoff; // 比赛已开始
              const bStarted = bKickoff > 0 && now > bKickoff; // 比赛已开始
              
              // 1. 已开始的比赛优先显示
              if (aStarted && !bStarted) return -1;
              if (!aStarted && bStarted) return 1;
              
              // 2. 在同一组（都已开始或都未开始）内，按开球时间排序（早的在前）
              if (aKickoff === 0 && bKickoff === 0) {
                // 两者都无效，按联赛优先级排序
                const aLeaguePriority = getLeaguePriority(a.match.league_name);
                const bLeaguePriority = getLeaguePriority(b.match.league_name);
                return aLeaguePriority - bLeaguePriority;
              }
              if (aKickoff === 0) return 1; // a 无效，排在后面
              if (bKickoff === 0) return -1; // b 无效，排在后面
              
              if (aKickoff !== bKickoff) {
                return aKickoff - bKickoff; // 早的在前
              }
              
              // 3. 对于相同时间的比赛，优先显示五大联赛
              const aLeaguePriority = getLeaguePriority(a.match.league_name);
              const bLeaguePriority = getLeaguePriority(b.match.league_name);
              return aLeaguePriority - bLeaguePriority; // 优先级数字小的在前（五大联赛）
            })
            .slice(0, 5); // 限制最多显示5场比赛
          
          // 如果当前索引超出范围，重置为0
          const validMatchIndex = matchIndex >= matchEntries.length ? 0 : matchIndex;
          if (validMatchIndex !== matchIndex) {
            setCurrentMatchIndex(prev => ({ ...prev, ['hunsoccermax']: 0 }));
          }
          
          const currentMatchData = matchEntries.length > 0 ? matchEntries[validMatchIndex] : null;
          
          // Separate bets by type
          let moneylineBet = currentMatchData?.bets.find(b => b.betType === 'moneyline') || null;
          let handicapBet = currentMatchData?.bets.find(b => b.betType === 'handicap') || null;
          let overUnderBet = currentMatchData?.bets.find(b => b.betType === 'over_under') || null;
          
          // Get market odds from ai_match_analyses.bet_snapshot.allMarketOdds
          const predictionKey = currentMatchData?.match ? `${currentMatchData.match.mid}_hunsoccermax` : '';
          const marketOdds = predictionKey ? marketOddsMap[predictionKey] : null;
          
          // 如果让分投注存在，使用 allMarketOdds 中的赔率数据
          if (handicapBet && marketOdds?.handicap && marketOdds.handicap.length > 0) {
            const handicapLine = handicapBet.handicapLine;
            
            // 精确匹配：先尝试字符串完全匹配，再尝试数字匹配
            let matchingHandicap = marketOdds.handicap.find(h => {
              // 如果 line 是字符串，直接比较字符串
              if (typeof h.line === 'string' && typeof handicapLine === 'number') {
                // 将数字转换为字符串进行比较（例如 -2 转换为 "-2"）
                return h.line === String(handicapLine);
              }
              // 如果都是数字，直接比较
              if (typeof h.line === 'number' && typeof handicapLine === 'number') {
                return Math.abs(h.line - handicapLine) < 0.01;
              }
              // 如果都是字符串，直接比较
              if (typeof h.line === 'string' && typeof handicapLine === 'string') {
                return h.line === handicapLine;
              }
              return false;
            });
            
            // 如果精确匹配失败，尝试数字匹配（兼容旧数据）
            if (!matchingHandicap && typeof handicapLine === 'number') {
              matchingHandicap = marketOdds.handicap.find(h => {
                const hLine = typeof h.line === 'number' ? h.line : parseFloat(String(h.line)) || 0;
                // 只有当解析后的值完全相等时才匹配（避免 '-2/2.5' 被误匹配为 -2）
                return !isNaN(hLine) && Math.abs(hLine - handicapLine) < 0.01 && 
                       (typeof h.line === 'number' || String(h.line) === String(handicapLine));
              });
            }
            
            if (matchingHandicap) {
              // 根据预测方向选择对应的赔率
              const isHome = handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME";
              const matchedOdds = isHome ? matchingHandicap.home : matchingHandicap.away;
              if (matchedOdds && matchedOdds > 0) {
                handicapBet = {
                  ...handicapBet,
                  odds: matchedOdds,
                };
              }
            }
          }
          
          // 如果大小球投注存在，使用 allMarketOdds 中的赔率数据
          if (overUnderBet && marketOdds?.overUnder && marketOdds.overUnder.length > 0) {
            const overUnderLine = overUnderBet.overUnderLine;
            
            // 精确匹配：先尝试字符串完全匹配，再尝试数字匹配
            let matchingOverUnder = marketOdds.overUnder.find(ou => {
              // 如果 line 是字符串，直接比较字符串
              if (typeof ou.line === 'string' && typeof overUnderLine === 'number') {
                // 将数字转换为字符串进行比较（例如 2.5 转换为 "2.5"）
                return ou.line === String(overUnderLine);
              }
              // 如果都是数字，直接比较
              if (typeof ou.line === 'number' && typeof overUnderLine === 'number') {
                return Math.abs(ou.line - overUnderLine) < 0.01;
              }
              // 如果都是字符串，直接比较
              if (typeof ou.line === 'string' && typeof overUnderLine === 'string') {
                return ou.line === overUnderLine;
              }
              return false;
            });
            
            // 如果精确匹配失败，尝试数字匹配（兼容旧数据）
            if (!matchingOverUnder && typeof overUnderLine === 'number') {
              matchingOverUnder = marketOdds.overUnder.find(ou => {
                const ouLine = typeof ou.line === 'number' ? ou.line : parseFloat(String(ou.line)) || 0;
                // 只有当解析后的值完全相等时才匹配（避免 '2.5/3' 被误匹配为 2.5）
                return !isNaN(ouLine) && Math.abs(ouLine - overUnderLine) < 0.01 && 
                       (typeof ou.line === 'number' || String(ou.line) === String(overUnderLine));
              });
            }
            
            if (matchingOverUnder) {
              // 根据预测方向选择对应的赔率
              const isOver = overUnderBet.overUnderPick === "over";
              const matchedOdds = isOver ? matchingOverUnder.over : matchingOverUnder.under;
              if (matchedOdds && matchedOdds > 0) {
                overUnderBet = {
                  ...overUnderBet,
                  odds: matchedOdds,
                };
              }
            }
          }
          
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
