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

const buildSystemPrompt = () => `你是一位专业的足球赛事分析专家。请从以下三个维度进行深度分析：

1. **球队老板层面分析**：分析球队投资、战略布局、近期管理层动态
2. **球员技术面拆解**：分析关键球员状态、战术体系、阵容配置
3. **异常赔率监测**：分析赔率波动、市场热度、投注趋势

最后给出综合判断和投注建议。请用专业、简洁的语言，重点突出关键信息。`;

type MarketOdds = {
  overUnder?: Array<{ line: number; over: number; under: number }>;
  handicap?: Array<{ line: number; home: number; away: number }>;
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
        const lineStr = h.line > 0 ? `+${h.line}` : h.line.toString();
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
const getTodayMatches = async () => {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from(DAILY_MATCHES_TABLE)
    .select('*')
    .eq('date', today)
    .in('status_short', ['NS', 'LIVE', 'HT', '2H', 'ET', 'P', 'BREAK'])
    .order('kickoff_at', { ascending: true });

  if (error) {
    console.error('Error fetching today matches:', error);
    throw error;
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
  const today = new Date().toISOString().split('T')[0];
  
  // 如果提供了 matches 数组，过滤出当天的比赛
  if (Array.isArray(body.matches) && body.matches.length > 0) {
    // 验证比赛是否是当天的（通过检查 matchId 是否在当天的比赛中）
    if (supabase) {
      const matchIds = body.matches.map(m => m.matchId).filter(Boolean) as number[];
      if (matchIds.length > 0) {
        const { data: todayMatches } = await supabase
          .from(DAILY_MATCHES_TABLE)
          .select('fixture_id')
          .eq('date', today)
          .in('fixture_id', matchIds);
        
        const validMatchIds = new Set((todayMatches || []).map((m: any) => m.fixture_id));
        const filteredMatches = body.matches.filter(m => !m.matchId || validMatchIds.has(m.matchId));
        
        if (filteredMatches.length === 0) {
          return {
            matches: [],
            error: "提供的比赛不是当天的比赛，只分析当天的比赛数据"
          };
        }
        
        return { matches: filteredMatches };
      }
    }
    return { matches: body.matches };
  }

  // 如果提供了 matchInfo 和 betInfo，验证是否是当天的比赛
  if (body.matchInfo && body.betInfo) {
    if (body.matchId && supabase) {
      const { data: matchData } = await supabase
        .from(DAILY_MATCHES_TABLE)
        .select('date')
        .eq('fixture_id', body.matchId)
        .single();
      
      if (matchData && matchData.date !== today) {
        return {
          matches: [],
          error: "提供的比赛不是当天的比赛，只分析当天的比赛数据"
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
  try {
    const todayMatches = await getTodayMatches();
    
    if (todayMatches.length === 0) {
      return {
        matches: [],
        error: "今天没有可用的比赛。请提供 matchInfo 和 betInfo，或提供 matches 数组。"
      };
    }

    // 为每场比赛生成默认的 MatchRequest
    const matches: MatchRequest[] = todayMatches.map((match) => {
      const matchInfo: MatchInfo = {
        league: match.league_name || 'Unknown League',
        homeTeam: match.home_team_name,
        awayTeam: match.away_team_name,
        homeScore: match.goals_home || 0,
        awayScore: match.goals_away || 0,
        status: match.status_short === 'LIVE' ? 'live' : 'upcoming',
      };

      // 为每个 AI 模型生成一个默认的 betInfo
      const aiBets: AiBetRequest[] = MODEL_CONFIGS.map((model) => ({
        aiId: model.id,
        aiDisplayName: model.displayName,
        betInfo: generateDefaultBetInfo('HOME_WIN', 50), // 初始预测，会被 AI 分析覆盖
        strategy: body.strategy,
        autoBet: body.autoBet ?? false,
      }));

      return {
        matchId: match.fixture_id,
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
    const today = new Date().toISOString().split('T')[0];
    
    // 查询今天是否有该AI对该比赛的分析记录
    const { data, error } = await supabase
      .from(ANALYSIS_TABLE)
      .select('id, provider_model_id, analysis, bet_snapshot')
      .eq('match_id', matchId)
      .eq('ai_id', aiId)
      .gte('inserted_at', `${today}T00:00:00Z`)
      .order('inserted_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(`[checkExistingAnalysis] 查询失败:`, error);
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

  const { data, error } = await supabase
    .from(ANALYSIS_TABLE)
    .insert(rows)
    .select("id, provider_model_id");

  if (error) {
    console.error("[match-analysis] 写入分析表失败", error);
    return analyses.map((item) => ({ id: null, modelId: item.id }));
  }

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

// 单个模型分析（用于每个AI独立分析）
const analyzeWithSingleModel = async (
  OPENROUTER_API_KEY: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  modelConfig: ModelConfig,
  isDefaultBetInfo: boolean = false,
  marketOdds?: MarketOdds,
): Promise<ModelAnalysisResult> => {
  const systemPrompt = buildSystemPrompt();
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
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

    const payloadResult = await normalizeMatchesPayload(body);
    if (payloadResult.error) {
      return new Response(
        JSON.stringify({ 
          error: payloadResult.error,
          message: "请求格式不正确。请提供 matchInfo 和 betInfo，或提供 matches 数组。如果没有提供，将自动查询当天的比赛。"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matchesPayload = payloadResult.matches;
    
    if (matchesPayload.length === 0) {
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
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from(AUTO_BET_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('ai_id', aiId)
        .eq('status', 'pending')
        .gte('inserted_at', `${today}T00:00:00Z`);
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
        
        // 获取所有可用的市场赔率（用于AI分析）
        const getAllMarketOdds = async (matchId: number | undefined): Promise<MarketOdds | null> => {
          if (!matchId) return null;
          
          try {
            const FOOTBALL_API_KEY = Deno.env.get("FOOTBALL_API_KEY");
            if (!FOOTBALL_API_KEY) {
              return null;
            }

            const url = `https://v3.football.api-sports.io/odds?fixture=${matchId}`;
            const response = await fetch(url, {
              headers: {
                "x-rapidapi-key": FOOTBALL_API_KEY,
                "x-rapidapi-host": "v3.football.api-sports.io",
              },
            });

            if (!response.ok) {
              return null;
            }

            const data = await response.json() as {
              response?: Array<{
                bookmakers?: Array<{
                  bets?: Array<{
                    id: number;
                    name: string;
                    values?: Array<{
                      value: string;
                      odd: string;
                    }>;
                  }>;
                }>;
              }>;
            };

            if (!data.response || data.response.length === 0) {
              return null;
            }

            const firstBookmaker = data.response[0].bookmakers?.[0];
            if (!firstBookmaker?.bets) {
              return null;
            }

            const marketOdds: MarketOdds = {};

            // 获取大小球赔率
            const overUnderBet = firstBookmaker.bets.find(
              (bet) => bet.name === "Goals Over/Under" || bet.id === 5
            );

            if (overUnderBet?.values) {
              const overUnderMap = new Map<number, { over?: number; under?: number }>();
              
              for (const value of overUnderBet.values) {
                const valueStr = value.value.toLowerCase().trim();
                const odd = parseFloat(value.odd);
                if (isNaN(odd) || odd <= 0) continue;

                // 提取 line 值（如 "2.5", "Over 2.5", "Under 2.5"）
                const lineMatch = valueStr.match(/(\d+\.?\d*)/);
                if (!lineMatch) continue;
                
                const line = parseFloat(lineMatch[1]);
                if (!overUnderMap.has(line)) {
                  overUnderMap.set(line, {});
                }
                
                const entry = overUnderMap.get(line)!;
                if (valueStr.includes('over') || valueStr.startsWith('o')) {
                  entry.over = odd;
                } else if (valueStr.includes('under') || valueStr.startsWith('u')) {
                  entry.under = odd;
                }
              }

              // 转换为数组格式，只保留同时有 over 和 under 的，且两个赔率都在1.65-2.3范围内
              marketOdds.overUnder = Array.from(overUnderMap.entries())
                .filter(([_, odds]) => {
                  // 必须同时有 over 和 under
                  if (!odds.over || !odds.under) return false;
                  // 两个赔率都必须在范围内
                  return isOddsInRange(odds.over) && isOddsInRange(odds.under);
                })
                .map(([line, odds]) => ({
                  line,
                  over: odds.over!,
                  under: odds.under!,
                }))
                .sort((a, b) => a.line - b.line);
            }

            // 获取让球盘赔率
            const handicapBet = firstBookmaker.bets.find(
              (bet) => bet.name === "Asian Handicap" || bet.id === 4
            );

            if (handicapBet?.values) {
              const handicapMap = new Map<number, { home?: number; away?: number }>();
              
              for (const value of handicapBet.values) {
                const valueStr = value.value.trim();
                const odd = parseFloat(value.odd);
                if (isNaN(odd) || odd <= 0) continue;

                // 提取 line 值（如 "-1.5", "+0.5", "Home -1", "Away -1.5"）
                // 格式可能是 "Home -1", "Away -1", "Home -1.5", "Away -1.5" 等
                const lineMatch = valueStr.match(/([+-]?\d+\.?\d*)/);
                if (!lineMatch) continue;
                
                const line = parseFloat(lineMatch[1]);
                if (!handicapMap.has(line)) {
                  handicapMap.set(line, {});
                }
                
                const entry = handicapMap.get(line)!;
                const valueLower = valueStr.toLowerCase();
                
                // 根据 "Home" 或 "Away" 关键字判断方向
                if (valueLower.includes('home')) {
                  entry.home = odd;
                } else if (valueLower.includes('away')) {
                  entry.away = odd;
                }
              }

              // 转换为数组格式，只保留同时有 home 和 away 的，且两个赔率都在1.65-2.3范围内
              marketOdds.handicap = Array.from(handicapMap.entries())
                .filter(([_, odds]) => {
                  // 必须同时有 home 和 away
                  if (!odds.home || !odds.away) return false;
                  // 两个赔率都必须在范围内
                  return isOddsInRange(odds.home) && isOddsInRange(odds.away);
                })
                .map(([line, odds]) => ({
                  line,
                  home: odds.home!,
                  away: odds.away!,
                }))
                .sort((a, b) => a.line - b.line);
            }

            return (marketOdds.overUnder && marketOdds.overUnder.length > 0) || 
                   (marketOdds.handicap && marketOdds.handicap.length > 0)
              ? marketOdds
              : null;
          } catch (error) {
            console.error(`Error fetching market odds for match ${matchId}:`, error);
            return null;
          }
        };

        // 获取比赛赔率数据（从 Football API 的 /odds 端点）
        // 支持获取输赢、大小球和让球盘的真实赔率
        const getMatchOdds = async (
          matchId: number | undefined,
          betType: string,
          prediction: string,
          line?: number,
          overUnderPick?: string
        ): Promise<number | null> => {
          if (!matchId) return null;
          
          try {
            const FOOTBALL_API_KEY = Deno.env.get("FOOTBALL_API_KEY");
            if (!FOOTBALL_API_KEY) {
              return null; // 如果没有 API key，返回 null 使用计算赔率
            }

            // 调用 Football API 的 /odds 端点
            const url = `https://v3.football.api-sports.io/odds?fixture=${matchId}`;
            const response = await fetch(url, {
              headers: {
                "x-rapidapi-key": FOOTBALL_API_KEY,
                "x-rapidapi-host": "v3.football.api-sports.io",
              },
            });

            if (!response.ok) {
              console.warn(`Failed to fetch odds for fixture ${matchId}:`, response.status);
              return null;
            }

            const data = await response.json() as {
              response?: Array<{
                bookmakers?: Array<{
                  bets?: Array<{
                    id: number;
                    name: string;
                    values?: Array<{
                      value: string;
                      odd: string;
                    }>;
                  }>;
                }>;
              }>;
            };

            if (!data.response || data.response.length === 0) {
              return null;
            }

            const firstBookmaker = data.response[0].bookmakers?.[0];
            if (!firstBookmaker?.bets) {
              return null;
            }

            // 根据 betType 获取不同类型的赔率
            if (betType === 'moneyline') {
              // 提取主胜/平局/客胜赔率
              const moneylineBet = firstBookmaker.bets.find(
                (bet) => bet.name === "Match Winner" || bet.id === 1
              );

              if (moneylineBet?.values) {
                for (const value of moneylineBet.values) {
                  const odd = parseFloat(value.odd);
                  if (isNaN(odd)) continue;

                  if (prediction === "HOME_WIN" && (value.value === "Home" || value.value === "1")) {
                    return odd;
                  } else if (prediction === "DRAW" && (value.value === "Draw" || value.value === "X")) {
                    return odd;
                  } else if (prediction === "AWAY_WIN" && (value.value === "Away" || value.value === "2")) {
                    return odd;
                  }
                }
              }
            } else if (betType === 'over_under' && line !== undefined && overUnderPick) {
              // 提取大小球赔率
              const overUnderBet = firstBookmaker.bets.find(
                (bet) => bet.name === "Goals Over/Under" || bet.id === 5
              );

              if (overUnderBet?.values) {
                // 查找匹配的 line 值（如 2.5, 3.0 等）
                for (const value of overUnderBet.values) {
                  // value.value 格式可能是 "2.5", "Over 2.5", "Under 2.5", "Over", "Under" 等
                  const valueStr = value.value.toLowerCase().trim();
                  const lineStr = line.toString();
                  const isOver = overUnderPick.toLowerCase() === 'over';
                  
                  // 检查是否匹配 line 和 pick
                  // 匹配逻辑：包含 line 值，且方向匹配
                  const matchesLine = valueStr.includes(lineStr) || valueStr === lineStr;
                  const matchesPick = isOver 
                    ? (valueStr.includes('over') || valueStr.startsWith('o') || valueStr === 'o')
                    : (valueStr.includes('under') || valueStr.startsWith('u') || valueStr === 'u');
                  
                  if (matchesLine && matchesPick) {
                    const odd = parseFloat(value.odd);
                    if (!isNaN(odd) && odd > 0 && isOddsInRange(odd)) {
                      return odd;
                    }
                  }
                }
              }
            } else if (betType === 'handicap' && line !== undefined) {
              // 提取让球盘赔率
              const handicapBet = firstBookmaker.bets.find(
                (bet) => bet.name === "Asian Handicap" || bet.id === 4
              );

              if (handicapBet?.values) {
                // 查找匹配的让球数和方向
                // value 格式： "Home -1", "Away -1", "Home -1.5", "Away +1", "Home +0.5" 等
                for (const value of handicapBet.values) {
                  const valueStr = value.value.trim();
                  const valueLower = valueStr.toLowerCase();
                  
                  // 提取 value 中的 line 值和方向
                  const lineMatch = valueStr.match(/([+-]?\d+\.?\d*)/);
                  if (!lineMatch) continue;
                  
                  const valueLine = parseFloat(lineMatch[1]);
                  
                  // 检查 line 是否匹配（精确匹配，需要考虑符号）
                  if (valueLine !== line) {
                    continue;
                  }
                  
                  // 检查方向匹配
                  const isHome = prediction === "HOME";
                  const hasHome = valueLower.includes('home');
                  const hasAway = valueLower.includes('away');
                  
                  // 根据预测方向匹配
                  const matchesDirection = isHome ? hasHome : hasAway;
                  
                  if (matchesDirection) {
                    const odd = parseFloat(value.odd);
                    if (!isNaN(odd) && odd > 0 && isOddsInRange(odd)) {
                      return odd;
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching odds for match ${matchId}:`, error);
          }
          
          return null; // 如果获取失败，返回 null 使用计算赔率
        };

        // 第一步：并行分析所有比赛（大幅提升性能）
        const analysisPromises = matchesPayload.map(async (match) => {
          const matchInfo = match.matchInfo;
          const defaultBetInfo = generateDefaultBetInfo('OVER', 50);
          
          // 检查是否已有分析记录
          const existingAnalysisRefs = await checkExistingAnalysis(match.matchId, aiId);
          
          if (existingAnalysisRefs && existingAnalysisRefs.length > 0) {
            // 已有分析记录，直接使用
            console.log(`[${aiDisplayName}] 比赛 ${match.matchId} 已有分析记录，跳过分析`);
            
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
            }
          }
          
          // 没有已有分析，进行新分析
          // 在分析之前，先获取市场赔率
          const marketOdds = await getAllMarketOdds(match.matchId);
          
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
          // 从已获取的市场赔率中查找真实赔率
          
          // 获取输赢真实赔率（仍需要调用API，因为marketOdds中没有输赢赔率）
          const moneylineRealOdds = moneylinePick
            ? await getMatchOdds(match.matchId, 'moneyline', moneylinePick)
            : null;

          const moneylineBetInfo: BetInfo | null = moneylinePick && moneylineConfidence
            ? {
                betType: 'moneyline',
                prediction: moneylinePick, // HOME_WIN, AWAY_WIN, 或 DRAW
                confidence: moneylineConfidence,
                odds: moneylineRealOdds || 1.9, // 使用真实赔率，如果获取失败则使用默认值
                betAmount: 0,
              }
            : null;

          // 从市场赔率中获取大小球真实赔率
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
          
          // 如果从市场赔率中没找到，尝试从API获取
          if (!overUnderRealOdds && overUnderPick && overUnderLine) {
            const apiOdds = await getMatchOdds(match.matchId, 'over_under', overUnderPick, overUnderLine, overUnderPick.toLowerCase());
            // 确保API返回的赔率也在范围内
            if (apiOdds && isOddsInRange(apiOdds)) {
              overUnderRealOdds = apiOdds;
            }
          }

          const overUnderBetInfo: BetInfo | null = overUnderPick && overUnderLine && overUnderConfidence
            ? {
                betType: 'over_under',
                prediction: overUnderPick,
                confidence: overUnderConfidence,
                odds: overUnderRealOdds || 1.9, // 使用真实赔率，如果获取失败则使用默认值
                betAmount: 0,
                overUnderLine,
                overUnderPick: overUnderPick.toLowerCase(),
              }
            : null;

          // 从市场赔率中获取让球盘真实赔率
          let handicapRealOdds: number | null = null;
          if (handicapPick && handicapLine !== undefined && savedMarketOdds?.handicap) {
            const matchedOdds = savedMarketOdds.handicap.find(h => Math.abs(h.line - handicapLine) < 0.01);
            if (matchedOdds) {
              const selectedOdds = handicapPick.toUpperCase() === 'HOME' ? matchedOdds.home : matchedOdds.away;
              // 确保选择的赔率在范围内
              if (selectedOdds && isOddsInRange(selectedOdds)) {
                handicapRealOdds = selectedOdds;
              }
            }
          }
          
          // 如果从市场赔率中没找到，尝试从API获取
          if (!handicapRealOdds && handicapPick && handicapLine !== undefined) {
            const apiOdds = await getMatchOdds(match.matchId, 'handicap', handicapPick, handicapLine);
            // 确保API返回的赔率也在范围内
            if (apiOdds && isOddsInRange(apiOdds)) {
              handicapRealOdds = apiOdds;
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

        // 确保至少下注 minBets 个，但不超过 maxBets 个
        const targetBetsCount = Math.max(minBets, Math.min(maxBets, sortedForBetting.length));
        const betsToPlace = sortedForBetting.slice(0, targetBetsCount);

        // 第三步：执行下注
        let actualBetsPlaced = 0;
        for (const betToPlace of betsToPlace) {
          // 检查今天已下注次数
          const currentBetsCount = await getTodayBetsCount(aiId);
          if (currentBetsCount >= maxBets) break;
          
          // 重新获取最新余额
          if (!supabase) continue;
          
          const { data: latestBalance } = await supabase
            .from(AI_BALANCES_TABLE)
            .select('*')
            .eq('ai_id', aiId)
            .single();
          
          if (!latestBalance) continue;
          
          // 获取真实赔率（优先使用数据库中已保存的赔率）
          let finalOdds: number;
          
          // 优先使用数据库中已保存的赔率（从分析阶段获取并保存的）
          const savedOdds = betToPlace.betInfo.odds;
          const isDefaultOdds = savedOdds === 1.9; // 如果是默认值，说明之前可能没有成功获取真实赔率
          
          if (savedOdds && !isDefaultOdds && savedOdds > 0 && isOddsInRange(savedOdds)) {
            // 使用数据库中已保存的真实赔率（必须在范围内）
            finalOdds = savedOdds;
          } else {
            // 如果数据库中没有有效赔率，尝试从 API 获取最新赔率
            let apiOdds: number | null = null;
            if (betToPlace.betInfo.betType === 'over_under') {
              apiOdds = await getMatchOdds(
                betToPlace.match.matchId,
                'over_under',
                betToPlace.betInfo.overUnderPick || betToPlace.betInfo.prediction,
                betToPlace.betInfo.overUnderLine,
                betToPlace.betInfo.overUnderPick
              );
            } else if (betToPlace.betInfo.betType === 'handicap') {
              apiOdds = await getMatchOdds(
                betToPlace.match.matchId,
                'handicap',
                betToPlace.betInfo.prediction,
                betToPlace.betInfo.handicapLine
              );
            }
            
            // 优先使用 API 获取的赔率（必须在范围内），如果失败则跳过这个投注
            if (apiOdds && apiOdds > 0 && isOddsInRange(apiOdds)) {
              finalOdds = apiOdds;
            } else if (savedOdds && savedOdds > 0 && isOddsInRange(savedOdds)) {
              finalOdds = savedOdds;
            } else {
              // 如果所有赔率都不在范围内，跳过这个投注
              continue;
            }
          }
          
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

    // 并行处理所有 AI 模型（大幅提升性能）
    const allResults = await Promise.all(
      MODEL_CONFIGS.map(modelConfig => processAIModel(modelConfig))
    );

    // 展平结果数组
    for (const aiResults of allResults) {
      results.push(...aiResults);
    }

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
