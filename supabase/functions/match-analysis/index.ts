import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const ANALYSIS_TABLE = "ai_match_analyses";
const AUTO_BET_TABLE = "ai_auto_bets";
const AI_BALANCES_TABLE = "ai_balances";
const SIM_POSITIONS_TABLE = "sim_positions";
const DAILY_MATCHES_TABLE = "daily_matches";

// AI 虚拟资金初始值
const INITIAL_AI_BALANCE = 10000;

type ModelConfig = {
  id: string;
  displayName: string;
  model: string;
};

type MatchInfo = {
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
};

type BetInfo = {
  betType: string;
  prediction: string;
  confidence: number;
  odds: number;
  betAmount: number;
  handicapLine?: number;
  overUnderLine?: number;
  overUnderPick?: string;
};

type AllPredictions = {
  moneyline?: {
    prediction: string;
    confidence: number;
    odds?: number;
  };
  overUnder?: {
    prediction: string;
    line: number;
    confidence: number;
    odds?: number;
  };
  handicap?: {
    prediction: string;
    line: number;
    confidence: number;
    odds?: number;
  };
  primaryBet?: BetInfo; // 主要投注（用于下注决策）
};

type StrategyConfig = {
  minConfidence?: number;
  baseStake?: number;
  stakeMultiplier?: number;
  maxStake?: number;
  forceBet?: boolean;
  balanceId?: string;
};

type AiBetRequest = {
  aiId?: string;
  aiDisplayName?: string;
  betInfo: BetInfo;
  strategy?: StrategyConfig;
  autoBet?: boolean;
};

type MatchRequest = {
  matchId?: number;
  matchInfo: MatchInfo;
  aiBets: AiBetRequest[];
};

type RequestBody = {
  matches?: MatchRequest[];
  strategy?: StrategyConfig;
  autoBet?: boolean;
  matchId?: number;
  matchInfo?: MatchInfo;
  betInfo?: BetInfo;
  aiModel?: string;
  aiId?: string;
};

type ModelAnalysisResult = ModelConfig & {
  analysis?: string;
  error?: string;
  latencyMs?: number;
};

type StoredAnalysisResult = {
  id: number | null;
  modelId: string;
};

type AutoBetResult = {
  placed: boolean;
  reason?: string;
  recordId?: number;
  stake?: number;
  positionId?: number | null;
};

type BalanceRecord = {
  id: number;
  ai_id: string | null;
  available_balance: number;
  locked_balance: number;
  currency: string;
  updated_at: string;
  last_position_id?: number | null;
};

type PositionRecord = {
  id: number;
};

const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "deepseek",
    displayName: "DeepSeek Terminus",
    model: "deepseek/deepseek-v3.1-terminus",
  },
  { id: "gpt5", displayName: "OpenAI GPT-5", model: "openai/gpt-5" },
  {
    id: "claude",
    displayName: "Claude 4.5 Sonnet",
    model: "anthropic/claude-sonnet-4.5",
  },
  { id: "grok", displayName: "xAI Grok 4", model: "x-ai/grok-4" },
  {
    id: "gemini",
    displayName: "Gemini 2.5 Pro",
    model: "google/gemini-2.5-pro",
  },
  {
    id: "hunsoccermax",
    displayName: "HUNSOCCER MAX",
    model: "qwen/qwen3-235b-a22b-2507", // 使用 DeepSeek 作为基础模型，或根据实际情况配置
  },
];

const buildSystemPrompt = (userTrainingData?: string[]) => {
  let prompt = `你是一位专业的足球赛事分析专家。请从以下三个维度进行深度分析：

1. **球队老板层面分析**：分析球队投资、战略布局、近期管理层动态
2. **球员技术面拆解**：分析关键球员状态、战术体系、阵容配置
3. **异常赔率监测**：分析赔率波动、市场热度、投注趋势

最后给出综合判断和投注建议。请用专业、简洁的语言，重点突出关键信息。`;

  // 如果有用户训练数据，注入到系统提示词中
  if (userTrainingData && userTrainingData.length > 0) {
    prompt += `\n\n**重要：您的专属分析偏好与知识库**\n`;
    prompt += `以下是从您之前的训练数据中提取的关键观点和分析偏好，请在分析时重点参考这些内容：\n\n`;
    userTrainingData.forEach((data, index) => {
      prompt += `${index + 1}. ${data}\n`;
    });
    prompt += `\n请结合以上您的专属知识，给出更符合您分析风格的预测。`;
  }

  return prompt;
};

type MarketOdds = {
  overUnder?: Array<{ line: number; over: number; under: number }>;
  handicap?: Array<{ line: number | string; home: number; away: number }>; // line 可以是数字或字符串（如 "-1/1.5"）
};

// 赔率范围限制：只选择 1.65 - 2.3 范围内的赔率
const MIN_ODDS = 1.65;
const MAX_ODDS = 2.3;

// 检查赔率是否在有效范围内
const isOddsInRange = (odds: number): boolean => {
  return odds >= MIN_ODDS && odds <= MAX_ODDS;
};

const buildUserPrompt = (
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  aiModel: string,
  isDefaultBetInfo: boolean = false,
  marketOdds?: MarketOdds,
) => {
  const basePrompt = `请分析以下比赛：

**比赛信息**
- 联赛：${matchInfo.league}
- 主队：${matchInfo.homeTeam}
- 客队：${matchInfo.awayTeam}
- 当前比分：${matchInfo.homeScore ?? 0} - ${matchInfo.awayScore ?? 0}
- 比赛状态：${matchInfo.status === "live" ? "进行中" : "即将开始"}`;

  // 构建赔率信息部分
  let oddsInfo = '';
  if (marketOdds) {
    oddsInfo = '\n\n**市场赔率信息**\n';
    
    if (marketOdds.overUnder && marketOdds.overUnder.length > 0) {
      oddsInfo += '\n大小球赔率：\n';
      marketOdds.overUnder.forEach(ou => {
        oddsInfo += `- ${ou.line}球：大球 ${ou.over.toFixed(2)} | 小球 ${ou.under.toFixed(2)}\n`;
      });
    }
    
    if (marketOdds.handicap && marketOdds.handicap.length > 0) {
      oddsInfo += '\n让球盘赔率：\n';
      marketOdds.handicap.forEach(h => {
        // line 可能是数字或字符串（如 "-1/1.5"），直接转换为字符串显示
        let lineStr: string;
        if (typeof h.line === 'number') {
          lineStr = h.line > 0 ? `+${h.line}` : h.line.toString();
        } else {
          lineStr = String(h.line);
        }
        oddsInfo += `- ${lineStr}：主队 ${h.home.toFixed(2)} | 客队 ${h.away.toFixed(2)}\n`;
      });
    }
  }

  if (isDefaultBetInfo) {
    return `${basePrompt}${oddsInfo}

请从老板层面、技术层面、赔率层面进行全面分析，并给出最终投注建议。

IMPORTANT: 在分析的最后，请提供你的预测，格式如下（必须同时提供输赢、大小球和让球盘预测）：

1. 输赢预测：
PREDICTION_MONEYLINE: [HOME_WIN/AWAY_WIN/DRAW] [confidence 0-100]

2. 大小球预测：
PREDICTION_OVER_UNDER: [OVER/UNDER] [line 2.5/3.0/3.5等] [confidence 0-100]
注意：请从上面提供的市场赔率中选择合适的 line 值，确保该 line 在市场赔率中存在。

3. 让球盘预测：
PREDICTION_HANDICAP: [HOME/AWAY] [line -1.5/-0.5/0.5/1.5等] [confidence 0-100]
注意：请从上面提供的市场赔率中选择合适的 line 值，确保该 line 在市场赔率中存在。

例如：
PREDICTION_MONEYLINE: HOME_WIN 75
PREDICTION_OVER_UNDER: OVER 2.5 68
PREDICTION_HANDICAP: HOME 0.5 72

或
PREDICTION_MONEYLINE: AWAY_WIN 70
PREDICTION_OVER_UNDER: UNDER 3.0 72
PREDICTION_HANDICAP: AWAY -0.5 65

注意：
- 如果对某个投注类型没有信心（置信度低于50），可以不提供该预测
- 输赢预测：HOME_WIN 表示主队获胜，AWAY_WIN 表示客队获胜，DRAW 表示平局
- 大小球的 line 值必须从上面提供的市场赔率中选择
- 让球盘的 line 值必须从上面提供的市场赔率中选择
- HOME 表示主队让球，AWAY 表示客队让球`;
  }

  return `${basePrompt}

**AI模型预测**
- AI模型：${aiModel}
- 投注类型：${betInfo.betType === "handicap" ? "让球盘" : betInfo.betType === "over_under" ? "大小球" : "独赢"}
- 预测：${betInfo.prediction}
- 置信度：${betInfo.confidence}%
- 赔率：${betInfo.odds}
- 投注金额：${betInfo.betAmount}

请从老板层面、技术层面、赔率层面进行全面分析，并给出最终投注建议。`;
};

const DEFAULT_STRATEGY: Required<Pick<StrategyConfig, "minConfidence" | "baseStake">> &
  StrategyConfig = {
    minConfidence: 60,
    baseStake: 800,
    stakeMultiplier: 1.2,
    maxStake: 5000,
    forceBet: false,
  };

const resolveStrategy = (
  globalStrategy?: StrategyConfig,
  aiStrategy?: StrategyConfig,
): StrategyConfig => ({
  ...DEFAULT_STRATEGY,
  ...globalStrategy,
  ...aiStrategy,
});

// 获取当天的比赛
// 获取 UTC+8 时区的日期字符串（YYYY-MM-DD）
const getUTC8DateString = (date: Date): string => {
  // 使用 Intl.DateTimeFormat 获取 UTC+8 时区的日期
  // 格式化为 YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', // UTC+8 时区
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

const getTodayMatches = async () => {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  // 获取今天和昨天的日期（使用 UTC+8 时区，与数据库存储一致）
  const now = new Date();
  const today = getUTC8DateString(now);
  
  // 计算昨天的日期（UTC+8）
  // 先获取 UTC+8 的当前时间，然后减去 24 小时
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getUTC8DateString(yesterdayDate);
  
  console.log(`[getTodayMatches] 查询比赛: 昨天=${yesterdayStr}, 今天=${today}`);
  
  // 查询比赛，过滤未完成的比赛（基于 mst 状态字段）
  // mst 可能的值需要根据实际 API 文档确定，这里使用更宽泛的过滤
  // 排除已完成状态：FT, AET, PEN, CANC, ABD, AWD, WO 等
  const completedStatuses = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];
  
  let query = supabase
    .from(DAILY_MATCHES_TABLE)
    .select('*')
    .in('date', [yesterdayStr, today]);
  
  // 使用链式 not 操作符排除已完成状态
  for (const status of completedStatuses) {
    query = query.not('mst', 'eq', status);
  }
  
  const { data, error } = await query.order('mgt', { ascending: true }); // 使用 mgt (比赛开始时间戳) 排序

  if (error) {
    console.error('[getTodayMatches] 查询失败:', error);
    throw error;
  }

  console.log(`[getTodayMatches] 查询成功: 找到 ${data?.length || 0} 场比赛`);
  if (data && data.length > 0) {
    console.log(`[getTodayMatches] 比赛详情: ${data.map((m: any) => `mid=${m.mid}, ${m.mhn || 'N/A'} vs ${m.man || 'N/A'}, status=${m.mst || 'N/A'}`).join('; ')}`);
  }

  return data || [];
};

// 为比赛生成默认的 betInfo（基于 AI 预测）
const generateDefaultBetInfo = (prediction: string, confidence: number): BetInfo => {
  // 根据置信度计算合理的赔率
  // 公式：odds = 3.0 - (confidence / 100) * 2.0
  const calculatedOdds = Math.max(1.1, Math.min(3.0, 3.0 - (confidence / 100) * 2.0));
  
  return {
    betType: 'over_under', // 默认使用大小球类型
    prediction: prediction.toUpperCase(),
    confidence: confidence,
    odds: calculatedOdds,
    betAmount: 0, // 初始为 0，由策略计算
  };
};

const normalizeMatchesPayload = async (body: RequestBody): Promise<{ matches: MatchRequest[]; error?: string }> => {
  // 获取今天和昨天的日期（使用 UTC+8 时区，与数据库存储一致）
  const now = new Date();
  const today = getUTC8DateString(now);
  // 计算昨天的日期（UTC+8）
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getUTC8DateString(yesterdayDate);
  
  // 如果提供了 matches 数组，过滤出昨天和今天的比赛
  if (Array.isArray(body.matches) && body.matches.length > 0) {
    // 验证比赛是否是昨天或今天的（通过检查 matchId 是否在昨天和今天的比赛中）
    if (supabase) {
      // matchId 可能是 number (旧格式) 或 string (新格式 mid)
      const matchIds = body.matches.map(m => m.matchId).filter(Boolean);
      if (matchIds.length > 0) {
        // 尝试作为 mid (TEXT) 查询
        const { data: todayMatches } = await supabase
          .from(DAILY_MATCHES_TABLE)
          .select('mid')
          .in('date', [yesterdayStr, today])
          .in('mid', matchIds.map(id => String(id)));
        
        const validMatchIds = new Set((todayMatches || []).map((m: any) => m.mid));
        const filteredMatches = body.matches.filter(m => {
          if (!m.matchId) return true;
          // 支持 number 和 string 格式的 matchId
          return validMatchIds.has(String(m.matchId));
        });
        
        if (filteredMatches.length === 0) {
          return {
            matches: [],
            error: "提供的比赛不是昨天或今天的比赛，只分析昨天和今天的比赛数据"
          };
        }
        
        return { matches: filteredMatches };
      }
    }
    return { matches: body.matches };
  }

  // 如果提供了 matchInfo 和 betInfo，验证是否是昨天或今天的比赛
  if (body.matchInfo && body.betInfo) {
    if (body.matchId && supabase) {
      const { data: matchData } = await supabase
        .from(DAILY_MATCHES_TABLE)
        .select('date')
        .eq('mid', String(body.matchId))
        .single();
      
      if (matchData && matchData.date !== today && matchData.date !== yesterdayStr) {
        return {
          matches: [],
          error: "提供的比赛不是昨天或今天的比赛，只分析昨天和今天的比赛数据"
        };
      }
    }
    
    return {
      matches: [{
        matchId: body.matchId,
        matchInfo: body.matchInfo,
        aiBets: [{
          aiId: body.aiId ?? "manual",
          aiDisplayName: body.aiModel ?? body.aiId ?? "Manual Strategy",
          betInfo: body.betInfo,
          strategy: body.strategy,
          autoBet: body.autoBet,
        }],
      }]
    };
  }

  // 如果都没有提供，查询当天的比赛
  console.log(`[normalizeMatchesPayload] 请求体为空，开始查询当天比赛`);
  try {
    const todayMatches = await getTodayMatches();
    console.log(`[normalizeMatchesPayload] 查询到 ${todayMatches.length} 场当天比赛`);
    
    if (todayMatches.length === 0) {
      console.log(`[normalizeMatchesPayload] 今天没有可用的比赛`);
      return {
        matches: [],
        error: "今天没有可用的比赛。请提供 matchInfo 和 betInfo，或提供 matches 数组。"
      };
    }

    // 如果比赛数量过多，按时间段每个小时挑选一场比赛
    const MAX_MATCHES = 15;
    let selectedMatches = todayMatches;
    
    if (todayMatches.length > MAX_MATCHES) {
      console.log(`[normalizeMatchesPayload] 比赛数量过多(${todayMatches.length}场)，按时间段每个小时挑选一场比赛`);
      
      // 按小时分组比赛
      const matchesByHour = new Map<string, any[]>();
      
      for (const match of todayMatches) {
        // 使用 mgt (毫秒时间戳) 而不是 kickoff_at
        if (!match.mgt) continue;
        
        try {
          // mgt 是毫秒时间戳，直接转换为 Date
          const kickoffDate = new Date(typeof match.mgt === 'string' ? parseInt(match.mgt) : match.mgt);
          // 使用 UTC+8 时区获取日期和小时（与数据库存储时区一致）
          // 使用 Intl.DateTimeFormat 获取 UTC+8 时区的各个部分
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            hour12: false,
          });
          
          const parts = formatter.formatToParts(kickoffDate);
          const year = parts.find(p => p.type === 'year')?.value || '';
          const month = parts.find(p => p.type === 'month')?.value || '';
          const day = parts.find(p => p.type === 'day')?.value || '';
          const hour = parts.find(p => p.type === 'hour')?.value || '';
          
          // 获取日期和小时，格式：YYYY-MM-DD-HH (例如：2025-11-21-14)
          const dateHourKey = `${year}-${month}-${day}-${hour}`;
          
          if (!matchesByHour.has(dateHourKey)) {
            matchesByHour.set(dateHourKey, []);
          }
          matchesByHour.get(dateHourKey)!.push(match);
        } catch (error) {
          console.warn(`[normalizeMatchesPayload] 解析比赛时间失败: ${match.mgt}`, error);
          // 如果解析失败，跳过该比赛
          continue;
        }
      }
      
      // 每个小时选择一场比赛（选择最早的那场）
      selectedMatches = [];
      const sortedHours = Array.from(matchesByHour.keys()).sort();
      
      for (const hourKey of sortedHours) {
        const matchesInHour = matchesByHour.get(hourKey)!;
        // 按 mgt (毫秒时间戳) 排序，选择最早的那场
        const sortedMatches = matchesInHour.sort((a, b) => {
          try {
            const timeA = typeof a.mgt === 'string' ? parseInt(a.mgt) : (a.mgt || 0);
            const timeB = typeof b.mgt === 'string' ? parseInt(b.mgt) : (b.mgt || 0);
            return timeA - timeB;
          } catch {
            return 0;
          }
        });
        
        if (sortedMatches.length > 0) {
          selectedMatches.push(sortedMatches[0]);
        }
      }
      
      console.log(`[normalizeMatchesPayload] 按小时分组后选出 ${selectedMatches.length} 场比赛`);
      
      // 如果按小时分组后仍然超过限制，再应用最大数量限制
      if (selectedMatches.length > MAX_MATCHES) {
        selectedMatches = selectedMatches.slice(0, MAX_MATCHES);
        console.log(`[normalizeMatchesPayload] 按小时分组后仍然超过限制，限制为前${MAX_MATCHES}场`);
      }
    }

    // 为每场比赛生成默认的 MatchRequest
    const matches: MatchRequest[] = selectedMatches.map((match) => {
      // 判断比赛状态：根据 mst 字段判断是否为进行中
      const isLive = match.mst && ['LIVE', 'HT', '2H', 'ET', 'P', 'BREAK'].includes(match.mst);
      
      const matchInfo: MatchInfo = {
        league: match.tn || match.tnjc || 'Unknown League',
        homeTeam: match.mhn || 'Unknown Home Team',
        awayTeam: match.man || 'Unknown Away Team',
        homeScore: match.mhs ?? 0,
        awayScore: match.mas ?? 0,
        status: isLive ? 'live' : 'upcoming',
      };

      // 为每个 AI 模型生成一个默认的 betInfo
      const aiBets: AiBetRequest[] = MODEL_CONFIGS.map((model) => ({
        aiId: model.id,
        aiDisplayName: model.displayName,
        betInfo: generateDefaultBetInfo('HOME_WIN', 50), // 初始预测，会被 AI 分析覆盖
        strategy: body.strategy,
        autoBet: body.autoBet ?? false,
      }));

      // matchId 使用 mid，但需要转换为 number（如果可能）以保持兼容性
      // 如果 mid 是纯数字字符串，转换为 number；否则保持为 string
      let matchId: number | undefined;
      if (match.mid) {
        const midNum = parseInt(match.mid);
        matchId = isNaN(midNum) ? undefined : midNum;
      }

      return {
        matchId,
        matchInfo,
        aiBets,
      };
    });

    return { matches };
  } catch (error) {
    return {
      matches: [],
      error: `查询当天比赛失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

const calculateStake = (betInfo: BetInfo, strategy: StrategyConfig) => {
  const base = strategy.baseStake ?? DEFAULT_STRATEGY.baseStake;
  const multiplier = strategy.stakeMultiplier ?? DEFAULT_STRATEGY.stakeMultiplier!;
  const maxStake = strategy.maxStake ?? DEFAULT_STRATEGY.maxStake!;
  const minStake = Math.max(Math.round(base * 0.3), 50);
  const rawStake = Math.round(base * (betInfo.confidence / 100) * multiplier);
  return Math.min(Math.max(rawStake, minStake), maxStake);
};

const shouldPlaceBet = (betInfo: BetInfo, strategy: StrategyConfig) => {
  const minConfidence = strategy.minConfidence ?? DEFAULT_STRATEGY.minConfidence;
  return betInfo.confidence >= minConfidence || strategy.forceBet === true;
};

// 检查是否已有分析记录
const checkExistingAnalysis = async (
  matchId: number | undefined,
  aiId: string | undefined,
): Promise<StoredAnalysisResult[] | null> => {
  if (!supabase || !matchId || !aiId) {
    return null;
  }

  try {
    // 使用 UTC+8 时区获取今天的日期（与数据库存储一致）
    const today = getUTC8DateString(new Date());
    
    // 查询今天是否有该AI对该比赛的分析记录
    // 注意：inserted_at 是 TIMESTAMPTZ，需要转换为 UTC+8 时区的开始时间
    const todayStartUTC8 = new Date(`${today}T00:00:00+08:00`).toISOString();
    const { data, error } = await supabase
      .from(ANALYSIS_TABLE)
      .select('id, provider_model_id, analysis, bet_snapshot')
      .eq('match_id', matchId)
      .eq('ai_id', aiId)
      .gte('inserted_at', todayStartUTC8)
      .order('inserted_at', { ascending: false })
      .limit(1);

    if (error) {
      return null;
    }

    if (data && data.length > 0 && data[0].analysis) {
      // 找到已有分析记录，返回引用
      return [{
        id: data[0].id,
        modelId: data[0].provider_model_id || aiId,
      }];
    }

    return null;
  } catch (error) {
    console.error(`[checkExistingAnalysis] 检查失败:`, error);
    return null;
  }
};

const persistAnalyses = async (
  matchId: number | undefined,
  aiId: string | undefined,
  aiDisplayName: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  analyses: ModelAnalysisResult[],
  allPredictions?: AllPredictions, // 可选的完整预测信息
): Promise<StoredAnalysisResult[]> => {
  if (!supabase) {
    console.warn("[match-analysis] Supabase 客户端未配置，跳过写入");
    return analyses.map((item) => ({ id: null, modelId: item.id }));
  }

  // 构建完整的 bet_snapshot，包含所有预测类型
  const betSnapshot = allPredictions ? {
    ...allPredictions,
    primaryBet: betInfo, // 主要投注信息
  } : betInfo; // 如果没有提供完整预测，则使用原来的 betInfo

  const rows = analyses.map((item) => ({
    match_id: matchId ?? null,
    ai_id: aiId ?? null,
    ai_display_name: aiDisplayName,
    provider_model_id: item.id,
    provider_model_name: item.displayName,
    model_identifier: item.model,
    analysis: item.analysis ?? null,
    error: item.error ?? null,
    latency_ms: item.latencyMs ?? null,
    match_snapshot: matchInfo,
    bet_snapshot: betSnapshot,
  }));

  console.log(`[persistAnalyses] 准备保存分析记录: matchId=${matchId}, aiId=${aiId}, aiDisplayName=${aiDisplayName}, rows=${rows.length}`);
  console.log(`[persistAnalyses] 分析结果: ${analyses.map(a => `${a.id}(${a.analysis ? '有分析' : '无分析'}, ${a.error ? '有错误' : '无错误'})`).join(', ')}`);

  const { data, error } = await supabase
    .from(ANALYSIS_TABLE)
    .insert(rows)
    .select("id, provider_model_id");

  if (error) {
    console.error("[persistAnalyses] 写入分析表失败", {
      error,
      matchId,
      aiId,
      aiDisplayName,
      rowsCount: rows.length,
      errorDetails: JSON.stringify(error),
    });
    return analyses.map((item) => ({ id: null, modelId: item.id }));
  }

  console.log(`[persistAnalyses] 成功保存分析记录: ${data?.length || 0} 条记录, IDs: ${data?.map(r => r.id).join(', ') || 'none'}`);
  return data?.map((row) => ({
    id: row.id,
    modelId: row.provider_model_id,
  })) ?? [];
};

const createSimPosition = async (
  matchId: number | undefined,
  aiId: string | undefined,
  aiDisplayName: string,
  betInfo: BetInfo,
  stake: number,
) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(SIM_POSITIONS_TABLE)
    .insert({
      match_id: matchId ?? null,
      ai_id: aiId ?? null,
      ai_display_name: aiDisplayName,
      bet_type: betInfo.betType,
      prediction: betInfo.prediction,
      odds: betInfo.odds,
      stake_amount: stake,
      status: "open",
      metadata: betInfo,
    })
    .select("id")
    .single<PositionRecord>();

  if (error) {
    console.error("[match-analysis] 创建模拟仓位失败", error);
    return null;
  }

  return data?.id ?? null;
};

const updateBalanceWithStake = async (
  balance: BalanceRecord,
  stake: number,
  positionId: number | null,
) => {
  if (!supabase) return false;

  const newAvailable = (balance.available_balance ?? 0) - stake;
  const newLocked = (balance.locked_balance ?? 0) + stake;

  const { error } = await supabase
    .from(AI_BALANCES_TABLE)
    .update({
      available_balance: newAvailable,
      locked_balance: newLocked,
      updated_at: new Date().toISOString(),
      last_position_id: positionId,
    })
    .eq("id", balance.id);

  if (error) {
    console.error("[match-analysis] 更新余额失败", error);
    return false;
  }

  return true;
};

const createAutoBet = async (
  matchId: number | undefined,
  aiId: string | undefined,
  aiDisplayName: string,
  betInfo: BetInfo,
  stake: number,
  strategy: StrategyConfig,
  analysisRefs: StoredAnalysisResult[],
) => {
  if (!supabase) {
    return {
      placed: false,
      reason: "Supabase 未配置，无法记录下注",
    };
  }

  // 检查是否已经为同一场比赛下过注（防止重复下注）
  if (matchId && aiId) {
    const { data: existingBets } = await supabase
      .from(AUTO_BET_TABLE)
      .select("id, bet_type")
      .eq("match_id", matchId)
      .eq("ai_id", aiId)
      .in("status", ["pending", "won", "lost"]); // 只检查未结算或已结算的投注

    if (existingBets && existingBets.length > 0) {
      console.log(`[match-analysis] 比赛 ${matchId} 已存在投注记录，跳过重复下注`);
      return {
        placed: false,
        reason: `该比赛已存在投注记录（${existingBets.map(b => b.bet_type).join(', ')}）`,
      };
    }
  }

  const { data: balance, error: balanceError } = await supabase
    .from(AI_BALANCES_TABLE)
    .select("*")
    .eq("ai_id", aiId ?? aiDisplayName)
    .single<BalanceRecord>();

  if (balanceError || !balance) {
    console.error("[match-analysis] 查询余额失败或不存在", balanceError);
    return {
      placed: false,
      reason: "账户余额不存在",
    };
  }

  if ((balance?.available_balance ?? 0) < stake) {
    return {
      placed: false,
      reason: "账户余额不足",
    };
  }

  const { data, error } = await supabase
    .from(AUTO_BET_TABLE)
    .insert({
      match_id: matchId ?? null,
      ai_id: aiId ?? null,
      ai_display_name: aiDisplayName,
      bet_type: betInfo.betType,
      prediction: betInfo.prediction,
      confidence: betInfo.confidence,
      odds: betInfo.odds,
      stake_amount: stake,
      status: "pending",
      strategy_config: strategy,
      analysis_reference_ids: analysisRefs
        .map((ref) => ref.id)
        .filter(Boolean),
      // 添加大小球和让球盘相关字段
      handicap_line: betInfo.handicapLine ?? null,
      over_under_line: betInfo.overUnderLine ?? null,
      over_under_pick: betInfo.overUnderPick ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[match-analysis] 记录自动下注失败", error);
    return {
      placed: false,
      reason: "记录自动下注失败",
    };
  }

  const positionId = await createSimPosition(
    matchId,
    aiId,
    aiDisplayName,
    betInfo,
    stake,
  );

  await updateBalanceWithStake(balance, stake, positionId);

  return {
    placed: true,
    recordId: data?.id,
    stake,
    positionId,
  };
};

// 获取用户的训练数据
const getUserTrainingData = async (userId?: string, limit: number = 10): Promise<string[]> => {
  if (!userId || !supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('ai_training_history' as any)
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[getUserTrainingData] Error fetching training data:', error);
      return [];
    }
    
    return (data || []).map((item: any) => item.content);
  } catch (error) {
    console.error('[getUserTrainingData] Unexpected error:', error);
    return [];
  }
};

// 单个模型分析（用于每个AI独立分析）
const analyzeWithSingleModel = async (
  OPENROUTER_API_KEY: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  modelConfig: ModelConfig,
  isDefaultBetInfo: boolean = false,
  marketOdds?: MarketOdds,
  userId?: string, // 添加可选的 userId 参数
): Promise<ModelAnalysisResult> => {
  // 如果是专属模型且有 userId，获取用户的训练数据
  let userTrainingData: string[] = [];
  if (modelConfig.id === 'hunsoccermax' && userId) {
    userTrainingData = await getUserTrainingData(userId, 10); // 获取最近10条训练数据
  }
  
  const systemPrompt = buildSystemPrompt(userTrainingData.length > 0 ? userTrainingData : undefined);
  const userPrompt = buildUserPrompt(matchInfo, betInfo, modelConfig.displayName, isDefaultBetInfo, marketOdds);
  
  const startedAt = performance.now();
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://owner-playbook.ai",
        "X-Title": "Owner Playbook AI",
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `OpenRouter error [${modelConfig.model}]`,
        response.status,
        errorText,
      );

      if (response.status === 429) {
        return {
          ...modelConfig,
          error: "请求过于频繁，请稍后再试",
          latencyMs: performance.now() - startedAt,
        };
      }
      if (response.status === 402) {
        return {
          ...modelConfig,
          error: "额度不足，请充值后继续使用",
          latencyMs: performance.now() - startedAt,
        };
      }

      return {
        ...modelConfig,
        error: "AI分析服务暂时不可用",
        latencyMs: performance.now() - startedAt,
      };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      return {
        ...modelConfig,
        error: "AI未能生成分析结果",
        latencyMs: performance.now() - startedAt,
      };
    }

    return {
      ...modelConfig,
      analysis,
      latencyMs: performance.now() - startedAt,
    };
  } catch (error) {
    console.error(
      `Unexpected error while calling ${modelConfig.model}`,
      error,
    );
    return {
      ...modelConfig,
      error: "AI分析调用失败，请稍后重试",
      latencyMs: performance.now() - startedAt,
    };
  }
};

const analyzeBetWithModels = async (
  OPENROUTER_API_KEY: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  aiModel: string,
  isDefaultBetInfo: boolean = false,
) => {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(matchInfo, betInfo, aiModel, isDefaultBetInfo);

  const analyzeWithModel = async (modelConfig: ModelConfig) => {
    const startedAt = performance.now();
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://owner-playbook.ai",
          "X-Title": "Owner Playbook AI",
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `OpenRouter error [${modelConfig.model}]`,
          response.status,
          errorText,
        );

        if (response.status === 429) {
          return {
            ...modelConfig,
            error: "请求过于频繁，请稍后再试",
            latencyMs: performance.now() - startedAt,
          };
        }
        if (response.status === 402) {
          return {
            ...modelConfig,
            error: "额度不足，请充值后继续使用",
            latencyMs: performance.now() - startedAt,
          };
        }

        return {
          ...modelConfig,
          error: "AI分析服务暂时不可用",
          latencyMs: performance.now() - startedAt,
        };
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content;

      if (!analysis) {
        return {
          ...modelConfig,
          error: "AI未能生成分析结果",
          latencyMs: performance.now() - startedAt,
        };
      }

      return {
        ...modelConfig,
        analysis,
        latencyMs: performance.now() - startedAt,
      };
    } catch (error) {
      console.error(
        `Unexpected error while calling ${modelConfig.model}`,
        error,
      );
      return {
        ...modelConfig,
        error: "AI分析调用失败，请稍后重试",
        latencyMs: performance.now() - startedAt,
      };
    }
  };

  return Promise.all(MODEL_CONFIGS.map(analyzeWithModel));
};

serve(async (req) => {
  console.log(`[match-analysis] ========== 函数被调用 ==========`);
  console.log(`[match-analysis] 请求方法: ${req.method}`);
  console.log(`[match-analysis] 请求URL: ${req.url}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[match-analysis] OPTIONS 请求，返回 CORS 头`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: RequestBody;
    try {
      body = await req.json();
      console.log(`[match-analysis] 请求体解析成功: ${JSON.stringify(body).substring(0, 200)}...`);
    } catch (jsonError) {
      // 如果 JSON 解析失败，使用空对象（将自动查询当天比赛）
      console.warn('[match-analysis] Failed to parse request body, using empty object:', jsonError);
      body = {};
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "OPENROUTER_API_KEY 未配置",
          message: "请在 Supabase 项目设置中配置 OPENROUTER_API_KEY"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[match-analysis] 开始规范化请求体...`);
    const payloadResult = await normalizeMatchesPayload(body);
    console.log(`[match-analysis] 规范化结果: matches数量=${payloadResult.matches?.length || 0}, error=${payloadResult.error || '无'}`);
    
    if (payloadResult.error) {
      // 如果是"今天没有可用的比赛"，返回 200 而不是 400（这是正常情况）
      if (payloadResult.error.includes("今天没有可用的比赛")) {
        return new Response(
          JSON.stringify({ 
            message: payloadResult.error,
            analyses: [],
            results: []
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: payloadResult.error,
          message: "请求格式不正确。请提供 matchInfo 和 betInfo，或提供 matches 数组。如果没有提供，将自动查询当天的比赛。"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matchesPayload = payloadResult.matches;
    
    console.log(`[match-analysis] 准备处理的比赛数量: ${matchesPayload.length}`);
    if (matchesPayload.length > 0) {
      console.log(`[match-analysis] 比赛列表: ${matchesPayload.map(m => `matchId=${m.matchId}, ${m.matchInfo.homeTeam} vs ${m.matchInfo.awayTeam}`).join('; ')}`);
    }
    
    if (matchesPayload.length === 0) {
      console.log(`[match-analysis] 没有找到需要分析的比赛，返回空结果`);
      return new Response(
        JSON.stringify({ 
          message: "没有找到需要分析的比赛",
          analyses: [],
          results: []
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 获取或创建每个 AI 的余额
    const getOrCreateBalance = async (aiId: string, aiDisplayName: string) => {
      if (!supabase) return null;
      
      const { data: existing } = await supabase
        .from(AI_BALANCES_TABLE)
        .select('*')
        .eq('ai_id', aiId)
        .single();
      
      if (existing) return existing;
      
      const { data: newBalance } = await supabase
        .from(AI_BALANCES_TABLE)
        .insert({
          ai_id: aiId,
          ai_display_name: aiDisplayName,
          available_balance: INITIAL_AI_BALANCE,
          locked_balance: 0,
          currency: 'USD',
        })
        .select()
        .single();
      
      return newBalance;
    };

    // 获取今天已下注次数
    const getTodayBetsCount = async (aiId: string) => {
      if (!supabase) return 0;
      // 使用 UTC+8 时区获取今天的日期（与数据库存储一致）
      const today = getUTC8DateString(new Date());
      // inserted_at 是 TIMESTAMPTZ，需要转换为 UTC+8 时区的开始时间
      const todayStartUTC8 = new Date(`${today}T00:00:00+08:00`).toISOString();
      const { count } = await supabase
        .from(AUTO_BET_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('ai_id', aiId)
        .eq('status', 'pending')
        .gte('inserted_at', todayStartUTC8);
      return count || 0;
    };

    const results: Array<{
      matchId?: number;
      aiId?: string;
      aiDisplayName: string;
      analyses: ModelAnalysisResult[];
      analysisRefs: StoredAnalysisResult[];
      primaryAnalysis: string | null;
      autoBet?: AutoBetResult;
    }> = [];

    // 对每个 AI 模型处理所有比赛（并行处理以提高性能）
    const processAIModel = async (modelConfig: ModelConfig) => {
      const aiResults: Array<{
        matchId?: number;
        aiId?: string;
        aiDisplayName: string;
        analyses: ModelAnalysisResult[];
        analysisRefs: StoredAnalysisResult[];
        primaryAnalysis: string | null;
        autoBet?: AutoBetResult;
      }> = [];
      
      try {
        const aiId = modelConfig.id;
        const aiDisplayName = modelConfig.displayName;
        
        // 获取或创建余额
        const balance = await getOrCreateBalance(aiId, aiDisplayName);
        if (!balance) {
          console.error(`[${aiDisplayName}] 无法获取或创建余额`);
          return [];
        }

        const todayBetsCount = await getTodayBetsCount(aiId);
        const strategy = resolveStrategy(body.strategy);
        
        // 从数据库的 odds_info 字段解析大小球和让球盘赔率
        // 实际数据结构：{ ts, msg, code, data: [{ hpt, hpn, hl: [{ hv, ol: [{ ot, ov, ov2 }] }] }] }
        const parseOddsInfoFromDB = (oddsInfo: unknown): MarketOdds | null => {
          if (!oddsInfo || typeof oddsInfo !== 'object') {
            return null;
          }

          const marketOdds: MarketOdds = {};
          const oddsData = oddsInfo as any;

          try {
            // 检查数据结构：可能是 { data: [...] } 或直接是数组
            const markets = Array.isArray(oddsData.data) ? oddsData.data : 
                           Array.isArray(oddsData) ? oddsData : [];

            if (markets.length === 0) {
              console.warn(`[parseOddsInfoFromDB] 没有找到市场数据`);
              return null;
            }

            // 解析大小球赔率（Over/Under）
            // hpt=5 表示大小球市场，hpn 包含"大小"或"Over/Under"
            const overUnderMarkets = markets.filter((market: any) => {
              const marketType = market.hpt || market.marketType || market.market_type;
              const marketName = (market.hpn || market.name || market.marketName || '').toLowerCase();
              // hpt=5 是大小球，或者名称包含"大小"
              return marketType === 5 || marketName.includes('大小') || 
                     marketName.includes('over') || marketName.includes('under') ||
                     marketName.includes('goals');
            });

            if (overUnderMarkets.length > 0) {
              const overUnderMap = new Map<number, { over?: number; under?: number }>();
              
              for (const market of overUnderMarkets) {
                const hl = market.hl || market.handicapLines || [];
                
                for (const lineData of hl) {
                  // hv 是盘口值，如 "3", "3.5", "2.5" 等
                  const hv = lineData.hv || lineData.handicapValue || lineData.line;
                  if (!hv) continue;
                  
                  // 解析盘口值（处理 "3", "3.5", "2/2.5" 等格式）
                  // 对于 "2/2.5" 这种格式，取平均值或第一个值
                  let line: number;
                  if (typeof hv === 'number') {
                    line = hv;
                  } else if (typeof hv === 'string') {
                    // 处理 "2/2.5" 格式，取第一个数字
                    const lineMatch = hv.match(/(\d+\.?\d*)/);
                    if (!lineMatch) continue;
                    line = parseFloat(lineMatch[1]);
                  } else {
                    continue;
                  }
                  
                  const ol = lineData.ol || lineData.outcomes || lineData.options || [];
                  
                  for (const outcome of ol) {
                    // ot 是选项类型："Over" 或 "Under"
                    const ot = outcome.ot || outcome.outcomeType || outcome.type || '';
                    // ov 是赔率值（整数，需要除以100000转换为小数）
                    const ovRaw = outcome.ov || outcome.odds || outcome.price || 0;
                    const odd = typeof ovRaw === 'number' ? ovRaw / 100000 : parseFloat(ovRaw) / 100000;
                    
                    if (isNaN(odd) || odd <= 0) continue;

                    if (!overUnderMap.has(line)) {
                      overUnderMap.set(line, {});
                    }
                    
                    const entry = overUnderMap.get(line)!;
                    const otLower = String(ot).toLowerCase();
                    
                    if (otLower === 'over' || otLower.includes('大')) {
                      entry.over = odd;
                    } else if (otLower === 'under' || otLower.includes('小')) {
                      entry.under = odd;
                    }
                  }
                }
              }

              // 转换为数组格式，只保留同时有 over 和 under 的，且两个赔率都在1.65-2.3范围内
              marketOdds.overUnder = Array.from(overUnderMap.entries())
                .filter(([_, odds]) => {
                  if (!odds.over || !odds.under) return false;
                  return isOddsInRange(odds.over) && isOddsInRange(odds.under);
                })
                .map(([line, odds]) => ({
                  line,
                  over: odds.over!,
                  under: odds.under!,
                }))
                .sort((a, b) => a.line - b.line);
              
              if (marketOdds.overUnder.length > 0) {
                console.log(`[parseOddsInfoFromDB] 解析到 ${marketOdds.overUnder.length} 个大小球盘口`);
              }
            }

            // 解析让球盘赔率（Asian Handicap）
            // hpt=2 或 4 表示让球盘市场，hpn 包含"让球"或"Handicap"
            const handicapMarkets = markets.filter((market: any) => {
              const marketType = market.hpt || market.marketType || market.market_type;
              const marketName = (market.hpn || market.name || market.marketName || '').toLowerCase();
              // hpt=2 或 4 是让球盘，或者名称包含"让球"
              return marketType === 2 || marketType === 4 || 
                     marketName.includes('让球') || marketName.includes('handicap') ||
                     marketName.includes('asian');
            });

            if (handicapMarkets.length > 0) {
              // 使用 string | number 作为 key，保留原始格式（如 "-1/1.5"）
              const handicapMap = new Map<string | number, { home?: number; away?: number }>();
              
              for (const market of handicapMarkets) {
                const hl = market.hl || market.handicapLines || [];
                
                for (const lineData of hl) {
                  // hv 是盘口值，如 "-1.5", "+0.5", "-1/1.5" 等
                  // 直接保留原始值，不进行转换
                  const hv = lineData.hv || lineData.handicapValue || lineData.line;
                  if (hv === null || hv === undefined || hv === '') continue;
                  
                  // 保留原始格式：如果是数字则保持数字，如果是字符串则保持字符串
                  const line: string | number = typeof hv === 'number' ? hv : String(hv);
                  
                  const ol = lineData.ol || lineData.outcomes || lineData.options || [];
                  
                  for (const outcome of ol) {
                    // ot 是选项类型："1" 表示主队，"2" 表示客队
                    const ot = outcome.ot || outcome.outcomeType || outcome.type || '';
                    // ov 是赔率值（整数，需要除以100000转换为小数）
                    const ovRaw = outcome.ov || outcome.odds || outcome.price || 0;
                    const odd = typeof ovRaw === 'number' ? ovRaw / 100000 : parseFloat(ovRaw) / 100000;
                    
                    if (isNaN(odd) || odd <= 0) continue;

                    if (!handicapMap.has(line)) {
                      handicapMap.set(line, {});
                    }
                    
                    const entry = handicapMap.get(line)!;
                    const otStr = String(ot);
                    
                    // "1" 表示主队（home），"2" 表示客队（away）
                    if (otStr === '1' || otStr.toLowerCase().includes('home') || otStr.includes('主')) {
                      entry.home = odd;
                    } else if (otStr === '2' || otStr.toLowerCase().includes('away') || otStr.includes('客')) {
                      entry.away = odd;
                    }
                  }
                }
              }

              // 转换为数组格式，只保留同时有 home 和 away 的，且两个赔率都在1.65-2.3范围内
              marketOdds.handicap = Array.from(handicapMap.entries())
                .filter(([_, odds]) => {
                  if (!odds.home || !odds.away) return false;
                  return isOddsInRange(odds.home) && isOddsInRange(odds.away);
                })
                .map(([line, odds]) => ({
                  line,
                  home: odds.home!,
                  away: odds.away!,
                }))
                .sort((a, b) => {
                  // 排序：数字优先，然后按字符串排序
                  const aNum = typeof a.line === 'number' ? a.line : parseFloat(String(a.line)) || Infinity;
                  const bNum = typeof b.line === 'number' ? b.line : parseFloat(String(b.line)) || Infinity;
                  if (aNum !== Infinity && bNum !== Infinity) {
                    return aNum - bNum;
                  }
                  return String(a.line).localeCompare(String(b.line));
                });
              
              if (marketOdds.handicap.length > 0) {
                console.log(`[parseOddsInfoFromDB] 解析到 ${marketOdds.handicap.length} 个让球盘盘口`);
              }
            }

            return (marketOdds.overUnder && marketOdds.overUnder.length > 0) || 
                   (marketOdds.handicap && marketOdds.handicap.length > 0)
              ? marketOdds
              : null;
          } catch (error) {
            console.error(`[parseOddsInfoFromDB] 解析赔率信息出错:`, error);
            if (error instanceof Error) {
              console.error(`[parseOddsInfoFromDB] 错误详情: ${error.message}, 堆栈: ${error.stack}`);
            }
            return null;
          }
        };

        // 从数据库获取所有可用的市场赔率（只读取大小球和让球盘）
        const getAllMarketOdds = async (matchMid?: string): Promise<MarketOdds | null> => {
          if (!matchMid || !supabase) return null;
          
          try {
            const { data: matchData, error } = await supabase
              .from(DAILY_MATCHES_TABLE)
              .select('odds_info')
              .eq('mid', matchMid)
              .single();

            if (error || !matchData || !matchData.odds_info) {
              console.warn(`[getAllMarketOdds] 比赛 ${matchMid} 没有赔率信息`);
              return null;
            }

            const parsedOdds = parseOddsInfoFromDB(matchData.odds_info);
            if (parsedOdds) {
              console.log(`[getAllMarketOdds] 从数据库成功读取比赛 ${matchMid} 的赔率信息`);
              return parsedOdds;
            }

            return null;
          } catch (error) {
            console.error(`[getAllMarketOdds] 从数据库读取赔率信息失败:`, error);
            return null;
          }
        };


        // 限制处理的比赛数量，避免超时
        const MAX_MATCHES_PER_AI = 12;
        const limitedMatches = matchesPayload.slice(0, MAX_MATCHES_PER_AI);
        if (matchesPayload.length > MAX_MATCHES_PER_AI) {
          console.log(`[${aiDisplayName}] 比赛数量过多(${matchesPayload.length}场)，限制为前${MAX_MATCHES_PER_AI}场`);
        }
        
        console.log(`[${aiDisplayName}] 开始处理 ${limitedMatches.length} 场比赛`);
        
        // 第一步：并行分析所有比赛（大幅提升性能）
        const analysisPromises = limitedMatches.map(async (match) => {
          const matchInfo = match.matchInfo;
          const defaultBetInfo = generateDefaultBetInfo('OVER', 50);
          
          // 检查是否已有分析记录
          const existingAnalysisRefs = await checkExistingAnalysis(match.matchId, aiId);
          
          if (existingAnalysisRefs && existingAnalysisRefs.length > 0) {
            // 已有分析记录，直接使用
            
            // 从数据库获取已有的分析结果
            if (!supabase) {
              return {
                match,
                analyses: [],
                analysisRefs: existingAnalysisRefs,
              };
            }
            
            const { data: existingData } = await supabase
              .from(ANALYSIS_TABLE)
              .select('analysis, bet_snapshot')
              .eq('id', existingAnalysisRefs[0].id)
              .single();
            
            if (existingData && existingData.analysis) {
              // 构建已有的分析结果
              const existingAnalysis: ModelAnalysisResult = {
                ...modelConfig,
                analysis: existingData.analysis,
                latencyMs: 0,
              };
              
              // 从 bet_snapshot 中提取预测信息
              const betSnapshot = existingData.bet_snapshot as any;
              let moneylineBetInfo: BetInfo | null = null;
              let overUnderBetInfo: BetInfo | null = null;
              let handicapBetInfo: BetInfo | null = null;
              
              if (betSnapshot) {
                // 提取主要投注信息
                if (betSnapshot.primaryBet) {
                  const primary = betSnapshot.primaryBet;
                  if (primary.betType === 'over_under') {
                    overUnderBetInfo = primary;
                  } else if (primary.betType === 'handicap') {
                    handicapBetInfo = primary;
                  }
                }
                
                // 提取所有预测信息
                if (betSnapshot.overUnder) {
                  overUnderBetInfo = {
                    betType: 'over_under',
                    prediction: betSnapshot.overUnder.prediction,
                    confidence: betSnapshot.overUnder.confidence,
                    odds: betSnapshot.overUnder.odds || 1.9,
                    betAmount: 0,
                    overUnderLine: betSnapshot.overUnder.line,
                    overUnderPick: betSnapshot.overUnder.prediction.toLowerCase(),
                  };
                }
                
                if (betSnapshot.handicap) {
                  handicapBetInfo = {
                    betType: 'handicap',
                    prediction: betSnapshot.handicap.prediction,
                    confidence: betSnapshot.handicap.confidence,
                    odds: betSnapshot.handicap.odds || 1.9,
                    betAmount: 0,
                    handicapLine: betSnapshot.handicap.line,
                  };
                }
              }
              
              return {
                match,
                analyses: [existingAnalysis],
                analysisRefs: existingAnalysisRefs,
                moneylineBetInfo,
                overUnderBetInfo,
                handicapBetInfo,
              };
            } else {
              // 已有记录但 analysis 为空，继续执行新分析
              console.log(`[${aiDisplayName}] 比赛 ${match.matchId} 已有记录但 analysis 为空，继续执行新分析`);
            }
          }
          
          // 没有已有分析，进行新分析
          // 在分析之前，从数据库获取市场赔率（只读取大小球和让球盘）
          const matchMid = match.matchId ? String(match.matchId) : undefined;
          const marketOdds = matchMid ? await getAllMarketOdds(matchMid) : null;
          
          // 调用当前 AI 模型进行分析（只调用自己的模型）
          const analysis = await analyzeWithSingleModel(
            OPENROUTER_API_KEY,
            matchInfo,
            defaultBetInfo,
            modelConfig,
            true, // 使用默认 betInfo，让 AI 自己生成预测
            marketOdds || undefined, // 传递市场赔率信息
          );

          const analyses = [analysis]; // 包装成数组以保持兼容性
          const successfulAnalysis = analysis.analysis && !analysis.error ? analysis : null;
          
          // 保存 marketOdds 以便后续使用
          const savedMarketOdds = marketOdds;
          
          if (!successfulAnalysis) {
            // 保存失败的分析记录
            const analysisRefs = await persistAnalyses(
              match.matchId,
              aiId,
              aiDisplayName,
              matchInfo,
              defaultBetInfo,
              analyses,
            );
            return {
              match,
              analyses,
              analysisRefs,
            };
          }

          // 从分析结果中提取预测
          const analysisText = successfulAnalysis.analysis;
          if (!analysisText) {
            const analysisRefs = await persistAnalyses(
              match.matchId,
              aiId,
              aiDisplayName,
              matchInfo,
              defaultBetInfo,
              analyses,
            );
            return {
              match,
              analyses,
              analysisRefs,
            };
          }
          
          // 解析输赢预测
          const moneylineMatch = analysisText.match(/PREDICTION_MONEYLINE:\s*(HOME_WIN|AWAY_WIN|DRAW)\s*(\d+)/i);
          let moneylinePick: string | undefined;
          let moneylineConfidence: number | undefined;

          if (moneylineMatch) {
            moneylinePick = moneylineMatch[1].toUpperCase();
            moneylineConfidence = parseInt(moneylineMatch[2]);
          }

          // 解析大小球预测
          const overUnderMatch = analysisText.match(/PREDICTION_OVER_UNDER:\s*(OVER|UNDER)\s*([\d.]+)\s*(\d+)/i);
          let overUnderPick: string | undefined;
          let overUnderLine: number | undefined;
          let overUnderConfidence: number | undefined;

          if (overUnderMatch) {
            overUnderPick = overUnderMatch[1].toUpperCase();
            overUnderLine = parseFloat(overUnderMatch[2]);
            overUnderConfidence = parseInt(overUnderMatch[3]);
          }

          // 解析让球盘预测
          const handicapMatch = analysisText.match(/PREDICTION_HANDICAP:\s*(HOME|AWAY)\s*([-\d.]+)\s*(\d+)/i);
          let handicapPick: string | undefined;
          let handicapLine: number | undefined;
          let handicapConfidence: number | undefined;

          if (handicapMatch) {
            handicapPick = handicapMatch[1].toUpperCase();
            handicapLine = parseFloat(handicapMatch[2]);
            handicapConfidence = parseInt(handicapMatch[3]);
          }

          // 保存分析记录（包含输赢、大小球和让球盘预测）
          // 从数据库的市场赔率中查找真实赔率（只使用大小球和让球盘）
          
          // 输赢赔率：数据库中没有存储，使用默认值
          const moneylineBetInfo: BetInfo | null = moneylinePick && moneylineConfidence
            ? {
                betType: 'moneyline',
                prediction: moneylinePick, // HOME_WIN, AWAY_WIN, 或 DRAW
                confidence: moneylineConfidence,
                odds: 1.9, // 使用默认值
                betAmount: 0,
              }
            : null;

          // 从数据库市场赔率中获取大小球真实赔率
          let overUnderRealOdds: number | null = null;
          if (overUnderPick && overUnderLine && savedMarketOdds?.overUnder) {
            const matchedOdds = savedMarketOdds.overUnder.find(ou => Math.abs(ou.line - overUnderLine) < 0.01);
            if (matchedOdds) {
              const selectedOdds = overUnderPick.toUpperCase() === 'OVER' ? matchedOdds.over : matchedOdds.under;
              // 确保选择的赔率在范围内
              if (selectedOdds && isOddsInRange(selectedOdds)) {
                overUnderRealOdds = selectedOdds;
              }
            }
          }

          const overUnderBetInfo: BetInfo | null = overUnderPick && overUnderLine && overUnderConfidence
            ? {
                betType: 'over_under',
                prediction: overUnderPick,
                confidence: overUnderConfidence,
                odds: overUnderRealOdds || 1.9, // 使用数据库赔率，如果没找到则使用默认值
                betAmount: 0,
                overUnderLine,
                overUnderPick: overUnderPick.toLowerCase(),
              }
            : null;

          // 从数据库市场赔率中获取让球盘真实赔率
          let handicapRealOdds: number | null = null;
          if (handicapPick && handicapLine !== undefined && savedMarketOdds?.handicap) {
            // 匹配逻辑：支持数字和字符串的 line 值
            const matchedOdds = savedMarketOdds.handicap.find(h => {
              // 如果 line 是数字，使用数值比较
              if (typeof h.line === 'number' && typeof handicapLine === 'number') {
                return Math.abs(h.line - handicapLine) < 0.01;
              }
              // 如果 line 是字符串，尝试转换为数字比较，或直接字符串匹配
              if (typeof h.line === 'string') {
                const lineNum = parseFloat(h.line);
                if (!isNaN(lineNum) && typeof handicapLine === 'number') {
                  return Math.abs(lineNum - handicapLine) < 0.01;
                }
                // 字符串精确匹配
                return String(h.line) === String(handicapLine);
              }
              // 如果 handicapLine 是字符串，尝试匹配
              if (typeof handicapLine === 'string') {
                return String(h.line) === String(handicapLine);
              }
              return false;
            });
            if (matchedOdds) {
              const selectedOdds = handicapPick.toUpperCase() === 'HOME' ? matchedOdds.home : matchedOdds.away;
              // 确保选择的赔率在范围内
              if (selectedOdds && isOddsInRange(selectedOdds)) {
                handicapRealOdds = selectedOdds;
              }
            }
          }

          const handicapBetInfo: BetInfo | null = handicapPick && handicapLine !== undefined && handicapConfidence
            ? {
                betType: 'handicap',
                prediction: handicapPick, // HOME 或 AWAY
                confidence: handicapConfidence,
                odds: handicapRealOdds || 1.9, // 使用真实赔率，如果获取失败则使用默认值
                betAmount: 0,
                handicapLine,
              }
            : null;

          // 保存分析记录（使用大小球或让球盘作为主要记录，优先级：大小球 > 让球盘，投注时不考虑输赢）
          const finalBetInfo: BetInfo = overUnderBetInfo || handicapBetInfo || defaultBetInfo;
          
          // 构建完整的预测信息，包含所有三种预测类型
          const allPredictions: AllPredictions = {
            moneyline: moneylineBetInfo ? {
              prediction: moneylineBetInfo.prediction,
              confidence: moneylineBetInfo.confidence,
              odds: moneylineBetInfo.odds,
            } : undefined,
            overUnder: overUnderBetInfo ? {
              prediction: overUnderBetInfo.overUnderPick || overUnderBetInfo.prediction,
              line: overUnderBetInfo.overUnderLine!,
              confidence: overUnderBetInfo.confidence,
              odds: overUnderBetInfo.odds,
            } : undefined,
            handicap: handicapBetInfo ? {
              prediction: handicapBetInfo.prediction,
              line: handicapBetInfo.handicapLine!,
              confidence: handicapBetInfo.confidence,
              odds: handicapBetInfo.odds,
            } : undefined,
            primaryBet: finalBetInfo,
          };
          
          const analysisRefs = await persistAnalyses(
            match.matchId,
            aiId,
            aiDisplayName,
            matchInfo,
            finalBetInfo,
            analyses,
            allPredictions, // 传递完整的预测信息
          );

          return {
            match,
            analyses,
            analysisRefs,
            // 输赢、大小球和让球盘预测
            moneylineBetInfo,
            overUnderBetInfo,
            handicapBetInfo,
          };
        });

        // 等待所有分析完成
        const matchAnalyses = await Promise.all(analysisPromises);

        // 第二步：为每场比赛选择置信度最高的一个投注（只考虑大小球或让球盘，不考虑输赢预测）
        // 注意：虽然AI会预测输赢（moneyline），但在投注决策时不使用输赢预测
        const allBetsToConsider: Array<{
          match: MatchRequest;
          betInfo: BetInfo;
          analysisRefs: StoredAnalysisResult[];
        }> = [];

        // 对每场比赛，选择置信度更高的投注（只比较大小球和让球盘，不考虑输赢）
        for (const matchAnalysis of matchAnalyses) {
          const overUnderConfidence = matchAnalysis.overUnderBetInfo?.confidence ?? 0;
          const handicapConfidence = matchAnalysis.handicapBetInfo?.confidence ?? 0;

          // 选择置信度更高的投注
          if (overUnderConfidence > handicapConfidence && overUnderConfidence >= (strategy.minConfidence ?? 60)) {
            allBetsToConsider.push({
              match: matchAnalysis.match,
              betInfo: matchAnalysis.overUnderBetInfo!,
              analysisRefs: matchAnalysis.analysisRefs,
            });
          } else if (handicapConfidence > overUnderConfidence && handicapConfidence >= (strategy.minConfidence ?? 60)) {
            allBetsToConsider.push({
              match: matchAnalysis.match,
              betInfo: matchAnalysis.handicapBetInfo!,
              analysisRefs: matchAnalysis.analysisRefs,
            });
          } else if (overUnderConfidence === handicapConfidence && overUnderConfidence >= (strategy.minConfidence ?? 60)) {
            // 如果置信度相同，优先选择大小球
            allBetsToConsider.push({
              match: matchAnalysis.match,
              betInfo: matchAnalysis.overUnderBetInfo!,
              analysisRefs: matchAnalysis.analysisRefs,
            });
          }
        }

        // 如果没有符合条件的，选择置信度最高的投注（不限制最低置信度）
        if (allBetsToConsider.length === 0) {
          for (const matchAnalysis of matchAnalyses) {
            const overUnderConfidence = matchAnalysis.overUnderBetInfo?.confidence ?? 0;
            const handicapConfidence = matchAnalysis.handicapBetInfo?.confidence ?? 0;

            // 选择置信度更高的投注
            if (overUnderConfidence > handicapConfidence && overUnderConfidence > 0) {
              allBetsToConsider.push({
                match: matchAnalysis.match,
                betInfo: matchAnalysis.overUnderBetInfo!,
                analysisRefs: matchAnalysis.analysisRefs,
              });
            } else if (handicapConfidence > overUnderConfidence && handicapConfidence > 0) {
              allBetsToConsider.push({
                match: matchAnalysis.match,
                betInfo: matchAnalysis.handicapBetInfo!,
                analysisRefs: matchAnalysis.analysisRefs,
              });
            } else if (overUnderConfidence === handicapConfidence && overUnderConfidence > 0) {
              // 如果置信度相同，优先选择大小球
              allBetsToConsider.push({
                match: matchAnalysis.match,
                betInfo: matchAnalysis.overUnderBetInfo!,
                analysisRefs: matchAnalysis.analysisRefs,
              });
            }
          }
        }

        // 限制下注数量（避免全买也不能一个不买）
        const availableBalance = balance.available_balance || 0;
        const baseStake = strategy.baseStake || 800;
        const maxBetsByBalance = Math.floor(availableBalance / baseStake);
        const maxBetsByStrategy = 10; // 每天最多下注次数
        const maxBets = Math.min(maxBetsByBalance, maxBetsByStrategy, allBetsToConsider.length);
        const minBets = Math.min(2, allBetsToConsider.length); // 至少下注 2 个

        // 按置信度排序，选择最佳的 N 个
        const sortedForBetting = allBetsToConsider
          .sort((a, b) => (b.betInfo.confidence || 0) - (a.betInfo.confidence || 0));

        // 去重：确保每场比赛只选择一个投注（选择置信度最高的）
        const uniqueMatchesMap = new Map<number, typeof sortedForBetting[0]>();
        for (const bet of sortedForBetting) {
          const matchId = bet.match.matchId;
          if (matchId) {
            const existing = uniqueMatchesMap.get(matchId);
            if (!existing || (bet.betInfo.confidence || 0) > (existing.betInfo.confidence || 0)) {
              uniqueMatchesMap.set(matchId, bet);
            }
          }
        }
        const uniqueBets = Array.from(uniqueMatchesMap.values());

        // 确保至少下注 minBets 个，但不超过 maxBets 个
        const targetBetsCount = Math.max(minBets, Math.min(maxBets, uniqueBets.length));
        const betsToPlace = uniqueBets.slice(0, targetBetsCount);

        // 第三步：执行下注
        let actualBetsPlaced = 0;
        for (const betToPlace of betsToPlace) {
          // 检查今天已下注次数
          const currentBetsCount = await getTodayBetsCount(aiId);
          if (currentBetsCount >= maxBets) {
            break;
          }
          
          // 重新获取最新余额
          if (!supabase) continue;
          
          const { data: latestBalance } = await supabase
            .from(AI_BALANCES_TABLE)
            .select('*')
            .eq('ai_id', aiId)
            .single();
          
          if (!latestBalance) continue;
          
          // 使用数据库中已保存的赔率（从分析阶段获取并保存的）
          const savedOdds = betToPlace.betInfo.odds;
          
          // 只使用数据库中的赔率，如果不在范围内则跳过该投注
          if (!savedOdds || savedOdds <= 0 || !isOddsInRange(savedOdds)) {
            // 如果赔率不在范围内，跳过这个投注
            continue;
          }
          
          const finalOdds = savedOdds;
          
          // 更新 betInfo 的赔率
          const finalBetInfo: BetInfo = {
            ...betToPlace.betInfo,
            odds: finalOdds,
          };
          
          // 检查余额
          const stake = calculateStake(finalBetInfo, strategy);
          
          if ((latestBalance.available_balance || 0) < stake) {
            continue;
          }
          
          // 更新 betInfo 的投注金额
          finalBetInfo.betAmount = stake;

          const autoBetResult = await createAutoBet(
            betToPlace.match.matchId,
            aiId,
            aiDisplayName,
            finalBetInfo,
            stake,
            strategy,
            betToPlace.analysisRefs,
          );

          if (autoBetResult.placed) {
            actualBetsPlaced++;
          }
        }

        // 添加未下注的分析结果（每场比赛只选择一个投注，所以检查该比赛是否下注）
        for (const matchAnalysis of matchAnalyses) {
          const wasBetPlaced = betsToPlace.some(btp => 
            btp.match.matchId === matchAnalysis.match.matchId
          );
          
          // 如果该比赛没有下注，记录分析结果
          if (!wasBetPlaced) {
            const overUnderConfidence = matchAnalysis.overUnderBetInfo?.confidence ?? 0;
            const handicapConfidence = matchAnalysis.handicapBetInfo?.confidence ?? 0;
            const maxConfidence = Math.max(overUnderConfidence, handicapConfidence);
            
            let reason = '未能提取有效预测';
            if (maxConfidence > 0) {
              const betType = overUnderConfidence >= handicapConfidence ? '大小球' : '让球盘';
              reason = `置信度(${betType}: ${maxConfidence}%) 未达到下注标准或未被选中`;
            }
            
            aiResults.push({
              matchId: matchAnalysis.match.matchId,
              aiId,
              aiDisplayName,
              analyses: matchAnalysis.analyses,
              analysisRefs: matchAnalysis.analysisRefs,
              primaryAnalysis: matchAnalysis.analyses.find((a) => a.analysis)?.analysis ?? null,
              autoBet: {
                placed: false,
                reason,
              },
            });
          }
        }

        return aiResults;
      } catch (aiError) {
        console.error(`[${modelConfig.displayName}] 处理失败:`, aiError);
        return [];
      }
    };

    console.log(`[match-analysis] 开始并行处理 ${MODEL_CONFIGS.length} 个 AI 模型`);
    
    // 并行处理所有 AI 模型（大幅提升性能）
    const allResults = await Promise.all(
      MODEL_CONFIGS.map(modelConfig => processAIModel(modelConfig))
    );

    console.log(`[match-analysis] 所有 AI 模型处理完成，结果数量: ${allResults.map(r => r.length).join(', ')}`);

    // 展平结果数组
    for (const aiResults of allResults) {
      results.push(...aiResults);
    }
    
    console.log(`[match-analysis] 最终结果总数: ${results.length}`);

    const fallbackResult = results.find((item) => item.primaryAnalysis);

    return new Response(
      JSON.stringify({
        analysis: fallbackResult?.primaryAnalysis ?? null,
        analyses: fallbackResult?.analyses ?? [],
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in match-analysis function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "分析失败，请稍后重试",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
