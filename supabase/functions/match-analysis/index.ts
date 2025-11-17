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
];

const buildSystemPrompt = () => `你是一位专业的足球赛事分析专家。请从以下三个维度进行深度分析：

1. **球队老板层面分析**：分析球队投资、战略布局、近期管理层动态
2. **球员技术面拆解**：分析关键球员状态、战术体系、阵容配置
3. **异常赔率监测**：分析赔率波动、市场热度、投注趋势

最后给出综合判断和投注建议。请用专业、简洁的语言，重点突出关键信息。`;

const buildUserPrompt = (
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  aiModel: string,
) => `请分析以下比赛：

**比赛信息**
- 联赛：${matchInfo.league}
- 主队：${matchInfo.homeTeam}
- 客队：${matchInfo.awayTeam}
- 当前比分：${matchInfo.homeScore ?? 0} - ${matchInfo.awayScore ?? 0}
- 比赛状态：${matchInfo.status === "live" ? "进行中" : "即将开始"}

**AI模型预测**
- AI模型：${aiModel}
- 投注类型：${betInfo.betType === "handicap" ? "让球盘" : "大小球"}
- 预测：${betInfo.prediction}
- 置信度：${betInfo.confidence}%
- 赔率：${betInfo.odds}
- 投注金额：${betInfo.betAmount}

请从老板层面、技术层面、赔率层面进行全面分析，并给出最终投注建议。`;

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

const normalizeMatchesPayload = (body: RequestBody): MatchRequest[] => {
  if (Array.isArray(body.matches) && body.matches.length > 0) {
    return body.matches;
  }

  if (!body.matchInfo || !body.betInfo) {
    throw new Error("缺少 matchInfo 或 betInfo");
  }

  return [{
    matchId: body.matchId,
    matchInfo: body.matchInfo,
    aiBets: [{
      aiId: body.aiId ?? "manual",
      aiDisplayName: body.aiModel ?? body.aiId ?? "Manual Strategy",
      betInfo: body.betInfo,
      strategy: body.strategy,
      autoBet: body.autoBet,
    }],
  }];
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

const persistAnalyses = async (
  matchId: number | undefined,
  aiId: string | undefined,
  aiDisplayName: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  analyses: ModelAnalysisResult[],
): Promise<StoredAnalysisResult[]> => {
  if (!supabase) {
    console.warn("[match-analysis] Supabase 客户端未配置，跳过写入");
    return analyses.map((item) => ({ id: null, modelId: item.id }));
  }

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
    bet_snapshot: betInfo,
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

const analyzeBetWithModels = async (
  OPENROUTER_API_KEY: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  aiModel: string,
) => {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(matchInfo, betInfo, aiModel);

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
      throw new Error("OPENROUTER_API_KEY 未配置");
    }

    const matchesPayload = normalizeMatchesPayload(body);
    const results: Array<{
      matchId?: number;
      aiId?: string;
      aiDisplayName: string;
      analyses: ModelAnalysisResult[];
      analysisRefs: StoredAnalysisResult[];
      primaryAnalysis: string | null;
      autoBet?: AutoBetResult;
    }> = [];

    for (const match of matchesPayload) {
      for (const aiBet of match.aiBets) {
        const aiDisplayName = aiBet.aiDisplayName ?? aiBet.aiId ?? "AI Strategy";
        const analyses = await analyzeBetWithModels(
          OPENROUTER_API_KEY,
          match.matchInfo,
          aiBet.betInfo,
          aiDisplayName,
        );

        const successfulAnalysis = analyses.find((item) => item.analysis);
        if (!successfulAnalysis) {
          results.push({
            matchId: match.matchId,
            aiId: aiBet.aiId,
            aiDisplayName,
            analyses,
            analysisRefs: [],
            primaryAnalysis: null,
            autoBet: {
              placed: false,
              reason: "所有模型均失败",
            },
          });
          continue;
        }

        const analysisRefs = await persistAnalyses(
          match.matchId,
          aiBet.aiId,
          aiDisplayName,
          match.matchInfo,
          aiBet.betInfo,
          analyses,
        );

        let autoBetResult: AutoBetResult | undefined;
        const shouldAutoBet = aiBet.autoBet ?? body.autoBet ?? false;
        if (shouldAutoBet) {
          const strategy = resolveStrategy(body.strategy, aiBet.strategy);
          if (shouldPlaceBet(aiBet.betInfo, strategy)) {
            const stake = calculateStake(aiBet.betInfo, strategy);
            autoBetResult = await createAutoBet(
              match.matchId,
              aiBet.aiId,
              aiDisplayName,
              aiBet.betInfo,
              stake,
              strategy,
              analysisRefs,
            );
          } else {
            autoBetResult = {
              placed: false,
              reason: `信心(${aiBet.betInfo.confidence}%) 低于策略下限`,
            };
          }
        }

        results.push({
          matchId: match.matchId,
          aiId: aiBet.aiId,
          aiDisplayName,
          analyses,
          analysisRefs,
          primaryAnalysis: successfulAnalysis.analysis ?? null,
          autoBet: autoBetResult,
        });
      }
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
